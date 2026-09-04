/**
 * MouseInput — pointer aiming (hover to aim) + wheel power control.
 * Coordinates are relative to the canvas element in CSS pixels.
 */

export class MouseInput {
  constructor(input, canvas) {
    this.input = input;
    this.canvas = canvas;

    this._onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.input.pointer = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        active: true,
      };
      // Mark a genuine pointer gesture so keyboard aiming is not overridden
      // by a cursor merely resting over the canvas (PC wonkiness fix).
      this.input.pointerMoved = true;
    };

    this._onWheel = (e) => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      // Wheel zooms the camera; power has Z/X keys, the slider and touch.
      this.input.zoomFromWheel(dir);
    };

    this._onLeave = () => {
      this.input.pointer.active = false;
      this.input.pointerMoved = false;
    };

    // Right-click: no browser context menu — it toggles the aim lock instead
    // (the turret angle freezes so power/movement can be tuned precisely).
    this._onContextMenu = (e) => {
      e.preventDefault();
    };
    this._onMouseDown = (e) => {
      if (e.button === 2) {
        e.preventDefault();
        this.input.game?.toggleAimLock?.();
      }
    };

    canvas.addEventListener('mousemove', this._onMove);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
    canvas.addEventListener('mouseleave', this._onLeave);
    canvas.addEventListener('contextmenu', this._onContextMenu);
    canvas.addEventListener('mousedown', this._onMouseDown);
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this._onMove);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
  }
}
