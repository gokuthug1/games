/**
 * Game — the orchestrator. Owns the canvas, camera, state machine, world,
 * entities, systems, audio and UI, and drives the fixed-timestep simulation:
 *
 *   Input -> Game State -> Simulation/Physics -> Entities -> Renderer -> Canvas
 *
 * The Game is intentionally the only place that wires systems together;
 * individual systems stay decoupled and testable.
 */

import { CONFIG } from './Config.js';
import { EventBus, EVT } from './EventBus.js';
import { GameState, GameStates } from './GameState.js';
import { GameLoop } from './GameLoop.js';
import { Camera } from './Camera.js';
import { Settings } from './Settings.js';
import { debug } from '../utils/Debug.js';
import { RNG, randomSeed } from '../utils/Random.js';
import { clamp, degToRad } from '../utils/MathUtils.js';
import { Vector2 } from '../utils/Vector2.js';

import { Map, mapNameFor } from '../world/Map.js';
import { Environment } from '../world/Environment.js';
import { Tank } from '../entities/Tank.js';
import { Projectile } from '../entities/Projectile.js';
import { Explosion } from '../entities/Explosion.js';
import { Physics } from '../systems/Physics.js';
import { Collision } from '../systems/Collision.js';
import { Combat } from '../systems/Combat.js';
import { TurnManager } from '../systems/TurnManager.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { AIController } from '../ai/AIController.js';
import { AimingAI } from '../ai/AimingAI.js';
import { SoundManager } from '../audio/SoundManager.js';
import { AssetManager } from './AssetManager.js';
import { registerSvgFiles } from '../ui/SvgAssets.js';
import { UIManager } from '../ui/UIManager.js';
import { Input } from '../input/Input.js';
import { NetClient } from '../net/NetClient.js';
import { createWeapon, getWeaponDef, isWeaponId } from '../weapons/Weapons.js';


export class Game {
  /**
   * @param {HTMLElement} root element containing the canvas
   */
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('#game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.max(1, window.devicePixelRatio || 1);

    this.bus = new EventBus();
    this.state = new GameState(this.bus);
    this.camera = new Camera();
    this.settings = new Settings();
    this.settings.load();
    this.sound = new SoundManager();
    this.assets = new AssetManager();
    this.sound.attachAssets(this.assets);
    this.particles = new ParticleSystem();
    this.loop = new GameLoop({ update: (dt) => this.update(dt), render: () => this.render() });
    this.ui = new UIManager(this, root.querySelector('#hud-root'), root.querySelector('#menu-root'), root.querySelector('#modal-root'));
    this.input = new Input(this, this.canvas);
    this.turnManager = new TurnManager(this);
    this.ai = new AIController(this, this.settings.get('difficulty'));
    this.net = new NetClient(this);

    // Match state.
    this.mode = 'pva';
    this.mapSeed = 0;
    this.mapName = '';
    this.rng = new RNG(1);
    this.map = null;
    this.terrain = null;
    this.environment = new Environment(randomSeed(), this.assets);
    this.tanks = [];
    this.projectiles = [];
    this.explosions = [];
    this.players = [];
    this.lastResult = null;
    this._matchWeaponKills = {}; // per-match: weaponId -> kills (results screen)
    this._loadTimer = 0;
    this._fixedAcc = 0;
    this._previewKey = '';
    this._previewPath = [];
    this._netStateTimer = 0;
    this._lastLoadout = null;
    this._onlinePayload = null;

    // Adaptive mobile render quality: on coarse-pointer devices the DPR cap
    // drops one tier when the frame rate sags below target and climbs back
    // when there is headroom, never above the user's mobileQuality choice.
    this._adaptive = {
      active: false,
      quality: null, // effective tier: 'low' | 'balanced' | 'high'
      samples: [],   // rolling FPS ring (0.5s cadence)
      sampleTimer: 0,
      lowTimer: 0,   // sustained low-fps window before dropping a tier
      highTimer: 0,  // sustained headroom window before raising a tier
    };

    // Field entities (weapon deployments) + scheduled callbacks.
    this._deferred = [];
    this.mines = [];
    this.turrets = [];
    this.fireZones = [];
    this.smokeZones = [];
    this.beams = [];
    this.companions = [];
    this.supplyDrops = [];

    this.applySettings();
    this._bindWindow();
    this._bindRotateOverlay();
    this.resize();

    this.state.transition(GameStates.MENU);
    this.loop.start();
    this._loadAssets();
    this.bus.on(EVT.TURN_START, (d) => this._onTurnStart(d));
  }

  // ------------------------------------------------------------- helpers

  /**
   * Schedule a callback `seconds` from now, driven by the game loop.
   * Used for sequenced effects: barrage shells, drone arm delay, airstrike
   * bomb drops, turret shots.
   */
  after(seconds, fn) {
    this._deferred.push({ t: seconds, fn });
    return fn;
  }

  // ------------------------------------------------------------- assets

  /**
   * Load the real artwork + audio files. Never blocks the game: on success
   * the SVG files are registered (icons/logo prefer them) and the loading
   * screen fades out; on failure every system keeps its procedural fallback.
   */
  _loadAssets() {
    this._loadingEl = document.getElementById('loading-screen');
    this._loadingFill = document.getElementById('loading-fill');
    this.assets.load((p) => {
      if (this._loadingFill) this._loadingFill.style.width = `${Math.round(p * 100)}%`;
    }).then((res) => {
      registerSvgFiles(this.assets.svgTexts());
      if (this._loadingEl) {
        this._loadingEl.classList.add('done');
        setTimeout(() => this._loadingEl && this._loadingEl.remove(), 600);
      }
      if (res.failed.length) {
        console.info('[assets] loaded', res.ok, 'of', res.total, '— missing:', res.failed.join(', '));
      } else {
        console.info('[assets] all', res.total, 'assets loaded');
      }
    });
  }

  // ------------------------------------------------------------ lifecycle

  /**
   * Portrait "rotate device" overlay: suggests landscape, dismissible, and
   * the touch controls are relocated to the screen edges by CSS while the
   * device is held upright (see responsive.css).
   */
  _bindRotateOverlay() {
    const overlay = document.getElementById('rotate-overlay');
    if (!overlay) return;
    const dismiss = () => overlay.classList.add('dismissed');
    overlay.querySelector('[data-action="rotate-dismiss"]')?.addEventListener('click', dismiss);
    // Re-show if the page is reloaded while still upright; the class only
    // persists for this page view.
  }

  _bindWindow() {
    // Mobile browsers fire resize storms when the URL bar / keyboard shows;
    // settle on the last size so we don't reallocate the canvas every frame.
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        this.resize();
      }, 80);
    });
    window.addEventListener('blur', () => {
      if (this.state.inMatch() && !this.state.is(GameStates.PAUSED)) {
        this.togglePause();
      }
    });
    // Init audio on the first user gesture.
    const initAudio = () => {
      this.sound.init();
      this.sound.setVolumes(this.settings.all());
      this.sound.loadBuffers(); // decode WAV assets (async, best effort)
      this.sound.startMusic();
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('pointerdown', initAudio);
    window.addEventListener('keydown', initAudio);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const small = w < 760 || h < 560;
    const portrait = h > w;

    let cssW;
    let cssH;
    if (coarse && portrait) {
      // Mobile held upright: the battlefield fills the whole window, rendered
      // rotated 90° (Camera.rotated). No letterbox — everything is visible.
      cssW = w;
      cssH = h;
    } else {
      // Fit 16:9 preserving aspect ratio inside the window.
      const scale = Math.min(w / 16, h / 9);
      cssW = Math.max(320, Math.floor(scale * 16));
      cssH = Math.max(180, Math.floor(scale * 9));
    }

    // Adaptive quality only pays off when there is resolution to shed; a
    // DPR-1 device has no headroom below the floor, so the guard stays off.
    this._adaptive.active = coarse && (window.devicePixelRatio || 1) > 1;

    this._applyCanvasSize(cssW, cssH, coarse);
    // Overlays: on touch/small screens the HUD + menu use the full window so
    // touch targets and menus get real estate, with the letterboxed canvas
    // centered inside. On desktop the viewport hugs the canvas so the HUD
    // aligns with the battlefield instead of the (possibly ultrawide) window.
    const vp = document.getElementById('viewport');
    if (vp) {
      if (coarse || small) {
        vp.style.width = '100%';
        vp.style.height = '100%';
      } else {
        vp.style.width = `${cssW}px`;
        vp.style.height = `${cssH}px`;
      }
    }
    this.camera.setViewport(cssW, cssH);
  }

  /**
   * Size the canvas backing store for the given CSS box. The pixel ratio is
   * capped on coarse-pointer devices by the mobileQuality setting, and the
   * adaptive fps guard may drop it further (see _sampleAdaptiveQuality).
   * Reallocating for a new DPR never touches the camera, so a mid-match
   * tier change does not reset the player's zoom.
   */
  _applyCanvasSize(cssW, cssH, coarse) {
    const rawDpr = Math.max(1, window.devicePixelRatio || 1);
    if (coarse) {
      this.dpr = Math.min(this._qualityCap(this.settings.get('mobileQuality') || 'balanced'), rawDpr);
    } else {
      this.dpr = rawDpr;
    }
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
  }

  /**
   * DPR cap for a user quality choice after the adaptive guard has its say:
   * low = 1x, balanced = 1.5x, high = 2x. The effective tier never exceeds
   * the user's setting (a raised cap is re-synced here on the next resize).
   */
  _qualityCap(userQ) {
    const order = ['low', 'balanced', 'high'];
    const cap = { low: 1, balanced: 1.5, high: 2 };
    let userIdx = order.indexOf(userQ);
    if (userIdx < 0) userIdx = 1; // 'balanced' is the default tier
    if (!this._adaptive.active) return cap[order[userIdx]];
    let effIdx = order.indexOf(this._adaptive.quality);
    if (effIdx < 0) effIdx = userIdx;
    effIdx = Math.min(userIdx, effIdx);
    this._adaptive.quality = order[effIdx];
    return cap[order[effIdx]];
  }

  /**
   * Rolling-fps guard for the mobile DPR cap. Every 0.5s during a match the
   * recent average is compared against two thresholds: sustained < 40fps for
   * 3s drops one tier; sustained > 55fps for 5s raises one back, up to the
   * user's mobileQuality setting. The distinct thresholds + sustained
   * windows (hysteresis) stop the tier from flapping between extremes.
   */
  _sampleAdaptiveQuality() {
    const a = this._adaptive;
    a.samples.push(this.loop.fps);
    if (a.samples.length > 12) a.samples.shift();
    if (a.samples.length < 6) return; // wait for a stable window
    const avg = a.samples.reduce((s, v) => s + v, 0) / a.samples.length;
    const order = ['low', 'balanced', 'high'];
    const userQ = this.settings.get('mobileQuality') || 'balanced';
    const userIdx = order.indexOf(userQ) < 0 ? 1 : order.indexOf(userQ);
    const curIdx = order.indexOf(a.quality);
    if (curIdx < 0) return;
    if (avg < 40 && curIdx > 0) {
      a.lowTimer += 0.5;
      a.highTimer = 0;
      if (a.lowTimer >= 3) {
        a.lowTimer = 0;
        a.quality = order[curIdx - 1];
        this._applyAdaptiveTier();
      }
    } else if (avg > 55 && curIdx < userIdx) {
      a.highTimer += 0.5;
      a.lowTimer = 0;
      if (a.highTimer >= 5) {
        a.highTimer = 0;
        a.quality = order[curIdx + 1];
        this._applyAdaptiveTier();
      }
    } else {
      // Neither threshold: decay pending windows so a brief dip never
      // accumulates into a spurious tier change.
      a.lowTimer = Math.max(0, a.lowTimer - 0.5);
      a.highTimer = Math.max(0, a.highTimer - 0.5);
    }
  }

  /** Reallocate the canvas at the new DPR, leaving the camera untouched. */
  _applyAdaptiveTier() {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse) return;
    const cssW = parseFloat(this.canvas.style.width);
    const cssH = parseFloat(this.canvas.style.height);
    if (!cssW || !cssH) return;
    this._applyCanvasSize(cssW, cssH, true);
    console.info(`[quality] fps guard: ${this._adaptive.quality} (dpr ${this.dpr.toFixed(2)})`);
    this.ui?.toast?.(`Auto quality: ${this._adaptive.quality}`);
  }

  applySettings() {
    const s = this.settings.all();
    debug.setEnabled(s.debug);
    document.body.classList.toggle('reduce-motion', s.reducedMotion);
    document.documentElement.style.setProperty('--ui-scale', String(s.uiScale));
    this.ai.setDifficulty(s.difficulty);
    this.sound.setVolumes(s);
    // Persisted thumb-zone positions flow into the live HUD clusters.
    this.ui?.hud?.applyTouchLayout?.();
    // Portrait rotation direction (world-left at top vs bottom).
    this.camera.flipRotation = s.flipRotation === true;
  }

  // ------------------------------------------------------------- weapons

  weaponDef(id) {
    return getWeaponDef(id);
  }

  /**
   * Scale base damage by the owner's earned mastery tier for a weapon.
   * Only the human player (team 0) benefits from progression bonuses.
   * @returns {number} adjusted damage
   */
  masteryDamage(owner, weaponId, base) {
    if (!owner || owner.team !== 0) return base;
    return base * this.settings.weaponMastery(weaponId).damageMult;
  }

  weaponChangePayload(tank) {
    return {
      id: tank.id,
      weapons: tank.weapons.map((id) => {
        const def = getWeaponDef(id);
        return {
          id,
          name: def.name,
          icon: def.icon,
          ammo: tank.ammoFor(id),
          desc: def.desc,
          damage: def.damage,
          blastRadius: def.blastRadius,
          minAngle: def.minAngle,
          maxAngle: def.maxAngle,
          minPower: def.minPower,
          maxPower: def.maxPower,
        };
      }),
      activeIndex: tank.weaponIndex,
    };
  }

  spawnProjectile(opts) {
    const p = new Projectile({
      ...opts,
      pos: new Vector2(opts.pos.x, opts.pos.y),
      vel: new Vector2(opts.vel.x, opts.vel.y),
    });
    this.projectiles.push(p);
    return p;
  }

  spawnExplosionEntity({ x, y, radius, color, duration }) {
    this.explosions.push(new Explosion({ x, y, radius, color, duration }));
    if (this.state.is(GameStates.PROJECTILE_FLIGHT) && this.projectiles.length === 0) {
      this.state.transition(GameStates.EXPLOSION);
    }
    return this.explosions[this.explosions.length - 1];
  }

  // ------------------------------------------------------------- matches

  peekMaps() {
    // Four distinct battlefields with four distinct names, so the map
    // select never shows duplicates. Regenerate seeds until names differ.
    const seen = new Set();
    const out = [];
    let guard = 0;
    while (out.length < 4 && guard++ < 64) {
      const seed = randomSeed();
      const name = mapNameFor(seed);
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ seed, name });
    }
    return out;
  }

  selectMode(mode) {
    this.mode = mode;
  }

  selectMap(seed) {
    this.mapSeed = seed >>> 0;
  }

  // ---- menu navigation (drives the centralized state machine) ----

  openModes() {
    this.state.transition(GameStates.GAME_MODE_SELECT);
  }

  openMaps() {
    this.state.transition(GameStates.MAP_SELECT);
  }

  openLoadout() {
    this.state.transition(GameStates.WEAPON_SELECT);
  }

  openGarage() {
    this.state.transition(GameStates.GARAGE);
  }

  openSettings(returnTo) {
    this.ui.menu.setReturnTo(returnTo || null);
    this.state.transition(GameStates.SETTINGS);
  }

  backToMenu() {
    this.net.disconnect();
    this.state.transition(GameStates.MENU);
  }

  backFromSettings() {
    const returnTo = this.ui.menu._returnTo;
    this.ui.menu.setReturnTo(null);
    if (returnTo === 'pause' && this.state.is(GameStates.SETTINGS)) {
      this.state.transition(GameStates.PAUSED);
    } else {
      this.state.transition(GameStates.MENU);
    }
  }

  startMatchFromLoadout() {
    const menu = this.ui.menu;
    const loadout = menu.loadout;
    const unlocked = menu.getUnlocked();

    const p1 = (loadout.p1 && loadout.p1.length ? loadout.p1 : [...CONFIG.WEAPONS.DEFAULT_LOADOUT])
      .filter((id) => isWeaponId(id));
    let p2 = loadout.p2 && loadout.p2.length ? loadout.p2 : null;

    if (this.mode === 'online') {
      if (!this.net.isOnline) {
        this.ui.toast('Connect to the server first (Online menu)');
        return;
      }
      // Host configures the whole match in online v1; guest waits.
      const payload = {
        mode: 'online',
        seed: this.mapSeed,
        p1,
        p2: p2 || this._randomLoadout(unlocked),
        role: this.net.role,
      };
      this._onlinePayload = payload;
      this.net.startMatch(payload);
      this.ui.setOnlineStatus('Match sent — starting…', 'ok');
      // The server relays to the guest only, so the host starts its own match.
      this.beginMatch({
        mode: 'online',
        seed: payload.seed,
        p1: payload.p1,
        p2: payload.p2,
        online: true,
        myIndex: this.net.myPlayerIndex,
      });
      return;
    }

    if (this.mode === 'pva') {
      p2 = p2 || this._randomLoadout(unlocked);
    }
    // Remember the last-used weapon chip order for the human player.
    this.settings.set('mobileLayout', {
      ...this.settings.get('mobileLayout'),
      chipOrder: [...p1],
    });
    this._lastLoadout = { p1, p2 };
    this.beginMatch({ mode: this.mode, seed: this.mapSeed, p1, p2 });
  }

  _randomLoadout(unlocked) {
    const slots = CONFIG.WEAPONS.MAX_SLOTS;
    const pool = [...unlocked];
    // Coordinated kit: one heavy hitter, one control weapon, one
    // utility/deployable, then fill the rest with flex picks. Each role
    // is drawn from distinct categories so the AI never ends up with six
    // weapons that all do the same thing.
    const roles = {
      heavy: ['nuke', 'railgun', 'orbital', 'sniper', 'leech', 'sticky', 'plasma'],
      control: ['emp', 'tesla', 'flash', 'gravity', 'cryo', 'smoke', 'homing'],
      utility: ['shield', 'drone', 'turret', 'airstrike', 'mine', 'napalm', 'dirtmaker', 'fireball'],
    };
    const pick = (list) => {
      const candidates = list.filter((id) => pool.includes(id));
      if (!candidates.length) return null;
      const idx = Math.floor(Math.random() * candidates.length);
      const id = candidates[idx];
      pool.splice(pool.indexOf(id), 1);
      return id;
    };
    const out = [];
    // Always keep a fallback shell so the AI can never be fully out of ammo.
    const anchor = pool.includes('cannon') ? 'cannon' : pool.includes('bouncer') ? 'bouncer' : null;
    if (anchor) {
      pool.splice(pool.indexOf(anchor), 1);
      out.push(anchor);
    }
    for (const role of [roles.heavy, roles.control, roles.utility]) {
      const id = pick(role);
      if (id) out.push(id);
    }
    // Fill remaining slots with the rest (still distinct by construction).
    while (out.length < slots && pool.length) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    if (!out.length) out.push('cannon');
    return out.slice(0, slots);
  }

  /**
   * Start a battle.
   * @param {object} o { mode, seed, p1: [ids], p2: [ids], online? }
   */
  beginMatch(o) {
    // Restarting from the pause menu must unpause the loop.
    this.loop.setPaused(false);
    const seed = (o.seed !== undefined ? o.seed : randomSeed()) >>> 0;
    const mode = o.mode || this.mode;
    this.mode = mode;
    this.mapSeed = seed;

    this.rng = new RNG(seed);
    this.map = new Map(seed);
    this.mapName = mapNameFor(seed);
    this.terrain = this.map.terrain;
    this.projectiles = [];
    this.explosions = [];
    this.particles.clear();
    this.lastResult = null;
    this._matchWeaponKills = {};
    this._fixedAcc = 0;
    this._previewPath = [];
    this._deferred = [];
    this.mines = [];
    this.turrets = [];
    this.fireZones = [];
    this.smokeZones = [];
    this.beams = [];
    this.companions = [];
    this.supplyDrops = [];

    const spawns = this.map.pickSpawns(2, 560);
    const colors = [CONFIG.COLORS.PLAYER_A, CONFIG.COLORS.PLAYER_B];
    const darks = [CONFIG.COLORS.PLAYER_A_DARK, CONFIG.COLORS.PLAYER_B_DARK];
    const online = !!o.online;

    const loadouts = [
      this._sanitizeLoadout(o.p1, 0),
      this._sanitizeLoadout(o.p2, 1),
    ];

    const names = mode === 'pva'
      ? ['You', 'ROBOT-9']
      : mode === 'online'
        ? ['Player 1', 'Player 2']
        : ['Player 1', 'Player 2'];

    this.tanks = [];
    const tanks = [];
    for (let i = 0; i < 2; i++) {
      const tank = new Tank({
        id: `tank-${i}`,
        name: names[i],
        team: i,
        color: colors[i],
        colorDark: darks[i],
        x: spawns[i].x,
        y: spawns[i].y,
        weapons: loadouts[i],
        weaponIndex: 0,
        sprite: this.assets.image(i === 0 ? 'tanks/tank-a' : 'tanks/tank-b'),
        wreck: this.assets.image('tanks/tank-wreck'),
      });
      tank.weaponInstances = tank.weapons.map((id) => createWeapon(id, tank));
      tank.weapons.forEach((id) => {
        tank.ammo[id] = getWeaponDef(id).ammo;
      });
      tank.restOn(this.terrain);
      tanks.push(tank);
    }
    this.tanks = tanks;

    const p2Type = mode === 'pva' ? 'ai' : 'human';
    this.players = [
      { type: 'human', name: names[0], tank: tanks[0] },
      { type: p2Type, name: names[1], tank: tanks[1] },
    ];
    this.turnManager.setup(this.players);
    this.ai.setDifficulty(this.settings.get('difficulty'));

    if (online) {
      this._onlinePayload = o;
      this.net.myPlayerIndex = o.myIndex !== undefined ? o.myIndex : this.net.myPlayerIndex;
    }

    this.bus.emit(EVT.MATCH_START, { players: this.players, mode });
    // Render weapon chips immediately (the HUD reads ammo at spawn).
    for (const tank of tanks) {
      this.bus.emit(EVT.WEAPON_CHANGE, this.weaponChangePayload(tank));
    }
    this.camera.followLocked = false;
    this.camera.snapTo(tanks[0].x, tanks[0].y - 60);
    this.state.transition(GameStates.LOADING, { mode, seed });
    this._loadTimer = 1.4;
    this.ui.hud.setBanner('GET READY', 'var(--accent)');
    this.sound.play('click');
    debug.log('match started', mode, seed, loadouts);
  }

  _sanitizeLoadout(list, fallback) {
    const max = CONFIG.WEAPONS.MAX_SLOTS;
    const def = fallback === 0 ? CONFIG.WEAPONS.DEFAULT_LOADOUT : ['cannon', 'bouncer'];
    if (!Array.isArray(list) || list.length === 0) return [...def].slice(0, max);
    const clean = list.filter((id) => isWeaponId(id));
    return clean.length ? clean.slice(0, max) : [...def].slice(0, max);
  }

  rematch() {
    if (!this._lastLoadout && this.mode !== 'online') return;
    if (this.mode === 'online') {
      this.net.startMatch(this._onlinePayload);
      return;
    }
    this.beginMatch({ mode: this.mode, seed: this.mapSeed, p1: this._lastLoadout.p1, p2: this._lastLoadout.p2 });
  }

  quitToMenu() {
    this.loop.setPaused(false);
    this.net.disconnect();
    this.projectiles = [];
    this.explosions = [];
    this.particles.clear();
    this._deferred = [];
    this.mines = [];
    this.turrets = [];
    this.fireZones = [];
    this.smokeZones = [];
    this.beams = [];
    this.companions = [];
    this.tanks = [];
    this.lastResult = null;
    // Hard exit: quitting is always allowed, from any match state.
    this.state.transition(GameStates.MENU, null, true);
  }

  restartMatch() {
    if (this.mode === 'online') {
      this.net.startMatch(this._onlinePayload);
      return;
    }
    this.beginMatch({ mode: this.mode, seed: this.mapSeed, p1: this._lastLoadout?.p1, p2: this._lastLoadout?.p2 });
  }

  resetProgress() {
    this.settings.stats = {
      gamesPlayed: 0, wins: 0, losses: 0, shotsFired: 0, directHits: 0,
      tanksDestroyed: 0, victoriesByMode: { pvp: 0, pva: 0 },
      rotationHintSeen: false,
    };
    this.settings.save();
    this.ui.toast('Progress reset');
  }

  // ------------------------------------------------------------- combat

  /** Fire the given tank's active weapon. Returns true if a shot was fired. */
  fireTank(tank) {
    if (!tank || !tank.alive) return false;
    if (!this.state.is(GameStates.PLAYER_TURN, GameStates.ENEMY_TURN)) return false;
    if (!tank.canFire()) {
      this.sound.play('error');
      // Out of ammo: a supply crate falls from the sky onto the tank's
      // exact position and resupplies it.
      this._maybeRequestSupply(tank);
      return false;
    }
    const weapon = tank.weaponInstances[tank.weaponIndex];
    tank.consumeAmmo();
    weapon.fire({ game: this, tank });
    // A shot hands the camera back to auto-follow (it tracks the projectile).
    this.camera.followLocked = false;
    this.settings.recordStat('shotsFired', 1);
    this.settings.recordWeaponUse(tank.activeWeaponId);
    this.bus.emit(EVT.TANK_STATS, this._tankStatsPayload(tank));
    this.bus.emit(EVT.WEAPON_CHANGE, this.weaponChangePayload(tank));

    if (this._online && this.net.isOnline) {
      this.net.sendCmd({
        type: 'fire',
        id: tank.id,
        angle: tank.turret.angle,
        power: tank.power,
        weaponIndex: tank.weaponIndex,
        x: tank.x, y: tank.y, rot: tank.rot,
      });
    }
    return true;
  }

  _tankStatsPayload(tank) {
    return {
      id: tank.id,
      health: tank.health,
      fuel: tank.fuel,
      power: tank.power,
      angle: tank.turret.angle,
    };
  }

  requestFire() {
    if (!this.state.is(GameStates.PLAYER_TURN)) return;
    const tank = this.turnManager.activeTank();
    if (!tank) return;
    if (this._online && this.net.isOnline) {
      const player = this.turnManager.activePlayer();
      if (this.players.indexOf(player) !== this.net.myPlayerIndex) return;
    }
    this.turnManager.fire();
  }

  requestWeaponIndex(i) {
    if (!this.state.is(GameStates.PLAYER_TURN)) return;
    const tank = this.turnManager.activeTank();
    if (!tank) return;
    if (this._online && this.net.isOnline) {
      const player = this.turnManager.activePlayer();
      if (this.players.indexOf(player) !== this.net.myPlayerIndex) return;
    }
    tank.setWeaponIndex(i);
    this.bus.emit(EVT.WEAPON_CHANGE, this.weaponChangePayload(tank));
  }

  onTankDestroyed(tank, source, weaponId) {
    if (!weaponId && source && source.activeWeaponId) weaponId = source.activeWeaponId;
    // Per-match kill attribution for the results screen (any mode).
    if (weaponId) this._matchWeaponKills[weaponId] = (this._matchWeaponKills[weaponId] || 0) + 1;
    this.bus.emit(EVT.TANK_DESTROYED, { id: tank.id, sourceId: source?.id || null });
    this.particles.wreckSmoke(tank.x, tank.y - tank.height / 2);
    this.camera.addShake(14);
    this.sound.play('explosion', { size: 80 });
    // Progression: player kills count toward unlocks (PvAI only).
    if (this.mode === 'pva' && tank.team === 1 && source && source.team === 0) {
      this.settings.recordStat('tanksDestroyed', 1);
      if (weaponId) this.settings.recordWeaponKill(weaponId);
    }
    this.checkVictory();
  }

  /** Check for a winner; transitions to VICTORY/DEFEAT and returns true if over. */
  checkVictory() {
    const alive = this.tanks.filter((t) => t.alive);
    if (alive.length === this.tanks.length) return false;

    const t0 = this.tanks.filter((t) => t.alive && t.team === 0);
    const t1 = this.tanks.filter((t) => t.alive && t.team === 1);

    let result = null;
    if (t0.length === 0 && t1.length === 0) {
      result = { won: false, title: 'Mutual Destruction', subtitle: 'Both tanks were obliterated. A draw.' };
    } else if (t0.length === 0) {
      result = this._lossResult();
    } else if (t1.length === 0) {
      result = this._winResult();
    }
    if (!result) return false;

    this._endMatch(result);
    return true;
  }

  _winResult() {
    if (this.mode === 'pva') {
      return { won: true, title: 'Victory!', subtitle: 'The last tank standing is yours.' };
    }
    return { won: true, title: 'Player 1 Wins!', subtitle: 'A flawless display of artillery.' };
  }

  _lossResult() {
    if (this.mode === 'pva') {
      return { won: false, title: 'Defeated', subtitle: 'ROBOT-9 outgunned you. Rematch?' };
    }
    return { won: false, title: 'Player 2 Wins!', subtitle: 'Better luck next round.' };
  }

  _endMatch(result) {
    result.weaponKills = { ...this._matchWeaponKills };
    this.lastResult = result;
    this.bus.emit(EVT.MATCH_END, { result, mode: this.mode });
    if (this.mode === 'pva') {
      this.settings.recordMatch('pva', result.won);
    } else {
      this.settings.recordMatch('pvp', null);
    }
    this.sound.play(result.won ? 'victory' : 'defeat');
    this.state.transition(result.won ? GameStates.VICTORY : GameStates.DEFEAT, { result });
    debug.log('match ended', result);
  }

  /** Toggle the aim lock (right-click). Returns the new locked state. */
  toggleAimLock() {
    const locked = this.input.toggleAimLock();
    this.sound.play('click');
    if (this.state.is(GameStates.PLAYER_TURN)) {
      this.ui.toast(locked ? 'Aim locked — angle fixed' : 'Aim unlocked');
    }
    return locked;
  }

  togglePause() {
    // Drop queued inputs (e.g. the Esc press that just paused) so they can't
    // immediately re-trigger after resuming.
    this.input.clearAll();
    if (this.state.is(GameStates.PAUSED)) {
      this.state.transition(this._resumeState || GameStates.PLAYER_TURN);
      this.loop.setPaused(false);
      this.bus.emit(EVT.PAUSE_CHANGE, { paused: false });
      return;
    }
    if (!this.state.inMatch()) return;
    if (this.state.is(GameStates.VICTORY, GameStates.DEFEAT)) return;
    this._resumeState = this.state.current;
    this.state.transition(GameStates.PAUSED);
    this.loop.setPaused(true);
    this.bus.emit(EVT.PAUSE_CHANGE, { paused: true });
  }

  // ------------------------------------------------------------- online

  onlineCreate() {
    this.ui.setOnlineStatus('Connecting…', '');
    this._ensureNet()
      .then(() => this.net.createRoom())
      .catch((err) => this.ui.setOnlineStatus(`Connection failed: ${err.message}`, 'error'));
  }

  onlineJoin(code) {
    this.ui.setOnlineStatus('Connecting…', '');
    this._ensureNet()
      .then(() => this.net.joinRoom(code))
      .catch((err) => this.ui.setOnlineStatus(`Connection failed: ${err.message}`, 'error'));
  }

  _ensureNet() {
    if (this.net.isOnline) return Promise.resolve();
    const url = `ws://${window.location.hostname || 'localhost'}:8765/ws`;
    return this.net.connect(url);
  }

  onOnlineRoom(msg) {
    this._online = this.net;
    if (msg.role === 'host') {
      this.ui.modals.show(
        'Room created',
        `Your room code is <b>${msg.room}</b>.<br/>Share it with your opponent, then pick map and loadout — the match starts when you hit "Start Battle".`
      );
      this.ui.setOnlineStatus(`Room ${msg.room} — waiting for opponent…`, 'ok');
      // Take the host to the battlefield picker.
      this.state.transition(GameStates.MAP_SELECT);
    } else {
      this.ui.setOnlineStatus(`Joined room ${msg.room} — waiting for host to start…`, 'ok');
    }
  }

  onOnlineError(text) {
    this.ui.setOnlineStatus(text, 'error');
    this.ui.modals.show('Online', text);
  }

  onOnlineStart(payload) {
    this.ui.setOnlineStatus('Match starting…', 'ok');
    this._online = this.net;
    this._lastLoadout = { p1: payload.p1, p2: payload.p2 };
    this.beginMatch({
      mode: 'online',
      seed: payload.seed,
      p1: payload.p1,
      p2: payload.p2,
      online: true,
      myIndex: this.net.myPlayerIndex,
    });
  }

  onOnlineTurn(index) {
    if (!this.state.inMatch()) return;
    this.turnManager.startTurn(index);
  }

  onOnlineCmd(cmd) {
    if (!this.state.inMatch() || !this.tanks.length) return;
    const remote = this.tanks.find((t) => t.id === cmd.id);
    if (!remote) return;
    if (cmd.type === 'state') {
      remote.x = cmd.x;
      remote.y = cmd.y;
      remote.rot = cmd.rot;
      remote.turret.angle = cmd.angle;
      remote.turret.targetAngle = cmd.angle;
      remote.power = cmd.power;
      remote.fuel = cmd.fuel;
      remote.health = cmd.health;
      if (cmd.weaponIndex !== undefined && cmd.weaponIndex !== remote.weaponIndex) {
        remote.setWeaponIndex(cmd.weaponIndex);
        this.bus.emit(EVT.WEAPON_CHANGE, this.weaponChangePayload(remote));
      }
    } else if (cmd.type === 'fire') {
      remote.x = cmd.x;
      remote.y = cmd.y;
      remote.rot = cmd.rot;
      remote.turret.angle = cmd.angle;
      remote.turret.targetAngle = cmd.angle;
      remote.setPower(cmd.power);
      if (cmd.weaponIndex !== undefined) remote.setWeaponIndex(cmd.weaponIndex);
      this.bus.emit(EVT.WEAPON_CHANGE, this.weaponChangePayload(remote));
      this.fireTank(remote);
    }
  }

  onOnlineOpponentLeft() {
    // Guard: only migrate once (the message + the WS close can both fire).
    if (!this._online) return;
    if (!this.tanks.length || !this.state.inMatch()) {
      this._online = false;
      this.net.disconnect();
      this.quitToMenu();
      return;
    }
    // Host-migration: the disconnected player's tank is taken over by the AI
    // so the remaining player can keep playing.
    const ghostIdx = this.net.myPlayerIndex === 0 ? 1 : 0;
    this.players[ghostIdx].type = 'ai';
    this._online = false; // switch to offline mode
    this.net.disconnect();
    this.ui.toast(`${this.players[ghostIdx].name} disconnected — AI taking over`);
    this.sound.play('click');
    // If it is currently the ghost player's turn, hand control to the AI now.
    if (this.turnManager.currentIndex === ghostIdx && !this.state.is(GameStates.PROJECTILE_FLIGHT, GameStates.EXPLOSION)) {
      if (!this.state.is(GameStates.ENEMY_TURN)) {
        this.state.transition(GameStates.ENEMY_TURN);
      }
      this.ai.beginTurn(this.players[ghostIdx].tank);
    }
  }

  // ------------------------------------------------------------- update

  update(dt) {
    this.environment.update(dt);
    this.camera.update(dt);
    this.ui.hud.tick?.(dt);

    // Adaptive mobile quality: sample fps during matches on coarse devices.
    if (this._adaptive.active && this.state.inMatch()) {
      this._adaptive.sampleTimer -= dt;
      if (this._adaptive.sampleTimer <= 0) {
        this._adaptive.sampleTimer = 0.5;
        this._sampleAdaptiveQuality();
      }
    }

    if (this.state.is(GameStates.LOADING)) {
      this._loadTimer -= dt;
      if (this._loadTimer <= 0) {
        if (this._online && this.net.isOnline) {
          if (this.net.role === 'host') {
            this.turnManager.begin();
            this.net.broadcastTurn(0);
          }
          // Online guest waits for the host's first 'turn' broadcast.
        } else {
          this.turnManager.begin();
        }
      }
      return;
    }

    if (!this.state.inMatch()) return;
    if (this.state.is(GameStates.PAUSED)) return;

    // Tanks: per-frame behavior + re-conform to the (possibly damaged) terrain.
    for (const tank of this.tanks) {
      tank.update(dt);
      if (tank.alive) {
        const groundY = this.terrain.heightAt(tank.x) - tank.height / 2 + CONFIG.TANK.CLEARANCE;
        if (tank.y < groundY - 0.5) {
          tank.y = Math.min(tank.y + 520 * dt, groundY);
          tank.rot = this.terrain.slopeAt(tank.x, 20);
        } else if (tank.y > groundY + 6) {
          // Terrain raised beneath the tank (Dirt Maker): push it up.
          tank.y = groundY;
          tank.rot = this.terrain.slopeAt(tank.x, 20);
        }
      }
    }

    // Scheduled callbacks (barrage shells, drone arm, airstrike bombs, …).
    if (this._deferred.length) {
      const now = this._deferred;
      this._deferred = [];
      for (const d of now) {
        d.t -= dt;
        if (d.t <= 0) {
          try {
            d.fn();
          } catch (err) {
            console.error('[Game] deferred callback error', err);
          }
        } else {
          this._deferred.push(d);
        }
      }
    }

    // Persistent field entities (mines, fire/smoke zones, turrets, drones)
    // and falling supply crates.
    this._updateFieldEntities(dt);
    this._updateSupplyDrops(dt);

    if (this.state.is(GameStates.PLAYER_TURN)) {
      this._handlePlayerInput(dt);
    } else if (this.state.is(GameStates.ENEMY_TURN)) {
      this.ai.update(dt);
    }

    // Fixed-step physics for projectiles.
    this._fixedAcc += dt;
    while (this._fixedAcc >= CONFIG.PHYSICS.FIXED_DT) {
      this._fixedAcc -= CONFIG.PHYSICS.FIXED_DT;
      this._stepPhysics(CONFIG.PHYSICS.FIXED_DT);
      if (!this.projectiles.length) break;
    }

    this.particles.update(dt);

    // Explosions.
    if (this.explosions.length) {
      for (const e of this.explosions) e.update(dt);
      this.explosions = this.explosions.filter((e) => !e.done);
    }

    // Online state sync while it's my turn.
    if (this._online && this.net.isOnline && this.state.is(GameStates.PLAYER_TURN)) {
      this._netStateTimer -= dt;
      if (this._netStateTimer <= 0) {
        this._netStateTimer = 0.1;
        const active = this.turnManager.activeTank();
        const idx = this.turnManager.currentIndex;
        if (active && idx === this.net.myPlayerIndex && active.alive) {
          this.net.sendCmd({
            type: 'state',
            id: active.id,
            x: active.x, y: active.y, rot: active.rot,
            angle: active.turret.angle, power: active.power,
            weaponIndex: active.weaponIndex,
            fuel: active.fuel, health: active.health,
          });
        }
      }
    }

    // Turn resolution: everything settled?
    if (
      (this.state.is(GameStates.PROJECTILE_FLIGHT) || this.state.is(GameStates.EXPLOSION)) &&
      this.projectiles.length === 0 &&
      this.explosions.length === 0
    ) {
      this._resolveTurn();
    }

    // Camera target.
    this._updateCamera(dt);
  }

  /**
   * Persistent field entities — mines, fire/smoke zones, turrets, drones
   * and visual beams. Runs every frame while a match is in progress.
   */
  _updateFieldEntities(dt) {
    // Mines: detonate when a tank crosses the trigger radius.
    for (const m of [...this.mines]) {
      if (m.detonated) {
        this.mines = this.mines.filter((x) => x !== m);
        continue;
      }
      for (const tank of this.tanks) {
        if (!tank.alive) continue;
        if (tank === m.owner && !this.settings.get('selfDamage')) continue;
        const d = Math.hypot(tank.x - m.x, tank.y - m.y);
        if (d < m.triggerRadius) {
          this._detonateMine(m);
          break;
        }
      }
    }

    // Fire zones: damage over time to tanks standing in the flames.
    for (const fz of [...this.fireZones]) {
      fz.life -= dt;
      fz.burnTimer -= dt;
      if (fz.burnTimer <= 0) {
        fz.burnTimer = 0.4;
        for (const tank of this.tanks) {
          if (!tank.alive) continue;
          if (Math.hypot(tank.x - fz.x, tank.y - fz.y) > fz.radius) continue;
          const destroyed = tank.takeDamage(fz.dps * 0.4);
          this.bus.emit(EVT.TANK_STATS, this._tankStatsPayload(tank));
          if (destroyed) this.onTankDestroyed(tank, fz.owner);
        }
      }
      if (fz.life <= 0) this.fireZones = this.fireZones.filter((x) => x !== fz);
    }

    // Smoke zones: lifetime only (their effect is aim-blocking for the AI).
    for (const sz of [...this.smokeZones]) {
      sz.life -= dt;
      if (sz.life <= 0) this.smokeZones = this.smokeZones.filter((x) => x !== sz);
    }

    // Turrets: cooldown decay (they fire on turn start via _onTurnStart).
    for (const tu of this.turrets) {
      if (tu.cooldown > 0) tu.cooldown -= dt;
    }

    // Companion drones: arm, then fire their shot and despawn.
    for (const c of [...this.companions]) {
      c.timer -= dt;
      if (c.timer <= 0) this._companionFire(c);
    }
    this.companions = this.companions.filter((c) => !c.done);

    // Beams: pure visual decay (railgun / orbital).
    for (const b of [...this.beams]) {
      b.life -= dt;
      if (b.life <= 0) this.beams = this.beams.filter((x) => x !== b);
    }
  }

  // --------------------------------------------------- field entity actions

  _detonateMine(m) {
    if (m.detonated) return;
    m.detonated = true;
    Combat.explode({
      game: this,
      x: m.x,
      y: m.y - 4,
      radius: 46,
      damage: 30,
      owner: m.owner,
      color: '#ffd166',
      shake: 9,
      craterDepth: 18,
    });
    this.sound.play('bounce');
  }

  _destroyTurret(tu) {
    if (!tu.alive) return;
    tu.alive = false;
    Combat.explode({
      game: this,
      x: tu.x,
      y: tu.y - 6,
      radius: 34,
      damage: 0,
      owner: null,
      color: '#ffb37a',
      shake: 6,
      craterDepth: 10,
      deform: true,
    });
    this.turrets = this.turrets.filter((x) => x !== tu);
  }

  // ------------------------------------------------------- supply drops

  /**
   * Is this tank already waiting on (or receiving) a supply drop?
   */
  _hasSupplyDrop(tank) {
    return this.supplyDrops.some((d) => d.tank === tank && !d.done);
  }

  /**
   * Resupply a tank: every limited weapon back to full ammo. Crate
   * landing calls this (the crates never hit other tanks — the drop is
   * sent to the exact player position, as requested).
   */
  _resupplyTank(tank, drop) {
    if (!tank || !tank.alive) return;
    const hadEmpty = tank.weapons.some((id) => tank.ammoFor(id) === 0);
    tank.weapons.forEach((id) => {
      const max = getWeaponDef(id).ammo;
      if (Number.isFinite(max)) tank.ammo[id] = max;
    });
    this.sound.play('split');
    this.particles.burst({
      x: drop ? drop.x : tank.x,
      y: (drop ? drop.y : tank.y) - 26,
      count: 22, speedMin: 40, speedMax: 130, grav: 260,
      lifeMin: 0.4, lifeMax: 0.9,
      sizeMin: 3, sizeMax: 7,
      color0: '#ffffff', color1: '#3ef2ff', kind: 'glow', additive: true,
    });
    if (this.ui) {
      this.ui.toast(
        hadEmpty
          ? `${tank.name} resupplied — ammo restored!`
          : `${tank.name} picked up supplies`
      );
    }
  }

  /**
   * If a tank is completely out of ammo (no limited weapon has any left)
   * and no crate is already inbound, drop a supply crate onto its exact
   * position. Returns the drop or null.
   */
  _maybeRequestSupply(tank) {
    if (!tank || !tank.alive) return null;
    if (this._hasSupplyDrop(tank)) return null;
    // Unlimited weapons (cannon, bouncer) never run dry, so they always
    // count as "has ammo". A tank is out of ammo when no weapon — limited
    // or not — has anything left to fire.
    const anyAmmo = tank.weapons.some((id) => tank.ammoFor(id) > 0);
    if (anyAmmo) return null;
    const drop = {
      tank,
      x: tank.x,
      y: CONFIG.WORLD.HEIGHT - 900,
      startY: CONFIG.WORLD.HEIGHT - 900,
      landed: false,
      done: false,
      t: 0,
      sway: Math.random() * Math.PI * 2,
    };
    this.supplyDrops.push(drop);
    if (this.ui) this.ui.toast(`${tank.name}: out of ammo — supply drop inbound!`);
    this.sound.play('click');
    this.camera.addShake(2);
    return drop;
  }

  /** Advance supply crates each frame; land + resupply on arrival. */
  _updateSupplyDrops(dt) {
    if (!this.supplyDrops.length) return;
    const worldH = CONFIG.WORLD.HEIGHT;
    for (const drop of [...this.supplyDrops]) {
      if (drop.done) {
        this.supplyDrops = this.supplyDrops.filter((x) => x !== drop);
        continue;
      }
      if (drop.landed) {
        // Small pause after landing (flash), then finish.
        drop.landTimer = (drop.landTimer || 0) - dt;
        if (drop.landTimer <= 0) drop.done = true;
        continue;
      }
      drop.t += dt;
      const fallTime = 1.5; // seconds from sky to the tank
      const endY = Math.min(drop.startY + 700, this.terrain.heightAt(drop.x) - 46);
      const k = Math.min(1, drop.t / fallTime);
      const ease = k * k; // accelerate as it falls
      drop.y = drop.startY + (endY - drop.startY) * ease;
      drop.x = drop.tank.x + Math.sin(drop.t * 2.2 + drop.sway) * 26 * (1 - k);
      if (k >= 1) {
        drop.landed = true;
        drop.landTimer = 0.35;
        this.camera.addShake(4);
        this.sound.play('thud');
        this.particles.burst({
          x: drop.x, y: endY + 4, count: 14,
          speedMin: 20, speedMax: 90, grav: 320,
          lifeMin: 0.3, lifeMax: 0.6,
          sizeMin: 2, sizeMax: 5,
          color0: '#c9d2e4', color1: '#6b7488', kind: 'smoke',
        });
        this._resupplyTank(drop.tank, drop);
      }
    }
  }

  /** Auto-turret fires one aimed shell at the nearest enemy. */
  _turretFire(tu) {
    if (!tu.alive || tu.cooldown > 0) return;
    tu.cooldown = 3;
    const enemy = this.tanks.find((t) => t !== tu.owner && t.alive);
    if (!enemy) return;
    const tip = { x: tu.x, y: tu.y - 8 };
    const etip = enemy.getBarrelTip();
    const sol = AimingAI.solveShot({
      x: tip.x,
      y: tip.y,
      targetX: etip.x,
      targetY: etip.y,
      wind: this.turnManager.wind,
      terrain: this.terrain,
      mass: 0.9,
    });
    const angle = sol ? sol.angle : tu.x < enemy.x ? 45 : 135;
    const power = sol ? sol.power : 72;
    const { vx, vy } = Physics.initialVelocity(angle, power);
    const color = '#7ee8ff';
    this.spawnProjectile({
      pos: { x: tip.x, y: tip.y },
      vel: { x: vx, y: vy },
      weaponId: 'turret',
      owner: tu.owner,
      color,
      mass: 0.9,
      radius: 3.5,
      maxLife: 6,
      trailColor: color,
      onImpact: (hit) =>
        Combat.explode({
          game: this,
          x: hit.x,
          y: hit.y,
          radius: 30,
          damage: 16,
          owner: tu.owner,
          color,
          shake: 4,
        }),
    });
    this.particles.muzzleFlash(tip.x, tip.y, angle, color);
    this.sound.play('fire');
  }

  /** Companion drone (Drone weapon) arms, solves and fires its shot. */
  _companionFire(c) {
    c.done = true;
    const enemy = this.tanks.find((t) => t !== c.owner && t.alive);
    const tip = { x: c.x, y: c.y - 4 };
    let angle;
    let power = 80;
    if (enemy) {
      const etip = enemy.getBarrelTip();
      const sol = AimingAI.solveShot({
        x: tip.x,
        y: tip.y,
        targetX: etip.x,
        targetY: etip.y,
        wind: this.turnManager.wind,
        terrain: this.terrain,
        mass: c.mass,
      });
      if (sol) {
        angle = sol.angle;
        power = sol.power;
      }
    }
    if (angle === undefined) angle = c.owner.x < (enemy ? enemy.x : 99999) ? 50 : 130;
    const { vx, vy } = Physics.initialVelocity(angle, power);
    const color = c.color;
    this.spawnProjectile({
      pos: { x: tip.x, y: tip.y },
      vel: { x: vx, y: vy },
      weaponId: c.weaponId,
      owner: c.owner,
      color,
      mass: c.mass,
      radius: 4.5,
      maxLife: 8,
      trailColor: color,
      onImpact: (hit) =>
        Combat.explode({
          game: this,
          x: hit.x,
          y: hit.y,
          radius: c.radius,
          damage: c.damage,
          owner: c.owner,
          color,
          shake: 6,
        }),
    });
    this.particles.muzzleFlash(tip.x, tip.y, angle, color);
    this.sound.play('fire');
    this.particles.smokeAt(c.x, c.y, 8, '#9aa7c7');
  }

  /** On turn start: stunned skip is handled in TurnManager; here we fire
   *  auto-turrets owned by the incoming player. */
  _onTurnStart({ playerIndex }) {
    const player = this.players[playerIndex];
    if (!player) return;
    const owned = this.turrets.filter((tu) => tu.alive && tu.owner === player.tank);
    owned.forEach((tu, i) => this.after(0.6 + i * 0.5, () => this._turretFire(tu)));
  }

  /** Is the given world point inside any active smoke zone? */
  inSmoke(x, y) {
    for (const sz of this.smokeZones) {
      if (Math.hypot(x - sz.x, y - sz.y) < sz.radius) return true;
    }
    return false;
  }

  _handlePlayerInput(dt) {
    const tank = this.turnManager.activeTank();
    if (!tank || !tank.alive) return;
    const isMine = !this._online || this.turnManager.currentIndex === this.net.myPlayerIndex;
    if (!isMine) return;

    // Movement.
    const moved = tank.move(this.input.move, dt, this.terrain);
    if (moved && Math.random() < 0.5) {
      this.particles.trackDust(tank.x - Math.sign(this.input.move) * tank.width * 0.4, this.terrain.heightAt(tank.x) + 1);
    }

    // Aiming: a genuine pointer gesture takes priority over keys, but a
    // cursor just resting over the canvas does not hijack keyboard aim.
    // While aim is locked (right-click), the angle stays frozen so power
    // and movement can be tuned without the turret swinging.
    if (!this.input.aimLocked) {
      if (this.input.pointer.active && this.input.pointerMoved) {
        const w = this.camera.screenToWorld(this.input.pointer.x, this.input.pointer.y);
        const pivot = tank.getPivot();
        const angle = (Math.atan2(-(w.y - pivot.y), w.x - pivot.x) * 180) / Math.PI;
        tank.aimToward(angle, dt);
      } else if (this.input.aim !== 0) {
        tank.aimBy(this.input.aim * CONFIG.TANK.AIM_SPEED, dt);
      }
    }

    // Power.
    if (this.input.power !== 0) {
      tank.adjustPower(this.input.power * 55 * dt);
    }
    const ticks = this.input.powerTicks;
    if (ticks !== 0) tank.adjustPower(ticks * 3);
    const sliderV = this.input.takeSliderPower();
    if (sliderV !== null) tank.setPower(sliderV);

    // Camera zoom: wheel ticks + I/O keys.
    const zt = this.input.zoomTicks;
    if (zt > 0) this.camera.zoomIn(0.09 * zt);
    if (zt < 0) this.camera.zoomOut(0.09 * -zt);
    if (this.input.zoomInPressed) this.camera.zoomIn(0.15);
    if (this.input.zoomOutPressed) this.camera.zoomOut(0.15);

    // Fire / weapon / pause.
    if (this.input.firePressed) this.requestFire();
    if (this.input.weaponNextPressed) {
      tank.cycleWeapon(1);
      this.bus.emit(EVT.WEAPON_CHANGE, this.weaponChangePayload(tank));
      this.sound.play('click');
    }
    if (this.input.weaponPrevPressed) {
      tank.cycleWeapon(-1);
      this.bus.emit(EVT.WEAPON_CHANGE, this.weaponChangePayload(tank));
      this.sound.play('click');
    }
    if (this.input.pausePressed) this.togglePause();

    // HUD stats.
    this.bus.emit(EVT.TANK_STATS, this._tankStatsPayload(tank));
  }

  _stepPhysics(dt) {
    const wind = this.turnManager.wind;
    // Extra circle targets: deployed turrets + mines.
    const targets = [];
    for (const tu of this.turrets) {
      if (tu.alive) targets.push({ x: tu.x, y: tu.y - 6, r: 15, kind: 'turret', ref: tu });
    }
    for (const m of this.mines) {
      if (!m.detonated) targets.push({ x: m.x, y: m.y, r: 12, kind: 'mine', ref: m });
    }

    for (const p of this.projectiles) {
      if (!p.alive) continue;

      // Mid-flight split.
      if (p.maybeSplit({ game: this, projectile: p })) {
        p.kill();
        continue;
      }

      // Homing steering (before integration so it curves correctly).
      if (typeof p.onSteer === 'function') {
        try {
          p.onSteer({ game: this, projectile: p, dt });
        } catch (err) {
          console.error('[Game] steer error', err);
        }
      }

      Physics.step(p, dt, wind);

      // Trail.
      p._trailTimer -= dt;
      if (p._trailTimer <= 0) {
        p._trailTimer = p.trailInterval;
        this.particles.trail(p.pos.x, p.pos.y, p.trailColor);
      }

      const hit = Collision.checkProjectile(p, this.terrain, this.tanks, targets);
      if (!hit.hit) continue;

      if (hit.type === 'bounds') {
        p.kill();
        continue;
      }
      if (hit.type === 'target') {
        const tg = hit.target;
        if (tg.kind === 'turret') this._destroyTurret(tg.ref);
        else if (tg.kind === 'mine') this._detonateMine(tg.ref);
        p.kill();
        continue;
      }
      if (hit.type === 'terrain' && p.bouncesLeft > 0) {
        p.bounce({
          game: this,
          onBounce: () => {
            this.particles.burst({
              x: hit.x, y: hit.y, count: 6, kind: 'smoke',
              color0: '#8b93a8', color1: '#3a4054',
              speedMin: 10, speedMax: 46, lifeMin: 0.25, lifeMax: 0.55,
              sizeMin: 3, sizeMax: 7, grav: -25,
            });
            this.sound.play('bounce');
          },
        });
        continue;
      }

      // Impact.
      if (typeof p.onImpact === 'function') {
        try {
          p.onImpact(hit);
        } catch (err) {
          console.error('[Game] weapon onImpact error', err);
        }
      }
      p.kill();
    }

    this.projectiles = this.projectiles.filter((p) => p.alive);

    // If new projectiles appeared after an explosion, move back to flight state.
    if (this.projectiles.length && this.state.is(GameStates.EXPLOSION)) {
      this.state.transition(GameStates.PROJECTILE_FLIGHT);
    }
  }

  _resolveTurn() {
    const isOnlineHost = this._online && this.net.isOnline && this.net.role === 'host';
    if (isOnlineHost) {
      if (this.checkVictory()) return;
      this.bus.emit(EVT.TURN_END, { playerIndex: this.turnManager.currentIndex });
      const next = (this.turnManager.currentIndex + 1) % this.players.length;
      this.net.broadcastTurn(next);
      this.turnManager.startTurn(next);
    } else if (!this._online) {
      this.turnManager.onEffectsResolved();
    } else {
      // Online guest: wait for the host's turn broadcast.
      this.bus.emit(EVT.TURN_END, { playerIndex: this.turnManager.currentIndex });
    }
  }

  _updateCamera(dt) {
    // The player pinch-panned: keep the view parked where they put it until
    // the next fire or turn unlocks auto-follow.
    if (this.camera.followLocked) {
      this.camera.resetFrame();
      return;
    }
    if (this.projectiles.length) {
      const p = this.projectiles[this.projectiles.length - 1];
      this.camera.followTarget(p.pos.x, p.pos.y - 60, dt);
    } else if (this.explosions.length) {
      const e = this.explosions[this.explosions.length - 1];
      this.camera.followTarget(e.x, e.y - 80, dt);
    } else {
      // Auto-frame both tanks when both are alive so the player always sees
      // their target; fall back to following the active tank.
      const alive = this.tanks.filter((t) => t.alive && Number.isFinite(t.x));
      if (alive.length === 2) {
        const a = alive[0];
        const b = alive[1];
        this.camera.frameBoth(a.x, a.y, b.x, b.y);
        this.camera.followTarget((a.x + b.x) / 2, (a.y + b.y) / 2 - 40, dt);
      } else {
        this.camera.resetFrame();
        const tank = this.turnManager.activeTank();
        if (tank && Number.isFinite(tank.x) && Number.isFinite(tank.y)) {
          this.camera.followTarget(tank.x, tank.y - 50, dt);
        }
      }
    }
  }

  // -------------------------------------------------------------- render

  render() {
    const ctx = this.ctx;
    const cam = this.camera;
    const inMatch = this.state.inMatch();

    // CSS-pixel space: background layers.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.environment.draw(ctx, cam);

    if (inMatch && this.terrain) {
      const shake = cam.shakeOffset();
      const z = cam.zoom;
      if (cam.rotated) {
        // Rotated -90°: world +x maps to screen +y (down the tall axis) and
        // world +y maps to screen -x, so the terrain wall sits on the phone's
        // right edge and the sky on the left. With flipRotation the tall-axis
        // direction is mirrored (world-left at the top) via the b/f terms.
        const b = cam.flipRotation ? this.dpr * z : -this.dpr * z;
        const f = cam.flipRotation
          ? this.dpr * (-z * cam.x + shake.y)
          : this.dpr * (z * cam.x + cam.viewH + shake.y);
        ctx.setTransform(
          0, b,
          this.dpr * z, 0,
          this.dpr * (-z * cam.y + shake.x),
          f
        );
      } else {
        ctx.setTransform(
          this.dpr * z, 0, 0, this.dpr * z,
          this.dpr * (-cam.x * z + shake.x),
          this.dpr * (-cam.y * z + shake.y)
        );
      }

      this.terrain.render(ctx);

      for (const tank of this.tanks) tank.draw(ctx);

      this._drawFieldEntities(ctx);

      for (const p of this.projectiles) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      for (const e of this.explosions) e.draw(ctx);

      this.particles.draw(ctx);

      if (this.state.is(GameStates.PLAYER_TURN)) this._drawTrajectory(ctx);
    }

    // Off-screen tank indicators (CSS px space) + debug overlay.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._drawOffscreenIndicators(ctx);
    if (debug.enabled) this._drawDebug(ctx);
  }

  /** Draw persistent field entities in world space. */
  _drawFieldEntities(ctx) {
    // Mines.
    for (const m of this.mines) {
      if (m.detonated) continue;
      const blink = 0.55 + 0.45 * Math.sin(performance.now() / 140 + m.x);
      ctx.beginPath();
      ctx.arc(m.x, m.y - 4, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1f2c';
      ctx.fill();
      ctx.strokeStyle = '#3a4152';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = blink;
      ctx.beginPath();
      ctx.arc(m.x, m.y - 4, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5a5a';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Auto-turrets.
    for (const tu of this.turrets) {
      if (!tu.alive) continue;
      ctx.save();
      ctx.translate(tu.x, tu.y);
      ctx.fillStyle = '#1c2336';
      ctx.beginPath();
      ctx.arc(0, -8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3ef2ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#3ef2ff';
      ctx.fillRect(-3, -26, 6, 18);
      ctx.beginPath();
      ctx.arc(0, -8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Supply crates falling from the sky.
    for (const drop of this.supplyDrops) {
      if (drop.done) continue;
      const bob = Math.sin(performance.now() / 60 + drop.sway) * 2;
      const y = drop.y + bob;
      const s = drop.landed ? 1.25 : 1;
      ctx.save();
      ctx.translate(drop.x, y);
      ctx.rotate(Math.sin(performance.now() / 160 + drop.sway) * 0.08 * s);
      ctx.fillStyle = '#182033';
      ctx.strokeStyle = '#3ef2ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-12 * s, -10 * s, 24 * s, 20 * s);
      ctx.fill();
      ctx.stroke();
      // Cross/drop marker.
      ctx.strokeStyle = '#3ef2ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -6 * s);
      ctx.lineTo(0, 6 * s);
      ctx.moveTo(-5 * s, 0);
      ctx.lineTo(5 * s, 0);
      ctx.stroke();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(performance.now() / 110 + drop.sway);
      ctx.fillStyle = '#3ef2ff';
      ctx.beginPath();
      ctx.arc(0, 0, 16 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Fire zones (flickering flames).
    for (const fz of this.fireZones) {
      const t = performance.now() / 90;
      const r = fz.radius * (0.85 + 0.12 * Math.sin(t + fz.x));
      const g = ctx.createRadialGradient(fz.x, fz.y, 0, fz.x, fz.y, r);
      g.addColorStop(0, 'rgba(255,200,80,0.55)');
      g.addColorStop(0.55, 'rgba(255,110,40,0.32)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fz.x, fz.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smoke zones.
    for (const sz of this.smokeZones) {
      ctx.globalAlpha = Math.min(0.5, sz.life * 0.2);
      ctx.fillStyle = '#8b93a8';
      ctx.beginPath();
      ctx.ellipse(sz.x, sz.y, sz.radius, sz.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Companion drones (mini tanks).
    for (const c of this.companions) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot || 0);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-11, -8, 22, 15, 4) : ctx.rect(-11, -8, 22, 15);
      ctx.fill();
      ctx.fillStyle = '#0b0e16';
      ctx.fillRect(-11, 1, 22, 6);
      ctx.restore();
    }

    // Beams (railgun / orbital) — additive glow.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.beams) {
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = Math.max(0, b.life / b.maxLife) * 0.9;
      ctx.lineWidth = b.width || 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0, b.life / b.maxLife) * 0.35;
      ctx.lineWidth = (b.width || 4) * 3;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Edge arrows pointing at tanks that are off-screen (CSS px space). */
  _drawOffscreenIndicators(ctx) {
    if (!this.state.inMatch() || !this.terrain) return;
    const cam = this.camera;
    const vw = cam.viewW;
    const vh = cam.viewH;
    const margin = 24;

    for (const tank of this.tanks) {
      if (!tank.alive) continue;
      const s = cam.worldToScreen(tank.x, tank.y - tank.height / 2);
      const offX = s.x < -margin || s.x > vw + margin;
      const offY = s.y < -margin || s.y > vh + margin;
      if (!offX && !offY) continue;

      // Clamp the indicator to the viewport edge.
      const ix = clamp(s.x, margin + 14, vw - margin - 14);
      const iy = clamp(s.y, margin + 14, vh - margin - 14);
      const ang = Math.atan2(s.y - iy, s.x - ix);

      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = tank.color;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-4, -8);
      ctx.lineTo(-4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Distance label near the indicator.
      const dist = Math.round(Math.hypot(tank.x - cam.x - cam.visibleW / 2, 0));
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = tank.color;
      ctx.fillText(`${tank.name.toUpperCase()} ${dist}m`, ix, iy - 16);
      ctx.textAlign = 'left';
    }
  }

  _drawTrajectory(ctx) {
    const s = this.settings.get('showTrajectory');
    if (s === false) return;
    const tank = this.turnManager.activeTank();
    if (!tank || !tank.alive) return;
    if (this._online && this.net.isOnline && this.turnManager.currentIndex !== this.net.myPlayerIndex) return;

    const angle = tank.turret.angle;
    const power = tank.power;
    const wind = this.turnManager.wind;
    const key = `${angle.toFixed(2)}:${power.toFixed(1)}:${wind}`;
    if (key !== this._previewKey) {
      this._previewKey = key;
      this._previewPath = this._simulatePreview(tank, wind);
    }

    const pts = this._previewPath;
    ctx.save();
    // Locked aiming arc: fan between the weapon's min/max angle so a
    // constrained (or fixed-angle) weapon shows exactly where shots are
    // blocked before the player even fires.
    this._drawAimArc(ctx, tank);
    for (let i = 0; i < pts.length; i += 2) {
      const alpha = 0.15 + (i / pts.length) * 0.75;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = tank.color;
      const r = i % 10 === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.arc(pts[i], pts[i + 1], r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pts[pts.length - 2], pts[pts.length - 1], 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw the weapon's legal aiming arc from the barrel tip. For fixed-angle
   * weapons (railgun) this renders a single lock line; for ranged weapons it
   * renders a translucent fan plus dashed boundary rays, truncated by the
   * weapon's power range.
   */
  _drawAimArc(ctx, tank) {
    const w = tank.weaponInstances && tank.weaponInstances[tank.weaponIndex];
    const def = w ? w.def : null;
    if (!def) return;
    const r = tank.aimRange();
    const pr = tank.powerRange();
    const tip = tank.getBarrelTip();
    const fixed = def.fixedAngle !== undefined;
    const locked = fixed || Math.abs(r.min - r.max) < 0.5;

    // Arc length scaled by current power so it truncates when the power cap
    // blocks a longer shot (minPower*3.2 at floor, maxPower*3.2 at ceiling).
    const maxReach = pr.max * 3.2 + 40;
    const aMin = degToRad(r.min);
    const aMax = degToRad(r.max);

    ctx.save();
    ctx.globalAlpha = fixed ? 0.85 : 0.28;
    if (fixed) {
      // Single locked ray.
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x + Math.cos(aMin) * maxReach, tip.y - Math.sin(aMin) * maxReach);
      ctx.stroke();
      ctx.setLineDash([]);
      // Lock glyph at the muzzle.
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Translucent fan + dashed boundaries.
    const span = aMax - aMin;
    ctx.fillStyle = 'rgba(62, 242, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.arc(tip.x, tip.y, maxReach, -aMin, -aMax, true);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    for (const a of [aMin, aMax]) {
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x + Math.cos(a) * maxReach, tip.y - Math.sin(a) * maxReach);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  /** Deterministic preview: identical math to real flight. */
  _simulatePreview(tank, wind) {
    const tip = tank.getBarrelTip();
    const { vx: ivx, vy: ivy } = Physics.initialVelocity(tank.turret.angle, tank.power);
    const mass = 1;
    const windAcc = Physics.windAcceleration(wind, mass);
    const dt = CONFIG.PHYSICS.FIXED_DT;
    const pts = [tip.x, tip.y];
    let px = tip.x;
    let py = tip.y;
    let vx = ivx;
    let vy = ivy;
    const maxSteps = 60 * 8;
    for (let i = 0; i < maxSteps; i++) {
      vx += windAcc * dt;
      vy += CONFIG.PHYSICS.GRAVITY * dt;
      px += vx * dt;
      py += vy * dt;
      pts.push(px, py);
      if (this.terrain.isSolidAt(px, py)) break;
      if (px < -100 || px > this.terrain.width + 100 || py > this.terrain.height + 200 || py < -600) break;
    }
    return pts;
  }

  _drawDebug(ctx) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.font = '12px ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6, 6, 270, 92);
    ctx.fillStyle = '#7ef2ff';
    const lines = [
      `FPS ${this.loop.fps.toFixed(0)}`,
      `state ${this.state.current}`,
      `wind ${this.turnManager.wind}`,
      `proj ${this.projectiles.length} · parts ${this.particles.active.length}`,
      `tank0 (${this.tanks[0]?.x.toFixed(0)}, ${this.tanks[0]?.y.toFixed(0)})`,
      `tank1 (${this.tanks[1]?.x.toFixed(0)}, ${this.tanks[1]?.y.toFixed(0)})`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, 12, 12 + i * 14));
  }
}
