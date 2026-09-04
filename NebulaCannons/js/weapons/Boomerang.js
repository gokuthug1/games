/**
 * Boomerang — a shell that flies out, then curves back to the firer.
 * It can hit on both the outbound leg and the return leg. Unique
 * 'boomerang' voice + spinning VFX.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';

const RETURN_AFTER = 1.7; // seconds of flight before curving back

export class Boomerang extends WeaponBase {
  static get DEF() {
    return {
      id: 'boomerang',
      name: 'Boomerang',
      desc: 'Flies out and curves back — can hit the enemy twice.',
      icon: 'boomerang',
      color: '#ffd166',
      sound: 'boomerang',
      damage: 26,
      blastRadius: 38,
      ammo: 3,
      minAngle: -10,
      maxAngle: 190,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    const { game, tank } = ctx;
    this._launchShell(ctx, {
      color: '#ffe29a',
      mass: 0.7,
      radius: 4,
      trailColor: '#ffd166',
      trailInterval: 0.018,
      maxLife: 8,
      onSteer: ({ projectile, dt }) => {
        if (projectile.life < RETURN_AFTER) return;
        // Curve back toward the firer (homing on the return leg).
        const tx = tank.x;
        const ty = tank.y - tank.height * 0.3;
        const cur = Math.atan2(projectile.vel.y, projectile.vel.x);
        const want = Math.atan2(ty - projectile.pos.y, tx - projectile.pos.x);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = 5.2 * dt;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
        const speed = Math.hypot(projectile.vel.x, projectile.vel.y);
        const na = cur + turn;
        projectile.vel.x = Math.cos(na) * speed;
        projectile.vel.y = Math.sin(na) * speed;
      },
    });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    Combat.explode({
      game,
      x,
      y,
      radius: this.def.blastRadius,
      damage: this.def.damage,
      owner: this.tank,
      color: '#ffd166',
      shake: 7,
    });
    game.sound.play('boomerang', { size: this.def.blastRadius });
  }
}
