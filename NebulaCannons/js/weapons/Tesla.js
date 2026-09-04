/**
 * Tesla — a lightning shell that erupts into chained arcs on impact,
 * zapping every tank in a wide radius and stunning them briefly. Unique
 * 'zap' voice + arcing beam VFX.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';

export class Tesla extends WeaponBase {
  static get DEF() {
    return {
      id: 'tesla',
      name: 'Tesla Coil',
      desc: 'Chain lightning: zaps every tank in a wide radius and stuns them.',
      icon: 'tesla',
      color: '#3ef2ff',
      sound: 'zap',
      damage: 26,
      blastRadius: 150,
      ammo: 2,
      minAngle: 20,
      maxAngle: 160,
      minPower: 35,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#7ff7ff',
      mass: 0.85,
      radius: 4,
      trailColor: '#3ef2ff',
      trailInterval: 0.02,
    });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    // Small containment blast (no crater — electricity doesn't dig).
    Combat.explode({
      game,
      x,
      y,
      radius: 24,
      damage: this.def.damage * 0.4,
      owner: this.tank,
      color: '#3ef2ff',
      shake: 6,
      deform: false,
      craterDepth: 0,
    });
    // Chained arcs to every tank in range.
    const targets = game.tanks.filter(
      (t) => t.alive && t !== this.tank && Math.hypot(t.x - x, t.y - y) < this.def.blastRadius
    );
    for (const t of targets) {
      const dmg = Combat.damageAt(Math.hypot(t.x - x, t.y - y), this.def.blastRadius, this.def.damage, 1.2);
      const destroyed = t.takeDamage(game.masteryDamage(this.tank, this.def.id, dmg));
      game.bus.emit(EVT.TANK_STATS, game._tankStatsPayload(t));
      if (destroyed) {
        game.onTankDestroyed(t, this.tank);
      } else {
        game.settings.recordStat('directHits', 1);
        t.stunned = true; // brief EMP-style stun: next turn skipped
      }
      // Jagged bolt from impact to the target.
      const segs = 5;
      const pts = [{ x, y }];
      for (let i = 1; i <= segs; i++) {
        const k = i / segs;
        pts.push({
          x: x + (t.x - x) * k + (Math.random() - 0.5) * 34,
          y: y + (t.y - t.height * 0.3 - y) * k + (Math.random() - 0.5) * 34,
        });
      }
      for (let i = 0; i < pts.length - 1; i++) {
        game.beams.push({
          x1: pts[i].x, y1: pts[i].y,
          x2: pts[i + 1].x, y2: pts[i + 1].y,
          color: i % 2 ? '#ffffff' : '#3ef2ff',
          width: i % 2 ? 2 : 4,
          life: 0.35, maxLife: 0.35,
        });
      }
    }
    game.particles.explosionBurst({ x, y, radius: 40, color: '#3ef2ff' });
    game.camera.addShake(10);
    game.sound.play('zap', { size: this.def.blastRadius });
  }
}
