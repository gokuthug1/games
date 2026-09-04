/**
 * Projectile — a simulated shell in flight.
 * It holds physical state (position, velocity, mass) plus behavior hooks
 * supplied by the weapon that fired it. The Game orchestrates integration
 * (Physics) and collision (Collision) with swept substeps so fast shells
 * never tunnel through terrain.
 *
 * Hooks:
 *   onImpact(ctx, hit)  — called once on impact (explosion/spawn/etc)
 *   onSplit(ctx)        — called when split conditions are met (Splitter)
 *   maxBounces          — remaining terrain bounces (Bouncer)
 */

import { CONFIG } from '../core/Config.js';
import { Vector2 } from '../utils/Vector2.js';

export class Projectile {
  /**
   * @param {object} o
   * @param {Vector2} o.pos
   * @param {Vector2} o.vel
   * @param {number} o.radius
   * @param {number} o.mass wind resistance divisor (heavier = straighter)
   * @param {string} o.weaponId
   * @param {object} o.owner the Tank that fired
   * @param {string} o.color
   */
  constructor(o) {
    this.pos = o.pos.copy();
    this.prevPos = o.pos.copy();
    this.vel = o.vel.copy();
    this.radius = o.radius !== undefined ? o.radius : CONFIG.PHYSICS.PROJECTILE_RADIUS;
    this.mass = o.mass !== undefined ? o.mass : 1;
    this.weaponId = o.weaponId;
    this.owner = o.owner;
    this.color = o.color || '#ffe14d';

    this.alive = true;
    this.life = 0;
    this.maxLife = o.maxLife !== undefined ? o.maxLife : CONFIG.PHYSICS.PROJECTILE_MAX_LIFE;

    // Behavior hooks (set by weapons).
    this.onImpact = o.onImpact || null;
    this.onSplit = o.onSplit || null;
    this.onSteer = o.onSteer || null; // per-step homing steering
    this.splitDistance = o.splitDistance || 0; // px travelled before split
    this.bouncesLeft = o.bouncesLeft || 0;
    this.bounceFactor = o.bounceFactor || 0.45;
    this.trailInterval = o.trailInterval !== undefined ? o.trailInterval : 0.03;
    this.trailColor = o.trailColor || this.color;

    this._travelled = 0;
    this._trailTimer = 0;
  }

  /** Total horizontal distance travelled (used by split weapons). */
  get travelled() {
    return this._travelled;
  }

  /**
   * Advance one fixed physics step. Physics integration happens here so
   * the AI can reuse the exact same code path via `simulateStep`.
   * @param {number} dt fixed timestep (1/60)
   * @param {number} windAccel px/s^2 horizontal
   * @param {number} gravity px/s^2 vertical
   */
  integrate(dt, windAccel, gravity) {
    this.prevPos.set(this.pos.x, this.pos.y);
    // Wind affects heavier shells less.
    this.vel.x += (windAccel / this.mass) * dt;
    this.vel.y += gravity * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this._travelled += Math.abs(this.vel.x * dt);
    this.life += dt;
  }

  /**
   * Called by the Game each frame before integration to give the projectile
   * a chance to split mid-flight (Splitter) — returns true if it split.
   */
  maybeSplit(ctx) {
    if (this.onSplit && this.splitDistance > 0 && this._travelled >= this.splitDistance && this.alive) {
      this.onSplit(ctx);
      return true;
    }
    return false;
  }

  /** Called by the Game on terrain impact. Returns true if it bounced instead. */
  bounce(ctx) {
    if (this.bouncesLeft > 0) {
      this.bouncesLeft--;
      // Reflect vertical velocity, dampen horizontal, add slight energy loss.
      this.vel.y = -Math.abs(this.vel.y) * this.bounceFactor;
      this.vel.x *= 0.82;
      if (ctx && ctx.onBounce) ctx.onBounce(this);
      return true;
    }
    return false;
  }

  kill() {
    this.alive = false;
  }
}
