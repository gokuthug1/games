/**
 * Random — seeded RNG so that maps and behavior can be deterministic.
 * Deterministic generation keeps the physics/debug experience reproducible
 * and makes future multiplayer sync far easier.
 */

/** Fast deterministic PRNG (mulberry32). Returns a function producing [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;

/** Random 32-bit seed from the system clock. */
export const randomSeed = () => (Math.random() * 0xffffffff) >>> 0;

export class RNG {
  /**
   * @param {number} seed unsigned 32-bit integer
   */
  constructor(seed) {
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }

  /** Uniform [0,1). */
  next() {
    return this._next();
  }

  /** Uniform [min, max). */
  range(min, max) {
    return min + this._next() * (max - min);
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /** Pick a random element of an array. */
  pick(arr) {
    return arr[Math.floor(this._next() * arr.length)];
  }

  /** True with probability p. */
  chance(p) {
    return this._next() < p;
  }

  /** Approximate normal distribution (mean, std). */
  gaussian(mean = 0, std = 1) {
    // Box–Muller
    const u = 1 - this._next();
    const v = this._next();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }

  /** In-place Fisher–Yates shuffle. */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
