/**
 * Cannon — the reliable standard shell. Medium damage, modest blast,
 * unlimited ammo. The baseline weapon every tank carries.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

export class Cannon extends WeaponBase {
  static get DEF() {
    return {
      id: 'cannon',
      name: 'Cannon',
      desc: 'The reliable classic. Balanced damage, unlimited ammo.',
      icon: 'cannon',
      color: '#ffe14d',
      damage: 28,
      blastRadius: 52,
      ammo: Infinity,
      minAngle: -40,
      maxAngle: 220,
      minPower: 10,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, { color: this.def.color });
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
