/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Comprehensive Achievements Tracking System
 */

import { storage } from '../core/storage.js';
import { events, EVENTS } from '../core/events.js';
import { audio } from '../core/audio.js';

export const ACHIEVEMENTS_LIST = [
  {
    id: 'first_kill',
    name: 'First Vector Terminated',
    desc: 'Destroy your first invading enemy unit.',
    icon: 'SKULL',
    reward: 1
  },
  {
    id: 'boss_slayer_1',
    name: 'Titan Falls',
    desc: 'Defeat a Goliath Titan Boss Mech.',
    icon: 'TROPHY',
    reward: 2
  },
  {
    id: 'tower_specialist',
    name: 'Apex Specialization',
    desc: 'Promote any Tier 3 tower to a specialized branch.',
    icon: 'UPGRADE',
    reward: 2
  },
  {
    id: 'economic_tycoon',
    name: 'Quantum Compound',
    desc: 'Amass 2,500 credits in the bank during a single mission.',
    icon: 'CREDITS',
    reward: 2
  },
  {
    id: 'laser_master',
    name: 'Prismatic Annihilation',
    desc: 'Inflict 10,000 total Energy damage to enemy shields.',
    icon: 'DAMAGE_ENERGY',
    reward: 2
  },
  {
    id: 'cryo_lockdown',
    name: 'Absolute Permafrost',
    desc: 'Freeze 50 enemies in a single match.',
    icon: 'DAMAGE_CRYO',
    reward: 2
  },
  {
    id: 'railgun_sniper',
    name: 'Hypersonic Penetration',
    desc: 'Pierce 5 or more enemies in a single Railgun shot.',
    icon: 'TARGET',
    reward: 3
  },
  {
    id: 'orbital_commander',
    name: 'Orbital Supremacy',
    desc: 'Call down 10 Orbital Strikes across your career.',
    icon: 'ABILITY_ORBITAL',
    reward: 3
  },
  {
    id: 'perfect_defense',
    name: 'Flawless Bastion',
    desc: 'Complete any campaign mission without losing a single life.',
    icon: 'SHIELD',
    reward: 4
  },
  {
    id: 'campaign_victor',
    name: 'Savior of the Core',
    desc: 'Complete all 8 campaign sectors.',
    icon: 'STAR',
    reward: 10
  }
];

export class AchievementSystem {
  constructor() {
    this.achievements = ACHIEVEMENTS_LIST;
    this.initListeners();
  }

  initListeners() {
    events.on(EVENTS.ENEMY_KILLED, ({ enemy }) => {
      this.checkUnlock('first_kill');
      if (enemy.isBoss) {
        this.checkUnlock('boss_slayer_1');
      }
    });

    events.on(EVENTS.TOWER_UPGRADED, ({ tower }) => {
      if (tower.chosenBranch) {
        this.checkUnlock('tower_specialist');
      }
    });

    events.on(EVENTS.CREDITS_CHANGED, ({ credits }) => {
      if (credits >= 2500) {
        this.checkUnlock('economic_tycoon');
      }
    });

    events.on(EVENTS.GAME_VICTORY, () => {
      // Check if flawless
      // Further checks handled in ui_manager
    });
  }

  isUnlocked(achId) {
    return storage.getAchievements().unlocked.includes(achId);
  }

  checkUnlock(achId) {
    if (this.isUnlocked(achId)) return false;

    const ach = this.achievements.find(a => a.id === achId);
    if (!ach) return false;

    const unlocked = storage.unlockAchievement(achId);
    if (unlocked) {
      storage.addResearchPoints(ach.reward || 1);
      audio.playVictory();
      events.emit(EVENTS.ACHIEVEMENT_UNLOCKED, { achievement: ach });
      events.emit(EVENTS.TOAST_NOTIFY, {
        title: 'ACHIEVEMENT UNLOCKED',
        message: `${ach.name} (+${ach.reward} Research Points)`,
        type: 'achievement'
      });
      return true;
    }
    return false;
  }
}

export const achievements = new AchievementSystem();
