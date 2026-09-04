/**
 * EmpWave — an electromagnetic pulse that damages enemies in a wide radius
 * and stuns them: their next turn is skipped entirely.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

export class EmpWave extends WeaponBase {
  static get DEF() {
    return {
      id: 'emp',
      name: 'EMP Wave',
      desc: 'Shocks the enemy — their next turn is skipped.',
      icon: 'emp',
      color: '#c14dff',
      sound: 'zap',
      damage: 22,
      blastRadius: 70,
      ammo: 1,
      minAngle: 20,
      maxAngle: 160,
      minPower: 35,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#e0b3ff',
      mass: 1.1,
      radius: 6,
      trailColor: '#c14dff',
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
      color: '#c14dff',
      shake: 10,
      deform: false,
    });
    for (const t of game.tanks) {
      if (!t.alive || t === this.tank) continue;
      if (Math.hypot(t.x - x, t.y - y) < this.def.blastRadius) t.stunned = true;
    }
    // Electric arcs.
    game.beams.push({ x1: x - 90, y1: y - 100, x2: x + 90, y2: y - 100, color: '#c14dff', width: 6, life: 0.4, maxLife: 0.4 });
    game.beams.push({ x1: x - 80, y1: y - 140, x2: x - 80, y2: y - 60, color: '#e0b3ff', width: 3, life: 0.4, maxLife: 0.4 });
    game.beams.push({ x1: x + 70, y1: y - 150, x2: x + 70, y2: y - 70, color: '#e0b3ff', width: 3, life: 0.4, maxLife: 0.4 });
  }
}
