/**
 * Map — bundles a generated terrain with fair, valid tank spawn points.
 * Spawns avoid steep slopes, the world edges and each other.
 *
 * Each map also carries a terrain archetype (canyon, plateau, dunes, peaks,
 * rift or classic) derived from the seed, so battles feel different not
 * just in layout but in character.
 */

import { Terrain } from './Terrain.js';
import { CONFIG } from '../core/Config.js';

export const ARCHETYPES = ['classic', 'canyon', 'plateau', 'dunes', 'peaks', 'rift'];

const MAP_NAMES = {
  classic: ['Craters of Neon', 'Silent Valley', 'Halo Basin', 'Neon Flats', 'The Divide'],
  canyon: ['Canyon Drift', 'Grand Rift', 'Echo Canyon', 'Sunken Gorge'],
  plateau: ['Twin Peaks', 'Mesa Heights', 'Plateau Prime', 'Sky Tables'],
  dunes: ['Dune Sea', 'Golden Ripples', 'Shifting Sands', 'Whisper Dunes'],
  peaks: ['Obsidian Ridge', 'Iron Ridge', 'Jagged Spire', 'Crystal Crown'],
  rift: ['Broken Earth', 'Rift Valley', 'Cracked Core', 'Shattered Plains'],
};

/** Terrain archetype for a seed. */
export function archetypeFor(seed) {
  return ARCHETYPES[(seed >>> 0) % ARCHETYPES.length];
}

/** Human-friendly map name derived deterministically from a seed. */
export function mapNameFor(seed) {
  const s = seed >>> 0;
  const arch = archetypeFor(s);
  const list = MAP_NAMES[arch];
  // Scramble the seed's low bits so neighbouring seeds (the map select
  // shows four fresh seeds side by side) don't collide on the same name.
  const h = (s ^ (s >>> 11) ^ (s << 3)) >>> 0;
  return list[h % list.length];
}

export class Map {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.archetype = archetypeFor(this.seed);
    this.terrain = new Terrain(CONFIG, this.seed, this.archetype);
  }

  /**
   * Pick `n` fair spawn positions (world x). Tries hard to find flat,
   * separated spots and falls back to even spacing if generation is odd.
   * @returns {Array<{x: number, y: number}>}
   */
  pickSpawns(n, minSeparation = 560) {
    const terrain = this.terrain;
    const W = CONFIG.WORLD.WIDTH;
    const margin = CONFIG.WORLD.EDGE_MARGIN;

    const candidates = [];
    for (let x = margin; x <= W - margin; x += 3) {
      const y = terrain.heightAt(x);
      const slope = Math.abs(Math.tan(terrain.slopeAt(x, 30)));
      if (slope > 0.28) continue; // too steep
      if (y > CONFIG.WORLD.GROUND_BASE - 30) continue; // too low (near flat bottom) is fine actually
      const flat = slope * 60 + Math.abs(terrain.heightAt(x + 90) - terrain.heightAt(x - 90)) * 0.4;
      candidates.push({ x, y, score: flat });
    }
    if (candidates.length < n) {
      // Fallback: even spacing on the first valid-ish column band.
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = margin + ((W - margin * 2) * i) / Math.max(1, n - 1);
        pts.push({ x, y: terrain.heightAt(x) });
      }
      return pts;
    }

    candidates.sort((a, b) => a.score - b.score);
    const chosen = [];
    for (const c of candidates) {
      if (chosen.some((p) => Math.abs(p.x - c.x) < minSeparation)) continue;
      chosen.push(c);
      if (chosen.length >= n) break;
    }
    // If greedy pick failed to fill, top up from remaining candidates.
    for (const c of candidates) {
      if (chosen.length >= n) break;
      if (!chosen.some((p) => Math.abs(p.x - c.x) < minSeparation * 0.6)) chosen.push(c);
    }
    return chosen.slice(0, n);
  }
}
