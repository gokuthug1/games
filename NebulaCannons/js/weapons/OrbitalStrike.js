/**
 * OrbitalStrike — a marker shell lands, then a sky beam smites the target
 * column after a short delay. Wide area damage with no terrain obstacle.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';
import { clamp } from '../utils/MathUtils.js';

export class OrbitalStrike extends WeaponBase {
  static get DEF() {
    return {
      id: 'orbital',
      name: 'Orbital Strike',
      desc: 'A sky beam smites the target column after a short delay.',
      icon: 'orbital',
      color: '#c14dff',
      sound: 'laser',
      damage: 46,
      blastRadius: 90,
      ammo: 1,
      minAngle: 35,
      maxAngle: 145,
      minPower: 45,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#e0b3ff',
      mass: 1.0,
      radius: 4.5,
      trailColor: '#c14dff',
    });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    const strikeX = clamp(x, 120, game.terrain.width - 120);
    game.particles.smokeAt(strikeX, game.terrain.heightAt(strikeX), 10, '#c14dff');

    game.after(1.2, () => {
      game.beams.push({
        x1: strikeX, y1: y - 1300, x2: strikeX, y2: y + 80,
        color: '#c14dff', width: 8, life: 0.5, maxLife: 0.5,
      });
      game.camera.addShake(18);
      for (const t of game.tanks) {
        if (!t.alive) continue;
        const d = Math.abs(t.x - strikeX);
        if (d > this.def.blastRadius) continue;
        const dmg = Combat.damageAt(d, this.def.blastRadius, this.def.damage, 1.4);
        if (dmg <= 0) continue;
        const destroyed = t.takeDamage(game.masteryDamage(this.tank, this.def.id, dmg));
        game.bus.emit(EVT.TANK_STATS, game._tankStatsPayload(t));
        if (destroyed) {
          game.onTankDestroyed(t, this.tank);
        } else if (t !== this.tank) {
          game.settings.recordStat('directHits', 1);
        }
      }
      game.terrain.crater(strikeX, y, this.def.blastRadius * 0.8, 40);
      game.spawnExplosionEntity({ x: strikeX, y, radius: 70, color: '#c14dff' });
      game.particles.explosionBurst({ x: strikeX, y, radius: 70, color: '#c14dff' });
      game.sound.play('explosion', { size: 90 });
    });
  }
}
