/**
 * GameLoop — requestAnimationFrame driver with clamped delta time.
 * The update callback receives real seconds since last frame; physics
 * integration with a fixed timestep is the Game's responsibility.
 */

import { CONFIG } from './Config.js';

export class GameLoop {
  constructor({ update, render, maxDt = CONFIG.PHYSICS.MAX_DT || 0.1 }) {
    this.update = update;
    this.render = render;
    this.maxDt = maxDt;
    this.running = false;
    this.paused = false;
    this._raf = 0;
    this._last = 0;
    this.elapsed = 0;
    this.fps = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._fpsTime = this._last;
    const tick = (now) => {
      if (!this.running) return;
      let dt = (now - this._last) / 1000;
      this._last = now;
      if (dt > this.maxDt) dt = this.maxDt;

      this.elapsed += dt;
      this._fpsFrames++;
      this._fpsTime += dt;
      if (this._fpsTime >= 0.5) {
        this.fps = this._fpsFrames / this._fpsTime;
        this._fpsFrames = 0;
        this._fpsTime = 0;
      }

      if (!this.paused) {
        try {
          this.update(dt);
        } catch (err) {
          console.error('[GameLoop] update error', err);
        }
      }
      try {
        this.render();
      } catch (err) {
        console.error('[GameLoop] render error', err);
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  setPaused(p) {
    this.paused = !!p;
    this._last = performance.now();
  }
}
