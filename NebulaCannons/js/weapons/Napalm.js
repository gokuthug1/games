/**
 * Napalm — splashes a burning fuel pool that keeps damaging any tank
 * standing in it for several seconds. Area denial. Unique 'whoosh'
 * voice + flickering fire VFX.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';

export class Napalm extends WeaponBase {
  static get DEF() {
    return {
      id: 'napalm',
      name: 'Napalm',
      desc: 'Ignites a burning pool that damages tanks standing in it.',
      icon: 'napalm',
      color: '#ff7a3d',
      sound: 'whoosh',
      damage: 14, // upfront splash
      blastRadius: 46,
      ammo: 2,
      minAngle: 20,
      maxAngle: 160,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#ffb37a',
      mass: 0.9,
      radius: 4,
      trailColor: '#ff7a3d',
    });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    // Small upfront splash so a direct hit still stings.
    Combat.explode({
      game,
      x,
      y,
      radius: 26,
      damage: this.def.damage,
      owner: this.tank,
      color: '#ff7a3d',
      shake: 5,
      craterDepth: 12,
    });
    // Persistent burning zone (existing fire-zone system).
    game.fireZones.push({
      x,
      y: y - 6,
      radius: this.def.blastRadius,
      dps: 10,
      life: 6,
      burnTimer: 0,
      owner: this.tank,
    });
    game.particles.explosionBurst({ x, y, radius: this.def.blastRadius, color: '#ff7a3d' });
    game.camera.addShake(6);
    game.sound.play('whoosh', { size: this.def.blastRadius });
  }
}
