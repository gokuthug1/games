/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Persistent Storage Manager (LocalStorage)
 */

const STORAGE_KEY = 'aegis_protocol_save_v1';

const DEFAULT_SAVE_DATA = {
  version: 1,
  stats: {
    totalGamesPlayed: 0,
    victories: 0,
    defeats: 0,
    totalEnemiesKilled: 0,
    totalBossesKilled: 0,
    totalCreditsEarned: 0,
    totalDamageDealt: 0,
    highestEndlessWave: 0,
    highestScore: 0
  },
  campaign: {
    // mapId -> { unlocked: boolean, stars: number (0-3), highScore: number, completedModes: [] }
    map_01: { unlocked: true, stars: 0, highScore: 0, completed: false },
    map_02: { unlocked: false, stars: 0, highScore: 0, completed: false },
    map_03: { unlocked: false, stars: 0, highScore: 0, completed: false },
    map_04: { unlocked: false, stars: 0, highScore: 0, completed: false },
    map_05: { unlocked: false, stars: 0, highScore: 0, completed: false },
    map_06: { unlocked: false, stars: 0, highScore: 0, completed: false },
    map_07: { unlocked: false, stars: 0, highScore: 0, completed: false },
    map_08: { unlocked: false, stars: 0, highScore: 0, completed: false }
  },
  research: {
    points: 10,
    unlockedTechs: []
  },
  achievements: {
    unlocked: [],
    progress: {}
  },
  customMaps: [],
  settings: {
    masterVolume: 0.8,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    screenShake: true,
    damageNumbers: true,
    rangeIndicators: true,
    bloomEffects: true,
    showGrid: true,
    autoStartWave: false
  }
};

class StorageManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    let result = JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          result = this.mergeWithDefaults(parsed, DEFAULT_SAVE_DATA);
        }
      }
    } catch (e) {
      console.warn('[Storage] Failed to read from LocalStorage, initializing defaults:', e);
    }

    // Auto-unlock progression migration check
    const mapKeys = ['map_01', 'map_02', 'map_03', 'map_04', 'map_05', 'map_06', 'map_07', 'map_08'];
    if (result.campaign) {
      result.campaign['map_01'].unlocked = true;
      for (let i = 0; i < mapKeys.length - 1; i++) {
        const cur = result.campaign[mapKeys[i]];
        if (cur && (cur.completed || cur.stars > 0)) {
          const nextKey = mapKeys[i + 1];
          if (result.campaign[nextKey]) {
            result.campaign[nextKey].unlocked = true;
          }
        }
      }
    }

    return result;
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch (e) {
      console.error('[Storage] Failed to save to LocalStorage:', e);
    }
  }

  mergeWithDefaults(target, source) {
    const output = Object.assign({}, source, target);
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.mergeWithDefaults(target[key] || {}, source[key]);
      }
    }
    return output;
  }

  getSettings() {
    return this.data.settings;
  }

  saveSettings(settings) {
    this.data.settings = Object.assign(this.data.settings, settings);
    this.save();
  }

  getCampaignMap(mapId) {
    const defaultObj = { unlocked: mapId === 'map_01', stars: 0, highScore: 0, completed: false };
    const map = this.data.campaign[mapId] || defaultObj;
    if (mapId === 'map_01') {
      map.unlocked = true;
    }
    return map;
  }

  updateMapProgress(mapId, stars, score, nextMapId = null) {
    if (!this.data.campaign[mapId]) {
      this.data.campaign[mapId] = { unlocked: true, stars: 0, highScore: 0, completed: false };
    }
    
    const map = this.data.campaign[mapId];
    map.stars = Math.max(map.stars, stars);
    map.highScore = Math.max(map.highScore, score);
    map.completed = true;

    // Grant research points for new stars
    const newStarsGained = Math.max(0, stars - (map.previousStars || 0));
    if (newStarsGained > 0) {
      this.addResearchPoints(newStarsGained * 2);
      map.previousStars = map.stars;
    }

    // Auto-unlock next sequential map
    const mapKeys = ['map_01', 'map_02', 'map_03', 'map_04', 'map_05', 'map_06', 'map_07', 'map_08'];
    const currentIdx = mapKeys.indexOf(mapId);
    if (currentIdx >= 0 && currentIdx < mapKeys.length - 1) {
      const nextKey = mapKeys[currentIdx + 1];
      if (!this.data.campaign[nextKey]) {
        this.data.campaign[nextKey] = { unlocked: true, stars: 0, highScore: 0, completed: false };
      } else {
        this.data.campaign[nextKey].unlocked = true;
      }
    }

    if (nextMapId && this.data.campaign[nextMapId]) {
      this.data.campaign[nextMapId].unlocked = true;
    }

    this.save();
  }

  getResearch() {
    return this.data.research;
  }

  addResearchPoints(amount) {
    this.data.research.points += amount;
    this.save();
  }

  unlockTech(techId, cost) {
    if (this.data.research.points >= cost && !this.isTechUnlocked(techId)) {
      this.data.research.points -= cost;
      this.data.research.unlockedTechs.push(techId);
      this.save();
      return true;
    }
    return false;
  }

  isTechUnlocked(techId) {
    return this.data.research.unlockedTechs.includes(techId);
  }

  resetTechTree() {
    // Refund all spent points
    // Will be calculated based on research data
    this.data.research.unlockedTechs = [];
    this.save();
  }

  getAchievements() {
    return this.data.achievements;
  }

  unlockAchievement(achId) {
    if (!this.data.achievements.unlocked.includes(achId)) {
      this.data.achievements.unlocked.push(achId);
      this.save();
      return true;
    }
    return false;
  }

  getCustomMaps() {
    return this.data.customMaps;
  }

  saveCustomMap(mapObj) {
    const existingIdx = this.data.customMaps.findIndex(m => m.id === mapObj.id);
    if (existingIdx >= 0) {
      this.data.customMaps[existingIdx] = mapObj;
    } else {
      this.data.customMaps.push(mapObj);
    }
    this.save();
  }

  deleteCustomMap(mapId) {
    this.data.customMaps = this.data.customMaps.filter(m => m.id !== mapId);
    this.save();
  }

  recordGameStats(statsDelta) {
    for (const [key, val] of Object.entries(statsDelta)) {
      if (this.data.stats[key] !== undefined) {
        if (key === 'highestEndlessWave' || key === 'highestScore') {
          this.data.stats[key] = Math.max(this.data.stats[key], val);
        } else {
          this.data.stats[key] += val;
        }
      }
    }
    this.save();
  }

  resetAllData() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
    this.save();
  }
}

export const storage = new StorageManager();
