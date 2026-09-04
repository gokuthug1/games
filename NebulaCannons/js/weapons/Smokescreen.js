/**
 * Smokescreen — blankets an area in thick smoke for several seconds. Tanks
 * inside are hidden, and the AI's aim is badly degraded when its target is
 * obscured. No direct damage — pure utility.
 */

import { WeaponBase } from './WeaponBase.js';

export class Smokescreen extends WeaponBase {
  static get DEF() {
    return {
      id: 'smoke',
      name: 'Smokescreen',
      desc: 'Blankets the area in smoke — blinds the AI and hides tanks.',
      icon: 'smoke',
      color: '#c8d2e8',
      sound: 'smoke',
      damage: 0,
      blastRadius: 0,
      ammo: 2,
      minAngle: 10,
      maxAngle: 170,
      minPower: 25,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#e8eef8',
      mass: 1.0,
      radius: 5,
      trailColor: '#c8d2e8',
    });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    game.smokeZones.push({ x, y: y - 6, radius: 95, life: 6 });
    for (let i = 0; i < 14; i++) {
      game.after(0.05 * i, () => {
        game.particles.burst({
          x: x + (Math.random() - 0.5) * 70,
          y: y - 10,
          count: 2,
          kind: 'smoke',
          color0: '#d5dce8',
          color1: '#7c8499',
          speedMin: 6, speedMax: 26,
          lifeMin: 0.8, lifeMax: 1.8,
          sizeMin: 8, sizeMax: 18, grav: -8,
        });
      });
    }
    game.sound.play('thud');
  }
}
