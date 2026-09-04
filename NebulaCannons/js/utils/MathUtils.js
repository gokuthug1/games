/**
 * MathUtils — pure math helpers used across the game.
 * No dependencies. All functions are deterministic and side-effect free.
 */

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Clamp a value between min and max. */
export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Linear interpolation between a and b by t (t clamped to [0,1]). */
export const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

/** Inverse lerp: where does v sit between a and b (unclamped)? */
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));

/** Remap v from range [a0,a1] to [b0,b1]. */
export const remap = (v, a0, a1, b0, b1) => b0 + (v - a0) * ((b1 - b0) / (a1 - a0));

/** Euclidean distance between two points. */
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

/** Squared distance — cheaper when only comparisons are needed. */
export const distSq = (ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export const degToRad = (d) => d * DEG;
export const radToDeg = (r) => r * RAD;

/**
 * Shortest-path angle interpolation in degrees.
 * Handles wraparound (e.g. 170 -> -170) smoothly.
 */
export const angleLerpDeg = (a, b, t) => {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * clamp(t, 0, 1);
};

/** Smooth 0..1 falloff used for explosion damage/craters. */
export const falloff = (d, radius, exponent = 1.5) => {
  if (d >= radius) return 0;
  return Math.pow(1 - d / radius, exponent);
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOutCubic = (t) => {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Frame-rate independent exponential damping toward a target. */
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Damped angle interpolation in degrees. */
export const dampAngleDeg = (current, target, lambda, dt) =>
  angleLerpDeg(current, target, 1 - Math.exp(-lambda * dt));

export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

/** Smoothstep 0..1 over [edge0, edge1]. */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Round to a fixed number of decimals (for HUD readouts). */
export const roundTo = (v, decimals = 0) => {
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
};

/** Format a number with thousands separators. */
export const formatInt = (v) => Math.round(v).toLocaleString('en-US');
