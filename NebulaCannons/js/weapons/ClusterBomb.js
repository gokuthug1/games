/**
 * ClusterBomb — a shell that bursts into a shower of small bomblets on
 * impact. Spread damage across a wide area; each bomblet explodes with its
 * own small crater.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { Physics } from '../systems/Physics.js';

const BOMMELET_COUNT = 6;
const BOMMELET_DAMAGE = 13;
const BOMMELET_RADIUS = 30;

export class ClusterBomb extends WeaponBase {
  static get DEF() {
    return {
      id: 'cluster',
      name: 'Cluster Bomb',
      desc: 'Breaks into 6 bomblets on impact. Great area coverage.',
      icon: 'cluster',
      color: '#7ee8ff',
      sound: 'pop',
      damage: 20,
      blastRadius: 42,
      ammo: 3,
      minAngle: 20,
      maxAngle: 160,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, { color: this.def.color, mass: 1.05 });
  }

  onImpact(ctx, hit) {
    const { game, x, y } = ctx;

    // Small initial burst so the bomblets spray out of a real blast.
    Combat.explode({
      game,
      x,
      y,
      radius: 34,
      damage: this.def.damage * 0.5,
      owner: this.tank,
      color: this.def.color,
      shake: 7,
    });

    // Scatter bomblets into the upper hemisphere.
    for (let i = 0; i < BOMMELET_COUNT; i++) {
      const angle = 20 + (i / Math.max(1, BOMMELET_COUNT - 1)) * 140; // 20..160 deg
      const speed = 150 + Math.random() * 120;
      const a = (angle * Math.PI) / 180;
      game.spawnProjectile({
        pos: { x: x + Math.cos(a) * 8, y: y - Math.sin(a) * 8 },
        vel: { vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed },
        weaponId: this.def.id,
        owner: this.tank,
        color: '#9fe8ff',
        mass: 0.7,
        radius: 3.5,
        maxLife: 3.5,
        trailColor: '#9fe8ff',
        trailInterval: 0.02,
        onImpact: (bHit) =>
          Combat.explode({
            game,
            x: bHit.x,
            y: bHit.y,
            radius: BOMMELET_RADIUS,
            damage: BOMMELET_DAMAGE,
            owner: this.tank,
            color: '#7ee8ff',
            shake: 4,
            craterDepth: BOMMELET_RADIUS * 0.35,
          }),
      });
    }
  }
}
