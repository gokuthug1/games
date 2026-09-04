/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Main Game Controller & Execution Loop
 */

import { CONFIG, TILE_TYPES } from './core/constants.js';
import { state, GAME_SCREENS, GAME_MODES } from './core/state.js';
import { events, EVENTS } from './core/events.js';
import { audio } from './core/audio.js';
import { storage } from './core/storage.js';
import { MAPS_DATA } from './data/maps_data.js';
import { TOWERS_DATA } from './data/towers_data.js';
import { GameMap } from './systems/map.js';
import { WaveManager } from './systems/wave_manager.js';
import { economy } from './systems/economy.js';
import { techTree } from './systems/tech_tree.js';
import { abilities } from './systems/abilities.js';
import { achievements } from './systems/achievements.js';
import { GameRenderer } from './rendering/renderer.js';
import { particles } from './rendering/particles.js';
import { Tower } from './entities/tower.js';
import { UIManager } from './ui/ui_manager.js';
import { TowerPanelManager } from './ui/tower_panel.js';
import { tutorial } from './systems/tutorial.js';
import { autonomousAgent } from './systems/autonomous_agent.js';
import { aiTimeline } from './ui/ai_timeline.js';

class GameController {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new GameRenderer(this.canvas);
    this.uiManager = new UIManager();
    this.towerPanel = new TowerPanelManager();
    this.waveManager = null;
    
    this.lastTimestamp = performance.now();
    this.accumulator = 0;

    this.initEventListeners();
    this.initHotkeys();
    this.startGameLoop();
  }

  initEventListeners() {
    // Canvas Mouse Interactions
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      state.clearSelection();
    });

    // Audio init on first user click anywhere
    window.addEventListener('click', () => {
      audio.ensureContext();
      audio.startMusic();
    }, { once: true });

    // Custom Game Events
    events.on('game:start_mission', ({ mapId, mode }) => {
      this.startMission(mapId, mode);
    });

    events.on('game:start_custom_mission', ({ mapData }) => {
      this.startCustomMission(mapData);
    });

    events.on('game:retry_mission', () => {
      this.startMission(state.currentMapId, state.mode);
    });

    events.on('hud:start_wave_click', () => {
      if (this.waveManager) {
        this.waveManager.startNextWave();
      }
    });

    events.on('hud:cast_ability', ({ abilityId, x, y }) => {
      abilities.triggerAbility(abilityId, x, y);
    });
  }

  initHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (state.currentScreen !== GAME_SCREENS.GAMEPLAY) return;

      const key = e.key.toUpperCase();

      // Number keys 1-9 for tower selection
      if (key >= '1' && key <= '9') {
        const towerKeys = Object.keys(TOWERS_DATA);
        const idx = parseInt(key) - 1;
        if (idx < towerKeys.length) {
          const type = towerKeys[idx];
          state.setSelectedTower(type);
          this.towerPanel.updateDockActiveStates();
        }
      }

      // Space to toggle pause
      if (e.code === 'Space') {
        e.preventDefault();
        state.togglePause();
        this.uiManager.updatePauseUI();
      }

      // F to cycle speed
      if (key === 'F') {
        state.cycleSpeed();
        this.uiManager.updateSpeedUI();
      }

      // A to toggle Autonomous AI Commander
      if (key === 'A') {
        autonomousAgent.toggle();
      }

      // L to toggle AI Reasoning Timeline Drawer
      if (key === 'L') {
        aiTimeline.toggleDrawer();
      }

      // N for next wave
      if (key === 'N') {
        if (this.waveManager) this.waveManager.startNextWave();
      }

      // Escape to cancel placement / deselect
      if (e.code === 'Escape') {
        state.clearSelection();
        this.towerPanel.updateDockActiveStates();
      }

      // Ability hotkeys: Q, W, E, R, T
      if (['Q', 'W', 'E', 'R', 'T'].includes(key)) {
        const abMap = { Q: 'orbital_strike', W: 'cryo_nova', E: 'emp_overcharge', R: 'nanite_repair', T: 'supply_drop' };
        const abId = abMap[key];
        const ab = abilities.abilities[abId];
        if (ab && abilities.canCast(abId)) {
          if (ab.radius === 0) {
            abilities.triggerAbility(abId, 0, 0);
          } else {
            state.activeAbilityTargeting = ab;
          }
        }
      }
    });
  }

  onMouseMove(e) {
    const worldPos = this.renderer.camera.screenToWorld(e.clientX, e.clientY);
    state.mouseWorldX = worldPos.x;
    state.mouseWorldY = worldPos.y;
    state.mouseGridX = Math.floor(worldPos.x / CONFIG.TILE_SIZE);
    state.mouseGridY = Math.floor(worldPos.y / CONFIG.TILE_SIZE);
  }

  onMouseDown(e) {
    if (e.button === 0) { // Left Click
      // 1. If Commander ability is active, cast it at mouse target
      if (state.activeAbilityTargeting) {
        abilities.triggerAbility(state.activeAbilityTargeting.id, state.mouseWorldX, state.mouseWorldY);
        state.activeAbilityTargeting = null;
        return;
      }

      // 2. If placing a tower
      if (state.selectedTowerType) {
        this.tryPlaceTower();
        return;
      }

      // 3. Otherwise, select placed tower for inspection
      const clickedTower = state.towers.find(t =>
        Math.hypot(t.x - state.mouseWorldX, t.y - state.mouseWorldY) <= CONFIG.TILE_SIZE * 0.5
      );

      if (clickedTower) {
        state.selectEntity(clickedTower);
        audio.playUIClick();
      } else {
        state.clearSelection();
      }
    }
  }

  tryPlaceTower() {
    const typeId = state.selectedTowerType;
    const proto = TOWERS_DATA[typeId];
    if (!proto || !state.currentMapData) return;

    const gx = state.mouseGridX;
    const gy = state.mouseGridY;

    if (state.currentMapData.canPlaceTower(gx, gy) && state.credits >= proto.cost) {
      if (state.spendCredits(proto.cost)) {
        const tower = new Tower(typeId, gx, gy);
        
        // Apply persistent research lab perks
        techTree.applyPerksToTower(tower);
        
        state.currentMapData.placeTower(gx, gy, tower);
        state.towers.push(tower);
        
        audio.playPlacement();
        particles.spawnExplosion(tower.x, tower.y, 25, tower.color, tower.glowColor);
        events.emit(EVENTS.TOWER_PLACED, { tower });

        // Keep placing if shift key is held, otherwise clear selection
        state.clearSelection();
        this.towerPanel.updateDockActiveStates();
      }
    }
  }

  startMission(mapId, mode = GAME_MODES.CAMPAIGN) {
    const rawMap = MAPS_DATA[mapId] || MAPS_DATA.map_01;
    state.resetState();
    state.mode = mode;
    state.currentMapId = mapId;
    
    // Apply starting credits and perks
    const bonusCredits = techTree.getStartingBonusCredits();
    const bonusLives = techTree.getBonusLives();
    
    state.credits = (rawMap.startingCredits || CONFIG.DEFAULT_CREDITS) + bonusCredits;
    state.lives = (rawMap.startingLives || CONFIG.DEFAULT_LIVES) + bonusLives;
    state.maxLives = state.lives;
    state.totalWaves = rawMap.totalWaves || 20;
    
    state.currentMapData = new GameMap(rawMap);
    this.waveManager = new WaveManager(state.currentMapData, rawMap.waves);
    
    state.isPlaying = true;
    this.uiManager.showScreen(GAME_SCREENS.GAMEPLAY);
    
    // Trigger initial UI update
    events.emit(EVENTS.CREDITS_CHANGED, { credits: state.credits });
    events.emit(EVENTS.LIVES_CHANGED, { lives: state.lives });
    events.emit(EVENTS.ENERGY_CHANGED, { energy: state.energy, max: state.maxEnergy });
    events.emit(EVENTS.SCORE_CHANGED, { score: state.score });
    events.emit(EVENTS.WAVE_START, { wave: 0 });
  }

  startCustomMission(mapObject) {
    state.resetState();
    state.mode = GAME_MODES.SANDBOX;
    state.currentMapId = mapObject.id;
    state.credits = mapObject.startingCredits || 750;
    state.lives = mapObject.startingLives || 20;
    state.totalWaves = mapObject.totalWaves || 25;
    
    state.currentMapData = new GameMap(mapObject);
    this.waveManager = new WaveManager(state.currentMapData, mapObject.waves);
    
    state.isPlaying = true;
    this.uiManager.showScreen(GAME_SCREENS.GAMEPLAY);
    
    events.emit(EVENTS.CREDITS_CHANGED, { credits: state.credits });
    events.emit(EVENTS.LIVES_CHANGED, { lives: state.lives });
    events.emit(EVENTS.ENERGY_CHANGED, { energy: state.energy, max: state.maxEnergy });
  }

  startGameLoop() {
    const loop = (timestamp) => {
      const delta = Math.min(timestamp - this.lastTimestamp, CONFIG.MAX_DELTA);
      this.lastTimestamp = timestamp;

      if (state.isPlaying && !state.isPaused) {
        const speed = state.gameSpeed;
        const dtSec = (delta / 1000) * speed;

        this.update(dtSec);
      }

      // Render every frame
      this.renderer.render(
        state.currentMapData,
        state.towers,
        state.enemies,
        state.projectiles
      );

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  update(dtSec) {
    // 1. Systems Update
    economy.update(dtSec);
    abilities.update(dtSec);
    autonomousAgent.update(performance.now(), state.currentMapData, this.waveManager);

    // 2. Wave Manager Spawner Update
    if (this.waveManager) {
      this.waveManager.update(dtSec, state.enemies);
    }

    // 3. Enemies Update
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.update(dtSec, state.enemies);
      if (!e.active) {
        state.enemies.splice(i, 1);
      }
    }

    // 4. Towers Update (Targeting, Shooting, Rotation)
    for (const t of state.towers) {
      t.update(dtSec, state.enemies, state.projectiles);
    }

    // 5. Projectiles & Beams Update
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      p.update(dtSec, state.enemies);
      if (!p.active) {
        state.projectiles.splice(i, 1);
      }
    }

    // 6. Particles & Floating Combat Texts
    particles.update(dtSec);
    this.renderer.camera.update(dtSec * 1000);
  }
}

// Instantiate game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.aegisGame = new GameController();
});
