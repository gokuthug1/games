/**
 * Plasma — a heavy superheated shell. Modest blast, but massive
 * knockback that shoves tanks off ledges. Unique 'plasma' voice +
 * green glow VFX.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';

export class Plasma extends WeaponBase {
  static get DEF() {
    return {
      id: 'plasma',
      name: 'Plasma Mortar',
      desc: 'Heavy blast with huge knockback — shoves tanks off ledges.',
      icon: 'plasma',
      color: '#7dff8a',
      sound: 'plasma',
      damage: 32,
      blastRadius: 55,
      ammo: 3,
      minAngle: 10,
      maxAngle: 170,
      minPower: 35,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#a8ffb2',
      mass: 1.25, // heavy: resists wind
      radius: 5,
      trailColor: '#7dff8a',
      trailInterval: 0.025,
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
      color: '#7dff8a',
      shake: 12,
      exponent: 1.4,
    });
    // Heavy knockback: push every tank in radius away from the blast.
    for (const t of game.tanks) {
      if (!t.alive || t === this.tank && !game.settings.get('selfDamage')) continue;
      const dx = t.x - x;
      const dy = t.y - y;
      const d = Math.hypot(dx, dy);
      if (d >= this.def.blastRadius || d === 0) continue;
      const push = (1 - d / this.def.blastRadius) * 170;
      t.x += (dx / d) * push;
      t.y += Math.max(-26, (dy / d) * push * 0.4);
      t.restOn(game.terrain);
      game.bus.emit(EVT.TANK_STATS, game._tankStatsPayload(t));
    }
    // Ring shockwave.
    game.beams.push({ x1: x, y1: y, x2: x, y2: y, color: '#7dff8a', width: 70, life: 0.4, maxLife: 0.4 });
    game.particles.explosionBurst({ x, y, radius: this.def.blastRadius, color: '#7dff8a' });
    game.sound.play('plasma', { size: this.def.blastRadius });
  }
}
