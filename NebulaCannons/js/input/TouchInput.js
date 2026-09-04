/**
 * TouchInput — single-finger drag-to-aim on the battlefield canvas, plus
 * two-finger pinch-zoom and pan for the mobile battlefield.
 *
 *   - 1 finger: aims the turret (drag anywhere on the canvas).
 *   - 2 fingers: zoom around the gesture midpoint (pinch) and pan the view.
 *     Panning locks the camera's auto-follow until the next fire or turn,
 *     so the view stays where the player put it.
 *
 * Fine controls (move/power/fire/weapon) live in the HUD touch bar; this
 * module only handles canvas gestures.
 */

export class TouchInput {
  constructor(input, canvas) {
    this.input = input;
    this.canvas = canvas;
    this._touches = new Map(); // identifier -> {x, y} canvas-local
    this._aimId = null; // identifier of the touch currently aiming
    this._gesture = null; // { lastDist, lastMidX, lastMidY } while 2+ fingers

    this._onStart = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const p = this._local(t);
        this._touches.set(t.identifier, p);
        // First finger starts aiming (if we aren't already in a gesture).
        if (this._touches.size === 1 && this._aimId === null) {
          this._aimId = t.identifier;
          this.input.pointer = { x: p.x, y: p.y, active: true };
          this.input.pointerMoved = true;
        }
      }
      this._syncGesture();
    };

    this._onMove = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this._touches.has(t.identifier)) {
          this._touches.set(t.identifier, this._local(t));
        }
      }
      if (this._gesture) {
        this._onPinchMove();
        return;
      }
      // Single-finger aim (only the registered aim touch moves the pointer).
      for (const t of e.changedTouches) {
        if (t.identifier === this._aimId) {
          const p = this._local(t);
          this.input.pointer = { x: p.x, y: p.y, active: true };
          this.input.pointerMoved = true;
        }
      }
    };

    this._onEnd = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) this._touches.delete(t.identifier);
      if (this._aimId !== null && !this._touches.has(this._aimId)) {
        this._aimId = null;
        this.input.pointer.active = false;
      }
      this._syncGesture();
    };

    canvas.addEventListener('touchstart', this._onStart, { passive: false });
    canvas.addEventListener('touchmove', this._onMove, { passive: false });
    canvas.addEventListener('touchend', this._onEnd, { passive: false });
    canvas.addEventListener('touchcancel', this._onEnd, { passive: false });
  }

  destroy() {
    this.canvas.removeEventListener('touchstart', this._onStart);
    this.canvas.removeEventListener('touchmove', this._onMove);
    this.canvas.removeEventListener('touchend', this._onEnd);
    this.canvas.removeEventListener('touchcancel', this._onEnd);
  }

  /** Touch point relative to the canvas, in CSS px. */
  _local(t) {
    const r = this.canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  /** Enter/leave the two-finger gesture state as the touch count changes. */
  _syncGesture() {
    if (this._touches.size >= 2 && !this._gesture) {
      // Second finger lands: stop aiming and start the pinch/pan gesture.
      this.input.pointer.active = false;
      const [a, b] = [...this._touches.values()];
      this._gesture = {
        lastDist: Math.max(8, Math.hypot(b.x - a.x, b.y - a.y)),
        lastMidX: (a.x + b.x) / 2,
        lastMidY: (a.y + b.y) / 2,
      };
    } else if (this._touches.size < 2 && this._gesture) {
      this._gesture = null;
      // A single finger remains; don't resume aiming mid-drag (avoid jumps).
      this.input.pointer.active = false;
    }
  }

  /**
   * Two-finger move: zoom about the gesture midpoint and drag the view.
   * The world point under the previous midpoint stays under the current
   * midpoint, so zoom and pan combine into one natural gesture.
   */
  _onPinchMove() {
    const pts = [...this._touches.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const g = this._gesture;
    const cam = this.input.game ? this.input.game.camera : null;
    if (cam) {
      const anchor = cam.screenToWorld(g.lastMidX, g.lastMidY);
      const ratio = dist / g.lastDist;
      // Zoom (ignore sub-pixel jitter; setUserZoom clamps to the zoom range).
      if (Math.abs(ratio - 1) > 0.004) {
        cam.setUserZoom(cam.userZoom * ratio);
      }
      // Pan: pin the anchor world point under the current midpoint.
      const after = cam.worldToScreen(anchor.x, anchor.y);
      cam.pinTo(g.lastMidX, g.lastMidY, midX, midY);
      // A real two-finger drag (beyond jitter) parks the camera: suspend
      // auto-follow so the view doesn't snap back to the tanks.
      const dx = midX - g.lastMidX;
      const dy = midY - g.lastMidY;
      if (Math.hypot(dx, dy) > 3 && !cam.followLocked) {
        cam.followLocked = true;
      }
      // Zooming alone (no midpoint drift) should not freeze auto-follow;
      // only panning parks the camera.
      if (Math.hypot(dx, dy) <= 3 && Math.abs(ratio - 1) > 0.004) {
        cam.followLocked = false;
      }
    }
    g.lastDist = dist;
    g.lastMidX = midX;
    g.lastMidY = midY;
  }
}
