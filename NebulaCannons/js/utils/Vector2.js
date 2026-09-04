/**
 * Vector2 — minimal 2D vector type used by physics entities.
 * Note: the world uses a y-down screen coordinate system.
 */

export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy() {
    return new Vector2(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  /** Normalize in place. */
  normalize() {
    const l = this.length();
    if (l > 1e-9) this.scale(1 / l);
    return this;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  static add(a, b) {
    return new Vector2(a.x + b.x, a.y + b.y);
  }

  static sub(a, b) {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static scale(v, s) {
    return new Vector2(v.x * s, v.y * s);
  }

  /** Distance between two vectors. */
  static dist(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }
}
