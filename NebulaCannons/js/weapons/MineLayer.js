/**
 * MineLayer — lobs a proximity mine that persists on the terrain and
 * detonates when any tank (enemy, or self with self-damage on) gets close.
 * Mines last until triggered or the match ends.
 */

import { WeaponBase } from './WeaponBase.js';
import { clamp } from '../utils/MathUtils.js';

export class MineLayer extends WeaponBase {
  static get DEF() {
    return {
      id: 'mine',
      name: 'Proximity Mine',
      desc: 'Lobs a mine that detonates when any tank gets close — even later turns.',
      icon: 'mine',
      color: '#ffd166',
      sound: 'mine',
      damage: 30,
      blastRadius: 46,
      ammo: 2,
      minAngle: -15,
      maxAngle: 195,
      minPower: 20,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#e8e2c9',
      mass: 1.3,
      radius: 5,
      trailColor: '#ffd166',
    });
  }

  onImpact(ctx) {
    const { game, x } = ctx;
    if (game.mines.filter((m) => !m.detonated).length >= 6) {
      game.ui.toast('Max 6 mines on the field');
      return;
    }
    const px = clamp(x, 30, game.terrain.width - 30);
    game.mines.push({
      x: px,
      y: game.terrain.heightAt(px),
      owner: this.tank,
      triggerRadius: 30,
      detonated: false,
    });
    game.particles.burst({
      x: px, y: game.terrain.heightAt(px), count: 8, kind: 'smoke',
      color0: '#9aa7c7', color1: '#4a5366',
      speedMin: 8, speedMax: 34, lifeMin: 0.2, lifeMax: 0.5,
      sizeMin: 3, sizeMax: 6, grav: -30,
    });
    game.sound.play('thud');
  }
}
