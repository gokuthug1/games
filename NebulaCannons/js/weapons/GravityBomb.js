/**
 * GravityBomb — an explosion that drags enemy tanks toward the crater,
 * repositioning them (and their next shot's angles) as well as damaging.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { clamp } from '../utils/MathUtils.js';

const PULL_RADIUS = 1.5;

export class GravityBomb extends WeaponBase {
  static get DEF() {
    return {
      id: 'gravity',
      name: 'Gravity Bomb',
      desc: 'Blast that drags the enemy toward the crater.',
      icon: 'gravity',
      color: '#6ea8ff',
      sound: 'gravity',
      damage: 24,
      blastRadius: 60,
      ammo: 2,
      minAngle: 25,
      maxAngle: 155,
      minPower: 35,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#a8c8ff',
      mass: 1.15,
      radius: 5.5,
      trailColor: '#6ea8ff',
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
      color: '#6ea8ff',
      shake: 10,
    });
    // Pull enemies toward the center (reverse knockback).
    for (const t of game.tanks) {
      if (!t.alive || t === this.tank) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < this.def.blastRadius * PULL_RADIUS && d > 4) {
        const pull = (1 - d / (this.def.blastRadius * PULL_RADIUS)) * 95;
        t.x = clamp(t.x - ((t.x - x) / d) * pull, 30, game.terrain.width - 30);
        t.restOn(game.terrain);
      }
    }
    game.particles.burst({
      x, y, count: 14, kind: 'smoke',
      color0: '#6ea8ff', color1: '#2a4d8a',
      speedMin: 20, speedMax: 90, lifeMin: 0.3, lifeMax: 0.7,
      sizeMin: 4, sizeMax: 9, grav: -10,
    });
  }
}
