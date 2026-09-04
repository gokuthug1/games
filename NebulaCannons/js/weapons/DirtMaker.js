/**
 * DirtMaker — a terrain-shaping round. Raises a mound instead of carving a
 * crater and deals almost no damage. Use it to build cover or bury a foe.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { CONFIG } from '../core/Config.js';

export class DirtMaker extends WeaponBase {
  static get DEF() {
    return {
      id: 'dirtmaker',
      name: 'Dirt Maker',
      desc: 'Piles up terrain where it lands. Build cover, redirect shots.',
      icon: 'dirt',
      color: '#c9a06a',
      sound: 'dirt',
      damage: 3,
      blastRadius: 34,
      ammo: 5,
      minAngle: 10,
      maxAngle: 170,
      minPower: 25,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, { color: '#d8b57e', mass: 1.6, radius: 6 });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    // Build the mound (raises the heightmap — the collision surface).
    game.terrain.raise(x, 64, 26);
    game.terrain.markDirty();

    // Tiny dust burst, minimal damage.
    game.particles.burst({
      x, y, count: 16,
      speedMin: 20, speedMax: 90, grav: 240,
      lifeMin: 0.4, lifeMax: 0.9,
      sizeMin: 3, sizeMax: 7,
      color0: '#c9a06a', color1: '#6b4f2c',
      kind: 'debris', rotVelMin: -10, rotVelMax: 10,
    });
    game.particles.smokeAt(x, y - 12, 8, '#8a7a5c');
    game.sound.play('thud');

    if (CONFIG.WEAPONS.dirtMakerDamage === true) {
      Combat.explode({
        game, x, y,
        radius: this.def.blastRadius,
        damage: this.def.damage,
        owner: this.tank,
        color: '#c9a06a',
        shake: 3,
        deform: false, // mound already built above
      });
    }
  }
}
