/**
 * Airstrike — a marker shell lands, then a strike plane sweeps across the
 * sky dropping five bombs down a vertical column at the mark.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { clamp } from '../utils/MathUtils.js';

export class Airstrike extends WeaponBase {
  static get DEF() {
    return {
      id: 'airstrike',
      name: 'Airstrike',
      desc: 'Calls in a strike plane that carpet-bombs a column.',
      icon: 'airstrike',
      color: '#ffe14d',
      sound: 'missile',
      damage: 16,
      blastRadius: 42,
      ammo: 1,
      minAngle: 30,
      maxAngle: 150,
      minPower: 40,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#ffe9a8',
      mass: 1.0,
      radius: 4.5,
      trailColor: '#ffe14d',
    });
  }

  onImpact(ctx) {
    const { game, x, y } = ctx;
    const markX = clamp(x, 200, game.terrain.width - 200);

    // Five bombs dropped down the column, staggered in time.
    for (let i = 0; i < 5; i++) {
      game.after(1.0 + i * 0.35, () => {
        const bx = clamp(markX + (i - 2) * 140, 30, game.terrain.width - 30);
        game.spawnProjectile({
          pos: { x: bx, y: y - 950 },
          vel: { x: 0, y: 620 },
          weaponId: this.def.id,
          owner: this.tank,
          color: '#ffd166',
          mass: 0.8,
          radius: 4,
          maxLife: 4,
          trailColor: '#ff8a3d',
          trailInterval: 0.02,
          onImpact: (hit) =>
            Combat.explode({
              game,
              x: hit.x,
              y: hit.y,
              radius: this.def.blastRadius,
              damage: this.def.damage,
              owner: this.tank,
              color: '#ff8a3d',
              shake: 5,
            }),
        });
        game.sound.play('fire');
      });
    }

    // Plane streak visual.
    const dir = markX > game.terrain.width / 2 ? -1 : 1;
    const startX = dir > 0 ? -260 : game.terrain.width + 260;
    const endX = dir > 0 ? game.terrain.width + 260 : -260;
    game.beams.push({
      x1: startX, y1: y - 700, x2: endX, y2: y - 700,
      color: '#ffe14d', width: 3, life: 2.6, maxLife: 2.6,
    });
    game.particles.smokeAt(markX, game.terrain.heightAt(markX), 12, '#ffe14d');
    game.sound.play('split');
  }
}
