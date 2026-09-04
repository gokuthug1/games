/**
 * Leech — siphons life from the target: heals the firer for 60% of the
 * damage it deals. Self-healing artillery.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';

export class Leech extends WeaponBase {
  static get DEF() {
    return {
      id: 'leech',
      name: 'Leech',
      desc: 'Siphons life: heals you for 60% of the damage it deals.',
      icon: 'leech',
      color: '#ff5a8a',
      sound: 'leech',
      damage: 42,
      blastRadius: 52,
      ammo: 2,
      minAngle: 10,
      maxAngle: 170,
      minPower: 35,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#ff8fb0',
      mass: 1.05,
      radius: 5,
      trailColor: '#ff5a8a',
    });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    let dealt = 0;
    for (const t of game.tanks) {
      if (!t.alive || t === this.tank) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d >= this.def.blastRadius) continue;
      const dmg = Combat.damageAt(d, this.def.blastRadius, this.def.damage);
      if (dmg <= 0) continue;
      const destroyed = t.takeDamage(game.masteryDamage(this.tank, this.def.id, dmg));
      dealt += dmg;
      game.bus.emit(EVT.TANK_STATS, game._tankStatsPayload(t));
      if (destroyed) {
        game.onTankDestroyed(t, this.tank);
      } else {
        game.settings.recordStat('directHits', 1);
      }
    }
    if (dealt > 0) {
      this.tank.heal(dealt * 0.6);
      game.bus.emit(EVT.TANK_STATS, game._tankStatsPayload(this.tank));
    }
    game.spawnExplosionEntity({ x, y, radius: this.def.blastRadius, color: '#ff5a8a' });
    game.particles.explosionBurst({ x, y, radius: this.def.blastRadius, color: '#ff5a8a' });
    game.camera.addShake(8);
    game.sound.play('explosion', { size: this.def.blastRadius });
  }
}
