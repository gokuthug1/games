/**
 * Bouncer — a shell that ricochets off terrain up to 3 times before
 * exploding. Arcing shots can bounce over ridges into cover.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

export class Bouncer extends WeaponBase {
  static get DEF() {
    return {
      id: 'bouncer',
      name: 'Bouncer',
      desc: 'Ricochets off terrain up to 3 times before detonating.',
      icon: 'bouncer',
      color: '#ffd166',
      sound: 'bounce',
      damage: 24,
      blastRadius: 46,
      ammo: 4,
      minAngle: -20,
      maxAngle: 200,
      minPower: 20,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#ffd166',
      mass: 1.1,
      radius: 5.5,
      bouncesLeft: 3,
      bounceFactor: 0.55,
      trailColor: '#ffd166',
      maxLife: 12,
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
      shake: 8,
    });
  }
}
