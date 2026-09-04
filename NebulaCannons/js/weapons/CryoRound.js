/**
 * CryoRound — flash-freezes the target: modest damage plus a total fuel
 * drain, leaving the enemy immobilized for their next turn.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

export class CryoRound extends WeaponBase {
  static get DEF() {
    return {
      id: 'cryo',
      name: 'Cryo Round',
      desc: 'Flash-freezes the target — damages and drains all its fuel.',
      icon: 'cryo',
      color: '#7ee8ff',
      sound: 'cryo',
      damage: 18,
      blastRadius: 44,
      ammo: 2,
      minAngle: 15,
      maxAngle: 165,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#bff2ff',
      mass: 1.1,
      radius: 5,
      trailColor: '#7ee8ff',
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
      color: '#7ee8ff',
      shake: 7,
      deform: false,
    });
    for (const t of game.tanks) {
      if (!t.alive || t === this.tank) continue;
      if (Math.hypot(t.x - x, t.y - y) < this.def.blastRadius) t.fuel = 0;
    }
    game.particles.burst({
      x, y, count: 12, kind: 'smoke',
      color0: '#dff7ff', color1: '#7ec9e8',
      speedMin: 14, speedMax: 60, lifeMin: 0.3, lifeMax: 0.8,
      sizeMin: 3, sizeMax: 7, grav: -5,
    });
  }
}
