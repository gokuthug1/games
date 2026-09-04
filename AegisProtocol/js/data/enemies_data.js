/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Enemy Bestiary & Titan Boss Definitions
 */

export const ARMOR_TYPES = {
  LIGHT: 'LIGHT',
  MEDIUM: 'MEDIUM',
  HEAVY: 'HEAVY',
  SHIELDED: 'SHIELDED',
  BIO: 'BIO',
  BOSS: 'BOSS'
};

export const ENEMIES_DATA = {
  scout: {
    id: 'scout',
    name: 'Vector Scout',
    armorType: ARMOR_TYPES.LIGHT,
    hp: 80,
    shield: 0,
    armor: 2,
    speed: 130, // px per second
    bounty: 12,
    scoreValue: 20,
    size: 14,
    color: '#00f3ff',
    glowColor: 'rgba(0, 243, 255, 0.4)',
    shape: 'triangle',
    lore: 'Light reconnaissance drone. High speed, minimal armor.'
  },

  swarmer: {
    id: 'swarmer',
    name: 'Nanite Swarmer',
    armorType: ARMOR_TYPES.BIO,
    hp: 45,
    shield: 0,
    armor: 0,
    speed: 155,
    bounty: 6,
    scoreValue: 10,
    size: 10,
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    shape: 'diamond',
    isSwarm: true,
    lore: 'Cheap, rapid swarming units deployed in overwhelming clusters.'
  },

  mech: {
    id: 'mech',
    name: 'Armored Strider',
    armorType: ARMOR_TYPES.HEAVY,
    hp: 380,
    shield: 0,
    armor: 18,
    speed: 65,
    bounty: 30,
    scoreValue: 50,
    size: 20,
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    shape: 'square',
    lore: 'Reinforced heavy combat walker. High armor reduces kinetic weapon damage.'
  },

  shield_drone: {
    id: 'shield_drone',
    name: 'Aegis Shield Bearer',
    armorType: ARMOR_TYPES.SHIELDED,
    hp: 200,
    shield: 350,
    shieldRegen: 25, // per second
    armor: 5,
    speed: 80,
    bounty: 40,
    scoreValue: 65,
    size: 18,
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.5)',
    shape: 'hexagon',
    lore: 'Equipped with a high-capacity kinetic deflector shield. Vulnerable to Energy and Shock weapons.'
  },

  infiltrator: {
    id: 'infiltrator',
    name: 'Stealth Infiltrator',
    armorType: ARMOR_TYPES.LIGHT,
    hp: 180,
    shield: 0,
    armor: 4,
    speed: 110,
    bounty: 35,
    scoreValue: 60,
    size: 15,
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    shape: 'star',
    isCloaked: true,
    cloakFadeTimer: 0,
    lore: 'Equipped with active optical camouflage. Cannot be targeted directly until revealed by Radar Beacons or EMP bursts.'
  },

  regenerator: {
    id: 'regenerator',
    name: 'Bio Mutagenic Behemoth',
    armorType: ARMOR_TYPES.BIO,
    hp: 650,
    shield: 0,
    armor: 8,
    regenRate: 45, // HP regen per second
    speed: 55,
    bounty: 50,
    scoreValue: 80,
    size: 22,
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    shape: 'circle',
    lore: 'Mutagenic organic titan capable of rapid flesh regeneration. Highly susceptible to Cryo and Thermal damage.'
  },

  speeder: {
    id: 'speeder',
    name: 'Sonic Interceptor',
    armorType: ARMOR_TYPES.LIGHT,
    hp: 120,
    shield: 60,
    armor: 3,
    speed: 190,
    bounty: 25,
    scoreValue: 40,
    size: 13,
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    shape: 'arrow',
    lore: 'Ultra-high velocity strike craft capable of sprinting through defense corridors before towers can track.'
  },

  splitter: {
    id: 'splitter',
    name: 'Hydra Carrier Core',
    armorType: ARMOR_TYPES.MEDIUM,
    hp: 420,
    shield: 100,
    armor: 10,
    speed: 70,
    bounty: 45,
    scoreValue: 70,
    size: 21,
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    shape: 'double_circle',
    splitsInto: 'swarmer',
    splitCount: 4,
    lore: 'Splits into 4 rapid Nanite Swarmers upon destruction.'
  },

  flyer: {
    id: 'flyer',
    name: 'Valkyrie Gunship',
    armorType: ARMOR_TYPES.LIGHT,
    hp: 260,
    shield: 120,
    armor: 6,
    speed: 105,
    bounty: 35,
    scoreValue: 55,
    size: 17,
    color: '#e0e7ff',
    glowColor: 'rgba(224, 231, 255, 0.5)',
    shape: 'chevron',
    isFlying: true, // flies directly across terrain ignoring ground blockers
    lore: 'Aerial heavy gunship that ignores ground barricades and terrain layout.'
  },

  // --- MEGA BOSSES ---

  boss_titan: {
    id: 'boss_titan',
    name: 'Goliath Titan Mech (Boss)',
    armorType: ARMOR_TYPES.BOSS,
    isBoss: true,
    hp: 4500,
    maxHp: 4500,
    shield: 1500,
    maxShield: 1500,
    armor: 28,
    speed: 40,
    bounty: 350,
    scoreValue: 1000,
    size: 34,
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    shape: 'boss_titan',
    specialAbility: 'SHIELD_RECOVERY_PULSE', // every 10s recovers 500 shields
    lore: 'Colossal siege mech fortress equipped with kinetic plating and an internal fusion generator.'
  },

  boss_overlord: {
    id: 'boss_overlord',
    name: 'Nexus Hive Overlord (Boss)',
    armorType: ARMOR_TYPES.BOSS,
    isBoss: true,
    hp: 6000,
    maxHp: 6000,
    shield: 800,
    maxShield: 800,
    armor: 16,
    speed: 42,
    bounty: 450,
    scoreValue: 1500,
    size: 36,
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.7)',
    shape: 'boss_hive',
    specialAbility: 'SPAWN_SWARM_ESCORT', // periodically spawns swarmer escorts
    lore: 'Bio-mechanical hive sovereign capable of synthesizing combat drones in real-time.'
  },

  boss_chronos: {
    id: 'boss_chronos',
    name: 'Chronos Singularity Dreadnought (Boss)',
    armorType: ARMOR_TYPES.BOSS,
    isBoss: true,
    hp: 12000,
    maxHp: 12000,
    shield: 4000,
    maxShield: 4000,
    armor: 35,
    speed: 35,
    bounty: 800,
    scoreValue: 3000,
    size: 40,
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.8)',
    shape: 'boss_singularity',
    specialAbility: 'TIME_WARP_TELEPORT', // teleports forward 100px when falling below 50% HP
    lore: 'Experimental warp-engine flagship capable of bending spacetime to absorb astronomical amounts of punishment.'
  }
};
