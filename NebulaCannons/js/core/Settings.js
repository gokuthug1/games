/**
 * Settings — runtime settings with validation, sanitization and persistence.
 * Settings are merged over DEFAULT_SETTINGS so corrupted saves can never
 * break the game: bad values fall back to defaults.
 */

import { DEFAULT_SETTINGS } from './Config.js';
import { Persistence } from './Persistence.js';

const KEYS = ['settings', 'stats'];

const NUMERIC = ['masterVolume', 'sfxVolume', 'musicVolume', 'uiScale'];
const BOOLEAN = ['reducedMotion', 'debug', 'showTrajectory', 'selfDamage', 'flipRotation'];
const STRING = ['difficulty', 'mobileQuality'];
const OBJECT = ['bindings'];

const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD', 'EXPERT'];
const MOBILE_QUALITIES = ['low', 'balanced', 'high'];
const ACTIONS = Object.keys(DEFAULT_SETTINGS.bindings);

/** Deep-copy the nested mobileLayout structure so stored values are never
 * shared with (or able to mutate) the frozen defaults. */
function deepCopyMobileLayout(ml) {
  const src = ml || {};
  return {
    custom: src.custom === true,
    zones: {
      left: { x: Number(src.zones?.left?.x) || 0, y: Number(src.zones?.left?.y) || 0 },
      right: { x: Number(src.zones?.right?.x) || 0, y: Number(src.zones?.right?.y) || 0 },
    },
    chipOrder: Array.isArray(src.chipOrder) ? [...src.chipOrder] : [],
  };
}

/** Clamp mobile-layout zone coordinates to 0–100 with a fallback. */
function sanitizeMobileLayout(input, defaults) {
  const d = deepCopyMobileLayout(defaults);
  if (!input || typeof input !== 'object') return d;
  const clampPct = (v, fb) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : fb;
  };
  for (const side of ['left', 'right']) {
    const z = (input.zones && input.zones[side]) || {};
    d.zones[side] = {
      x: clampPct(z.x, d.zones[side].x),
      y: clampPct(z.y, d.zones[side].y),
    };
  }
  d.custom = input.custom === true;
  d.chipOrder = Array.isArray(input.chipOrder)
    ? input.chipOrder.filter((id) => typeof id === 'string').slice(0, 12)
    : [];
  return d;
}

/** Per-weapon mastery tiers keyed on kills. Bronze/Silver/Gold each add a
 * small damage bonus to the human player's shots with that weapon. */
export const MASTERY_TIERS = [
  { tier: 'bronze', kills: 5, damageMult: 1.05, label: 'Bronze' },
  { tier: 'silver', kills: 15, damageMult: 1.10, label: 'Silver' },
  { tier: 'gold', kills: 30, damageMult: 1.15, label: 'Gold' },
];

function sanitize(input, defaults) {
  if (!input || typeof input !== 'object') return { ...defaults };
  const out = { ...defaults };
  for (const k of NUMERIC) {
    const v = Number(input[k]);
    if (Number.isFinite(v)) {
      if (k === 'uiScale') out[k] = Math.min(1.4, Math.max(0.8, v));
      else out[k] = Math.min(1, Math.max(0, v));
    }
  }
  for (const k of BOOLEAN) {
    if (typeof input[k] === 'boolean') out[k] = input[k];
  }
  if (DIFFICULTIES.includes(input.difficulty)) out.difficulty = input.difficulty;
  if (MOBILE_QUALITIES.includes(input.mobileQuality)) out.mobileQuality = input.mobileQuality;
  if (input.bindings && typeof input.bindings === 'object') {
    const b = {};
    for (const action of ACTIONS) {
      const codes = Array.isArray(input.bindings[action])
        ? input.bindings[action].filter((c) => typeof c === 'string')
        : [];
      b[action] = codes.length ? codes.slice(0, 4) : [...defaults.bindings[action]];
    }
    out.bindings = b;
  }
  out.mobileLayout = sanitizeMobileLayout(input.mobileLayout, defaults.mobileLayout);
  return out;
}

export class Settings {
  constructor() {
    this.values = {
      ...DEFAULT_SETTINGS,
      bindings: deepCopyBindings(DEFAULT_SETTINGS.bindings),
      mobileLayout: deepCopyMobileLayout(DEFAULT_SETTINGS.mobileLayout),
    };
    this.stats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      shotsFired: 0,
      directHits: 0,
      tanksDestroyed: 0,
      victoriesByMode: { pvp: 0, pva: 0 },
      /** One-time "the battlefield is rotated" hint (shown at the start of
       *  the first portrait match). Lives with the other non-gameplay stats. */
      rotationHintSeen: false,
    };
  }

  load() {
    this.values = sanitize(Persistence.loadJSON(KEYS[0], null), DEFAULT_SETTINGS);
    const saved = Persistence.loadJSON(KEYS[1], null);
    if (saved && typeof saved === 'object') {
      this.stats = { ...this.stats, ...saved };
      this.stats.victoriesByMode = { ...this.stats.victoriesByMode, ...(saved.victoriesByMode || {}) };
    }
    return this;
  }

  save() {
    Persistence.saveJSON(KEYS[0], this.values);
    Persistence.saveJSON(KEYS[1], this.stats);
  }

  get(k) {
    // Defensive copy: callers must never mutate stored state through the
    // getter (nested objects like bindings/mobileLayout are rebuilt fresh).
    return sanitize(this.values, DEFAULT_SETTINGS)[k];
  }

  set(k, v) {
    this.values = sanitize({ ...this.values, [k]: v }, DEFAULT_SETTINGS);
    this.save();
  }

  /** Full settings object (sanitized). */
  all() {
    return sanitize(this.values, DEFAULT_SETTINGS);
  }

  /** Rebind an action to a keyboard code. Returns true on success. */
  rebind(action, code) {
    if (!ACTIONS.includes(action)) return false;
    const bindings = deepCopyBindings(this.values.bindings);
    const existing = new Set(bindings[action]);
    existing.add(code);
    bindings[action] = [...existing].slice(0, 4);
    this.values.bindings = bindings;
    this.save();
    return true;
  }

  resetBindings() {
    this.values.bindings = deepCopyBindings(DEFAULT_SETTINGS.bindings);
    this.save();
  }

  // ---- stats helpers ----
  recordStat(stat, delta = 1) {
    this.stats[stat] = (this.stats[stat] || 0) + delta;
    this.save();
  }

  /** Per-weapon stats: { weaponId: { used, kills } } */
  weaponStats() {
    if (!this.stats.weapons) this.stats.weapons = {};
    return this.stats.weapons;
  }

  recordWeaponUse(weaponId) {
    const w = this.weaponStats();
    w[weaponId] = w[weaponId] || { used: 0, kills: 0 };
    w[weaponId].used += 1;
    this.save();
  }

  recordWeaponKill(weaponId) {
    const w = this.weaponStats();
    w[weaponId] = w[weaponId] || { used: 0, kills: 0 };
    w[weaponId].kills += 1;
    this.save();
  }

  /**
   * Mastery tier earned with a weapon from tracked kills.
   * @returns {{ tier: string|null, kills: number, damageMult: number, label: string|null, next: number|null }}
   */
  weaponMastery(weaponId) {
    const kills = (this.weaponStats()[weaponId] || {}).kills || 0;
    let earned = null;
    for (const t of MASTERY_TIERS) {
      if (kills >= t.kills) earned = t;
    }
    const nextTier = MASTERY_TIERS.find((t) => kills < t.kills) || null;
    return {
      tier: earned ? earned.tier : null,
      kills,
      damageMult: earned ? earned.damageMult : 1,
      label: earned ? earned.label : null,
      next: nextTier ? nextTier.kills : null,
      nextLabel: nextTier ? nextTier.label : null,
    };
  }

  recordMatch(mode, won) {
    this.stats.gamesPlayed += 1;
    if (won) {
      this.stats.wins += 1;
      this.stats.victoriesByMode[mode] = (this.stats.victoriesByMode[mode] || 0) + 1;
    } else {
      this.stats.losses += 1;
    }
    this.save();
  }

  /** Whether the one-time portrait rotation hint should still be shown. */
  rotationHintPending() {
    return this.stats.rotationHintSeen !== true;
  }

  /** Mark the rotation hint as shown (persisted; reset with progress). */
  markRotationHintShown() {
    this.stats.rotationHintSeen = true;
    this.save();
  }
}


function deepCopyBindings(b) {
  const out = {};
  for (const k of Object.keys(b)) out[k] = [...b[k]];
  return out;
}
