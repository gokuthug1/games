/**
 * ParticleSystem — object-pooled particle emitter. Pooling avoids garbage
 * collection pressure during heavy explosions; a hard cap keeps the draw
 * cost bounded so frame rate stays at 60fps.
 */

import { Particle } from '../entities/Particle.js';
import { CONFIG } from '../core/Config.js';

export class ParticleSystem {
  constructor(max = CONFIG.PARTICLES.MAX_PARTICLES) {
    this.max = max;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < max; i++) this.pool.push(new Particle());
  }

  _acquire() {
    let p = this.pool.pop();
    if (!p) {
      // Recycle the oldest active particle.
      p = this.active.shift();
    }
    return p;
  }

  /** Spawn one particle from an options object. */
  spawn(o) {
    if (this.active.length >= this.max) return null;
    const p = this._acquire().init(o);
    this.active.push(p);
    return p;
  }

  /**
   * Spawn `count` particles in a directional cone.
   * @param {object} o
   * @param {number} o.x
   * @param {number} o.y
   * @param {number} o.count
   * @param {number} [o.angle] base angle in degrees (0 = east, 90 = up)
   * @param {number} [o.spread=360] cone width in degrees
   * @param {number} [o.speedMin] [o.speedMax] speed range px/s
   */
  burst(o) {
    const count = o.count || 0;
    for (let i = 0; i < count; i++) {
      const angleDeg = (o.angle !== undefined ? o.angle : 90) + (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : 360);
      const speed = o.speedMin + Math.random() * (o.speedMax - o.speedMin);
      const a = (angleDeg * Math.PI) / 180;
      this.spawn({
        x: o.x,
        y: o.y,
        vx: Math.cos(a) * speed,
        vy: -Math.sin(a) * speed,
        grav: o.grav !== undefined ? o.grav : 0,
        drag: o.drag !== undefined ? o.drag : 0,
        life: o.lifeMin + Math.random() * (o.lifeMax - o.lifeMin),
        size0: o.sizeMin || 2,
        size1: o.sizeMax !== undefined ? o.sizeMax : o.sizeMin || 0,
        color0: o.color0 || '#ffffff',
        color1: o.color1 || o.color0 || '#ffffff',
        kind: o.kind || 'glow',
        rot: Math.random() * Math.PI * 2,
        rotVel: o.rotVelMin !== undefined ? o.rotVelMin + Math.random() * (o.rotVelMax || 0) : 0,
        additive: !!o.additive,
      });
    }
  }

  /** Classic explosion burst: fast sparks + slower fire glow. */
  explosionBurst({ x, y, radius, color }) {
    const r = radius;
    this.burst({
      x, y, count: Math.min(26, 10 + Math.ceil(r / 6)),
      speedMin: 60, speedMax: 90 + r * 2.2, grav: 320,
      lifeMin: 0.4, lifeMax: 1.0,
      sizeMin: 5, sizeMax: 14 + r * 0.15,
      color0: '#fff4c2', color1: color,
      kind: 'glow', additive: true,
    });
    this.burst({
      x, y, count: Math.min(18, 6 + Math.ceil(r / 10)),
      speedMin: 20, speedMax: 70, drag: 1.5,
      lifeMin: 0.7, lifeMax: 1.6,
      sizeMin: 6, sizeMax: 22 + r * 0.2,
      color0: color, color1: '#2a1206',
      kind: 'smoke',
    });
    this.burst({
      x, y, count: Math.min(14, 4 + Math.ceil(r / 12)),
      speedMin: 120, speedMax: 260 + r * 1.6, grav: 700,
      lifeMin: 0.5, lifeMax: 1.1,
      sizeMin: 3, sizeMax: 7,
      color0: '#ffd98a', color1: '#ff7a3d',
      kind: 'debris', rotVelMin: -14, rotVelMax: 14,
    });
  }

  /** Rising smoke plume. */
  smokeAt(x, y, count, color = '#8a93ad') {
    this.burst({
      x, y, count,
      angle: 90, spread: 50,
      speedMin: 8, speedMax: 34, grav: -55, drag: 1.2,
      lifeMin: 0.8, lifeMax: 1.8,
      sizeMin: 7, sizeMax: 26,
      color0: color, color1: '#20242f',
      kind: 'smoke',
    });
  }

  /** Fired-weapon muzzle flash. */
  muzzleFlash(x, y, angleDeg, color) {
    this.burst({
      x, y, count: 10,
      angle: angleDeg, spread: 42,
      speedMin: 40, speedMax: 160, drag: 3,
      lifeMin: 0.12, lifeMax: 0.3,
      sizeMin: 3, sizeMax: 8,
      color0: '#fffbe8', color1: color,
      kind: 'glow', additive: true,
    });
    this.burst({
      x, y, count: 6,
      angle: angleDeg, spread: 46,
      speedMin: 12, speedMax: 40, grav: -30,
      lifeMin: 0.3, lifeMax: 0.6,
      sizeMin: 4, sizeMax: 10,
      color0: '#aab3c8', color1: '#4a5166',
      kind: 'smoke',
    });
  }

  /** Debris kicked up while a tank drives. */
  trackDust(x, y) {
    this.burst({
      x, y, count: 1,
      angle: 90, spread: 30,
      speedMin: 6, speedMax: 18, grav: -25,
      lifeMin: 0.25, lifeMax: 0.5,
      sizeMin: 2, sizeMax: 5,
      color0: '#6a718a', color1: '#333a52',
      kind: 'smoke',
    });
  }

  /** Contrail for a fired projectile. */
  trail(x, y, color) {
    this.spawn({
      x, y, vx: 0, vy: 0, grav: 0,
      life: 0.28, size0: 4.5, size1: 0.5,
      color0: color, color1: 'rgba(255,255,255,0.1)',
      kind: 'glow', additive: true,
    });
  }

  /** Wreck smoke after a tank is destroyed. */
  wreckSmoke(x, y) {
    this.burst({
      x, y, count: 14,
      angle: 90, spread: 120,
      speedMin: 10, speedMax: 45, grav: -40, drag: 1.5,
      lifeMin: 1.2, lifeMax: 2.6,
      sizeMin: 8, sizeMax: 26,
      color0: '#3a3f4e', color1: '#14161f',
      kind: 'smoke',
    });
  }

  update(dt) {
    const act = this.active;
    for (let i = act.length - 1; i >= 0; i--) {
      const p = act[i];
      p.update(dt);
      if (!p.alive) {
        act.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  draw(ctx) {
    for (const p of this.active) p.draw(ctx);
  }

  clear() {
    for (const p of this.active) {
      p.alive = false;
      this.pool.push(p);
    }
    this.active.length = 0;
  }
}
