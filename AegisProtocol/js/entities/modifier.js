/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Modifier & Status Effect System
 */

import { STATUS_EFFECTS } from '../core/constants.js';

export class StatusEffect {
  constructor(type, duration, strength = 1, options = {}) {
    this.type = type;
    this.duration = duration;
    this.maxDuration = duration;
    this.strength = strength;
    this.options = options;
    this.tickTimer = 0;
    this.tickInterval = options.tickInterval || 0.5; // DoT tick rate
    this.stacks = options.stacks || 1;
    this.maxStacks = options.maxStacks || 10;
  }

  refresh(duration, strength, addStacks = 1) {
    this.duration = Math.max(this.duration, duration);
    this.strength = Math.max(this.strength, strength);
    this.stacks = Math.min(this.maxStacks, this.stacks + addStacks);
  }

  update(dtSec, target) {
    this.duration -= dtSec;
    this.tickTimer += dtSec;

    if (this.tickTimer >= this.tickInterval) {
      this.tickTimer -= this.tickInterval;
      this.applyTick(target);
    }

    return this.duration > 0;
  }

  applyTick(target) {
    switch (this.type) {
      case STATUS_EFFECTS.BURN: {
        const dps = (this.options.dps || 20) * this.strength;
        target.takeDamage(dps * this.tickInterval, 'THERMAL', null, false);
        break;
      }
      case STATUS_EFFECTS.CORROSION: {
        const dps = (this.options.dpsPerStack || 8) * this.stacks;
        target.takeDamage(dps * this.tickInterval, 'CORROSIVE', null, false);
        break;
      }
      case STATUS_EFFECTS.ELECTRIFIED: {
        const dps = (this.options.dps || 15) * this.strength;
        target.takeDamage(dps * this.tickInterval, 'SHOCK', null, false);
        break;
      }
    }
  }
}

export class ModifierManager {
  constructor(target) {
    this.target = target;
    this.effects = new Map();
  }

  add(type, duration, strength = 1, options = {}) {
    if (this.effects.has(type)) {
      this.effects.get(type).refresh(duration, strength, options.stacks || 1);
    } else {
      this.effects.set(type, new StatusEffect(type, duration, strength, options));
    }
  }

  has(type) {
    return this.effects.has(type);
  }

  get(type) {
    return this.effects.get(type);
  }

  remove(type) {
    this.effects.delete(type);
  }

  update(dtSec) {
    for (const [type, effect] of this.effects.entries()) {
      const active = effect.update(dtSec, this.target);
      if (!active) {
        this.effects.delete(type);
      }
    }
  }

  getSpeedMultiplier() {
    if (this.has(STATUS_EFFECTS.FREEZE) || this.has(STATUS_EFFECTS.STUN)) {
      return 0; // Frozen/Stunned in place
    }
    let mult = 1.0;
    if (this.has(STATUS_EFFECTS.SLOW)) {
      const slow = this.effects.get(STATUS_EFFECTS.SLOW);
      mult *= Math.max(0.15, 1 - slow.strength);
    }
    return mult;
  }

  getEffectiveArmor(baseArmor) {
    let armor = baseArmor;
    if (this.has(STATUS_EFFECTS.CORROSION)) {
      const corr = this.effects.get(STATUS_EFFECTS.CORROSION);
      const shred = (corr.options.armorShredPerStack || 2) * corr.stacks;
      armor = Math.max(0, armor - shred);
    }
    if (this.has(STATUS_EFFECTS.ARMOR_SHATTER)) {
      armor *= 0.5;
    }
    return armor;
  }

  getDamageMultiplier() {
    let mult = 1.0;
    if (this.has(STATUS_EFFECTS.MARK_OF_DEATH)) {
      mult *= 1.35;
    }
    // Thermal Shock combo bonus (Cryo + Thermal)
    if (this.has(STATUS_EFFECTS.SLOW) && this.has(STATUS_EFFECTS.BURN)) {
      mult *= 1.4;
    }
    return mult;
  }

  clear() {
    this.effects.clear();
  }
}
