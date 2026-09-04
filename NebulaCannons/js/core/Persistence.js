/**
 * Persistence — safe localStorage wrapper.
 * The game must remain fully playable when storage is unavailable or
 * corrupted, so every read/write is wrapped and falls back gracefully.
 */

const PREFIX = 'nebula-cannons:';

const mem = new Map();

function storageAvailable() {
  try {
    const k = '__nc_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const available = typeof window !== 'undefined' ? storageAvailable() : false;

export const Persistence = {
  isAvailable: available,

  /** Read a value; returns fallback on any failure. */
  get(key, fallback = null) {
    try {
      if (available) {
        const raw = window.localStorage.getItem(PREFIX + key);
        if (raw === null) return fallback;
        return raw;
      }
      return mem.has(key) ? mem.get(key) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      if (available) {
        window.localStorage.setItem(PREFIX + key, String(value));
      } else {
        mem.set(key, String(value));
      }
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      if (available) {
        window.localStorage.removeItem(PREFIX + key);
      } else {
        mem.delete(key);
      }
    } catch {
      /* ignore */
    }
  },

  /** Read + parse JSON; returns fallback when missing/corrupt. */
  loadJSON(key, fallback) {
    const raw = this.get(key, null);
    if (raw === null) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed === undefined ? fallback : parsed;
    } catch {
      console.warn(`[Persistence] corrupt saved data for "${key}", using defaults`);
      return fallback;
    }
  },

  saveJSON(key, value) {
    try {
      return this.set(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
};
