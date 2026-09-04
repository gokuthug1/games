/**
 * Particle — one pooled particle. Instances are recycled by the
 * ParticleSystem, so hot loops never allocate.
 *
 * kinds:
 *   'glow'  — additive radial blob (fire, sparks)
 *   'smoke' — soft dark circle that grows and fades
 *   'debris'— rotating rect that falls with gravity
 *   'dot'   — plain fading circle
 */

import { Vector2 } from '../utils/Vector2.js';
import { lerp } from '../utils/MathUtils.js';

const TAU = Math.PI * 2;

export class Particle {
  constructor() {
    this.alive = false;
    this.pos = new Vector2();
    this.vel = new Vector2();
    this.grav = 0;
    this.drag = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size0 = 2;
    this.size1 = 0;
    this.color0 = '#fff';
    this.color1 = '#000';
    this.kind = 'glow';
    this.rot = 0;
    this.rotVel = 0;
    this.additive = false;
  }

  /** (Re)initialize a particle from the pool. */
  init(o) {
    this.alive = true;
    this.pos.set(o.x, o.y);
    this.vel.set(o.vx || 0, o.vy || 0);
    this.grav = o.grav || 0;
    this.drag = o.drag !== undefined ? o.drag : 0;
    this.life = 0;
    this.maxLife = o.life || 1;
    this.size0 = o.size0 || 2;
    this.size1 = o.size1 !== undefined ? o.size1 : o.size0 || 0;
    this.color0 = o.color0 || '#ffffff';
    this.color1 = o.color1 || this.color0;
    this.kind = o.kind || 'glow';
    this.rot = o.rot || 0;
    this.rotVel = o.rotVel || 0;
    this.additive = !!o.additive;
    return this;
  }

  update(dt) {
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.alive = false;
      return;
    }
    this.vel.x -= this.vel.x * this.drag * dt;
    this.vel.y -= this.vel.y * this.drag * dt;
    this.vel.y += this.grav * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.rot += this.rotVel * dt;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    const alpha = 1 - t;
    const size = lerp(this.size0, this.size1, t);
    if (size <= 0.05 || alpha <= 0.01) return;

    ctx.globalAlpha = alpha;
    if (this.additive) ctx.globalCompositeOperation = 'lighter';

    if (this.kind === 'smoke') {
      ctx.fillStyle = this.color0;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, size, 0, TAU);
      ctx.fill();
    } else if (this.kind === 'debris') {
      ctx.save();
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(this.rot);
      ctx.fillStyle = this.color0;
      ctx.fillRect(-size / 2, -size / 2, size, size * 0.7);
      ctx.restore();
    } else if (this.kind === 'dot') {
      ctx.fillStyle = this.color0;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, size, 0, TAU);
      ctx.fill();
    } else {
      // glow
      const grad = ctx.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, Math.max(0.5, size));
      grad.addColorStop(0, this.color0);
      grad.addColorStop(0.4, this.color1);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, Math.max(0.5, size), 0, TAU);
      ctx.fill();
    }

    if (this.additive) ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}
