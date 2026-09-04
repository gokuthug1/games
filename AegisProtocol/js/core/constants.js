/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Core Constants, Balance Tables & Mathematical Models
 * 
 * Strict Zero-Emoji Policy: All iconography rendered via SVG/Canvas vector paths.
 */

export const CONFIG = {
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 800,
  GRID_COLS: 24,
  GRID_ROWS: 16,
  TILE_SIZE: 50,
  
  // Game Loop
  FIXED_TIMESTEP: 1000 / 60, // 60 FPS update rate (16.66ms)
  MAX_DELTA: 100, // Avoid spiral of death
  
  // Speeds
  SPEED_MULTIPLIERS: [1, 2, 4, 8],
  
  // Economy Defaults
  DEFAULT_CREDITS: 500,
  DEFAULT_LIVES: 20,
  DEFAULT_ENERGY: 100,
  INTEREST_RATE: 0.05, // 5% bonus credits per wave ended
  MAX_INTEREST: 150,
  KILL_STREAK_WINDOW_MS: 3000, // 3s kill streak window
  
  // Rendering Layers
  LAYERS: {
    BACKGROUND: 0,
    GRID: 1,
    TERRAIN: 2,
    PATH: 3,
    TOWERS_BASE: 4,
    RANGE_INDICATORS: 5,
    ENEMIES: 6,
    FLYING_ENEMIES: 7,
    TOWERS_TURRET: 8,
    PROJECTILES: 9,
    PARTICLES: 10,
    EFFECTS_OVERLAY: 11,
    HEALTH_BARS: 12,
    COMBAT_TEXT: 13,
    UI_OVERLAY: 14
  }
};

export const MATH_MODELS = {
  // Armor Mitigation Constant kappa
  // Damage Reduction = 100 / (100 + ARMOR_KAPPA * Armor)
  ARMOR_KAPPA: 3.0,

  // Flocking & Formation Repulsion Constants
  FLOCK_SEPARATION_RADIUS: 24.0,
  FLOCK_REPULSION_FORCE: 220.0,
  FLOCK_DAMPING: 0.92,

  // Predictive Interception Tolerance
  LEAD_TOLERANCE_EPSILON: 1e-4,

  // Angular PID Tracking Constants
  PID_KP: 16.0,
  PID_KD: 2.8,

  // Wave Scaling Exponents
  // HP(w) = HP_0 * (1 + HP_BASE_COEFF * w)^HP_EXPONENT
  HP_BASE_COEFF: 0.095,
  HP_EXPONENT: 1.14,
  SHIELD_BASE_COEFF: 0.085,
  SHIELD_EXPONENT: 1.10,
  ARMOR_SCALE_COEFF: 1.25,
  ARMOR_SCALE_EXPONENT: 0.72,
  BOUNTY_SCALE_COEFF: 0.035,

  // Kill Streak Multiplier Calculus: M(k) = 1.0 + MAX_BOOST * (1 - e^(-LAMBDA * k))
  STREAK_MAX_BOOST: 2.5,
  STREAK_LAMBDA: 0.08,

  // Gaussian Kernel Sigma for AoE Cluster Optimization (in pixels)
  GAUSSIAN_CLUSTER_SIGMA: 45.0
};

export const TILE_TYPES = {
  EMPTY: 0,
  BLOCKED: 1,
  PATH: 2,
  SPAWN: 3,
  GOAL: 4,
  HIGH_GROUND: 5,     // +15% range & +10% damage
  POWER_GRID: 6,       // -20% ability/attack cooldown
  AMPLIFIER: 7,        // +25% critical strike chance
  HAZARD: 8            // Damages/slows ground enemies crossing it
};

export const DAMAGE_TYPES = {
  KINETIC: 'KINETIC',       // High vs Light/Shieldless, Normal vs Armor
  ENERGY: 'ENERGY',         // +50% vs Shields, -25% vs Armor
  CRYO: 'CRYO',             // Slows and Freezes, Normal damage
  THERMAL: 'THERMAL',       // Burns over time, Melts Armor
  CORROSIVE: 'CORROSIVE',   // Destroys Armor, stacks DoT
  SHOCK: 'SHOCK',           // Chains to nearby targets, Stuns
  TRUE_DAMAGE: 'TRUE_DAMAGE' // Ignores all Armor and Shields
};

export const DAMAGE_MULTIPLIERS = {
  // Attacker Damage Type -> Defender Armor Type
  KINETIC: {
    LIGHT: 1.30,
    MEDIUM: 1.00,
    HEAVY: 0.70,
    SHIELDED: 0.80,
    BIO: 1.20,
    BOSS: 0.90
  },
  ENERGY: {
    LIGHT: 1.00,
    MEDIUM: 1.00,
    HEAVY: 0.80,
    SHIELDED: 1.75, // Energy cuts through plasma shields
    BIO: 1.10,
    BOSS: 1.00
  },
  CRYO: {
    LIGHT: 1.00,
    MEDIUM: 1.00,
    HEAVY: 0.90,
    SHIELDED: 0.70,
    BIO: 1.40, // Cryo is deadly to biological enemies
    BOSS: 0.85
  },
  THERMAL: {
    LIGHT: 1.25,
    MEDIUM: 1.10,
    HEAVY: 1.30, // Thermal melts armored plating
    SHIELDED: 0.60,
    BIO: 1.50,
    BOSS: 1.10
  },
  CORROSIVE: {
    LIGHT: 0.90,
    MEDIUM: 1.10,
    HEAVY: 1.60, // Acid shreds heavy plates
    SHIELDED: 0.50,
    BIO: 1.30,
    BOSS: 1.20
  },
  SHOCK: {
    LIGHT: 1.30,
    MEDIUM: 1.20,
    HEAVY: 1.00,
    SHIELDED: 1.50, // EMP bursts overload electronics & shields
    BIO: 0.80,
    BOSS: 1.00
  },
  TRUE_DAMAGE: {
    LIGHT: 1.00,
    MEDIUM: 1.00,
    HEAVY: 1.00,
    SHIELDED: 1.00,
    BIO: 1.00,
    BOSS: 1.00
  }
};

export const TARGET_PRIORITIES = {
  FIRST: 'FIRST',         // Closest to the exit
  LAST: 'LAST',           // Furthest from the exit
  STRONGEST: 'STRONGEST', // Highest current HP + Shield
  WEAKEST: 'WEAKEST',     // Lowest current HP
  FASTEST: 'FASTEST',     // Highest current movement speed
  CLOSEST: 'CLOSEST',     // Shortest distance to tower
  OPTIMAL: 'OPTIMAL',     // Multi-variable mathematical utility function
  FLYING: 'FLYING',       // Prioritize aerial units
  BOSS: 'BOSS'            // Prioritize boss units
};

export const STATUS_EFFECTS = {
  SLOW: 'SLOW',
  FREEZE: 'FREEZE',
  BURN: 'BURN',
  CORROSION: 'CORROSION',
  ELECTRIFIED: 'ELECTRIFIED',
  STUN: 'STUN',
  ARMOR_SHATTER: 'ARMOR_SHATTER',
  DISARMED: 'DISARMED',
  MARK_OF_DEATH: 'MARK_OF_DEATH'
};

export const COLORS = {
  CYAN: '#00f3ff',
  CYAN_GLOW: 'rgba(0, 243, 255, 0.4)',
  AMBER: '#ffb703',
  AMBER_GLOW: 'rgba(255, 183, 3, 0.4)',
  CRIMSON: '#ff0055',
  CRIMSON_GLOW: 'rgba(255, 0, 85, 0.4)',
  EMERALD: '#00ff88',
  EMERALD_GLOW: 'rgba(0, 255, 136, 0.4)',
  VIOLET: '#b5179e',
  VIOLET_GLOW: 'rgba(181, 23, 158, 0.4)',
  DARK_BG: '#0a0d14',
  DARK_PANEL: '#101726',
  DARK_BORDER: '#1e293b',
  GRID_LINE: 'rgba(30, 41, 59, 0.5)',
  GRID_ACTIVE: 'rgba(0, 243, 255, 0.15)',
  RANGE_VALID: 'rgba(0, 243, 255, 0.18)',
  RANGE_INVALID: 'rgba(255, 0, 85, 0.22)',
  RANGE_BORDER: 'rgba(0, 243, 255, 0.6)',
  HEALTH_BAR_BG: 'rgba(15, 23, 42, 0.8)',
  HEALTH_BAR_FILL: '#00ff88',
  SHIELD_BAR_FILL: '#00d0ff',
  BOSS_BAR_FILL: '#ff0055'
};
