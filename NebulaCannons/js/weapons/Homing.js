/**
 * Homing — a missile that locks onto the nearest enemy once inside
 * acquisition range and steers toward it. Outside range it flies straight,
 * so bad launches still fall flat.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

const ACQUIRE_RANGE = 950;

export class Homing extends WeaponBase {
  static get DEF() {
    return {
      id: 'homing',
      name: 'Homing Missile',
      desc: 'Locks on and steers toward the enemy once in range.',
      icon: 'homing',
      color: '#ff5a7a',
      sound: 'missile',
      damage: 30,
      blastRadius: 42,
      ammo: 3,
      minAngle: -10,
      maxAngle: 190,
      minPower: 25,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#ff8fa5',
      mass: 0.9,
      radius: 4.5,
      maxLife: 12,
      trailColor: '#ff5a7a',
      trailInterval: 0.02,
      onSteer: ({ game, projectile, dt }) => {
        let best = null;
        let bestD = Infinity;
        for (const t of game.tanks) {
          if (!t.alive || t === this.tank) continue;
          const d = Math.hypot(t.x - projectile.pos.x, t.y - projectile.pos.y);
          if (d < bestD) {
            bestD = d;
            best = t;
          }
        }
        if (!best || bestD > ACQUIRE_RANGE) return; // too far: straight shot
        const target = { x: best.x, y: best.y - best.height * 0.1 };
        const cur = Math.atan2(projectile.vel.y, projectile.vel.x);
        const want = Math.atan2(target.y - projectile.pos.y, target.x - projectile.pos.x);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        // Turn rate scales up as the missile closes in.
        const closeness = 1 - Math.min(1, bestD / ACQUIRE_RANGE);
        const maxTurn = (70 + closeness * 150) * dt;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
        const speed = Math.hypot(projectile.vel.x, projectile.vel.y);
        const na = cur + turn;
        projectile.vel.x = Math.cos(na) * speed;
        projectile.vel.y = Math.sin(na) * speed;
      },
    });
  }

  onImpact(ctx) {
    Combat.explode({
      game: ctx.game,
      x: ctx.x,
      y: ctx.y,
      radius: this.def.blastRadius,
      damage: this.def.damage,
      owner: this.tank,
      color: this.def.color,
      shake: 9,
    });
  }
}
