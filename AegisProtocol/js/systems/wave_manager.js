/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Mathematically Calibrated Wave Progression & Spawner Engine
 */

import { Enemy } from '../entities/enemy.js';
import { state, GAME_MODES } from '../core/state.js';
import { events, EVENTS } from '../core/events.js';
import { audio } from '../core/audio.js';
import { MATH_MODELS } from '../core/constants.js';

export class WaveManager {
  constructor(mapInstance, waveConfigs = []) {
    this.map = mapInstance;
    this.waves = waveConfigs;
    this.currentWaveIndex = 0;
    
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.isSpawning = false;
    this.waveActive = false;
  }

  get totalWaves() {
    return this.waves.length;
  }

  getCurrentWaveConfig() {
    if (this.currentWaveIndex < this.waves.length) {
      return this.waves[this.currentWaveIndex];
    }
    // Endless mode dynamic procedural generator
    return this.generateEndlessWave(this.currentWaveIndex + 1);
  }

  /**
   * Generates procedural endless waves using polynomial difficulty scaling
   */
  generateEndlessWave(waveNum) {
    const types = ['scout', 'swarmer', 'mech', 'shield_drone', 'infiltrator', 'regenerator', 'speeder', 'splitter', 'flyer'];
    const isBoss = waveNum % 5 === 0;

    if (isBoss) {
      const bossType = waveNum % 10 === 0 ? 'boss_chronos' : (waveNum % 5 === 0 ? 'boss_titan' : 'boss_overlord');
      const bossCount = Math.floor(waveNum / 10) + 1;
      return {
        count: bossCount,
        enemy: bossType,
        escort: { count: Math.floor(waveNum * 1.8), enemy: 'speeder' },
        interval: 3.8,
        bossName: `Endless Titan Wave ${waveNum}`
      };
    }

    const enemyType = types[waveNum % types.length];
    const baseCount = Math.floor(10 + Math.pow(waveNum, 1.18) * 1.5);
    // Harmonic pacing interval: T = max(0.15, 1.2 * (1 + 0.04 * w)^(-0.75))
    const spawnInterval = Math.max(0.16, 1.20 * Math.pow(1 + 0.04 * waveNum, -0.75));

    return {
      count: baseCount,
      enemy: enemyType,
      escort: waveNum > 8 ? { count: Math.floor(waveNum * 0.6), enemy: 'shield_drone' } : null,
      interval: spawnInterval
    };
  }

  startNextWave() {
    if (this.waveActive || this.isSpawning) return false;

    const waveConfig = this.getCurrentWaveConfig();
    if (!waveConfig) return false;

    this.currentWaveIndex++;
    state.currentWave = this.currentWaveIndex;
    this.waveActive = true;
    this.isSpawning = true;
    state.waveInProgress = true;

    this.buildSpawnQueue(waveConfig);

    audio.playAlarm();
    events.emit(EVENTS.WAVE_START, { wave: this.currentWaveIndex, config: waveConfig });

    if (waveConfig.bossName) {
      events.emit(EVENTS.BOSS_SPAWNED, { bossName: waveConfig.bossName });
    }

    return true;
  }

  buildSpawnQueue(waveConfig) {
    this.spawnQueue = [];
    const count = waveConfig.count || 10;
    const interval = waveConfig.interval || 1.0;
    const enemyType = waveConfig.enemy || 'scout';

    // Primary wave enemies
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push({
        type: enemyType,
        delay: i === 0 ? 0.4 : interval,
        waveLevel: this.currentWaveIndex,
        customName: waveConfig.bossName
      });

      // Escorts interlaced with golden ratio phase offset
      if (waveConfig.escort && i % 2 === 0) {
        this.spawnQueue.push({
          type: waveConfig.escort.enemy,
          delay: interval * 0.35,
          waveLevel: this.currentWaveIndex
        });
      }
    }
  }

  update(dtSec, enemies) {
    if (!this.waveActive) return;

    // Process spawn queue
    if (this.isSpawning && this.spawnQueue.length > 0) {
      this.spawnTimer -= dtSec;

      if (this.spawnTimer <= 0) {
        const nextSpawn = this.spawnQueue.shift();
        this.spawnEnemy(nextSpawn, enemies);

        if (this.spawnQueue.length > 0) {
          this.spawnTimer = this.spawnQueue[0].delay;
        } else {
          this.isSpawning = false;
        }
      }
    }

    // Check if wave is completed (all enemies spawned and none active)
    if (!this.isSpawning && enemies.length === 0) {
      this.completeWave();
    }
  }

  spawnEnemy(spawnData, enemies) {
    if (!this.map.paths || this.map.paths.length === 0) return;

    // Cycle through multi-paths
    const pathIdx = enemies.length % this.map.paths.length;
    const pathWaypoints = this.map.paths[pathIdx];

    const enemy = new Enemy(spawnData.type, pathWaypoints, spawnData.waveLevel, {
      customName: spawnData.customName
    });

    enemies.push(enemy);
    events.emit(EVENTS.WAVE_SPAWN_ENEMY, { enemy });
  }

  completeWave() {
    this.waveActive = false;
    state.waveInProgress = false;

    // Compound Interest Calculus: 5% of banked credits (up to 150)
    const interest = Math.min(150, Math.floor(state.credits * 0.05));
    if (interest > 0) {
      state.addCredits(interest);
    }

    events.emit(EVENTS.WAVE_COMPLETE, {
      wave: this.currentWaveIndex,
      interestEarned: interest
    });

    // Check Victory in Campaign mode
    if (state.mode === GAME_MODES.CAMPAIGN && this.currentWaveIndex >= this.totalWaves) {
      state.isVictory = true;
      state.isPlaying = false;
      audio.playVictory();
      events.emit(EVENTS.GAME_VICTORY, { score: state.score, waves: this.currentWaveIndex });
    }
  }
}
