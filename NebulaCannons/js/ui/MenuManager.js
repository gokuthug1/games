/**
 * MenuManager — all non-battle screens: main menu, mode/map/loadout
 * selection, garage, settings, controls, credits, and the victory/defeat
 * overlays. Pure presentation: it reads game/settings state and calls back
 * into the Game for actions.
 */

import { Svg } from './SvgAssets.js';
import { CONFIG, DEFAULT_SETTINGS } from '../core/Config.js';
import { ALL_WEAPON_IDS, getWeaponDef, WEAPON_CATALOG, isWeaponId } from '../weapons/Weapons.js';
import { DIFFICULTIES } from '../ai/Difficulty.js';
import { Map as WorldMap } from '../world/Map.js';

const UNLOCK_THRESHOLDS = {
  cluster: 1, homing: 2, splitter: 3, fireball: 4, dirtmaker: 5,
  barrage: 6, mine: 7, nuke: 8, cryo: 9, smoke: 10, leech: 11,
  railgun: 12, gravity: 13, sniper: 14, shield: 15, orbital: 16,
  emp: 18, turret: 20, airstrike: 22, drone: 25,
  sticky: 24, flash: 26, napalm: 28, plasma: 30, tesla: 32,
  boomerang: 34,
};
const BASE_WEAPONS = ['cannon', 'bouncer'];

const KEY_LABELS = {
  KeyA: 'A', KeyD: 'D', KeyW: 'W', KeyS: 'S', KeyZ: 'Z', KeyX: 'X',
  KeyQ: 'Q', KeyE: 'E', KeyP: 'P',
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Space: 'Space', Enter: 'Enter', Escape: 'Esc',
  Equal: '+', Minus: '−', BracketLeft: '[', BracketRight: ']',
};

function keyLabel(code) {
  return KEY_LABELS[code] || code.replace('Key', '').replace('Digit', '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function clampNum(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export class MenuManager {
  /**
   * @param {HTMLElement} root
   * @param {object} game
   * @param {import('./ModalManager.js').ModalManager} modals
   */
  constructor(root, game, modals) {
    this.root = root;
    this.game = game;
    this.modals = modals;
    this.screens = new Map();
    this.current = null;
    this.loadout = { p1: [...CONFIG.WEAPONS.DEFAULT_LOADOUT], p2: null };
    this.activeLoadoutPlayer = 1;
    this._returnTo = null;
    this._pendingRebind = null;

    this._buildScreens();
  }

  // ------------------------------------------------------------ structure

  _buildScreens() {
    const defs = [
      ['main', 'MENU'],
      ['modes', 'GAME_MODE_SELECT'],
      ['online', 'ONLINE'],
      ['maps', 'MAP_SELECT'],
      ['loadout', 'WEAPON_SELECT'],
      ['garage', 'GARAGE'],
      ['settings', 'SETTINGS'],
      ['controls', 'CONTROLS'],
      ['credits', 'CREDITS'],
      ['pause', 'PAUSE'],
      ['result', 'RESULT'],
    ];
    for (const [id, title] of defs) {
      const section = document.createElement('section');
      section.className = 'screen';
      section.dataset.screen = id;
      section.setAttribute('aria-label', title);
      this.root.appendChild(section);
      this.screens.set(id, section);
    }
    this._screenTitle = new Map(defs);
  }

  showScreen(id) {
    // Leaving a screen (or hiding them all before a match) must cancel any
    // in-progress key rebind, or its global capture listener would linger
    // and silently hijack game keys later.
    this._cancelRebind();
    this.current = id;
    for (const [sid, el] of this.screens) {
      el.classList.toggle('active', sid === id);
    }
    this.root.classList.toggle('visible', id !== null);
    // Backdrop only on the navigation screens; pause/result/settings keep
    // the dimmed battlefield visible behind them.
    this.root.classList.toggle(
      'has-backdrop',
      id !== null && id !== 'pause' && id !== 'result' && id !== 'settings'
    );
    if (!id) return;
    if (id === 'main') this._buildMain();
    else if (id === 'modes') this._buildModes();
    else if (id === 'online') this._buildOnline();
    else if (id === 'maps') this._buildMaps();
    else if (id === 'loadout') this._buildLoadout();
    else if (id === 'garage') this._buildGarage();
    else if (id === 'settings') this._buildSettings();
    else if (id === 'controls') this._buildControls();
    else if (id === 'credits') this._buildCredits();
    else if (id === 'pause') this._buildPause();
    else if (id === 'result') this._buildResult();
  }

  /** Abort an in-progress key rebind and detach its global key listener. */
  _cancelRebind() {
    if (!this._pendingRebind) return;
    const { el, onKey } = this._pendingRebind;
    this._pendingRebind = null;
    el.classList.remove('listening');
    if (onKey) document.removeEventListener('keydown', onKey, true);
  }

  hideAll() {
    this.showScreen(null);
  }

  // ------------------------------------------------------------- helpers

  _backBtn() {
    return `<button class="btn btn-ghost back-btn" data-action="back">${Svg.back(20, 20)} Back</button>`;
  }

  _title(text) {
    return `<h2 class="screen-title">${text}</h2>`;
  }

  _bind(root, sel, fn) {
    root.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        fn(el, e);
      });
    });
  }

  /** Where the settings screen returns to when closed (e.g. the pause menu). */
  setReturnTo(screen) {
    this._returnTo = screen || null;
  }

  _backAction(root) {
    this._bind(root, '[data-action="back"]', () => {
      switch (this.current) {
        case 'settings': this.game.backFromSettings(); break;
        case 'modes': case 'garage': this.game.backToMenu(); break;
        case 'online': case 'maps': this.game.openModes(); break;
        case 'loadout': this.game.openMaps(); break;
        case 'controls': case 'credits': this.showScreen('main'); break;
        default: this.game.backToMenu();
      }
    });
  }

  // --------------------------------------------------------------- main

  _buildMain() {
    const s = this.screens.get('main');
    const stats = this.game.settings.stats;
    s.innerHTML = `
      <div class="main-menu">
        <div class="logo-wrap">
          <div class="logo-svg">${Svg.logo(300, 96, 'logo-icon')}</div>
          <h1 class="logo-text">NEBULA<span>CAN</span>NONS</h1>
          <p class="logo-sub">neon artillery duels</p>
        </div>
        <nav class="main-nav" role="menu">
          <button class="menu-btn primary" data-action="play">
            <span class="menu-btn-icon">${Svg.play(22, 22)}</span>
            <span class="menu-btn-label">Play</span>
            <span class="menu-btn-arrow">${Svg.chevron(16, 16)}</span>
          </button>
          <button class="menu-btn" data-action="garage">
            <span class="menu-btn-icon">${Svg.shield(22, 22)}</span>
            <span class="menu-btn-label">Garage</span>
            <span class="menu-btn-arrow">${Svg.chevron(16, 16)}</span>
          </button>
          <button class="menu-btn" data-action="settings">
            <span class="menu-btn-icon">${Svg.gear(22, 22)}</span>
            <span class="menu-btn-label">Settings</span>
            <span class="menu-btn-arrow">${Svg.chevron(16, 16)}</span>
          </button>
          <button class="menu-btn" data-action="controls">
            <span class="menu-btn-icon">${Svg.keyboard(22, 22)}</span>
            <span class="menu-btn-label">Controls</span>
            <span class="menu-btn-arrow">${Svg.chevron(16, 16)}</span>
          </button>
          <button class="menu-btn" data-action="credits">
            <span class="menu-btn-icon">${Svg.info(22, 22)}</span>
            <span class="menu-btn-label">Credits</span>
            <span class="menu-btn-arrow">${Svg.chevron(16, 16)}</span>
          </button>
        </nav>
        <div class="main-stats">Matches <b>${stats.gamesPlayed || 0}</b> · Wins <b>${stats.wins || 0}</b> · Tanks destroyed <b>${stats.tanksDestroyed || 0}</b></div>
        <div class="main-version">v${CONFIG.VERSION} — offline-first · hand-crafted artwork & audio</div>
      </div>
    `;
    this._bind(s, '[data-action="play"]', () => this.game.openModes());
    this._bind(s, '[data-action="garage"]', () => this.game.openGarage());
    this._bind(s, '[data-action="settings"]', () => this.game.openSettings('main'));
    this._bind(s, '[data-action="controls"]', () => this.showScreen('controls'));
    this._bind(s, '[data-action="credits"]', () => this.showScreen('credits'));
    this._backAction(s);
  }

  // -------------------------------------------------------------- modes

  _buildModes() {
    const s = this.screens.get('modes');
    const diff = this.game.settings.get('difficulty');
    const chips = Object.values(DIFFICULTIES)
      .map((d) => `<button class="diff-chip ${d.id === diff ? 'active' : ''}" data-diff="${d.id}">
        <span class="diff-label">${d.label}</span><span class="diff-desc">${d.desc}</span></button>`)
      .join('');
    s.innerHTML = `
      <div class="panel">
        ${this._title('Select Game Mode')}
        <div class="mode-list">
          <button class="mode-card" data-mode="pva">
            <span class="mode-icon">${Svg.crosshair(34, 34)}</span>
            <span class="mode-title">Player vs AI</span>
            <span class="mode-desc">Battle a computer commander</span>
            <div class="diff-row">${chips}</div>
          </button>
          <button class="mode-card" data-mode="pvp">
            <span class="mode-icon">${Svg.target(34, 34)}</span>
            <span class="mode-title">2 Players</span>
            <span class="mode-desc">Pass-and-play on this device</span>
          </button>
          <button class="mode-card" data-mode="online">
            <span class="mode-icon">${Svg.wind(34, 34)}</span>
            <span class="mode-title">Online</span>
            <span class="mode-desc">Head-to-head over the local server</span>
          </button>
        </div>
        ${this._backBtn()}
      </div>
    `;
    this._bind(s, '[data-diff]', (el) => {
      this.game.settings.set('difficulty', el.dataset.diff);
      s.querySelectorAll('.diff-chip').forEach((c) => c.classList.toggle('active', c === el));
    });
    this._bind(s, '[data-mode]', (el) => {
      const mode = el.dataset.mode;
      this.game.selectMode(mode);
      if (mode === 'online') {
        this.showScreen('online');
        return;
      }
      this.game.openMaps();
    });
    this._backAction(s);
  }

  // ------------------------------------------------------------- online

  _buildOnline() {
    const s = this.screens.get('online');
    const host = window.location.hostname || 'localhost';
    const lanUrl = host === 'localhost' || host === '127.0.0.1'
      ? null
      : `http://${host}:${window.location.port || 8765}`;
    s.innerHTML = `
      <div class="panel">
        ${this._title('Online Battle')}
        <p class="hint">Requires the local Python server (see README). Both players
        run the same seeded match; the server relays turns and commands.</p>
        ${lanUrl ? `<div class="lan-hint">
          <span class="lan-hint-label">Share this address with your opponent:</span>
          <code class="lan-hint-url">${lanUrl}</code>
        </div>` : ''}
        <div class="online-actions">
          <button class="btn btn-primary" data-action="create">Create room</button>
          <button class="btn" data-action="join">Join</button>
          <input class="text-input" data-role="room-code" placeholder="Room code" maxlength="12" aria-label="Room code" style="flex:1"/>
        </div>
        <div class="online-status" data-role="status"></div>
        <p class="hint">After connecting, pick a battlefield and loadout, then hit Start Battle.</p>
        ${this._backBtn()}
      </div>
    `;
    this._bind(s, '[data-action="create"]', () => this.game.onlineCreate());
    this._bind(s, '[data-action="join"]', () => {
      const code = s.querySelector('[data-role="room-code"]').value.trim();
      if (code) this.game.onlineJoin(code);
      else this.modals.show('Join room', 'Enter the room code your opponent shared.');
    });
    this._backAction(s);
  }

  setOnlineStatus(text, kind = '') {
    const s = this.screens.get('online');
    const el = s?.querySelector('[data-role="status"]');
    if (el) {
      el.textContent = text;
      el.className = `online-status ${kind}`;
    }
  }

  // --------------------------------------------------------------- maps

  _buildMaps() {
    const s = this.screens.get('maps');
    s.innerHTML = `
      <div class="panel">
        ${this._title('Select Battlefield')}
        <div class="map-grid" data-role="maps"></div>
        <div class="map-actions">
          <button class="btn" data-action="reroll">${Svg.wind(18, 18)} New layouts</button>
          ${this._backBtn()}
        </div>
      </div>
    `;
    const grid = s.querySelector('[data-role="maps"]');
    const render = () => {
      grid.innerHTML = '';
      this.game.peekMaps().forEach((m) => {
        const card = document.createElement('button');
        card.className = 'map-card';
        // Real terrain preview: render the seeded heightmap into a canvas.
        const thumb = document.createElement('canvas');
        thumb.className = 'map-thumb';
        thumb.width = 168;
        thumb.height = 100;
        const map = new WorldMap(m.seed);
        map.terrain.renderThumb(thumb.getContext('2d'), 168, 100);
        card.innerHTML = `
          <span class="map-name">${m.name}</span>
          <span class="map-meta">${map.archetype} · seed ${m.seed}</span>
        `;
        card.prepend(thumb);
        card.addEventListener('click', () => {
          this.game.selectMap(m.seed);
          this.game.openLoadout();
        });
        grid.appendChild(card);
      });
    };
    render();
    this._bind(s, '[data-action="reroll"]', render);
    this._backAction(s);
  }

  // ------------------------------------------------------------ loadout

  getUnlocked() {
    const kills = this.game.settings.stats.tanksDestroyed || 0;
    const unlocked = [...BASE_WEAPONS];
    for (const [id, threshold] of Object.entries(UNLOCK_THRESHOLDS)) {
      if (kills >= threshold) unlocked.push(id);
    }
    return unlocked;
  }

  _buildLoadout() {
    const s = this.screens.get('loadout');
    const mode = this.game.mode; // 'pva' | 'pvp' | 'online'
    const unlocked = this.getUnlocked();
    const pvp = mode !== 'pva';
    // Fresh screen = fresh tab; never carry a previous player's tab over.
    this.activeLoadoutPlayer = 1;
    // Restore the last-used weapon order for the human player's HUD chips.
    const saved = this.game.settings.get('mobileLayout')?.chipOrder;
    const savedOrder = Array.isArray(saved) && saved.length
      ? saved.filter((id) => isWeaponId(id))
      : [];
    this.loadout.p1 = savedOrder.length
      ? [...savedOrder]
      : [...CONFIG.WEAPONS.DEFAULT_LOADOUT];
    // Preserve a player-2 loadout already set earlier in this session.
    this.loadout.p2 = this.loadout.p2 || null;

    s.innerHTML = `
      <div class="panel loadout-panel">
        ${this._title(pvp ? 'Loadouts' : 'Your Loadout')}
        <div class="loadout-players" data-role="tabs">
          <button class="loadout-tab active" data-tab="1">${pvp ? 'Player 1' : 'Player 1'}</button>
          ${pvp ? '<button class="loadout-tab" data-tab="2">Player 2</button>' : '<button class="loadout-tab locked" data-tab="2">AI (auto)</button>'}
        </div>
        <div class="loadout-slots" data-role="slots"></div>
        <div class="loadout-catalog" data-role="catalog"></div>
        <div class="loadout-actions">
          <button class="btn" data-action="auto">Auto-pick</button>
          <button class="btn btn-primary" data-action="start">Start Battle ${Svg.play(18, 18)}</button>
          ${this._backBtn()}
        </div>
      </div>
    `;

    const tabs = s.querySelector('[data-role="tabs"]');
    tabs.querySelectorAll('.loadout-tab').forEach((t) => {
      if (t.classList.contains('locked')) return;
      t.addEventListener('click', () => {
        this.activeLoadoutPlayer = Number(t.dataset.tab);
        tabs.querySelectorAll('.loadout-tab').forEach((x) => x.classList.toggle('active', x === t));
        this._renderLoadoutSlots(s, unlocked);
      });
    });

    this._renderLoadoutSlots(s, unlocked);

    // Catalog: every weapon, locked ones grayed out.
    const catalog = s.querySelector('[data-role="catalog"]');
    for (const def of WEAPON_CATALOG) {
      const isUnlocked = unlocked.includes(def.id);
      const card = document.createElement('button');
      card.className = 'weapon-card';
      card.classList.toggle('locked', !isUnlocked);
      card.innerHTML = `
        <span class="weapon-card-icon">${Svg.weaponIcon(def.icon, 30, 30)}</span>
        <span class="weapon-card-name">${def.name}</span>
        <span class="weapon-card-desc">${def.desc}</span>
        ${isUnlocked ? '' : `<span class="weapon-card-lock">Unlock: destroy ${UNLOCK_THRESHOLDS[def.id]} tank(s)</span>`}
      `;
      if (isUnlocked) {
        card.addEventListener('click', () => this._toggleWeapon(def.id, unlocked, s));
      }
      catalog.appendChild(card);
    }

    this._bind(s, '[data-action="auto"]', () => {
      const key = this.activeLoadoutPlayer === 2 ? 'p2' : 'p1';
      const list = this.loadout[key];
      const pool = [...unlocked];
      const max = CONFIG.WEAPONS.MAX_SLOTS;
      list.splice(0, list.length);
      while (list.length < max && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        list.push(pool.splice(idx, 1)[0]);
      }
      if (!list.length) list.push('cannon');
      if (key === 'p1') this._saveP1ChipOrder();
      this._renderLoadoutSlots(s, unlocked);
    });

    this._bind(s, '[data-action="start"]', () => this.game.startMatchFromLoadout());
    this._backAction(s);
  }

  _toggleWeapon(id, unlocked, s) {
    const key = this.activeLoadoutPlayer === 2 ? 'p2' : 'p1';
    const list = this.loadout[key];
    const idx = list.indexOf(id);
    const max = CONFIG.WEAPONS.MAX_SLOTS;
    if (idx >= 0) {
      list.splice(idx, 1);
    } else if (list.length < max) {
      list.push(id);
    } else {
      this.modals.show('Loadout full', `You can carry ${max} weapons per battle. Remove one first.`);
      return;
    }
    if (key === 'p1') this._saveP1ChipOrder();
    this._renderLoadoutSlots(s, unlocked);
  }

  /** Persist the human player's weapon chip order (part of the mobile layout). */
  _saveP1ChipOrder() {
    const ids = (this.loadout.p1 || []).filter((id) => isWeaponId(id));
    this.game.settings.set('mobileLayout', {
      ...this.game.settings.get('mobileLayout'),
      chipOrder: ids,
    });
  }

  _renderLoadoutSlots(s, unlocked) {
    const key = this.activeLoadoutPlayer === 2 ? 'p2' : 'p1';
    const list = this.loadout[key] || (this.loadout[key] = []);
    const slots = s.querySelector('[data-role="slots"]');
    const max = CONFIG.WEAPONS.MAX_SLOTS;
    slots.innerHTML = list
      .map(
        (id, i) =>
          `<div class="slot filled" data-slot="${i}" data-weapon="${id}" title="${escapeHtml(getWeaponDef(id).name)} — click to remove">
            ${Svg.weaponIcon(getWeaponDef(id).icon, 22, 22)}
            <span class="slot-name">${escapeHtml(getWeaponDef(id).name)}</span>
            <span class="slot-ammo">${getWeaponDef(id).ammo === Infinity ? '∞' : getWeaponDef(id).ammo}</span>
            <span class="slot-moves">
              <button class="slot-move" data-move="-1" aria-label="Move ${escapeHtml(getWeaponDef(id).name)} left">${Svg.back(14, 14)}</button>
              <button class="slot-move" data-move="1" aria-label="Move ${escapeHtml(getWeaponDef(id).name)} right">${Svg.chevron(14, 14)}</button>
            </span>
          </div>`
      )
      .join('') +
      Array.from({ length: Math.max(0, max - list.length) }, (_, i) => {
        const n = list.length + i;
        return `<div class="slot empty" data-slot="${n}"><span class="slot-empty">+ slot</span></div>`;
      }).join('');
    // Clicking a filled slot removes it; empty slots hint at the limit.
    slots.querySelectorAll('.slot.filled').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.weapon;
        const key = this.activeLoadoutPlayer === 2 ? 'p2' : 'p1';
        const list = this.loadout[key];
        const i = list.indexOf(id);
        if (i >= 0) list.splice(i, 1);
        if (key === 'p1') this._saveP1ChipOrder();
        this._renderLoadoutSlots(s, unlocked);
      });
    });
    // Reorder buttons on each filled slot (stopPropagation keeps the
    // click-to-remove behavior intact).
    slots.querySelectorAll('.slot-move').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('.slot').dataset.weapon;
        const key = this.activeLoadoutPlayer === 2 ? 'p2' : 'p1';
        const list = this.loadout[key];
        const i = list.indexOf(id);
        const j = i + Number(btn.dataset.move);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        if (key === 'p1') this._saveP1ChipOrder();
        this._renderLoadoutSlots(s, unlocked);
      });
    });
  }

  // ------------------------------------------------------------- garage

  _buildGarage() {
    const s = this.screens.get('garage');
    const stats = this.game.settings.stats;
    const unlocked = this.getUnlocked();
    const wstats = this.game.settings.weaponStats();
    const weaponRows = ALL_WEAPON_IDS.map((id) => {
      const def = getWeaponDef(id);
      const isUnlocked = unlocked.includes(id);
      const need = UNLOCK_THRESHOLDS[id];
      const ws = wstats[id] || { used: 0, kills: 0 };
      const m = this.game.settings.weaponMastery(id);
      const killsBadge = ws.kills > 0
        ? `<span class="garage-kills" title="Kills with this weapon">${Svg.skull(14, 14)} ${ws.kills}</span>`
        : '';
      const masteryBadge = m.tier
        ? `<span class="garage-mastery ${m.tier}" title="${m.label} mastery: +${Math.round((m.damageMult - 1) * 100)}% damage">${Svg.trophy(14, 14)} ${m.label}</span>`
        : '';
      return `
        <div class="garage-weapon ${isUnlocked ? '' : 'locked'}">
          <span class="garage-weapon-icon">${Svg.weaponIcon(def.icon, 24, 24)}</span>
          <span class="garage-weapon-name">${def.name}</span>
          <span class="garage-weapon-status">${isUnlocked ? 'unlocked' : `destroy ${need} tanks`}</span>
          ${killsBadge}
          ${masteryBadge}
        </div>`;
    }).join('');

    s.innerHTML = `
      <div class="panel">
        ${this._title('Garage')}
        <div class="garage-stats">
          <div class="stat"><span class="stat-value">${stats.gamesPlayed || 0}</span><span class="stat-label">Matches</span></div>
          <div class="stat"><span class="stat-value">${stats.wins || 0}</span><span class="stat-label">Wins</span></div>
          <div class="stat"><span class="stat-value">${stats.losses || 0}</span><span class="stat-label">Losses</span></div>
          <div class="stat"><span class="stat-value">${stats.tanksDestroyed || 0}</span><span class="stat-label">Tanks destroyed</span></div>
          <div class="stat"><span class="stat-value">${stats.shotsFired || 0}</span><span class="stat-label">Shots fired</span></div>
        </div>
        <h3 class="garage-title">Weapon unlocks</h3>
        <div class="garage-list">${weaponRows}</div>
        <div class="garage-actions">
          <button class="btn btn-danger" data-action="reset">Reset progress</button>
          ${this._backBtn()}
        </div>
      </div>
    `;
    this._bind(s, '[data-action="reset"]', async () => {
      const res = await this.modals.show(
        'Reset progress',
        'This wipes stats and re-locks weapons. This cannot be undone.',
        [
          { label: 'Cancel', value: 'cancel' },
          { label: 'Reset everything', value: 'reset', kind: 'danger' },
        ]
      );
      if (res === 'reset') {
        this.game.resetProgress();
        this._buildGarage();
      }
    });
    this._backAction(s);
  }

  // ----------------------------------------------------------- settings

  _buildSettings() {
    const s = this.screens.get('settings');
    const st = this.game.settings;
    const bindings = st.get('bindings');

    const actionNames = {
      moveLeft: 'Move left', moveRight: 'Move right', aimUp: 'Aim up', aimDown: 'Aim down',
      powerUp: 'Power up', powerDown: 'Power down', fire: 'Fire', weaponNext: 'Next weapon',
      weaponPrev: 'Previous weapon', zoomIn: 'Zoom in', zoomOut: 'Zoom out', pause: 'Pause',
    };

    const rebindRows = Object.entries(actionNames)
      .map(([action, label]) => `
        <div class="rebind-row">
          <span class="rebind-label">${label}</span>
          <button class="rebind-keys" data-action="${action}">${bindings[action].map(keyLabel).join(' / ')}</button>
        </div>`)
      .join('');

    s.innerHTML = `
      <div class="panel settings-panel">
        ${this._title('Settings')}
        <div class="settings-scroll">
          <h3 class="settings-head">Audio</h3>
          <label class="setting-row">Master volume
            <input type="range" data-setting="masterVolume" min="0" max="1" step="0.05" value="${st.get('masterVolume')}"/>
          </label>
          <label class="setting-row">Sound effects
            <input type="range" data-setting="sfxVolume" min="0" max="1" step="0.05" value="${st.get('sfxVolume')}"/>
          </label>
          <label class="setting-row">Music
            <input type="range" data-setting="musicVolume" min="0" max="1" step="0.05" value="${st.get('musicVolume')}"/>
          </label>

          <h3 class="settings-head">Gameplay</h3>
          <label class="setting-row">AI difficulty
            <select data-setting="difficulty">
              ${Object.values(DIFFICULTIES).map((d) => `<option value="${d.id}" ${d.id === st.get('difficulty') ? 'selected' : ''}>${d.label}</option>`).join('')}
            </select>
          </label>
          <label class="setting-row toggle">Self-damage
            <input type="checkbox" data-setting="selfDamage" ${st.get('selfDamage') ? 'checked' : ''}/>
          </label>
          <label class="setting-row toggle">Trajectory preview
            <input type="checkbox" data-setting="showTrajectory" ${st.get('showTrajectory') ? 'checked' : ''}/>
          </label>
          <label class="setting-row toggle">Flip battlefield rotation
            <input type="checkbox" data-setting="flipRotation" ${st.get('flipRotation') ? 'checked' : ''}/>
          </label>
          <p class="hint">Portrait: puts the left edge of the battlefield at the top of the screen instead of the bottom.</p>

          <h3 class="settings-head">Display</h3>
          <label class="setting-row">UI scale
            <input type="range" data-setting="uiScale" min="0.8" max="1.4" step="0.05" value="${st.get('uiScale')}"/>
          </label>
          <label class="setting-row">Mobile render quality
            <select data-setting="mobileQuality">
              <option value="low" ${st.get('mobileQuality') === 'low' ? 'selected' : ''}>Low (1×) — fastest</option>
              <option value="balanced" ${st.get('mobileQuality') === 'balanced' ? 'selected' : ''}>Balanced (1.5×)</option>
              <option value="high" ${st.get('mobileQuality') === 'high' ? 'selected' : ''}>High (2×) — sharpest</option>
            </select>
          </label>
          <p class="hint">Canvas resolution cap on phones. Balanced trades a little sharpness for smoother frames.</p>
          <label class="setting-row toggle">Reduced motion
            <input type="checkbox" data-setting="reducedMotion" ${st.get('reducedMotion') ? 'checked' : ''}/>
          </label>
          <label class="setting-row toggle">Debug mode
            <input type="checkbox" data-setting="debug" ${st.get('debug') ? 'checked' : ''}/>
          </label>

          <h3 class="settings-head">Controls</h3>
          <div class="rebind-list">${rebindRows}</div>
          <button class="btn" data-action="reset-bindings">Reset controls to default</button>

          <h3 class="settings-head">Touch layout</h3>
          <div class="setting-row">
            <span>On-screen control positions</span>
            <button class="btn" data-action="edit-layout">Customize…</button>
          </div>
          <div class="setting-row">
            <span>Reset to defaults</span>
            <button class="btn" data-action="reset-layout">Reset</button>
          </div>
          <p class="hint">Weapon chip order is remembered from your loadout — use the arrows on the loadout slots to reorder. Touch controls appear only on touch devices.</p>
        </div>
        ${this._backBtn()}
      </div>
    `;

    const apply = (key, value) => {
      st.set(key, value);
      this.game.applySettings();
    };

    this._bind(s, 'input[data-setting]', (el) => {
      const key = el.dataset.setting;
      const type = el.type;
      let value;
      if (type === 'checkbox') value = el.checked;
      else if (type === 'range') value = parseFloat(el.value);
      else value = el.value;
      apply(key, value);
      if (key === 'masterVolume' || key === 'sfxVolume' || key === 'musicVolume') {
        this.game.sound.play('click');
      }
    });
    this._bind(s, 'select[data-setting]', (el) => apply(el.dataset.setting, el.value));

    // Rebind-on-click. The listener is capture-phase on document; it is
    // detached via _cancelRebind() on success, Escape, or leaving the screen.
    this._bind(s, '.rebind-keys', (el) => {
      const action = el.dataset.action;
      if (this._pendingRebind) return;
      const onKey = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
          this._cancelRebind();
          this._refreshSettings();
          return;
        }
        const code = e.code;
        if (code && this.game.settings.rebind(action, code)) {
          this._cancelRebind();
          this._refreshSettings();
          this.game.applySettings();
          this.game.sound.play('click');
        }
      };
      this._pendingRebind = { action, el, onKey };
      el.classList.add('listening');
      el.textContent = 'Press a key…';
      document.addEventListener('keydown', onKey, true);
    });

    this._bind(s, '[data-action="reset-bindings"]', () => {
      this.game.settings.resetBindings();
      this.game.applySettings();
      this._refreshSettings();
    });

    this._bind(s, '[data-action="edit-layout"]', () => this._openLayoutEditor());
    this._bind(s, '[data-action="reset-layout"]', () => {
      const ml = this.game.settings.get('mobileLayout');
      const d = DEFAULT_SETTINGS.mobileLayout;
      this.game.settings.set('mobileLayout', {
        custom: false,
        zones: {
          left: { x: d.zones.left.x, y: d.zones.left.y },
          right: { x: d.zones.right.x, y: d.zones.right.y },
        },
        chipOrder: ml && Array.isArray(ml.chipOrder) ? ml.chipOrder : [],
      });
      this.game.applySettings();
      this.game.sound.play('click');
      this.modals.show('Touch layout', 'Touch controls reset to the default positions. Your weapon chip order was kept.');
    });

    this._backAction(s);
  }

  /**
   * Drag editor for the on-screen touch control positions (thumb zones).
   * Positions are stored as percentages of the viewport and applied to the
   * in-match HUD the next time a battle runs (or immediately if one is live).
   */
  _openLayoutEditor() {
    const ml = this.game.settings.get('mobileLayout');
    const state = {
      zones: {
        left: { x: ml.zones.left.x, y: ml.zones.left.y },
        right: { x: ml.zones.right.x, y: ml.zones.right.y },
      },
    };
    const editor = document.createElement('div');
    editor.className = 'layout-editor';
    const ar = clampNum(window.innerWidth / window.innerHeight, 0.56, 1.8);
    editor.innerHTML = `
      <p class="hint">Drag the control clusters to where your thumbs rest. Positions are remembered per device.</p>
      <div class="layout-stage" style="aspect-ratio: ${ar} / 1"></div>
      <div class="layout-coords" data-role="coords"></div>
      <button class="btn" data-action="layout-reset">Reset positions</button>
    `;
    const stage = editor.querySelector('.layout-stage');
    const coords = editor.querySelector('[data-role="coords"]');

    const rect = () => stage.getBoundingClientRect();
    const coordsText = () =>
      `Left ${state.zones.left.x}% · ${state.zones.left.y}%   Right ${state.zones.right.x}% · ${state.zones.right.y}%`;
    const persist = () => {
      this.game.settings.set('mobileLayout', {
        custom: true,
        zones: {
          left: { x: state.zones.left.x, y: state.zones.left.y },
          right: { x: state.zones.right.x, y: state.zones.right.y },
        },
        chipOrder: this.game.settings.get('mobileLayout').chipOrder || [],
      });
      this.game.applySettings();
    };

    const makeZone = (side, label) => {
      const zone = document.createElement('div');
      zone.className = `layout-zone layout-zone-${side}`;
      zone.dataset.side = side;
      zone.innerHTML = `<span class="layout-zone-label">${label}</span>`;
      const pos = () => {
        const z = state.zones[side];
        zone.style.left = side === 'left' ? `${z.x}%` : 'auto';
        zone.style.right = side === 'right' ? `${z.x}%` : 'auto';
        zone.style.bottom = `${z.y}%`;
      };
      pos();
      const move = (e) => {
        const r = rect();
        if (!r.width || !r.height) return;
        const px = clampNum(((e.clientX - r.left) / r.width) * 100, 0, 100);
        const py = clampNum(((r.bottom - e.clientY) / r.height) * 100, 0, 100);
        state.zones[side].x = Math.round(px);
        state.zones[side].y = Math.round(py);
        pos();
        coords.textContent = coordsText();
      };
      const down = (e) => {
        e.preventDefault();
        zone.classList.add('dragging');
        try {
          zone.setPointerCapture?.(e.pointerId);
        } catch {
          /* pointer capture is unavailable for synthetic/legacy pointers */
        }
        move(e);
      };
      const up = (e) => {
        zone.classList.remove('dragging');
        try {
          zone.releasePointerCapture?.(e.pointerId);
        } catch {
          /* pointer capture may be gone after a fast drag */
        }
        persist();
      };
      zone.addEventListener('pointerdown', down);
      zone.addEventListener('pointermove', (e) => {
        if (zone.classList.contains('dragging')) move(e);
      });
      zone.addEventListener('pointerup', up);
      zone.addEventListener('pointercancel', up);
      stage.appendChild(zone);
    };
    makeZone('left', 'MOVE · AIM');
    makeZone('right', 'POWER · WHEEL');
    coords.textContent = coordsText();

    editor.querySelector('[data-action="layout-reset"]').addEventListener('click', () => {
      const d = DEFAULT_SETTINGS.mobileLayout;
      state.zones.left = { x: d.zones.left.x, y: d.zones.left.y };
      state.zones.right = { x: d.zones.right.x, y: d.zones.right.y };
      editor.querySelectorAll('.layout-zone').forEach((z) => {
        const side = z.dataset.side;
        const v = state.zones[side];
        z.style.left = side === 'left' ? `${v.x}%` : 'auto';
        z.style.right = side === 'right' ? `${v.x}%` : 'auto';
        z.style.bottom = `${v.y}%`;
      });
      coords.textContent = coordsText();
      persist();
    });

    this.modals.show('Customize touch layout', editor, []);
  }

  _refreshSettings() {
    if (this.current === 'settings') this._buildSettings();
  }

  // ----------------------------------------------------------- controls

  _buildControls() {
    const s = this.screens.get('controls');
    s.innerHTML = `
      <div class="panel">
        ${this._title('Controls')}
        <div class="controls-grid">
          <div class="control-block">
            <h3>${Svg.keyboard(18, 18)} Keyboard</h3>
            <ul>
              <li><kbd>A</kbd><kbd>D</kbd> or <kbd>←</kbd><kbd>→</kbd> — move</li>
              <li><kbd>W</kbd><kbd>S</kbd> or <kbd>↑</kbd><kbd>↓</kbd> — aim turret</li>
              <li><kbd>Z</kbd><kbd>X</kbd> or <kbd>+</kbd><kbd>−</kbd> — power</li>
              <li><kbd>Space</kbd> — fire</li>
              <li><kbd>Q</kbd><kbd>E</kbd> or <kbd>[</kbd><kbd>]</kbd> — weapon</li>
              <li><kbd>I</kbd><kbd>O</kbd> or mouse wheel — zoom in / out (auto-fits both tanks)</li>
              <li><kbd>Esc</kbd> — pause</li>
            </ul>
            <p class="hint">All bindings are remappable in Settings → Controls.</p>
          </div>
          <div class="control-block">
            <h3>${Svg.crosshair(18, 18)} Mouse</h3>
            <ul>
              <li>Move cursor over the battlefield to aim</li>
              <li>Scroll wheel to zoom the camera</li>
              <li><b>Right-click</b> to lock the turret angle while you fine-tune power</li>
              <li>Click weapons in the HUD to switch</li>
              <li>Drag the power slider</li>
            </ul>
          </div>
          <div class="control-block">
            <h3>${Svg.touch(18, 18)} Touch</h3>
            <ul>
              <li>Drag anywhere on the battlefield to aim</li>
              <li><b>Drag the joystick</b> left/right to move your tank</li>
              <li>Use the on-screen buttons to aim fine, adjust power and fire</li>
              <li>Held upright, the battlefield rotates to fill the screen</li>
              <li>The corner mini-map shows both tanks at a glance</li>
            </ul>
          </div>
        </div>
        ${this._backBtn()}
      </div>
    `;
    this._backAction(s);
  }

  // ------------------------------------------------------------ credits

  _buildCredits() {
    const s = this.screens.get('credits');
    s.innerHTML = `
      <div class="panel">
        ${this._title('Credits')}
        <div class="credits-body">
          <p><b>Nebula Cannons</b> — a 2D turn-based artillery duel.</p>
          <p>Inspired by the classic artillery genre (Tank Stars, Worms, Scorched Earth)
          but built as an original game: original code, visuals and audio.</p>
          <ul>
            <li>Engine: vanilla JavaScript ES modules + HTML5 Canvas</li>
            <li>Artwork: hand-crafted SVG (logo, tanks, icons, backgrounds) in assets/svg</li>
            <li>Audio: synthesized WAV files (scripts/generate-audio.py) in assets/sound</li>
            <li>Procedural canvas/SVG/Web-Audio fallbacks keep it offline-first with no CDNs</li>
          </ul>
          <p class="hint">Every pixel and sound byte ships with the game — no network required.</p>
        </div>
        ${this._backBtn()}
      </div>
    `;
    this._backAction(s);
  }

  // -------------------------------------------------------------- pause

  _buildPause() {
    const s = this.screens.get('pause');
    s.innerHTML = `
      <div class="overlay">
        <div class="panel pause-panel">
          <h2 class="screen-title">Paused</h2>
          <div class="pause-actions">
            <button class="btn btn-primary" data-action="resume">${Svg.play(20, 20)} Resume</button>
            <button class="btn" data-action="settings">${Svg.gear(20, 20)} Settings</button>
            <button class="btn" data-action="restart">${Svg.back(20, 20)} Restart match</button>
            <button class="btn btn-danger" data-action="quit">${Svg.close(20, 20)} Quit to menu</button>
          </div>
        </div>
      </div>
    `;
    this._bind(s, '[data-action="resume"]', () => this.game.togglePause());
    this._bind(s, '[data-action="settings"]', () => this.game.openSettings('pause'));
    this._bind(s, '[data-action="restart"]', () => this.game.restartMatch());
    this._bind(s, '[data-action="quit"]', async () => {
      const res = await this.modals.show(
        'Quit match?',
        'Progress in this battle will be lost.',
        [
          { label: 'Keep playing', value: 'stay' },
          { label: 'Quit', value: 'quit', kind: 'danger' },
        ]
      );
      if (res === 'quit') this.game.quitToMenu();
    });
  }

  // -------------------------------------------------------------- result

  _buildResult() {
    const s = this.screens.get('result');
    const data = this.game.lastResult || {};
    const won = data.won;
    const banner = won
      ? `<div class="result-banner victory">${Svg.trophy(64, 64)}</div>
         <h2 class="result-title victory-title">${data.title || 'Victory!'}</h2>`
      : `<div class="result-banner defeat">${Svg.skull(64, 64)}</div>
         <h2 class="result-title defeat-title">${data.title || 'Defeated'}</h2>`;
    const sub = data.subtitle
      ? `<p class="result-sub">${data.subtitle}</p>`
      : '<p class="result-sub">The battlefield falls silent.</p>';
    const shots = this.game.settings.stats.shotsFired || 0;
    const killEntries = Object.entries((data.weaponKills) || {}).filter(([, n]) => Number(n) > 0);
    s.innerHTML = `
      <div class="overlay">
        <div class="panel result-panel">
          ${banner}
          ${sub}
          ${this._buildMasteryHtml(killEntries)}
          <div class="result-actions">
            <button class="btn btn-primary" data-action="rematch">${Svg.play(20, 20)} Rematch</button>
            <button class="btn" data-action="menu">${Svg.back(20, 20)} Main menu</button>
          </div>
          <div class="main-stats">Lifetime: <b>${this.game.settings.stats.wins || 0}</b> wins · <b>${shots}</b> shots fired</div>
        </div>
      </div>
    `;
    this._bind(s, '[data-action="rematch"]', () => this.game.rematch());
    this._bind(s, '[data-action="menu"]', () => this.game.quitToMenu());
  }

  /**
   * Mastery readouts for the match results: which weapons earned kills this
   * match and lifetime progress toward the next mastery tier.
   * @param {Array<[string, number]>} killEntries weaponId -> kills this match
   */
  _buildMasteryHtml(killEntries) {
    const rows = killEntries.length
      ? killEntries.map(([id, n]) => {
          const def = getWeaponDef(id);
          if (!def) return '';
          const m = this.game.settings.weaponMastery(id);
          const pct = m.next ? Math.min(100, Math.round((m.kills / m.next) * 100)) : 100;
          const status = m.tier
            ? `<span class="rm-tier ${m.tier}">${Svg.trophy(12, 12)} ${m.label}</span>`
            : m.next
              ? `<span class="rm-progress-text">${m.kills}/${m.next} → ${m.nextLabel}</span>`
              : '<span class="rm-tier gold">MAX</span>';
          return `
            <div class="rm-row">
              <span class="rm-icon">${Svg.weaponIcon(def.icon, 20, 20)}</span>
              <span class="rm-name">${escapeHtml(def.name)}</span>
              <span class="rm-kills" title="Kills this match">${Svg.skull(12, 12)} ${n}</span>
              ${status}
              <span class="rm-bar"><span class="rm-fill" style="width:${pct}%"></span></span>
            </div>`;
        }).join('')
      : '<p class="rm-empty">No kills this match. Destroying tanks with a weapon earns mastery tiers — Bronze +5%, Silver +10%, Gold +15% damage.</p>';
    return `
      <div class="result-mastery">
        <h3 class="result-mastery-title">${Svg.trophy(16, 16)} Mastery</h3>
        ${rows}
      </div>`;
  }
}
