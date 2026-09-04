/**
 * Drone — the "AI bot". Deploys a combat drone that lands near the impact
 * point, arms itself, then plays a mini-turn: it solves and fires a shot
 * with a random other weapon on the player's behalf.
 */

import { WeaponBase } from './WeaponBase.js';
import { Physics } from '../systems/Physics.js';

const DRONE_POOL = [
  'cannon', 'cluster', 'bouncer', 'splitter', 'fireball',
  'cryo', 'leech', 'barrage', 'homing', 'sniper',
];

export class Drone extends WeaponBase {
  static get DEF() {
    return {
      id: 'drone',
      name: 'Drone',
      desc: 'Deploys a combat drone that fires a random weapon on your behalf.',
      icon: 'drone',
      color: '#9ef25a',
      sound: 'drone',
      damage: 0,
      blastRadius: 0,
      ammo: 1,
      minAngle: -20,
      maxAngle: 200,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    const { game, tank } = ctx;
    const tip = tank.getBarrelTip();
    const { vx, vy } = Physics.initialVelocity(tank.turret.angle, tank.power);
    game.spawnProjectile({
      pos: { x: tip.x, y: tip.y },
      vel: { x: vx, y: vy },
      weaponId: this.def.id,
      owner: tank,
      color: '#b8ff8a',
      mass: 1.2,
      radius: 5,
      maxLife: 8,
      trailColor: '#9ef25a',
      onImpact: (hit) => this._deploy(ctx, hit),
    });
    tank.turret.recoil = tank.turret.recoilMax;
    game.particles.muzzleFlash(tip.x, tip.y, tank.turret.angle, this.def.color);
    game.sound.play('fire');
  }

  _deploy(ctx, hit) {
    const { game } = ctx;
    const weaponId = DRONE_POOL[Math.floor(Math.random() * DRONE_POOL.length)];
    const def = game.weaponDef(weaponId) || { damage: 24, blastRadius: 46 };
    // Land beside the impact point, biased toward the enemy.
    const enemy = game.tanks.find((t) => t !== this.tank && t.alive);
    const side = enemy ? Math.sign(enemy.x - hit.x) || 1 : 1;
    const x = Math.max(40, Math.min(game.terrain.width - 40, hit.x + side * 70));
    game.companions.push({
      x,
      y: game.terrain.heightAt(x),
      owner: this.tank,
      weaponId,
      color: '#9ef25a',
      mass: 1.0,
      damage: def.damage || 24,
      radius: def.blastRadius || 46,
      timer: 1.1,
      done: false,
      rot: side > 0 ? 0 : Math.PI,
    });
    game.particles.smokeAt(x, game.terrain.heightAt(x), 10, '#9ef25a');
    game.sound.play('thud');
  }

  onImpact() {
    // The drone deploys on impact instead of exploding.
  }
}
