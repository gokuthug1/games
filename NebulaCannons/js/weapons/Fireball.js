/**
 * Fireball — an incendiary shell that leaves burning ground behind.
 * The fire zone deals damage over time to any tank standing in it.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

export class Fireball extends WeaponBase {
  static get DEF() {
    return {
      id: 'fireball',
      name: 'Fireball',
      desc: 'Incendiary burst — burning ground damages anything standing in it.',
      icon: 'fireball',
      color: '#ff8a3d',
      sound: 'whoosh',
      damage: 22,
      blastRadius: 55,
      ammo: 2,
      minAngle: 15,
      maxAngle: 165,
      minPower: 35,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#ffb37a',
      mass: 1.05,
      radius: 6,
      trailColor: '#ff8a3d',
    });
  }

  onImpact(ctx) {
    Combat.explode({
      game: ctx.game,
      x: ctx.x,
      y: ctx.y,
      radius: 40,
      damage: this.def.damage,
      owner: this.tank,
      color: '#ff8a3d',
      shake: 8,
    });
    ctx.game.fireZones.push({
      x: ctx.x,
      y: ctx.y - 4,
      radius: this.def.blastRadius,
      dps: 11,
      life: 3.6,
      burnTimer: 0,
      owner: this.tank,
    });
  }
}
