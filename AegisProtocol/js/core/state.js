/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Central Game State Store
 */

import { CONFIG, MATH_MODELS } from './constants.js';
import { events, EVENTS } from './events.js';

export const GAME_SCREENS = {
  MAIN_MENU: 'screen-main-menu',
  CAMPAIGN_SELECT: 'screen-campaign-select',
  GAMEPLAY: 'screen-gameplay',
  TECH_TREE: 'screen-tech-tree',
  CODEX: 'screen-codex',
  MAP_EDITOR: 'screen-map-editor',
  ACHIEVEMENTS: 'screen-achievements',
  SETTINGS: 'screen-settings'
};

export const GAME_MODES = {
  CAMPAIGN: 'CAMPAIGN',
  ENDLESS: 'ENDLESS',
  SANDBOX: 'SANDBOX',
  BOSS_RUSH: 'BOSS_RUSH'
};

class GameState {
  constructor() {
    this.resetState();
  }

  resetState() {
    // Current Active Screen
    this.currentScreen = GAME_SCREENS.MAIN_MENU;
    
    // Play Session State
    this.mode = GAME_MODES.CAMPAIGN;
    this.currentMapId = 'map_01';
    this.currentMapData = null;
    
    // Play State
    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.speedIndex = 0; // index in CONFIG.SPEED_MULTIPLIERS
    
    // Resources
    this.credits = CONFIG.DEFAULT_CREDITS;
    this.lives = CONFIG.DEFAULT_LIVES;
    this.maxLives = CONFIG.DEFAULT_LIVES;
    this.energy = CONFIG.DEFAULT_ENERGY;
    this.maxEnergy = CONFIG.DEFAULT_ENERGY;
    this.score = 0;
    this.totalEarnedCredits = 0;
    this.totalDamageDealt = 0;
    this.enemiesKilled = 0;
    this.bossesKilled = 0;
    
    // Wave status
    this.currentWave = 0;
    this.totalWaves = 20;
    this.waveInProgress = false;
    this.waveTimer = 0;
    this.waveAutoStart = false;
    
    // Kill streak & multiplier
    this.killStreak = 0;
    this.lastKillTimestamp = 0;
    this.killStreakMultiplier = 1.0;
    
    // Selection state
    this.selectedTowerType = null; // for placement
    this.selectedEntity = null;    // placed tower or enemy for inspection
    this.mouseGridX = 0;
    this.mouseGridY = 0;
    this.mouseWorldX = 0;
    this.mouseWorldY = 0;
    this.isPlacementValid = false;
    this.isDragging = false;
    
    // Commander Abilities Cooldowns (in ms remaining)
    this.abilityCooldowns = {
      orbital_strike: 0,
      cryo_nova: 0,
      emp_overcharge: 0,
      nanite_repair: 0,
      supply_drop: 0
    };
    
    // Active commander target mode
    this.activeAbilityTargeting = null;

    // Runtime Entities Collections
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.activeAuras = [];
  }

  get gameSpeed() {
    if (this.isPaused) return 0;
    return CONFIG.SPEED_MULTIPLIERS[this.speedIndex] || 1;
  }

  setCredits(amount) {
    const prev = this.credits;
    this.credits = Math.max(0, Math.floor(amount));
    if (this.credits > prev) {
      this.totalEarnedCredits += (this.credits - prev);
    }
    events.emit(EVENTS.CREDITS_CHANGED, { credits: this.credits, delta: this.credits - prev });
  }

  addCredits(amount) {
    this.setCredits(this.credits + amount);
  }

  spendCredits(amount) {
    if (this.credits >= amount) {
      this.setCredits(this.credits - amount);
      return true;
    }
    return false;
  }

  setLives(amount) {
    const prev = this.lives;
    this.lives = Math.max(0, Math.floor(amount));
    events.emit(EVENTS.LIVES_CHANGED, { lives: this.lives, delta: this.lives - prev });
    
    if (this.lives <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.isPlaying = false;
      events.emit(EVENTS.GAME_OVER, { score: this.score, wave: this.currentWave });
    }
  }

  takeDamage(amount = 1) {
    this.setLives(this.lives - amount);
  }

  setEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, Math.max(0, amount));
    events.emit(EVENTS.ENERGY_CHANGED, { energy: this.energy, max: this.maxEnergy });
  }

  useEnergy(amount) {
    if (this.energy >= amount) {
      this.setEnergy(this.energy - amount);
      return true;
    }
    return false;
  }

  addScore(amount) {
    const multiplied = Math.round(amount * this.killStreakMultiplier);
    this.score += multiplied;
    events.emit(EVENTS.SCORE_CHANGED, { score: this.score, added: multiplied });
  }

  recordKill(enemy) {
    this.enemiesKilled++;
    if (enemy.isBoss) {
      this.bossesKilled++;
    }
    
    const now = performance.now();
    if (now - this.lastKillTimestamp < CONFIG.KILL_STREAK_WINDOW_MS) {
      this.killStreak++;
    } else {
      this.killStreak = 1;
    }
    this.lastKillTimestamp = now;
    
    // Scale multiplier exponentially: M(k) = 1.0 + M_max * (1 - e^(-lambda * k))
    const boost = MATH_MODELS.STREAK_MAX_BOOST * (1.0 - Math.exp(-MATH_MODELS.STREAK_LAMBDA * this.killStreak));
    this.killStreakMultiplier = 1.0 + boost;
    
    // Gold bounty with streak bonus
    const bounty = Math.round(enemy.bounty * (1.0 + (this.killStreak > 3 ? (this.killStreakMultiplier - 1.0) * 0.25 : 0)));
    this.addCredits(bounty);
    this.addScore(enemy.scoreValue || 10);
  }

  cycleSpeed() {
    this.speedIndex = (this.speedIndex + 1) % CONFIG.SPEED_MULTIPLIERS.length;
    events.emit(EVENTS.GAME_SPEED_CHANGE, { speed: this.gameSpeed, index: this.speedIndex });
    return this.gameSpeed;
  }

  setSpeedIndex(index) {
    this.speedIndex = Math.max(0, Math.min(CONFIG.SPEED_MULTIPLIERS.length - 1, index));
    events.emit(EVENTS.GAME_SPEED_CHANGE, { speed: this.gameSpeed, index: this.speedIndex });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    events.emit(this.isPaused ? EVENTS.GAME_PAUSE : EVENTS.GAME_RESUME, { isPaused: this.isPaused });
    return this.isPaused;
  }

  setSelectedTower(towerType) {
    this.selectedTowerType = towerType;
    if (towerType) {
      this.selectedEntity = null;
    }
  }

  selectEntity(entity) {
    this.selectedEntity = entity;
    if (entity) {
      this.selectedTowerType = null;
    }
    events.emit(EVENTS.TOWER_SELECTED, { entity });
  }

  clearSelection() {
    this.selectedTowerType = null;
    this.selectedEntity = null;
    this.activeAbilityTargeting = null;
    events.emit(EVENTS.TOWER_SELECTED, { entity: null });
  }
}

export const state = new GameState();
