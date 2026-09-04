/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Commander Active Tactical Abilities System
 */

import { state } from '../core/state.js';
import { audio } from '../core/audio.js';
import { particles } from '../rendering/particles.js';
import { events, EVENTS } from '../core/events.js';

export const ABILITIES = {
  orbital_strike: {
    id: 'orbital_strike',
    name: 'Orbital Beam Strike',
    key: 'Q',
    energyCost: 40,
    cooldown: 25, // seconds
    radius: 100,
    damage: 1800,
    damageType: 'ENERGY',
    icon: 'ABILITY_ORBITAL',
    desc: 'Calls down a concentrated satellite beam dealing 1,800 damage in a targeted radius.'
  },

  cryo_nova: {
    id: 'cryo_nova',
    name: 'Cryo Flash Freeze',
    key: 'W',
    energyCost: 35,
    cooldown: 20,
    radius: 160,
    freezeDuration: 3.5,
    icon: 'ABILITY_CRYO_NOVA',
    desc: 'Releases a sub-zero pulse freezing all enemies in area solid for 3.5 seconds.'
  },

  emp_overcharge: {
    id: 'emp_overcharge',
    name: 'EMP Blackout Pulse',
    key: 'E',
    energyCost: 50,
    cooldown: 30,
    radius: 9999, // global battlefield effect
    icon: 'ABILITY_EMP',
    desc: 'Battlefield-wide electromagnetic discharge. Depletes 100% of enemy shields and stuns all mechs for 2.5s.'
  },

  nanite_repair: {
    id: 'nanite_repair',
    name: 'Nanite Overclock',
    key: 'R',
    energyCost: 30,
    cooldown: 22,
    radius: 140,
    duration: 8.0,
    icon: 'ABILITY_NANITE',
    desc: 'Boosts attack speed of all defensive batteries in area by +100% for 8 seconds.'
  },

  supply_drop: {
    id: 'supply_drop',
    name: 'Emergency Supply Drop',
    key: 'T',
    energyCost: 60,
    cooldown: 40,
    radius: 0, // instant self-cast
    creditsGain: 250,
    icon: 'ABILITY_AIRDROP',
    desc: 'Transfers 250 emergency credits directly from orbital reserves.'
  }
};

export class AbilityManager {
  constructor() {
    this.abilities = ABILITIES;
  }

  canCast(abilityId) {
    const ab = this.abilities[abilityId];
    if (!ab) return false;
    if (state.energy < ab.energyCost) return false;
    if (state.abilityCooldowns[abilityId] > 0) return false;
    return true;
  }

  triggerAbility(abilityId, worldX = 0, worldY = 0) {
    const ab = this.abilities[abilityId];
    if (!this.canCast(abilityId)) return false;

    // Deduct energy & set cooldown
    state.useEnergy(ab.energyCost);
    state.abilityCooldowns[abilityId] = ab.cooldown;

    // Execute effect
    switch (abilityId) {
      case 'orbital_strike': {
        audio.playShoot('RAILGUN');
        particles.spawnExplosion(worldX, worldY, ab.radius, '#00f3ff', 'rgba(0, 243, 255, 0.8)');
        
        // Damage enemies in radius
        for (const enemy of state.enemies) {
          if (enemy.active && Math.hypot(enemy.x - worldX, enemy.y - worldY) <= ab.radius + enemy.size) {
            enemy.takeDamage(ab.damage, ab.damageType, null, true);
          }
        }
        break;
      }

      case 'cryo_nova': {
        audio.playShoot('CRYO');
        particles.spawnCryoFrost(worldX, worldY);
        particles.spawnExplosion(worldX, worldY, ab.radius, '#00d0ff', 'rgba(0, 208, 255, 0.7)');

        for (const enemy of state.enemies) {
          if (enemy.active && Math.hypot(enemy.x - worldX, enemy.y - worldY) <= ab.radius + enemy.size) {
            enemy.modifiers.add('FREEZE', ab.freezeDuration, 1.0);
          }
        }
        break;
      }

      case 'emp_overcharge': {
        audio.playShoot('TESLA');
        audio.playExplosion(1.5);
        
        for (const enemy of state.enemies) {
          if (enemy.active) {
            enemy.shield = 0;
            enemy.modifiers.add('STUN', 2.5, 1.0);
            particles.spawnTeslaChain(enemy.x - 20, enemy.y, enemy.x + 20, enemy.y, '#b5179e');
          }
        }
        break;
      }

      case 'nanite_repair': {
        audio.playUpgrade();
        particles.spawnExplosion(worldX, worldY, ab.radius, '#00ff88', 'rgba(0, 255, 136, 0.6)');

        for (const tower of state.towers) {
          if (Math.hypot(tower.x - worldX, tower.y - worldY) <= ab.radius) {
            tower.buffModifiers.fireRateMult = 2.0;
            setTimeout(() => {
              tower.buffModifiers.fireRateMult = 1.0;
            }, ab.duration * 1000);
          }
        }
        break;
      }

      case 'supply_drop': {
        audio.playPlacement();
        state.addCredits(ab.creditsGain);
        particles.spawnText(`+${ab.creditsGain} CREDITS`, 600, 400, '#00ff88', true);
        break;
      }
    }

    events.emit(EVENTS.ABILITY_TRIGGERED, { ability: ab, worldX, worldY });
    return true;
  }

  update(dtSec) {
    // Tick down cooldowns
    for (const key of Object.keys(state.abilityCooldowns)) {
      if (state.abilityCooldowns[key] > 0) {
        state.abilityCooldowns[key] = Math.max(0, state.abilityCooldowns[key] - dtSec);
      }
    }
  }
}

export const abilities = new AbilityManager();
