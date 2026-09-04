/**
 * Terrain — the destructible battlefield surface.
 *
 * The heightmap is the *source of truth*: craters and dirt-mounds modify the
 * underlying heights, and rendering + collision both read from them. There is
 * no "visual only" deformation anywhere.
 *
 * Rendering is cached to an offscreen canvas and re-rendered only when the
 * terrain changes, which keeps deformation-heavy matches at 60fps.
 */

import { CONFIG } from '../core/Config.js';
import { generateTerrain } from './TerrainGenerator.js';
import { RNG } from '../utils/Random.js';
import { clamp, falloff, lerp } from '../utils/MathUtils.js';

export class Terrain {
  /**
   * @param {object} config CONFIG
   * @param {number} seed
   * @param {string} [archetype] terrain personality (see TerrainGenerator)
   */
  constructor(config, seed, archetype = 'classic') {
    this.config = config;
    this.width = config.WORLD.WIDTH;
    this.height = config.WORLD.HEIGHT;
    this.heights = generateTerrain(this.width, seed, config.WORLD, archetype);
    this._dirty = true;
    this._canvas = null;
    this._ctx = null;
    this._decor = [];
    this._buildDecor(seed);
  }

  /** Small thumbnail of the terrain surface (map select cards). */
  renderThumb(ctx, w, h) {
    const { width, height } = this;
    const C = CONFIG.COLORS;
    ctx.fillStyle = '#0a0e22';
    ctx.fillRect(0, 0, w, h);
    // faint horizon glow
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#101638');
    g.addColorStop(1, '#0a0e22');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.scale(w / width, h / height);
    ctx.fillStyle = C.TERRAIN_BODY_1;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) ctx.lineTo(x, this.heights[x]);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.TERRAIN_TOP;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) {
      if (x === 0) ctx.moveTo(x, this.heights[x]);
      else ctx.lineTo(x, this.heights[x]);
    }
    ctx.stroke();
    ctx.restore();
  }

  _buildDecor(seed) {
    const rng = new RNG(seed ^ 0x9e3779b9);
    const n = Math.floor(this.width / 40);
    for (let i = 0; i < n; i++) {
      const x = rng.range(0, this.width);
      const baseY = this.heightAt(x);
      this._decor.push({
        x,
        y: baseY + rng.range(30, 160),
        r: rng.range(30, 110),
        a: rng.range(0.04, 0.1),
      });
    }
  }

  /** Terrain surface y at world x (continuous, linear interpolation). */
  heightAt(x) {
    const w = this.width;
    const cx = clamp(x, 0, w - 1);
    const i0 = Math.floor(cx);
    const i1 = Math.min(w - 1, i0 + 1);
    const t = cx - i0;
    return lerp(this.heights[i0], this.heights[i1], t);
  }

  /** Slope in radians at x over a horizontal span of `half` px each way. */
  slopeAt(x, half = 26) {
    const a = this.heightAt(x - half);
    const b = this.heightAt(x + half);
    return Math.atan2(b - a, half * 2);
  }

  /** Integer column index for x. */
  column(x) {
    return clamp(Math.round(x), 0, this.width - 1);
  }

  /** Is the world point at (x,y) inside solid terrain? */
  isSolidAt(x, y) {
    if (x < 0 || x >= this.width) return false;
    return y >= this.heightAt(x);
  }

  /**
   * Carve a crater centered at (x, y).
   * Modifies the heightmap: depression at center, raised rim around the edge.
   * @param {number} x center x (world px)
   * @param {number} y center y (ignored for depth shaping, kept for API clarity)
   * @param {number} radius px
   * @param {number} depth max depression in px (positive = deeper)
   */
  crater(x, y, radius, depth) {
    const r = Math.max(4, radius);
    const x0 = this.column(x - r);
    const x1 = this.column(x + r);
    const rimStart = r * 0.42;
    for (let i = x0; i <= x1; i++) {
      const d = Math.abs(i - x);
      const dep = depth * falloff(d, r, 1.8);
      let delta = dep;
      if (d > rimStart) {
        // Rim raise: a bump just inside the crater lip.
        delta -= depth * (this.config.TERRAIN.RIM_FACTOR || 0.35) * falloff(d - rimStart, r - rimStart, 1.0);
      }
      this.heights[i] = clamp(this.heights[i] + delta, this.config.WORLD.GROUND_MIN, this.height - 8);
    }
    this._dirty = true;
  }

  /**
   * Raise a mound of terrain (Dirt Maker). Negative direction, positive depth.
   * @param {number} x center
   * @param {number} radius px
   * @param {number} amount max height gain in px
   */
  raise(x, radius, amount) {
    const r = Math.max(4, radius);
    const x0 = this.column(x - r);
    const x1 = this.column(x + r);
    for (let i = x0; i <= x1; i++) {
      const d = Math.abs(i - x);
      const gain = amount * falloff(d, r, 1.6);
      this.heights[i] = clamp(this.heights[i] - gain, this.config.WORLD.GROUND_MIN, this.height - 8);
    }
    this._dirty = true;
  }

  /** Mark terrain changed so the cached render refreshes. */
  markDirty() {
    this._dirty = true;
  }

  /** Draw the terrain into an offscreen canvas (rebuilt only when dirty). */
  render(ctx) {
    if (!this._canvas) {
      this._canvas = document.createElement('canvas');
      this._canvas.width = this.width;
      this._canvas.height = this.height;
      this._ctx = this._canvas.getContext('2d');
      this._dirty = true;
    }
    if (this._dirty) {
      this._drawTo(this._ctx);
      this._dirty = false;
    }
    ctx.drawImage(this._canvas, 0, 0);
  }

  _drawTo(g) {
    const { width, height } = this;
    const C = CONFIG.COLORS;

    // Base body fill.
    const grad = g.createLinearGradient(0, this.config.WORLD.GROUND_MIN, 0, height);
    grad.addColorStop(0, C.TERRAIN_BODY_1);
    grad.addColorStop(0.55, C.TERRAIN_BODY_2);
    grad.addColorStop(1, C.TERRAIN_UNDER);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, height);
    for (let x = 0; x <= width; x += this.config.TERRAIN.RENDER_STEP) {
      g.lineTo(x, this.heights[x]);
    }
    g.lineTo(width, height);
    g.closePath();
    g.fill();

    // Subtle darker blotches for texture.
    for (const d of this._decor) {
      const bg = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      bg.addColorStop(0, `rgba(0,0,0,${d.a})`);
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = bg;
      g.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
    }

    // Grass cap: dark under-strip then neon top line.
    g.lineJoin = 'round';
    g.lineCap = 'round';

    g.strokeStyle = 'rgba(8,12,22,0.55)';
    g.lineWidth = 11;
    g.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = this.heights[x] - 4;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();

    g.strokeStyle = C.TERRAIN_TOP;
    g.lineWidth = 5;
    g.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = this.heights[x] - 4;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
}
