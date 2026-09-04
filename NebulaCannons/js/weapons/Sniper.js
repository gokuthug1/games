/**
 * Sniper — a hyper-velocity slug: double launch speed and very high mass,
 * so wind barely curves it. Devastating on direct hits, weak splash.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { Physics } from '../systems/Physics.js';

export class Sniper extends WeaponBase {
  static get DEF() {
    return {
      id: 'sniper',
      name: 'Sniper Round',
      desc: 'Hyper-velocity slug — wind barely touches it. Devastating direct hits.',
      icon: 'sniper',
      color: '#dff7ff',
      sound: 'laser',
      damage: 55,
      blastRadius: 30,
      ammo: 1, // a guaranteed direct hit at 55 — same tier as railgun, once
      minAngle: -5,
      maxAngle: 15,
      minPower: 60,
      maxPower: 100,
    };
  }

  fire(ctx) {
    const { game, tank } = ctx;
    const tip = tank.getBarrelTip();
    const { vx, vy } = Physics.initialVelocity(tank.turret.angle, tank.power);
    game.spawnProjectile({
      pos: { x: tip.x, y: tip.y },
      vel: { x: vx * 2.1, y: vy * 2.1 },
      weaponId: this.def.id,
      owner: tank,
      color: '#ffffff',
      mass: 3.5,
      radius: 3.5,
      maxLife: 6,
      trailColor: '#9fe8ff',
      trailInterval: 0.02,
      onImpact: (hit) => this.onImpact({ game, x: hit.x, y: hit.y, hitTank: hit.tank }, hit),
    });
    tank.turret.recoil = tank.turret.recoilMax;
    game.particles.muzzleFlash(tip.x, tip.y, tank.turret.angle, this.def.color);
    game.sound.play('fire');
  }

  onImpact(ctx) {
    Combat.explode({
      game: ctx.game,
      x: ctx.x,
      y: ctx.y,
      radius: this.def.blastRadius,
      damage: this.def.damage,
      owner: this.tank,
      color: '#9fe8ff',
      shake: 8,
    });
  }
}
