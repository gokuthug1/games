/**
 * Barrage — three mortar shells fired in quick succession with a slight
 * spread, saturating an area.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { Physics } from '../systems/Physics.js';
import { CONFIG } from '../core/Config.js';
import { clamp } from '../utils/MathUtils.js';

export class Barrage extends WeaponBase {
  static get DEF() {
    return {
      id: 'barrage',
      name: 'Mortar Barrage',
      desc: 'Fires 3 shells in quick succession with slight spread.',
      icon: 'barrage',
      color: '#ffb04d',
      sound: 'missile',
      damage: 20,
      blastRadius: 40,
      ammo: 1,
      minAngle: 40,
      maxAngle: 140,
      minPower: 40,
      maxPower: 100,
    };
  }

  fire(ctx) {
    const { game, tank } = ctx;
    const tip = tank.getBarrelTip();
    for (let i = 0; i < 3; i++) {
      game.after(i * 0.35, () => {
        const angle = tank.turret.angle + (i - 1) * 2.5;
        const power = clamp(
          tank.power + (i - 1) * 4,
          CONFIG.PHYSICS.POWER_MIN,
          CONFIG.PHYSICS.POWER_MAX
        );
        const { vx, vy } = Physics.initialVelocity(angle, power);
        game.spawnProjectile({
          pos: { x: tip.x, y: tip.y },
          vel: { x: vx, y: vy },
          weaponId: this.def.id,
          owner: tank,
          color: '#ffd07a',
          mass: 1,
          radius: 5,
          maxLife: 8,
          trailColor: this.def.color,
          onImpact: (hit) => this._shell(ctx, hit),
        });
        game.sound.play('fire');
      });
    }
    game.particles.muzzleFlash(tip.x, tip.y, tank.turret.angle, this.def.color);
    game.sound.play('click');
  }

  _shell(ctx, hit) {
    Combat.explode({
      game: ctx.game,
      x: hit.x,
      y: hit.y,
      radius: this.def.blastRadius,
      damage: this.def.damage,
      owner: this.tank,
      color: this.def.color,
      shake: 6,
    });
  }

  onImpact(ctx) {
    this._shell(ctx, ctx);
  }
}
