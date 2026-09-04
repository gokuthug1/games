/**
 * Nuke — the big one. Massive blast radius, enormous crater, heavy shake.
 * One shot per match; genuinely dangerous to fire at close range.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

export class Nuke extends WeaponBase {
  static get DEF() {
    return {
      id: 'nuke',
      name: 'Nuke',
      desc: 'Obliterates the map. One shot only — don\'t stand near it.',
      icon: 'nuke',
      color: '#ff8f4d',
      sound: 'bomb',
      damage: 60,
      blastRadius: 150,
      ammo: 1,
      minAngle: 30,
      maxAngle: 150,
      minPower: 45,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, { color: '#ffb37a', mass: 1.25, radius: 7 });
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
      color: '#ff8f4d',
      shake: 30,
      craterDepth: 95,
      exponent: 1.2, // slower falloff — hurts everything nearby
    });
    // Long-lived fireball core handled by particles + shake already.
    game.particles.smokeAt(x, y - 60, 18, '#5b2c12');
  }
}
