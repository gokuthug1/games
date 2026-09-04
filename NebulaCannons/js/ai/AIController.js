/**
 * AIController — drives an AI tank through a turn: choose weapon, solve the
 * shot, optionally reposition, then aim and fire with difficulty-tuned error.
 * The controller is a small state machine advanced by Game.update during
 * ENEMY_TURN so the AI visibly "thinks" and aims like a player.
 */

import { getDifficulty } from './Difficulty.js';
import { AimingAI } from './AimingAI.js';
import { CONFIG } from '../core/Config.js';
import { EVT } from '../core/EventBus.js';
import { clamp } from '../utils/MathUtils.js';

const WEAPON_MASS = {
  cannon: 1.0,
  cluster: 1.05,
  nuke: 1.25,
  splitter: 1.0,
  dirtmaker: 1.6,
  bouncer: 1.1,
};

function angleDiffDeg(a, b) {
  return ((b - a + 540) % 360) - 180;
}

export class AIController {
  /**
   * @param {object} game
   * @param {string} difficultyId
   */
  constructor(game, difficultyId = 'NORMAL') {
    this.game = game;
    this.diff = getDifficulty(difficultyId);
    this.tank = null;
    this.phase = 'idle'; // idle | moving | aiming | firing
    this.timer = 0;
    this.solution = null;
    this.moveTarget = 0;
  }

  setDifficulty(id) {
    this.diff = getDifficulty(id);
  }

  /** Called by TurnManager when an AI turn starts. */
  beginTurn(tank) {
    this.tank = tank;
    if (!tank || !tank.alive) return;

    this._chooseWeapon(tank);
    const enemy = this._pickTarget(tank);
    if (!enemy) {
      this.phase = 'idle';
      return;
    }

    // Solve from the actual muzzle so the simulated and real shots share a start.
    const tip = tank.getBarrelTip();
    const etip = enemy.getBarrelTip();
    const aim = tank.aimRange();
    const pow = tank.powerRange();
    this.solution = AimingAI.solveShot({
      x: tip.x,
      y: tip.y,
      targetX: etip.x,
      targetY: etip.y,
      wind: this.game.turnManager.wind,
      terrain: this.game.terrain,
      mass: WEAPON_MASS[tank.activeWeaponId] || 1,
      minAngle: aim.min,
      maxAngle: aim.max,
      minPower: pow.min,
      maxPower: pow.max,
    });

    if (this.solution) {
      // Difficulty error injection — the AI does not get perfect information.
      this.solution.angle += this.game.rng.gaussian(0, this.diff.errorDeg);
      this.solution.power += this.game.rng.gaussian(0, this.diff.powerJitter);
      // Smokescreen: an enemy hiding in smoke throws the AI's aim way off.
      if (this.game.inSmoke && this.game.inSmoke(enemy.x, enemy.y)) {
        this.solution.angle += this.game.rng.gaussian(0, 16);
        this.solution.power += this.game.rng.gaussian(0, 14);
      }
      this.solution.angle = clamp(this.solution.angle, aim.min, aim.max);
      this.solution.power = clamp(this.solution.power, pow.min, pow.max);
    }

    // Optional reposition.
    const margin = CONFIG.WORLD.EDGE_MARGIN;
    this.moveTarget = tank.x;
    if (this.game.rng.chance(this.diff.moveChance)) {
      const dir = Math.sign(enemy.x - tank.x);
      const offset = this.game.rng.range(50, 140) * (this.game.rng.chance(0.3) ? dir : -dir);
      this.moveTarget = clamp(tank.x + offset, margin, CONFIG.WORLD.WIDTH - margin);
    }

    this.phase = Math.abs(this.moveTarget - tank.x) > 16 ? 'moving' : 'aiming';
    this.timer = this.diff.thinkTime * (0.7 + Math.random() * 0.6);
    this._stallTime = 0;
    this._lastX = tank.x;
  }

  update(dt) {
    if (this.phase === 'idle') return;
    const tank = this.tank;
    if (!tank || !tank.alive) {
      this.phase = 'idle';
      return;
    }
    this.timer -= dt;

    switch (this.phase) {
      case 'moving': {
        const dir = Math.sign(this.moveTarget - tank.x);
        tank.move(dir, dt, this.game.terrain);
        // Give up repositioning if blocked (wall/fuel) for half a second.
        if (Math.abs(tank.x - this._lastX) < 1) this._stallTime += dt;
        else this._stallTime = 0;
        this._lastX = tank.x;
        if (
          Math.abs(tank.x - this.moveTarget) < 18 ||
          tank.fuel <= 0 ||
          this._stallTime > 0.5
        ) {
          this.phase = 'aiming';
          this.timer = this.diff.thinkTime * (0.5 + Math.random() * 0.5);
        }
        break;
      }
      case 'aiming': {
        if (this.solution) {
          tank.aimToward(this.solution.angle, dt);
          const k = Math.min(1, dt * (6 * this.diff.aimRate));
          tank.setPower(tank.power + (this.solution.power - tank.power) * k);
          const aligned = Math.abs(angleDiffDeg(tank.turret.angle, this.solution.angle)) < 1.5;
          if (this.timer <= 0 && aligned) {
            this.phase = 'firing';
            this.timer = 0.22;
          }
        } else if (this.timer <= 0) {
          this.phase = 'firing';
          this.timer = 0.2;
        }
        break;
      }
      case 'firing': {
        if (this.timer <= 0) {
          this.phase = 'idle';
          // Even a failed solve deserves a shot — fire at max power.
          if (!this.solution) tank.setPower(CONFIG.PHYSICS.POWER_MAX);
          this.game.turnManager.fire();
        }
        break;
      }
    }
  }

  _pickTarget(tank) {
    return this.game.tanks.find((t) => t !== tank && t.alive) || null;
  }

  /** Pick the highest-scoring weapon with ammo and select it. */
  _chooseWeapon(tank) {
    const weights = CONFIG.AI.WEAPON_WEIGHTS;
    let bestIdx = -1;
    let bestScore = -Infinity;
    tank.weapons.forEach((id, idx) => {
      const ammo = tank.ammoFor(id);
      if (ammo <= 0) return;
      const def = this.game.weaponDef(id);
      const score = (def ? def.damage : 0) * (weights[id] || 1);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0 && bestIdx !== tank.weaponIndex) {
      tank.setWeaponIndex(bestIdx);
      this.game.bus.emit(EVT.WEAPON_CHANGE, this.game.weaponChangePayload(tank));
    }
  }
}
