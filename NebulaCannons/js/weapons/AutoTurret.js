/**
 * AutoTurret — deploys a small turret that stays on the battlefield and
 * fires one aimed shell at the enemy at the start of each of the owner's
 * turns, until it is destroyed by an enemy shell.
 */

import { WeaponBase } from './WeaponBase.js';
import { clamp } from '../utils/MathUtils.js';

export class AutoTurret extends WeaponBase {
  static get DEF() {
    return {
      id: 'turret',
      name: 'Auto-Turret',
      desc: 'Deploys a turret that fires at the enemy at the start of each of your turns.',
      icon: 'turret',
      color: '#7ee8ff',
      sound: 'turret',
      damage: 0,
      blastRadius: 0,
      ammo: 1,
      minAngle: -30,
      maxAngle: 210,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#bff2ff',
      mass: 1.4,
      radius: 5,
      trailColor: '#7ee8ff',
    });
  }

  onImpact(ctx) {
    const { game, x } = ctx;
    if (game.turrets.filter((t) => t.alive).length >= 3) {
      game.ui.toast('Max 3 turrets on the field');
      return;
    }
    const px = clamp(x, 30, game.terrain.width - 30);
    game.turrets.push({
      x: px,
      y: game.terrain.heightAt(px) - 6,
      owner: this.tank,
      alive: true,
      hp: 40,
      cooldown: 0,
    });
    game.particles.smokeAt(px, game.terrain.heightAt(px), 10, '#7ee8ff');
    game.sound.play('thud');
  }
}
