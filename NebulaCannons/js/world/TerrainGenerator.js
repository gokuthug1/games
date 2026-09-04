/**
 * TerrainGenerator — seeded procedural heightmap generation.
 * Uses layered 1D value noise (smoothstep-interpolated control points) so
 * profiles are varied but always smooth enough for tanks to drive on.
 *
 * Heights are stored as y coordinates of the terrain *surface* in world
 * space (y-down): larger value = lower terrain.
 */

import { RNG } from '../utils/Random.js';
import { clamp } from '../utils/MathUtils.js';

/** One octave of value noise across the width. */
function noiseLayer(width, rng, spacing, amp) {
  const n = Math.ceil(width / spacing) + 2;
  const pts = new Float32Array(n);
  for (let i = 0; i < n; i++) pts[i] = rng.range(0, amp);

  const out = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const f = x / spacing;
    const i0 = Math.floor(f);
    const t = f - i0;
    const a = pts[i0];
    const b = pts[i0 + 1];
    // smoothstep interpolation between control points
    const s = t * t * (3 - 2 * t);
    out[x] = a + (b - a) * s;
  }
  return out;
}

/**
 * Generate a heightmap (Float32Array, one entry per world x pixel).
 * @param {number} width world width in px
 * @param {number} seed deterministic seed
 * @param {object} config world config (WORLD.*)
 * @param {string} [archetype] 'classic' | 'canyon' | 'plateau' | 'dunes' |
 *   'peaks' | 'rift' — a distinct terrain personality.
 */
export function generateTerrain(width, seed, config, archetype = 'classic') {
  const rng = new RNG(seed);
  const { GROUND_BASE, GROUND_MIN } = config;

  const big = noiseLayer(width, rng, 430, 250);
  const mid = noiseLayer(width, rng, 175, 135);
  const fine = noiseLayer(width, rng, 64, 46);

  const heights = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    let hills;
    switch (archetype) {
      case 'canyon': {
        // Tall walls with deep, flattened valley floors.
        const cut = Math.abs(big[x] - 125);
        hills = big[x] * 1.25 - cut * 2.2 + mid[x] * 0.35 + fine[x] * 0.3;
        break;
      }
      case 'plateau': {
        // Quantized terraces → mesas with (climbable) cliffs.
        hills = Math.round(big[x] / 110) * 110 + mid[x] * 0.3 + fine[x] * 0.3;
        break;
      }
      case 'dunes': {
        // Gentle rolling ridges.
        hills = big[x] * 0.42 + mid[x] * 0.5 + fine[x] * 0.35;
        break;
      }
      case 'peaks': {
        // Narrow, tall spikes with broad bases.
        hills = Math.pow(big[x] / 250, 1.5) * 250 * 1.4 + mid[x] * 0.3 + fine[x] * 0.35;
        break;
      }
      case 'rift': {
        // A flat valley floor splitting two raised walls.
        const cx = Math.abs(x - width / 2) / (width / 2);
        const valley = Math.pow(1 - cx, 2.2);
        hills = big[x] * 0.7 * (1 - valley * 0.5) + valley * 120 - (1 - valley) * 160 + mid[x] * 0.25;
        break;
      }
      default: {
        hills = big[x] + mid[x] * 0.6 + fine[x] * 0.35;
      }
    }
    heights[x] = clamp(GROUND_BASE - hills, GROUND_MIN, GROUND_BASE);
  }

  // One smoothing pass removes any remaining harsh single-pixel jumps.
  for (let pass = 0; pass < 2; pass++) {
    for (let x = 2; x < width - 2; x++) {
      heights[x] =
        (heights[x - 2] + heights[x - 1] + heights[x] + heights[x + 1] + heights[x + 2]) / 5;
    }
  }

  // Clamp the per-pixel slope so tanks can always drive anywhere: no wall
  // can ever exceed MAX_SLOPE px per pixel (drivable cliff limit).
  const MAX_SLOPE = 7;
  for (let pass = 0; pass < 3; pass++) {
    for (let x = 1; x < width; x++) {
      const d = heights[x] - heights[x - 1];
      if (d > MAX_SLOPE) heights[x] = heights[x - 1] + MAX_SLOPE;
      else if (d < -MAX_SLOPE) heights[x] = heights[x - 1] - MAX_SLOPE;
    }
    for (let x = width - 2; x >= 0; x--) {
      const d = heights[x] - heights[x + 1];
      if (d > MAX_SLOPE) heights[x] = heights[x + 1] + MAX_SLOPE;
      else if (d < -MAX_SLOPE) heights[x] = heights[x + 1] - MAX_SLOPE;
    }
  }
  return heights;
}
