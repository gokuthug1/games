/**
 * Tank — a battlefield unit. Pure data + behavior; rendering is a method so
 * the entity stays self-contained but never touches the game loop.
 *
 * World model:
 *   - (x, y) is the tank's center.
 *   - The tank rests on the terrain surface (y = terrainHeight - height/2).
 *   - `rot` follows the local terrain slope.
 *   - The turret rotates in absolute degrees: 0 = east, 90 = up, 180 = west.
 */

import { CONFIG } from '../core/Config.js';
import { clamp, degToRad } from '../utils/MathUtils.js';
import { debug } from '../utils/Debug.js';

export class Tank {
  /**
   * @param {object} o
   * @param {string} o.id
   * @param {string} o.name
   * @param {number} o.team 0 or 1
   * @param {string} o.color accent color
   * @param {string} o.colorDark dark variant
   * @param {number} o.x spawn x
   * @param {number} o.y spawn y (center)
   * @param {string[]} o.weapons weapon ids
   * @param {number} o.weaponIndex active weapon index
   */
  constructor(o) {
    const T = CONFIG.TANK;
    this.id = o.id;
    this.name = o.name;
    this.team = o.team;
    this.color = o.color;
    this.colorDark = o.colorDark || '#222';

    this.x = o.x;
    this.y = o.y;
    this.rot = 0;

    this.width = T.WIDTH;
    this.height = T.HEIGHT;
    this.moveSpeed = T.MOVE_SPEED;
    this.maxClimb = T.MAX_CLIMB;
    this.hitRadius = T.HIT_RADIUS;

    this.maxHealth = T.MAX_HEALTH;
    this.health = T.MAX_HEALTH;
    this.maxFuel = T.MAX_FUEL;
    this.fuel = T.MAX_FUEL;
    this.fuelDrain = T.FUEL_DRAIN;

    this.turret = {
      angle: o.team === 0 ? 55 : 125,
      targetAngle: o.team === 0 ? 55 : 125,
      length: T.TURRET_LENGTH,
      width: T.TURRET_WIDTH,
      recoil: 0,
      recoilMax: 8,
    };
    this.aimSpeed = T.AIM_SPEED;

    this.power = 55;
    this.powerMin = CONFIG.PHYSICS.POWER_MIN;
    this.powerMax = CONFIG.PHYSICS.POWER_MAX;

    this.weapons = [...o.weapons];
    this.ammo = {};
    this.weaponIndex = clamp(o.weaponIndex || 0, 0, Math.max(0, this.weapons.length - 1));

    this.alive = true;
    this.destroyed = false;
    this.hitFlash = 0;
    this.moving = false;
    this.treadOffset = 0;
    this.shield = 0; // absorbs damage first (Shield weapon)
    this.stunned = false; // EMP: skips this tank's next turn

    // Optional real-art sprites (assets/svg/tanks/*). The hull/tracks come
    // from the sprite; the turret dome + barrel stay procedural so aiming
    // and recoil keep animating independently of the body.
    this.sprite = o.sprite || null;
    this.wreck = o.wreck || null;

    this._rested = false;
  }

  /** Called once after spawn so the tank conforms to the terrain. */
  restOn(terrain) {
    const bottomY = terrain.heightAt(this.x) + CONFIG.TANK.CLEARANCE;
    this.y = bottomY - this.height / 2;
    this.rot = terrain.slopeAt(this.x, 20);
    this._rested = true;
  }

  /**
   * Move along the terrain. Returns true if any movement happened.
   * The direction is analog: `dir` may be any value in [-1, 1] (joystick
   * deflection), and both speed and fuel drain scale with |dir| so a light
   * tilt creeps while a hard push runs at full speed. Keyboard/AI input
   * passes ±1 and behaves exactly as before.
   * @param {number} dir -1..1
   * @param {number} dt seconds
   */
  move(dir, dt, terrain) {
    if (!this.alive || dir === 0 || this.fuel <= 0) {
      this.moving = false;
      return false;
    }
    const mag = Math.min(1, Math.abs(dir));
    const dx = Math.sign(dir) * this.moveSpeed * mag * dt;
    const newX = this.x + dx;
    if (newX < CONFIG.WORLD.EDGE_MARGIN || newX > CONFIG.WORLD.WIDTH - CONFIG.WORLD.EDGE_MARGIN) {
      this.moving = false;
      return false;
    }
    // Climb check: reject only real walls (cliffs). The per-frame allowance
    // is generous (maxClimb*dt*3) so gentle-to-moderate slopes never block,
    // while an absolute wall still stops the tank.
    const hNow = terrain.heightAt(this.x);
    const hNext = terrain.heightAt(newX);
    if (Math.abs(hNext - hNow) > this.maxClimb * dt * 3 + 1.5) {
      this.moving = false;
      return false;
    }
    this.x = newX;
    this.restOn(terrain);
    this.fuel = Math.max(0, this.fuel - this.fuelDrain * mag * dt);
    this.moving = true;
    this.treadOffset += Math.abs(dx);
    return true;
  }

  /** Weapon-aware aim range (degrees), mirrored for the right-side team. */
  aimRange() {
    const w = this.weaponInstances && this.weaponInstances[this.weaponIndex];
    const def = w ? w.def : null;
    // Weapon angle windows are authored for the left team (facing east).
    // The right team mirrors them across vertical so the same weapon fires
    // toward its own enemy (0° east -> 180° west).
    const mirror = (a) => (this.team === 0 ? a : 180 - a);
    if (def && def.fixedAngle !== undefined) {
      const locked = mirror(def.fixedAngle);
      return { min: locked, max: locked };
    }
    const mn = def && def.minAngle !== undefined ? def.minAngle : CONFIG.TANK.TURRET_MIN;
    const mx = def && def.maxAngle !== undefined ? def.maxAngle : CONFIG.TANK.TURRET_MAX;
    const a = mirror(mn);
    const b = mirror(mx);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  /** Weapon-aware power range. */
  powerRange() {
    const w = this.weaponInstances && this.weaponInstances[this.weaponIndex];
    const def = w ? w.def : null;
    return {
      min: def && def.minPower !== undefined ? def.minPower : CONFIG.PHYSICS.POWER_MIN,
      max: def && def.maxPower !== undefined ? def.maxPower : CONFIG.PHYSICS.POWER_MAX,
    };
  }

  /**
   * Rotate the turret toward its target angle (clamped to the active weapon).
   * @param {number} targetDeg absolute degrees
   * @param {number} dt
   */
  aimToward(targetDeg, dt) {
    const r = this.aimRange();
    this.turret.targetAngle = clamp(targetDeg, r.min, r.max);
  }

  /** Nudge the aim target by a signed delta (degrees), clamped. */
  aimBy(deltaDeg, dt) {
    const r = this.aimRange();
    const cur = this.turret.targetAngle;
    this.turret.targetAngle = clamp(cur + deltaDeg * dt, r.min, r.max);
  }

  /** Update per-frame behavior (turret rotation, recoil decay, flash decay). */
  update(dt) {
    const r = this.aimRange();
    // Move toward the target angle at a fixed speed, shortest path within range.
    let cur = this.turret.angle;
    let tgt = clamp(this.turret.targetAngle, r.min, r.max);
    let diff = tgt - cur;
    const maxStep = this.aimSpeed * dt;
    if (Math.abs(diff) > maxStep) diff = Math.sign(diff) * maxStep;
    this.turret.angle = clamp(cur + diff, r.min, r.max);

    if (this.turret.recoil > 0) {
      this.turret.recoil = Math.max(0, this.turret.recoil - 60 * dt);
    }
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
  }

  adjustPower(delta) {
    const r = this.powerRange();
    this.power = clamp(this.power + delta, r.min, r.max);
  }

  setPower(v) {
    const r = this.powerRange();
    this.power = clamp(v, r.min, r.max);
  }

  /** Restore the per-turn movement allowance. */
  resetFuel() {
    this.fuel = this.maxFuel;
  }

  get activeWeaponId() {
    return this.weapons[this.weaponIndex];
  }

  /** Ammo remaining for a weapon id (Infinity = unlimited). */
  ammoFor(id) {
    return this.ammo[id] === undefined ? Infinity : this.ammo[id];
  }

  canFire() {
    return this.alive && this.ammoFor(this.activeWeaponId) > 0;
  }

  /** Move weapon selection by ±1, skipping empty weapons when possible. */
  cycleWeapon(dir) {
    const n = this.weapons.length;
    if (n <= 1) return;
    for (let i = 1; i <= n; i++) {
      const idx = (this.weaponIndex + dir * i + n) % n;
      if (this.ammoFor(this.weapons[idx]) > 0) {
        this.weaponIndex = idx;
        return;
      }
    }
  }

  setWeaponIndex(i) {
    if (i < 0 || i >= this.weapons.length) return;
    this.weaponIndex = i;
    // Re-clamp the current aim/power to the new weapon's constraints so a
    // locked weapon (e.g. railgun) snaps to its firing line immediately.
    const ar = this.aimRange();
    this.turret.targetAngle = clamp(this.turret.targetAngle, ar.min, ar.max);
    this.turret.angle = clamp(this.turret.angle, ar.min, ar.max);
    const pr = this.powerRange();
    this.power = clamp(this.power, pr.min, pr.max);
  }

  /** Consume one unit of ammo for the active weapon. Returns false if empty. */
  consumeAmmo() {
    const id = this.activeWeaponId;
    const ammo = this.ammoFor(id);
    if (ammo === Infinity) return true;
    if (ammo <= 0) return false;
    this.ammo[id] = ammo - 1;
    return true;
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    let remaining = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
      this.hitFlash = Math.max(this.hitFlash, 0.2);
      if (remaining <= 0) return false;
    }
    this.health = Math.max(0, this.health - remaining);
    this.hitFlash = 0.3;
    if (this.health <= 0) {
      this.alive = false;
      this.destroyed = true;
      this.moving = false;
      return true;
    }
    return false;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** World position of the barrel tip (muzzle) including recoil. */
  getBarrelTip() {
    const a = degToRad(this.turret.angle);
    const len = this.turret.length - this.turret.recoil;
    const px = this.x;
    const py = this.y - this.height * 0.1;
    return {
      x: px + Math.cos(a) * len,
      y: py - Math.sin(a) * len,
    };
  }

  /** Turret pivot world position. */
  getPivot() {
    return { x: this.x, y: this.y - this.height * 0.1 };
  }

  // ---------------------------------------------------------------- drawing

  draw(ctx, dt) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    const w = this.width;
    const h = this.height;
    const c = this.color;
    const cd = this.colorDark;

    if (this.destroyed) {
      // Charred wreck (sprite when available, procedural otherwise).
      if (!this._drawSprite(ctx, this.wreck)) {
        ctx.fillStyle = '#15151c';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        this._rr(ctx, -w / 2, -h / 2, w, h, 7);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Body: real hull sprite when loaded, procedural fallback otherwise.
    if (!this._drawSprite(ctx, this.sprite)) {
      // Tracks.
      ctx.fillStyle = '#0b0e16';
      this._rr(ctx, -w / 2 - 3, -h / 2 + 2, w + 6, 12, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tread marks (animated while moving).
      if (this.moving) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        const off = -(this.treadOffset % 12);
        for (let tx = -w / 2; tx < w / 2; tx += 12) {
          ctx.fillRect(tx + off, -h / 2 + 4, 5, 3);
        }
      }

      // Hull body.
      const bodyGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      bodyGrad.addColorStop(0, cd);
      bodyGrad.addColorStop(0.5, '#2a2f3d');
      bodyGrad.addColorStop(1, '#171b26');
      ctx.fillStyle = bodyGrad;
      this._rr(ctx, -w / 2, -h / 2 + 8, w, h - 8, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Team accent stripe.
      ctx.fillStyle = c;
      ctx.fillRect(-w / 2 + 6, -h / 2 + 12, w - 12, 4);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(-w / 2 + 6, -h / 2 + 18, w - 12, 2);
      ctx.globalAlpha = 1;
    }

    // Turret pivot + barrel.
    const px = 0;
    const py = -h * 0.1;
    const a = this.turret.angle * (Math.PI / 180);

    // Barrel.
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-a); // canvas rotate is clockwise; world angle is ccw-from-east
    const len = this.turret.length - this.turret.recoil;
    const tw = this.turret.width;
    const barrelGrad = ctx.createLinearGradient(0, 0, len, 0);
    barrelGrad.addColorStop(0, '#3a4152');
    barrelGrad.addColorStop(1, '#232834');
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(0, -tw / 2, len, tw);
    ctx.fillStyle = c;
    ctx.fillRect(len - 3, -tw / 2 - 1.5, 5, tw + 3); // muzzle ring
    ctx.restore();

    // Turret dome.
    ctx.fillStyle = '#39404f';
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Hit flash overlay.
    if (this.hitFlash > 0) {
      ctx.globalAlpha = Math.min(1, this.hitFlash * 4);
      ctx.fillStyle = '#ffffff';
      this._rr(ctx, -w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Shield bubble (drawn outside the body transform, world-aligned).
    if (this.alive && this.shield > 0 && !this.destroyed) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const pulse = 1 + 0.05 * Math.sin(performance.now() / 180);
      const r = (this.width * 0.62) * pulse;
      const g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
      g.addColorStop(0, 'rgba(62,242,255,0.02)');
      g.addColorStop(0.8, 'rgba(62,242,255,0.10)');
      g.addColorStop(1, 'rgba(62,242,255,0.32)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -this.height * 0.1, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(62,242,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    if (CONFIG.PHYSICS.debugHitboxes === true) {
      // Reserved debug hook; see Debug overlay.
      debug.log('hitbox debug not wired', this.id);
    }
  }

  /** Draw the hull sprite if it is loaded and decodable. */
  _drawSprite(ctx, img) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
    return true;
  }

  /** Rounded rectangle path helper. */
  _rr(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
