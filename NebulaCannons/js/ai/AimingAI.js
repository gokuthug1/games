/**
 * AimingAI — solves firing solutions using the *exact same* physics the
 * game simulates (fixed timestep, gravity, wind, mass). No shortcuts: the
 * AI genuinely predicts trajectories, so it can be fooled by terrain and
 * wind exactly like a player.
 */

import { CONFIG } from '../core/Config.js';
import { Physics } from '../systems/Physics.js';
import { clamp } from '../utils/MathUtils.js';

export class AimingAI {
  /**
   * Deterministic flight simulation identical to real projectiles.
   * @param {object} o
   * @param {number} o.x start x
   * @param {number} o.y start y
   * @param {number} o.angleDeg turret angle (deg from east, CCW)
   * @param {number} o.power 10..100
   * @param {number} o.wind signed wind units
   * @param {object} o.terrain Terrain
   * @param {number} [o.mass=1]
   * @param {number} [o.gravity]
   * @returns {{x:number,y:number,time:number,hitTerrain:boolean,hitBounds:boolean,maxY:number}}
   */
  static simulate(o) {
    const dt = CONFIG.PHYSICS.FIXED_DT;
    const gravity = o.gravity !== undefined ? o.gravity : CONFIG.PHYSICS.GRAVITY;
    const maxTime = CONFIG.AI.MAX_SIM_TIME;
    const { vx: ivx, vy: ivy } = Physics.initialVelocity(o.angleDeg, o.power);
    const windAcc = Physics.windAcceleration(o.wind, o.mass || 1);

    let px = o.x;
    let py = o.y;
    let vx = ivx;
    let vy = ivy;
    let time = 0;
    let maxY = py;
    let hitTerrain = false;
    let hitBounds = false;

    for (; time < maxTime; time += dt) {
      vx += windAcc * dt;
      vy += gravity * dt;
      px += vx * dt;
      py += vy * dt;
      if (py < maxY) maxY = py;
      if (o.terrain.isSolidAt(px, py)) {
        hitTerrain = true;
        break;
      }
      if (px < -100 || px > o.terrain.width + 100 || py > o.terrain.height + 200 || py < -600) {
        hitBounds = true;
        break;
      }
    }
    return { x: px, y: py, time, hitTerrain, hitBounds, maxY };
  }

  /**
   * Find the best (angleDeg, power) pair to land near the target.
   * @param {object} o
   * @param {number} o.x
   * @param {number} o.y
   * @param {number} o.targetX
   * @param {number} o.targetY
   * @param {number} o.wind
   * @param {object} o.terrain
   * @param {number} [o.mass=1]
   * @param {number[]} [o.powerTrials]
   * @param {number} [o.coarseSamples]
   * @param {number} [o.minAngle]
   * @param {number} [o.maxAngle]
   * @param {number} [o.minPower]
   * @param {number} [o.maxPower]
   * @returns {{angle:number,power:number,score:number}|null}
   */
  static solveShot(o) {
    const trials = (o.powerTrials || CONFIG.AI.POWER_TRIALS).filter(
      (p) => p >= (o.minPower !== undefined ? o.minPower : CONFIG.PHYSICS.POWER_MIN) &&
             p <= (o.maxPower !== undefined ? o.maxPower : CONFIG.PHYSICS.POWER_MAX)
    );
    const samples = o.coarseSamples || CONFIG.AI.COARSE_SAMPLES;
    const minA = o.minAngle !== undefined ? o.minAngle : 6;
    const maxA = o.maxAngle !== undefined ? o.maxAngle : 174;
    const step = (maxA - minA) / samples;

    let best = null;
    let bestScore = Infinity;

    for (const power of trials) {
      for (let i = 0; i <= samples; i++) {
        const angle = minA + i * step;
        const res = AimingAI.simulate({
          x: o.x, y: o.y, angleDeg: angle, power, wind: o.wind, terrain: o.terrain, mass: o.mass,
        });
        const score = AimingAI._score(res, o.targetX, o.targetY);
        if (score < bestScore) {
          bestScore = score;
          best = { angle, power, res };
        }
      }
    }
    if (!best) return null;

    // Refine angle near the coarse best with a shrinking bracket search.
    let angle = best.angle;
    let span = step;
    for (let it = 0; it < 7; it++) {
      span *= 0.5;
      const a1 = angle - span;
      const a2 = angle + span;
      const s1 = AimingAI._score(
        AimingAI.simulate({ x: o.x, y: o.y, angleDeg: a1, power: best.power, wind: o.wind, terrain: o.terrain, mass: o.mass }),
        o.targetX, o.targetY
      );
      const s2 = AimingAI._score(
        AimingAI.simulate({ x: o.x, y: o.y, angleDeg: a2, power: best.power, wind: o.wind, terrain: o.terrain, mass: o.mass }),
        o.targetX, o.targetY
      );
      if (s1 < s2) angle = a1;
      else angle = a2;
    }

    const finalRes = AimingAI.simulate({
      x: o.x, y: o.y, angleDeg: angle, power: best.power, wind: o.wind, terrain: o.terrain, mass: o.mass,
    });
    return {
      angle: clamp(angle, minA, maxA),
      power: best.power,
      score: AimingAI._score(finalRes, o.targetX, o.targetY),
    };
  }

  static _score(res, tx, ty) {
    if (res.hitBounds) return 1e6;
    const dx = res.x - tx;
    const dy = res.y - ty;
    return Math.abs(dx) + Math.abs(dy) * 0.35;
  }
}
