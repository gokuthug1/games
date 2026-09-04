/**
 * Environment — the parallax sky/background scenery behind the battlefield.
 * All background layers are drawn in screen space with parallax factors so
 * they never interfere with the world-space camera transform.
 */

import { CONFIG } from '../core/Config.js';
import { RNG } from '../utils/Random.js';

const TAU = Math.PI * 2;

export class Environment {
  constructor(seed, assets = null) {
    this.assets = assets;
    const rng = new RNG(seed ^ 0x51ab3);
    const W = CONFIG.WORLD.WIDTH;

    this.stars = [];
    const starCount = 150;
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: rng.range(0, W),
        y: rng.range(20, 480),
        r: rng.range(0.6, 1.9),
        phase: rng.range(0, TAU),
        speed: rng.range(0.4, 1.6),
      });
    }

    this.clouds = [];
    const cloudCount = 9;
    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({
        x: rng.range(0, W),
        y: rng.range(120, 640),
        w: rng.range(120, 300),
        h: rng.range(18, 42),
        speed: rng.range(2, 6),
        alpha: rng.range(0.12, 0.3),
      });
    }

    this.sun = { x: W * 0.74, y: 240, r: 78 };

    // Mountain ridge silhouettes (two parallax depths).
    this.ridges = {
      far: { p: 0.16, baseY: 470, amp: 170, color: '#191c3c' },
      near: { p: 0.34, baseY: 620, amp: 190, color: '#12152e' },
    };
    this.ridgeData = {
      far: this._buildRidge(rng, W, 340, 1),
      near: this._buildRidge(rng, W, 180, 1),
    };
  }

  _buildRidge(rng, width, spacing, ampMul) {
    const pts = [];
    const n = Math.ceil(width / spacing) + 2;
    for (let i = 0; i < n; i++) pts.push(rng.range(-1, 1));
    const out = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      const f = x / spacing;
      const i0 = Math.floor(f);
      const t = f - i0;
      const s = t * t * (3 - 2 * t);
      out[x] = pts[i0] + (pts[i0 + 1] - pts[i0]) * s;
    }
    return out;
  }

  update(dt) {
    this._time = (this._time || 0) + dt;
    for (const c of this.clouds) c.x += c.speed * dt;
  }

  /**
   * Draw the full background. Called with the ctx in CSS-pixel space
   * (no world transform applied). `cam` provides x/y/zoom/offset.
   */
  draw(ctx, cam) {
    const viewW = cam.viewW;
    const viewH = cam.viewH;
    const { offsetX, offsetY, zoom } = cam;
    // Never let a bad camera value take down the render loop.
    if (!Number.isFinite(zoom) || !Number.isFinite(cam.x) || !Number.isFinite(cam.y)) {
      return;
    }

    // Sky gradient (screen space, anchored slightly to the camera). Always
    // drawn — it is a single fill and keeps the scene from going black.
    const topY = offsetY - cam.y * 0.02 * zoom;
    const grad = ctx.createLinearGradient(0, topY - viewH * zoom, 0, offsetY + viewH * 0.2);
    grad.addColorStop(0, CONFIG.COLORS.SKY_TOP);
    grad.addColorStop(0.7, CONFIG.COLORS.SKY_BOTTOM);
    grad.addColorStop(1, '#10133a');
    ctx.fillStyle = grad;
    ctx.fillRect(offsetX - 4, offsetY - 4, viewW + 8, viewH + 8);

    // The parallax layers (nebula, stars, sun, ridges, clouds) are the
    // expensive part of the backdrop. Skip them when the world covers the
    // screen: in portrait the battlefield fills the whole canvas, and in
    // any orientation a camera zoomed in past the natural fit hides them
    // behind the terrain anyway.
    const skipMode = CONFIG.RENDER.SKIP_BACKDROP;
    const skipBackdrop = skipMode === true
      ? true
      : skipMode === false
        ? false
        : cam.rotated || zoom > cam.baseZoom * 1.02;
    if (skipBackdrop) return;

    // Real nebula artwork layer (loaded from assets; skipped when absent).
    this._drawNebula(ctx, cam);

    const t = this._time || 0;
    const period = CONFIG.WORLD.WIDTH * zoom;

    // Stars (twinkle).
    ctx.fillStyle = '#dfe7ff';
    for (const s of this.stars) {
      const sx = this._wrap((s.x - cam.x * 0.06) * zoom + offsetX, period, viewW);
      if (sx === null) continue;
      const sy = (s.y - cam.y * 0.06) * zoom + offsetY;
      if (sy < -10 || sy > viewH + 10) continue;
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * s.speed + s.phase));
      ctx.globalAlpha = tw * 0.9;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Sun with glow.
    this._drawSun(ctx, cam);

    // Mountains far + near.
    this._drawRidge(ctx, cam, this.ridges.far, this.ridgeData.far);
    this._drawRidge(ctx, cam, this.ridges.near, this.ridgeData.near);

    // Clouds.
    ctx.fillStyle = '#9fb4e8';
    for (const c of this.clouds) {
      const sx = this._wrap((c.x - cam.x * 0.55) * zoom + offsetX, period, viewW);
      if (sx === null) continue;
      const sy = (c.y - cam.y * 0.55) * zoom + offsetY;
      if (sy < -80 || sy > viewH + 80) continue;
      ctx.globalAlpha = c.alpha;
      ctx.beginPath();
      ctx.ellipse(sx, sy, c.w / 2, c.h / 2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Parallax nebula backdrop drawn from the real artwork, screen-blended. */
  _drawNebula(ctx, cam) {
    const img = this.assets ? this.assets.image('bg-nebula') : null;
    if (!img || !img.complete || !img.naturalWidth) return;
    const { offsetX, offsetY, zoom } = cam;
    const viewW = cam.viewW;
    const h = viewW * (img.naturalHeight / img.naturalWidth);
    const p = 0.04;
    const drift = p * cam.x * zoom;
    const period = viewW;
    let sx = offsetX - drift;
    sx = (((sx - offsetX) % period) + period) % period + offsetX - period;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.drawImage(img, sx + i * viewW, offsetY - h * 0.35, viewW, h);
    }
    ctx.restore();
  }

  _wrap(sx, period, viewW) {
    let v = ((sx % period) + period) % period;
    if (v > viewW + 40) return null;
    if (v < -40) v += period;
    return v;
  }

  _drawSun(ctx, cam) {
    const { offsetX, offsetY, zoom } = cam;
    const s = this.sun;
    const sx = (s.x - cam.x * 0.12) * zoom + offsetX;
    const sy = (s.y - cam.y * 0.12) * zoom + offsetY;
    const r = s.r * zoom;

    const glow = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 4);
    glow.addColorStop(0, 'rgba(255,233,160,0.55)');
    glow.addColorStop(1, 'rgba(255,233,160,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);

    const disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    disc.addColorStop(0, '#fff6d8');
    disc.addColorStop(1, '#ffd98a');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.fill();
  }

  _drawRidge(ctx, cam, ridge, data) {
    const viewW = cam.viewW;
    const viewH = cam.viewH;
    const { offsetX, offsetY, zoom } = cam;
    const W = CONFIG.WORLD.WIDTH;
    const step = 6;

    ctx.fillStyle = ridge.color;
    ctx.beginPath();
    ctx.moveTo(offsetX - 2, offsetY + viewH + 2);
    for (let sx = -step; sx <= viewW + step; sx += step) {
      const anchorX = ridge.p * cam.x + (sx - offsetX) / zoom;
      const wx = ((anchorX % W) + W) % W;
      const h = ridge.baseY + data[Math.floor(wx)] * ridge.amp;
      const sy = (h - cam.y * ridge.p) * zoom + offsetY;
      ctx.lineTo(offsetX + sx, sy);
    }
    ctx.lineTo(offsetX + viewW + 2, offsetY + viewH + 2);
    ctx.closePath();
    ctx.fill();
  }
}
