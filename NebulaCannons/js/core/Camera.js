/**
 * Camera — world<->screen transforms, smooth follow behavior, player zoom
 * and auto-framing of both tanks.
 *
 * Screen coordinates are CSS pixels of the canvas element; world
 * coordinates are the simulated battlefield space. The two never mix.
 *
 * Portrait rotation: on touch devices held upright, the canvas fills the
 * window and the battlefield is rendered rotated -90° so its full width
 * spans the tall axis (world-left sits at the bottom of the screen, the
 * terrain wall on the right). `rotated` toggles that mapping everywhere a
 * coordinate crosses between the two spaces.
 *
 * Zoom layering:
 *   zoom = baseZoom (window fit) × userZoom (player keys/wheel) × frameZoom
 *   (auto-fit so both tanks stay on screen). The three layers are
 *   independent: player zoom persists, auto-frame recalculates every frame.
 */

import { CONFIG } from './Config.js';
import { clamp, damp } from '../utils/MathUtils.js';

export const USER_ZOOM_MIN = 0.5;
export const USER_ZOOM_MAX = 2.2;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.baseZoom = 1;
    this.userZoom = 1;
    this.frameZoom = 1;
    this.zoom = 1;
    this._zoomTarget = 1;
    // CSS-pixel viewport (screen space). In landscape this is the canvas
    // box; in rotated portrait it is the (tall) window the canvas fills.
    this.viewW = CONFIG.VIEW.LOGICAL_HEIGHT * CONFIG.VIEW.ASPECT;
    this.viewH = CONFIG.VIEW.LOGICAL_HEIGHT;
    this.rotated = false;
    /** Portrait rotation direction: false = world-left at the bottom of the
     *  screen (classic), true = world-left at the top (Settings toggle). */
    this.flipRotation = false;
    /** When true, the Game skips its per-frame auto-follow/frame so the
     *  player's manual pinch-pan stays where they put it. Unlocked on fire
     *  and at the start of every turn. */
    this.followLocked = false;
    this.shake = 0;
    this.shakeDur = 0;
    this.shakeTime = 0;
    this._follow = null; // {x, y, lambda}
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /**
   * Set the on-screen viewport (CSS pixels). When the viewport is taller
   * than it is wide, the camera switches to the rotated portrait mapping
   * and fits the whole battlefield to the screen.
   */
  setViewport(cssW, cssH) {
    this.rotated = cssH > cssW;
    this.viewW = Math.max(1, cssW);
    this.viewH = Math.max(1, cssH);
    if (this.rotated) {
      // World WIDTH maps to the tall axis, world HEIGHT to the short axis.
      // Fit both so the whole battlefield is visible on the phone.
      this.baseZoom = Math.min(cssH / CONFIG.WORLD.WIDTH, cssW / CONFIG.WORLD.HEIGHT);
    } else {
      this.baseZoom = cssH / CONFIG.VIEW.LOGICAL_HEIGHT;
    }
    this.userZoom = 1;
    this.frameZoom = 1;
    this._applyZoom();
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /** Recompute the target zoom from the three layers. */
  _applyZoom() {
    this._zoomTarget = this.baseZoom * this.userZoom * this.frameZoom;
  }

  /** World-space x span currently visible on screen. */
  get visibleW() {
    return (this.rotated ? this.viewH : this.viewW) / this.zoom;
  }

  /** World-space y span currently visible on screen. */
  get visibleH() {
    return (this.rotated ? this.viewW : this.viewH) / this.zoom;
  }

  /**
   * World point -> CSS px on the canvas. In rotated portrait mode the world
   * x-axis runs down the screen and the y-axis runs across it (rightwards
   * toward smaller world y, i.e. the sky). With `flipRotation` the world
   * x-axis direction is mirrored so world-left sits at the top instead of
   * the bottom of the screen.
   */
  worldToScreen(wx, wy) {
    if (this.rotated) {
      return {
        x: (wy - this.y) * this.zoom,
        y: this.flipRotation
          ? (wx - this.x) * this.zoom
          : this.viewH - (wx - this.x) * this.zoom,
      };
    }
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom,
    };
  }

  /** CSS px on the canvas -> world point (inverse of worldToScreen). */
  screenToWorld(sx, sy) {
    if (this.rotated) {
      return this.flipRotation
        ? {
            x: sy / this.zoom + this.x,
            y: sx / this.zoom + this.y,
          }
        : {
            x: (this.viewH - sy) / this.zoom + this.x,
            y: sx / this.zoom + this.y,
          };
    }
    return {
      x: sx / this.zoom + this.x,
      y: sy / this.zoom + this.y,
    };
  }

  /** Player zoom controls (persistent multiplier). */
  setUserZoom(mult) {
    this.userZoom = clamp(mult, USER_ZOOM_MIN, USER_ZOOM_MAX);
    this._applyZoom();
  }

  zoomIn(step = 0.12) {
    this.setUserZoom(this.userZoom + step);
  }

  zoomOut(step = 0.12) {
    this.setUserZoom(this.userZoom - step);
  }

  /** Reset the player zoom to the natural window fit. */
  resetUserZoom() {
    this.setUserZoom(1);
  }

  /**
   * Auto-frame: zoom out just enough that both points fit on screen (width
   * and height, with margin), while the player's manual zoom is respected.
   * Idempotent per frame; never zooms in past the natural fit.
   */
  frameBoth(ax, ay, bx, by) {
    const needW = Math.max(240, Math.abs(bx - ax) + 240);
    const needH = Math.max(200, Math.abs(by - ay) + 200);
    // In rotated mode the world x-span is displayed along the tall axis.
    const spanW = this.rotated ? this.viewH : this.viewW;
    const spanH = this.rotated ? this.viewW : this.viewH;
    const fW = spanW / (needW * this.baseZoom * this.userZoom);
    const fH = spanH / (needH * this.baseZoom * this.userZoom);
    this.frameZoom = clamp(Math.min(fW, fH, 1), 0.35, 1);
    this._applyZoom();
  }

  /** Stop auto-framing (zoom returns to base × user). */
  resetFrame() {
    this.frameZoom = 1;
    this._applyZoom();
  }

  /**
   * Pan the view by a screen-space delta (CSS px). The mapping goes through
   * screenToWorld so it stays correct in rotated portrait mode. Dragging the
   * content right moves the view left, like any touch map.
   */
  panByScreen(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const a = this.screenToWorld(this.viewW / 2, this.viewH / 2);
    const b = this.screenToWorld(this.viewW / 2 + dx, this.viewH / 2 + dy);
    const wdx = b.x - a.x;
    const wdy = b.y - a.y;
    if (!Number.isFinite(wdx) || !Number.isFinite(wdy)) return;
    this.x -= wdx;
    this.y -= wdy;
    this._clampBounds();
  }

  /**
   * Keep the world point currently under screen point (sourceX, sourceY)
   * pinned to screen point (targetX, targetY). This is the core of the
   * two-finger pinch gesture: zoom around the midpoint while the midpoint
   * drags. Coordinates are canvas CSS px.
   */
  pinTo(sourceX, sourceY, targetX, targetY) {
    if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return;
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
    const before = this.screenToWorld(sourceX, sourceY);
    const after = this.worldToScreen(before.x, before.y);
    this.panByScreen(targetX - after.x, targetY - after.y);
  }

  /** Center the camera on a world point instantly (used at match start). */
  snapTo(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      console.warn('[Camera] snapTo got non-finite target, ignoring', x, y);
      return;
    }
    this.x = x - (this.rotated ? this.viewH : this.viewW) / 2;
    this.y = y - (this.rotated ? this.viewW : this.viewH) / 2;
    this._clampBounds();
  }

  /** Smoothly follow a world point. dt defaults to one 60fps frame. */
  followTarget(x, y, dt = 1 / 60, lambda = CONFIG.CAMERA.LAMBDA) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      console.warn('[Camera] followTarget got non-finite target, ignoring', x, y);
      return;
    }
    const tx = x - (this.rotated ? this.viewH : this.viewW) / 2;
    const ty = y - (this.rotated ? this.viewW : this.viewH) / 2;
    this.x = damp(this.x, tx, lambda, dt);
    this.y = damp(this.y, ty, lambda, dt);
    this._clampBounds();
  }

  _clampBounds() {
    // Visible world size shrinks as we zoom in.
    const visW = this.visibleW;
    const visH = this.visibleH;
    const maxX = CONFIG.WORLD.WIDTH - visW;
    const maxY = CONFIG.WORLD.HEIGHT - visH;
    this.x = clamp(this.x, 0, Math.max(0, maxX));
    this.y = clamp(this.y, 0, Math.max(0, maxY));
  }

  /** Add screen shake. magnitude in px. */
  addShake(magnitude) {
    this.shake = Math.max(this.shake, magnitude);
    this.shakeDur = 0.5;
    this.shakeTime = 0;
  }

  /** Update shake decay + zoom damping; call once per frame. */
  update(dt) {
    this.zoom = damp(this.zoom, this._zoomTarget, 6, dt);
    if (!Number.isFinite(this.zoom) || this.zoom <= 0) this.zoom = this._zoomTarget;
    if (this.shake > 0.1) {
      this.shakeTime += dt;
      const p = 1 - Math.min(1, this.shakeTime / this.shakeDur);
      this.shake = this.shake * p;
    } else {
      this.shake = 0;
    }
  }

  /** Random offset to apply to the render transform this frame. */
  shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const s = this.shake * this.zoom;
    return {
      x: (Math.random() * 2 - 1) * s,
      y: (Math.random() * 2 - 1) * s,
    };
  }
}
