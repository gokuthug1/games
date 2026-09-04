/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Master UI & Screen Flow Manager
 */

import { state, GAME_SCREENS, GAME_MODES } from '../core/state.js';
import { events, EVENTS } from '../core/events.js';
import { storage } from '../core/storage.js';
import { audio } from '../core/audio.js';
import { getIcon } from '../rendering/svg_icons.js';
import { MAPS_DATA } from '../data/maps_data.js';
import { ENEMIES_DATA } from '../data/enemies_data.js';
import { TOWERS_DATA } from '../data/towers_data.js';
import { RESEARCH_DATA } from '../data/research_data.js';
import { ACHIEVEMENTS_LIST } from '../systems/achievements.js';
import { ABILITIES } from '../systems/abilities.js';
import { techTree } from '../systems/tech_tree.js';
import { editor, BRUSH_MODES } from '../systems/editor.js';
import { tutorial } from '../systems/tutorial.js';
import { autonomousAgent } from '../systems/autonomous_agent.js';
import { aiTimeline } from './ai_timeline.js';

export class UIManager {
  constructor() {
    this.initScreens();
    this.initHud();
    this.initCampaignSelect();
    this.initTechTreeScreen();
    this.initCodexScreen();
    this.initMapEditorScreen();
    this.initAchievementsScreen();
    this.initSettingsScreen();
    this.initModals();
    this.initListeners();
  }

  showScreen(screenId) {
    const screens = document.querySelectorAll('.game-screen');
    screens.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      state.currentScreen = screenId;
      events.emit(EVENTS.SCREEN_CHANGED, { screenId });
      audio.playUIClick();
    }
  }

  initScreens() {
    // Menu Buttons
    document.getElementById('btn-play-tutorial')?.addEventListener('click', () => {
      tutorial.startTutorial();
    });

    document.getElementById('btn-play-campaign')?.addEventListener('click', () => {
      this.renderCampaignCards();
      this.showScreen(GAME_SCREENS.CAMPAIGN_SELECT);
    });

    document.getElementById('btn-play-endless')?.addEventListener('click', () => {
      state.mode = GAME_MODES.ENDLESS;
      events.emit('game:start_mission', { mapId: 'map_01', mode: GAME_MODES.ENDLESS });
    });

    document.getElementById('btn-open-tech-tree')?.addEventListener('click', () => {
      this.renderTechTreeNodes();
      this.showScreen(GAME_SCREENS.TECH_TREE);
    });

    document.getElementById('btn-open-codex')?.addEventListener('click', () => {
      this.renderCodex();
      this.showScreen(GAME_SCREENS.CODEX);
    });

    document.getElementById('btn-open-editor')?.addEventListener('click', () => {
      this.showScreen(GAME_SCREENS.MAP_EDITOR);
    });

    document.getElementById('btn-open-achievements')?.addEventListener('click', () => {
      this.renderAchievements();
      this.showScreen(GAME_SCREENS.ACHIEVEMENTS);
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.loadSettingsUI();
      this.showScreen(GAME_SCREENS.SETTINGS);
    });

    // Back to main menu buttons
    document.querySelectorAll('.btn-back-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showScreen(GAME_SCREENS.MAIN_MENU);
      });
    });
  }

  initHud() {
    // Top Bar bindings
    this.creditsVal = document.getElementById('hud-credits-val');
    this.livesVal = document.getElementById('hud-lives-val');
    this.energyBar = document.getElementById('hud-energy-bar-fill');
    this.energyVal = document.getElementById('hud-energy-val');
    this.waveVal = document.getElementById('hud-wave-val');
    this.scoreVal = document.getElementById('hud-score-val');
    this.streakVal = document.getElementById('hud-streak-multiplier');
    this.aiBtn = document.getElementById('btn-autonomous-ai-toggle');
    this.aiTickerText = document.getElementById('ai-ticker-text');
    this.aiTickerBox = document.getElementById('ai-decision-ticker');

    // Controls
    document.getElementById('btn-wave-start')?.addEventListener('click', () => {
      events.emit('hud:start_wave_click');
    });

    document.getElementById('btn-speed-toggle')?.addEventListener('click', () => {
      state.cycleSpeed();
      this.updateSpeedUI();
    });

    document.getElementById('btn-pause-toggle')?.addEventListener('click', () => {
      state.togglePause();
      this.updatePauseUI();
    });

    this.aiBtn?.addEventListener('click', () => {
      autonomousAgent.toggle();
    });

    // AI Target Wave Control
    this._initTargetWaveControl();

    // Commander Abilities Dock
    this.initAbilitiesDock();
  }

  _initTargetWaveControl() {
    this._targetWaveEl = document.getElementById('ai-target-wave-control');
    this._targetWaveInput = document.getElementById('input-ai-target-wave');
    const setBtn = document.getElementById('btn-ai-target-set');
    const clearBtn = document.getElementById('btn-ai-target-clear');

    const engage = () => {
      const val = parseInt(this._targetWaveInput?.value, 10);
      if (!val || val < 1 || val > 999) return;
      autonomousAgent.setTargetWave(val);
      if (this._targetWaveEl) {
        this._targetWaveEl.classList.remove('reached');
        this._targetWaveEl.classList.add('active');
      }
      if (this._targetWaveInput) {
        this._targetWaveInput.classList.add('locked');
        this._targetWaveInput.disabled = true;
      }
    };

    setBtn?.addEventListener('click', engage);

    this._targetWaveInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); engage(); }
    });

    clearBtn?.addEventListener('click', () => {
      autonomousAgent.clearTargetWave();
      this._resetTargetWaveUI();
    });

    events.on('agent:target_wave_reached', () => {
      if (this._targetWaveEl) {
        this._targetWaveEl.classList.remove('active');
        this._targetWaveEl.classList.add('reached');
      }
      this._resetTargetWaveUI(false);
      events.emit(EVENTS.TOAST_NOTIFY, {
        title: 'TARGET WAVE REACHED',
        message: `Mission objective complete. Simulation paused.`,
        type: 'success'
      });
    });

    events.on('agent:target_wave_cleared', () => {
      this._resetTargetWaveUI();
    });
  }

  _resetTargetWaveUI(clearValue = true) {
    if (this._targetWaveEl) {
      this._targetWaveEl.classList.remove('active');
    }
    if (this._targetWaveInput) {
      this._targetWaveInput.disabled = false;
      this._targetWaveInput.classList.remove('locked');
      if (clearValue) this._targetWaveInput.value = '';
    }
  }

  initAbilitiesDock() {
    const dock = document.getElementById('commander-abilities-dock');
    if (!dock) return;
    dock.innerHTML = '';

    Object.values(ABILITIES).forEach(ab => {
      const btn = document.createElement('button');
      btn.className = 'ability-btn';
      btn.dataset.abilityId = ab.id;
      btn.innerHTML = `
        <div class="ability-hotkey">${ab.key}</div>
        <div class="ability-icon">${getIcon(ab.icon)}</div>
        <div class="ability-cost">${getIcon('ENERGY')} ${ab.energyCost}</div>
        <div class="ability-cd-overlay"></div>
      `;

      btn.addEventListener('click', () => {
        if (state.energy >= ab.energyCost && state.abilityCooldowns[ab.id] <= 0) {
          if (ab.radius === 0) {
            // instant cast
            events.emit('hud:cast_ability', { abilityId: ab.id, x: 0, y: 0 });
          } else {
            // Target mode
            state.activeAbilityTargeting = ab;
          }
        }
      });

      dock.appendChild(btn);
    });
  }

  updateSpeedUI() {
    const btn = document.getElementById('btn-speed-toggle');
    if (btn) {
      btn.innerHTML = `${getIcon('FAST_FORWARD')} ${state.gameSpeed}x`;
    }
  }

  updatePauseUI() {
    const btn = document.getElementById('btn-pause-toggle');
    if (btn) {
      btn.innerHTML = state.isPaused ? `${getIcon('PLAY')} PLAY` : `${getIcon('PAUSE')} PAUSE`;
    }
  }

  initCampaignSelect() {
    this.campaignContainer = document.getElementById('campaign-mission-grid');
  }

  renderCampaignCards() {
    if (!this.campaignContainer) return;
    this.campaignContainer.innerHTML = '';

    const mapKeys = Object.keys(MAPS_DATA);
    mapKeys.forEach((mapKey, idx) => {
      const map = MAPS_DATA[mapKey];
      const prog = storage.getCampaignMap(mapKey);
      
      // Determine unlocked status
      const prevKey = idx > 0 ? mapKeys[idx - 1] : null;
      const prevProg = prevKey ? storage.getCampaignMap(prevKey) : null;
      const isUnlocked = idx === 0 || prog.unlocked || (prevProg && (prevProg.completed || prevProg.stars > 0));

      const card = document.createElement('div');
      card.className = `mission-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      let starHtml = '';
      for (let s = 1; s <= 3; s++) {
        starHtml += `<span class="star-icon ${s <= prog.stars ? 'earned' : ''}">${getIcon('STAR')}</span>`;
      }

      card.innerHTML = `
        <div class="mission-header">
          <div class="mission-title">${map.name}</div>
          <div class="mission-diff-badge">${map.difficulty}</div>
        </div>
        <div class="mission-sub">${map.subtitle}</div>
        <div class="mission-desc">${map.description}</div>
        <div class="mission-stars">${starHtml}</div>
        <div class="mission-footer">
          <span class="mission-score">High: ${prog.highScore}</span>
          <button class="btn-launch-mission ${isUnlocked ? '' : 'disabled'}">
            ${isUnlocked ? `${getIcon('PLAY')} DEPLOY` : `${getIcon('LOCK')} LOCKED`}
          </button>
        </div>
      `;

      if (isUnlocked) {
        card.querySelector('.btn-launch-mission')?.addEventListener('click', () => {
          events.emit('game:start_mission', { mapId: mapKey, mode: GAME_MODES.CAMPAIGN });
        });
      }

      this.campaignContainer.appendChild(card);
    });
  }

  initTechTreeScreen() {
    this.techGrid = document.getElementById('tech-tree-grid');
    this.techPointsVal = document.getElementById('tech-points-counter');

    document.getElementById('btn-reset-techs')?.addEventListener('click', () => {
      techTree.resetAllTechs();
      this.renderTechTreeNodes();
    });
  }

  renderTechTreeNodes() {
    if (!this.techGrid) return;
    if (this.techPointsVal) {
      this.techPointsVal.innerHTML = `${getIcon('RESEARCH')} ${techTree.getResearchPoints()} RESEARCH CREDITS`;
    }

    this.techGrid.innerHTML = '';

    const branches = ['Ballistics & Kinetics', 'Beam & Laser Physics', 'Cryo & Superheat', 'Command & Logistics'];

    branches.forEach(branchName => {
      const col = document.createElement('div');
      col.className = 'tech-branch-column';
      col.innerHTML = `<div class="branch-title">${branchName}</div>`;

      const branchTechs = RESEARCH_DATA.filter(t => t.branch === branchName);
      branchTechs.forEach(tech => {
        const isUnlocked = techTree.isUnlocked(tech.id);
        const canUnlock = techTree.canUnlock(tech.id);

        const card = document.createElement('div');
        card.className = `tech-node-card ${isUnlocked ? 'unlocked' : (canUnlock ? 'available' : 'locked')}`;
        card.innerHTML = `
          <div class="tech-card-header">
            <div class="tech-icon">${getIcon(tech.icon)}</div>
            <div class="tech-name">${tech.name}</div>
            <div class="tech-cost">${isUnlocked ? getIcon('CHECK') : `${getIcon('RESEARCH')} ${tech.cost}`}</div>
          </div>
          <div class="tech-desc">${tech.desc}</div>
        `;

        if (!isUnlocked && canUnlock) {
          card.addEventListener('click', () => {
            if (techTree.unlock(tech.id)) {
              this.renderTechTreeNodes();
            }
          });
        }

        col.appendChild(card);
      });

      this.techGrid.appendChild(col);
    });
  }

  initCodexScreen() {
    this.codexContainer = document.getElementById('codex-content-container');
    
    document.querySelectorAll('.codex-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.codex-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderCodex(btn.dataset.tab);
      });
    });
  }

  renderCodex(tab = 'towers') {
    if (!this.codexContainer) return;
    this.codexContainer.innerHTML = '';

    if (tab === 'towers') {
      Object.values(TOWERS_DATA).forEach(t => {
        const card = document.createElement('div');
        card.className = 'codex-card';
        card.innerHTML = `
          <div class="codex-card-title">${t.name} <span class="badge">Cost: ${t.cost}</span></div>
          <div class="codex-card-sub">${t.role} (${t.damageType})</div>
          <div class="codex-card-lore">${t.lore}</div>
          <div class="codex-stats-row">
            <span>${getIcon('DAMAGE')} Dmg: ${t.baseStats.damage}</span>
            <span>${getIcon('FIRE_RATE')} Rate: ${t.baseStats.fireRate}/s</span>
            <span>${getIcon('RANGE')} Range: ${t.baseStats.range}px</span>
          </div>
        `;
        this.codexContainer.appendChild(card);
      });
    } else {
      Object.values(ENEMIES_DATA).forEach(e => {
        const card = document.createElement('div');
        card.className = 'codex-card';
        card.innerHTML = `
          <div class="codex-card-title">${e.name} <span class="badge">${e.armorType}</span></div>
          <div class="codex-card-sub">Speed: ${e.speed}px/s | Bounty: ${e.bounty}</div>
          <div class="codex-card-lore">${e.lore}</div>
          <div class="codex-stats-row">
            <span>${getIcon('LIVES')} HP: ${e.hp}</span>
            <span>${getIcon('SHIELD')} Shield: ${e.shield}</span>
            <span>${getIcon('SHIELD')} Armor: ${e.armor}</span>
          </div>
        `;
        this.codexContainer.appendChild(card);
      });
    }
  }

  initMapEditorScreen() {
    const editorCanvas = document.getElementById('editor-canvas');
    if (!editorCanvas) return;

    editorCanvas.width = 1200;
    editorCanvas.height = 800;
    const ctx = editorCanvas.getContext('2d');

    const renderEditor = () => {
      ctx.fillStyle = '#070a13';
      ctx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);
      editor.render(ctx);
    };

    renderEditor();

    // Brush Tool Buttons
    document.querySelectorAll('.editor-brush-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.editor-brush-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        editor.setBrush(BRUSH_MODES[btn.dataset.brush]);
      });
    });

    let isPainting = false;
    editorCanvas.addEventListener('mousedown', (e) => {
      isPainting = true;
      const rect = editorCanvas.getBoundingClientRect();
      const col = Math.floor(((e.clientX - rect.left) * (1200 / rect.width)) / 50);
      const row = Math.floor(((e.clientY - rect.top) * (800 / rect.height)) / 50);
      editor.paintTile(col, row);
      renderEditor();
    });

    editorCanvas.addEventListener('mousemove', (e) => {
      if (!isPainting) return;
      const rect = editorCanvas.getBoundingClientRect();
      const col = Math.floor(((e.clientX - rect.left) * (1200 / rect.width)) / 50);
      const row = Math.floor(((e.clientY - rect.top) * (800 / rect.height)) / 50);
      editor.paintTile(col, row);
      renderEditor();
    });

    window.addEventListener('mouseup', () => { isPainting = false; });

    document.getElementById('btn-editor-clear')?.addEventListener('click', () => {
      editor.initEmptyGrid();
      renderEditor();
    });

    document.getElementById('btn-editor-save')?.addEventListener('click', () => {
      editor.saveToStorage();
    });

    document.getElementById('btn-editor-play')?.addEventListener('click', () => {
      const customMap = editor.exportMapData();
      events.emit('game:start_custom_mission', { mapData: customMap });
    });
  }

  initAchievementsScreen() {
    this.achievementsGrid = document.getElementById('achievements-grid');
  }

  renderAchievements() {
    if (!this.achievementsGrid) return;
    this.achievementsGrid.innerHTML = '';

    ACHIEVEMENTS_LIST.forEach(ach => {
      const isUnlocked = storage.getAchievements().unlocked.includes(ach.id);
      const card = document.createElement('div');
      card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="ach-icon">${getIcon(ach.icon)}</div>
        <div class="ach-info">
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.desc}</div>
        </div>
        <div class="ach-reward">${getIcon('RESEARCH')} +${ach.reward}</div>
      `;
      this.achievementsGrid.appendChild(card);
    });
  }

  initSettingsScreen() {
    document.getElementById('slider-master-volume')?.addEventListener('input', (e) => {
      storage.saveSettings({ masterVolume: parseFloat(e.target.value) });
      audio.updateVolumes();
    });

    document.getElementById('slider-sfx-volume')?.addEventListener('input', (e) => {
      storage.saveSettings({ sfxVolume: parseFloat(e.target.value) });
      audio.updateVolumes();
    });

    document.getElementById('slider-music-volume')?.addEventListener('input', (e) => {
      storage.saveSettings({ musicVolume: parseFloat(e.target.value) });
      audio.updateVolumes();
    });

    document.getElementById('btn-wipe-data')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all game progress and research points?')) {
        storage.resetAllData();
        location.reload();
      }
    });
  }

  loadSettingsUI() {
    const s = storage.getSettings();
    const master = document.getElementById('slider-master-volume');
    const sfx = document.getElementById('slider-sfx-volume');
    const music = document.getElementById('slider-music-volume');
    if (master) master.value = s.masterVolume;
    if (sfx) sfx.value = s.sfxVolume;
    if (music) music.value = s.musicVolume;
  }

  initModals() {
    this.victoryModal = document.getElementById('victory-modal');
    this.defeatModal = document.getElementById('defeat-modal');

    document.getElementById('btn-victory-continue')?.addEventListener('click', () => {
      this.victoryModal?.classList.remove('active');
      this.renderCampaignCards();
      this.showScreen(GAME_SCREENS.CAMPAIGN_SELECT);
    });

    document.getElementById('btn-defeat-retry')?.addEventListener('click', () => {
      this.defeatModal?.classList.remove('active');
      events.emit('game:retry_mission');
    });

    document.getElementById('btn-defeat-menu')?.addEventListener('click', () => {
      this.defeatModal?.classList.remove('active');
      this.showScreen(GAME_SCREENS.MAIN_MENU);
    });
  }

  initListeners() {
    events.on(EVENTS.CREDITS_CHANGED, ({ credits }) => {
      if (this.creditsVal) this.creditsVal.textContent = credits;
    });

    events.on(EVENTS.LIVES_CHANGED, ({ lives }) => {
      if (this.livesVal) this.livesVal.textContent = lives;
    });

    events.on(EVENTS.ENERGY_CHANGED, ({ energy, max }) => {
      if (this.energyVal) this.energyVal.textContent = `${Math.floor(energy)}/${max}`;
      if (this.energyBar) this.energyBar.style.width = `${(energy / max) * 100}%`;
    });

    events.on(EVENTS.SCORE_CHANGED, ({ score }) => {
      if (this.scoreVal) this.scoreVal.textContent = score;
      if (this.streakVal) this.streakVal.textContent = `${state.killStreakMultiplier.toFixed(2)}x`;
    });

    events.on(EVENTS.WAVE_START, ({ wave }) => {
      if (this.waveVal) this.waveVal.textContent = `${wave}/${state.totalWaves}`;
    });

    events.on(EVENTS.GAME_VICTORY, () => {
      const stars = state.lives === state.maxLives ? 3 : (state.lives >= 10 ? 2 : 1);
      storage.updateMapProgress(state.currentMapId, stars, state.score);

      if (this.victoryModal) {
        document.getElementById('victory-score-val').textContent = state.score;
        document.getElementById('victory-stars-val').innerHTML = `${stars} / 3 ${getIcon('STAR')}`;
        this.victoryModal.classList.add('active');
      }
    });

    events.on('ui:show_screen', ({ screenId }) => {
      if (screenId === GAME_SCREENS.CAMPAIGN_SELECT) {
        this.renderCampaignCards();
      }
      this.showScreen(screenId);
    });

    events.on(EVENTS.AUTONOMOUS_AI_TOGGLED, ({ isEnabled }) => {
      if (this.aiBtn) {
        this.aiBtn.classList.toggle('active', isEnabled);
      }
      if (this.aiTickerBox) {
        this.aiTickerBox.classList.toggle('active', isEnabled);
      }
      if (this.aiTickerText) {
        this.aiTickerText.textContent = isEnabled 
          ? 'AUTONOMOUS COMMANDER ONLINE // POLICY: OPTIMAL MATHEMATICAL DEFENSE' 
          : 'AUTONOMOUS COMMANDER STANDBY // PRESS [A] TO ENGAGE';
      }
    });

    events.on(EVENTS.AUTONOMOUS_AI_DECISION, ({ log }) => {
      if (this.aiTickerText) {
        this.aiTickerText.textContent = log;
      }
    });

    events.on(EVENTS.GAME_OVER, () => {
      if (this.defeatModal) {
        document.getElementById('defeat-wave-val').textContent = state.currentWave;
        document.getElementById('defeat-score-val').textContent = state.score;
        this.defeatModal.classList.add('active');
      }
    });
  }
}
