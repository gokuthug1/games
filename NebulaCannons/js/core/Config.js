/**
 * Config — the single source of truth for all gameplay/rendering constants.
 * No magic numbers scattered through the codebase: tune the game here.
 */

export const CONFIG = Object.freeze({
  VERSION: '1.0.0',
  TITLE: 'NEBULA CANNONS',

  WORLD: {
    WIDTH: 2560,
    HEIGHT: 1440,
    /** Terrain top surface stays between these bounds. */
    GROUND_MIN: 740,
    GROUND_BASE: 1180,
    /** Keep tanks away from the world edges. */
    EDGE_MARGIN: 260,
  },

  VIEW: {
    /** Logical viewport height in world units (16:9 aspect). */
    LOGICAL_HEIGHT: 720,
    ASPECT: 16 / 9,
  },

  PHYSICS: {
    /** Gravity in px/s^2 (y-down screen space, so positive = down). */
    GRAVITY: 560,
    /** Initial projectile speed = power * POWER_SCALE px/s. */
    POWER_SCALE: 10.5,
    POWER_MIN: 10,
    POWER_MAX: 100,
    POWER_STEP_KEYS: 2,
    /** Horizontal acceleration per wind unit, divided by projectile mass. */
    WIND_SCALE: 8,
    WIND_MIN: -15,
    WIND_MAX: 15,
    /** Fixed simulation timestep used for projectile flight (matches AI sim). */
    FIXED_DT: 1 / 60,
    /** Upper clamp on per-frame delta time. */
    MAX_DT: 0.1,
    /** Swept-collision substep length in px (prevents tunneling). */
    PROJECTILE_STEP: 5,
    /** Projectiles disappear after this many seconds. */
    PROJECTILE_MAX_LIFE: 10,
    /** Default projectile radius. */
    PROJECTILE_RADIUS: 5,
  },

  TANK: {
    WIDTH: 64,
    HEIGHT: 30,
    TURRET_LENGTH: 36,
    TURRET_WIDTH: 6,
    /** Turret angle limits in degrees (0 = east, 90 = up, 180 = west). */
    TURRET_MIN: -40,
    TURRET_MAX: 220,
    /** Degrees per second when aiming with keys. */
    AIM_SPEED: 42,
    MAX_HEALTH: 100,
    MAX_FUEL: 100,
    /** Fuel drain per second while moving. */
    FUEL_DRAIN: 16,
    MOVE_SPEED: 130,
    /** Max vertical terrain step the tank can climb in one second of travel. */
    MAX_CLIMB: 130,
    /** Hit circle radius used for projectile collisions. */
    HIT_RADIUS: 30,
    /** Collision margin vs terrain when resting. */
    CLEARANCE: 0,
  },

  TERRAIN: {
    /** Default crater depth for a "standard" blast. */
    CRATER_DEPTH: 46,
    /** Crater rim raise relative to depth (0..1). */
    RIM_FACTOR: 0.35,
    /** Columns per terrain segment drawn (rendering detail). */
    RENDER_STEP: 1,
  },

  WEAPONS: {
    // Six slots. Unlimited weapons (cannon, bouncer) anchor the kit; the
    // limited ones run dry over a match, which is what makes supply drops
    // meaningful.
    DEFAULT_LOADOUT: ['cannon', 'bouncer', 'homing', 'cluster', 'nuke', 'mine'],
    MAX_SLOTS: 6,
  },

  AI: {
    /** Weapon preference weights: id -> weight used by AI weapon selection. */
    WEAPON_WEIGHTS: {
      nuke: 3.2,
      orbital: 3.0,
      airstrike: 2.4,
      railgun: 2.6,
      drone: 2.6,
      emp: 2.2,
      turret: 2.0,
      homing: 1.9,
      leech: 1.8,
      gravity: 1.7,
      sniper: 1.6,
      cluster: 1.6,
      splitter: 1.5,
      fireball: 1.4,
      barrage: 1.4,
      mine: 1.3,
      cryo: 1.3,
      bouncer: 1.1,
      cannon: 1.0,
      smoke: 0.8,
      shield: 0.6,
      dirtmaker: 0.4,
      tesla: 2.4,
      sticky: 2.0,
      plasma: 1.9,
      boomerang: 1.7,
      napalm: 1.5,
      flash: 1.2,
    },
    /** Simulated flight cap for AI trajectory solving (seconds). */
    MAX_SIM_TIME: 8,
    /** Number of candidate angles in the coarse solve pass. */
    COARSE_SAMPLES: 26,
    /** Powers the AI tries when solving. */
    POWER_TRIALS: [50, 62, 75, 88, 100],
  },

  CAMERA: {
    /** Position damping lambda. */
    LAMBDA: 5.5,
    /** How far the camera can zoom out when framing an explosion (multiplier). */
    EXPLOSION_ZOOM: 0.78,
  },

  PARTICLES: {
    MAX_PARTICLES: 600,
    EXPLOSION_BURST: 26,
  },

  RENDER: {
    /** Skip the parallax backdrop layers (nebula, stars, sun, mountain
     *  ridges, clouds) when the world covers the screen, to save mobile
     *  GPU time. 'auto' = portrait skips (the battlefield fills the whole
     *  canvas) and any orientation skips once zoomed in past the natural
     *  fit; false = always draw; true = always skip. The cheap sky
     *  gradient is always drawn. */
    SKIP_BACKDROP: 'auto',
  },

  COLORS: {
    SKY_TOP: '#070b1f',
    SKY_BOTTOM: '#1b1f4d',
    PLAYER_A: '#3ef2ff',
    PLAYER_B: '#ff7a3d',
    PLAYER_A_DARK: '#0b3a4d',
    PLAYER_B_DARK: '#4d1f0b',
    TERRAIN_TOP: '#59e6a8',
    TERRAIN_BODY_1: '#20304a',
    TERRAIN_BODY_2: '#141c30',
    TERRAIN_UNDER: '#0a0e1c',
    ACCENT: '#ffe14d',
    UI_BG: 'rgba(10,14,28,0.82)',
    UI_BORDER: 'rgba(62,242,255,0.35)',
  },
});

/** Runtime-tunable settings (mirrors js/core/Settings.js defaults). */
export const DEFAULT_SETTINGS = Object.freeze({
  masterVolume: 0.8,
  sfxVolume: 1.0,
  musicVolume: 0.5,
  reducedMotion: false,
  uiScale: 1,
  debug: false,
  difficulty: 'NORMAL',
  showTrajectory: true,
  selfDamage: true,
  /** Portrait: which end of the battlefield sits at the top of the screen.
   *  false = world-left at the bottom (classic), true = world-left at the
   *  top (mirrored). Only affects the rotated portrait mapping. */
  flipRotation: false,
  /** Mobile render resolution: 'low' (1x DPR), 'balanced' (1.5x),
   *  'high' (2x). Desktop always uses the device pixel ratio. */
  mobileQuality: 'balanced',
  bindings: {
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    aimUp: ['KeyW', 'ArrowUp'],
    aimDown: ['KeyS', 'ArrowDown'],
    powerUp: ['KeyZ', 'Equal'],
    powerDown: ['KeyX', 'Minus'],
    fire: ['Space', 'Enter'],
    weaponNext: ['KeyE', 'BracketRight'],
    weaponPrev: ['KeyQ', 'BracketLeft'],
    zoomIn: ['KeyI'],
    zoomOut: ['KeyO'],
    pause: ['Escape', 'KeyP'],
  },
  /**
   * Mobile touch layout — thumb-zone positions + weapon chip order.
   * `zones` are percentages (0–100): x from the respective horizontal edge,
   * y from the bottom. They only apply when `custom` is true; otherwise the
   * responsive CSS defaults (which adapt per orientation) take over.
   * `chipOrder` remembers the last-used weapon chip order for the human
   * player's HUD (empty = loadout order).
   */
  mobileLayout: {
    custom: false,
    zones: {
      left: { x: 2, y: 14 },
      right: { x: 2, y: 14 },
    },
    chipOrder: [],
  },
});
