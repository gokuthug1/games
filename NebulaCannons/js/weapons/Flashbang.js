/**
 * Flashbang — a blinding burst: low damage, wide radius, and the enemy's
 * next turn is skipped (stunned). Unique 'flash' voice + full-screen
 * whiteout VFX.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';

export class Flashbang extends WeaponBase {
  static get DEF() {
    return {
      id: 'flash',
      name: 'Flashbang',
      desc: 'Blinding burst — skips the enemy\'s next turn.',
      icon: 'flash',
      color: '#fff4c2',
      sound: 'flash',
      damage: 10,
      blastRadius: 110,
      ammo: 2,
      minAngle: 20,
      maxAngle: 160,
      minPower: 35,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#fff8dc',
      mass: 0.8,
      radius: 4,
      trailColor: '#fff4c2',
      trailInterval: 0.02,
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
      color: '#fff4c2',
      shake: 4,
      deform: false,
      exponent: 2.4, // tiny damage even at close range
    });
    // Stun every enemy caught in the flash.
    for (const t of game.tanks) {
      if (!t.alive || t === this.tank) continue;
      if (Math.hypot(t.x - x, t.y - y) < this.def.blastRadius) t.stunned = true;
    }
    // Bright expanding rings + white flash.
    game.beams.push({ x1: x, y1: y, x2: x, y2: y, color: '#ffffff', width: 90, life: 0.5, maxLife: 0.5 });
    game.beams.push({ x1: x, y1: y, x2: x, y2: y, color: '#fff4c2', width: 60, life: 0.7, maxLife: 0.7 });
    game.beams.push({ x1: x, y1: y, x2: x, y2: y, color: '#ffe9a8', width: 30, life: 0.9, maxLife: 0.9 });
    game.particles.explosionBurst({ x, y, radius: 50, color: '#fff4c2' });
    game.camera.addShake(5);
    game.sound.play('flash');
  }
}
