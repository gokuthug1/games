/**
 * Shield — projects a defensive bubble that absorbs 60 damage before the
 * tank's health is touched. One-shot, no projectile: the whole turn is the
 * shield-up action.
 */

import { WeaponBase } from './WeaponBase.js';

export class Shield extends WeaponBase {
  static get DEF() {
    return {
      id: 'shield',
      name: 'Shield',
      desc: 'Projects a defensive bubble that absorbs 60 damage.',
      icon: 'shield',
      color: '#3ef2ff',
      sound: 'shield',
      damage: 0,
      blastRadius: 0,
      ammo: 1,
      minAngle: -40,
      maxAngle: 220,
      minPower: 10,
      maxPower: 100,
    };
  }

  fire(ctx) {
    const { game, tank } = ctx;
    tank.shield = Math.max(tank.shield, 60);
    tank.turret.recoil = tank.turret.recoilMax;
    game.particles.burst({
      x: tank.x, y: tank.y - tank.height * 0.1, count: 18, kind: 'smoke',
      color0: '#7ef2ff', color1: '#2a6a8a',
      speedMin: 10, speedMax: 70, lifeMin: 0.4, lifeMax: 0.9,
      sizeMin: 2, sizeMax: 5, grav: 0,
    });
    game.sound.play('click');
    game.ui.toast('Shield up — absorbs 60 damage');
  }

  onImpact() {
    // No projectile.
  }
}
