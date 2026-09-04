/**
 * Splitter — the shell divides mid-flight into three smaller shells that
 * continue on slightly different trajectories. Great against tanks hiding
 * behind ridges.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';

const SPLIT_DISTANCE = 460;
const SUB_COUNT = 3;
const SUB_DAMAGE = 15;
const SUB_RADIUS = 36;
const SPREAD_DEG = 15;

export class Splitter extends WeaponBase {
  static get DEF() {
    return {
      id: 'splitter',
      name: 'Splitter',
      desc: 'Splits into 3 shells mid-flight. Perfect for ridgeline cover.',
      icon: 'splitter',
      color: '#c49bff',
      sound: 'pop',
      damage: 20,
      blastRadius: 40,
      ammo: 3,
      minAngle: 15,
      maxAngle: 165,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#c49bff',
      mass: 1,
      splitDistance: SPLIT_DISTANCE,
      trailColor: '#c49bff',
      onSplit: (splitCtx) => this._split(splitCtx),
    });
  }

  _split({ game, projectile }) {
    const { x, y } = projectile.pos;
    const baseAngle = Math.atan2(-projectile.vel.y, projectile.vel.x) * (180 / Math.PI);
    const speed = Math.hypot(projectile.vel.x, projectile.vel.y) * 0.9;

    for (let i = 0; i < SUB_COUNT; i++) {
      const spread = (i - (SUB_COUNT - 1) / 2) * SPREAD_DEG;
      const a = ((baseAngle + spread) * Math.PI) / 180;
      game.spawnProjectile({
        pos: { x, y },
        vel: { vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed },
        weaponId: this.def.id,
        owner: this.tank,
        color: '#e0ccff',
        mass: 0.85,
        radius: 4,
        maxLife: 6,
        trailColor: '#c49bff',
        trailInterval: 0.025,
        onImpact: (hit) =>
          Combat.explode({
            game,
            x: hit.x,
            y: hit.y,
            radius: SUB_RADIUS,
            damage: SUB_DAMAGE,
            owner: this.tank,
            color: '#c49bff',
            shake: 5,
          }),
      });
    }
    // Tiny puff where the split happened.
    game.particles.smokeAt(x, y, 6, '#b79ae8');
    game.sound.play('split');
  }

  onImpact(ctx) {
    Combat.explode({
      game: ctx.game,
      x: ctx.x,
      y: ctx.y,
      radius: this.def.blastRadius,
      damage: this.def.damage,
      owner: this.tank,
      color: this.def.color,
      shake: 8,
    });
  }
}
