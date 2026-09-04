/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Tech Tree / Research Progression System
 */

import { RESEARCH_DATA } from '../data/research_data.js';
import { storage } from '../core/storage.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

export class TechTreeSystem {
  constructor() {
    this.techs = RESEARCH_DATA;
  }

  getUnlockedTechIds() {
    return storage.getResearch().unlockedTechs;
  }

  getResearchPoints() {
    return storage.getResearch().points;
  }

  canUnlock(techId) {
    const tech = this.techs.find(t => t.id === techId);
    if (!tech) return false;
    if (this.isUnlocked(techId)) return false;

    // Check points
    if (this.getResearchPoints() < tech.cost) return false;

    // Check prerequisites
    if (tech.prerequisites && tech.prerequisites.length > 0) {
      const unlocked = this.getUnlockedTechIds();
      for (const req of tech.prerequisites) {
        if (!unlocked.includes(req)) return false;
      }
    }

    return true;
  }

  isUnlocked(techId) {
    return this.getUnlockedTechIds().includes(techId);
  }

  unlock(techId) {
    const tech = this.techs.find(t => t.id === techId);
    if (!tech || !this.canUnlock(techId)) return false;

    const success = storage.unlockTech(techId, tech.cost);
    if (success) {
      audio.playUpgrade();
    }
    return success;
  }

  resetAllTechs() {
    // Calculate total points spent
    const unlocked = this.getUnlockedTechIds();
    let totalRefund = 0;
    for (const id of unlocked) {
      const t = this.techs.find(item => item.id === id);
      if (t) totalRefund += t.cost;
    }

    storage.resetTechTree();
    storage.addResearchPoints(totalRefund);
    audio.playUIClick();
  }

  applyPerksToTower(tower) {
    const unlocked = this.getUnlockedTechIds();

    for (const techId of unlocked) {
      const tech = this.techs.find(t => t.id === techId);
      if (!tech || !tech.effects) continue;

      const eff = tech.effects;

      // Kinetic Buffs
      if (eff.kineticDamage && ['gatling', 'mortar', 'missile'].includes(tower.typeId)) {
        tower.buffModifiers.damageMult *= (1 + eff.kineticDamage);
      }
      if (eff.kineticRange && ['gatling', 'railgun'].includes(tower.typeId)) {
        tower.buffModifiers.rangeMult *= (1 + eff.kineticRange);
      }

      // Energy Buffs
      if (eff.energyDamage && ['laser', 'tesla', 'plasma'].includes(tower.typeId)) {
        tower.buffModifiers.damageMult *= (1 + eff.energyDamage);
      }

      // Cryo Buffs
      if (eff.cryoSlowFactor && tower.typeId === 'cryo') {
        tower.stats.slowFactor = (tower.stats.slowFactor || 0.4) + eff.cryoSlowFactor;
      }
    }
  }

  getStartingBonusCredits() {
    let bonus = 0;
    if (this.isUnlocked('tech_command_1')) {
      bonus += 150;
    }
    return bonus;
  }

  getBonusLives() {
    let lives = 0;
    if (this.isUnlocked('tech_command_2')) {
      lives += 5;
    }
    return lives;
  }
}

export const techTree = new TechTreeSystem();
