/**
 * Explosion — the visual/animation side of a blast.
 * Damage and terrain deformation are handled by the Combat system; this
 * entity only animates the flash, expanding shockwave ring and core.
 */

import { CONFIG } from '../core/Config.js';
import { easeOutCubic } from '../utils/MathUtils.js';

const TAU = Math.PI * 2;

export class Explosion {
  /**
   * @param {object} o
   * @param {number} o.x
   * @param {number} o.y
   * @param {number} o.radius max visual radius px
   * @param {number} o.duration seconds
   * @param {string} o.color
   */
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.radius = o.radius || 40;
    this.duration = o.duration || 0.55;
    this.color = o.color || CONFIG.COLORS.ACCENT;
    this.time = 0;
    this.done = false;
  }

  update(dt) {
    this.time += dt;
    if (this.time >= this.duration) this.done = true;
  }

  draw(ctx) {
    const t = Math.min(1, this.time / this.duration);
    const p = easeOutCubic(t);
    const r = this.radius * p;

    // Expanding shockwave ring.
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1.5, 6 * (1 - t));
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.stroke();

    // Hot core flash, brightest at the start.
    const core = 1 - t;
    if (core > 0) {
      ctx.globalAlpha = core * 0.85;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 0.7);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, this.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
