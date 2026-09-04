/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Handcrafted Campaign Maps & Wave Configurations (8 Distinct Theaters)
 * 
 * Strict Zero-Emoji Policy: All iconography rendered via SVG/Canvas vector paths.
 */

import { TILE_TYPES } from '../core/constants.js';

export const MAPS_DATA = {
  map_01: {
    id: 'map_01',
    name: 'Sector 01: Neon Outpost',
    subtitle: 'Outer Perimeter Station',
    difficulty: 'Recruit',
    startingCredits: 550,
    startingLives: 20,
    totalWaves: 15,
    theme: 'neon',
    bgColor: '#070a12',
    gridColor: 'rgba(0, 243, 255, 0.08)',
    description: 'A classic S-curve perimeter trench. Master basic chokepoints and kinetic vs shield weapon placement.',
    paths: [
      [
        { x: 0, y: 3 },
        { x: 7, y: 3 },
        { x: 7, y: 12 },
        { x: 16, y: 12 },
        { x: 16, y: 4 },
        { x: 23, y: 4 }
      ]
    ],
    specialTiles: [
      { x: 6, y: 2, type: TILE_TYPES.HIGH_GROUND },
      { x: 8, y: 4, type: TILE_TYPES.POWER_GRID },
      { x: 15, y: 11, type: TILE_TYPES.AMPLIFIER },
      { x: 17, y: 5, type: TILE_TYPES.HIGH_GROUND },
      { x: 11, y: 7, type: TILE_TYPES.AMPLIFIER },
      // Obstacles
      { x: 2, y: 8, type: TILE_TYPES.BLOCKED },
      { x: 3, y: 8, type: TILE_TYPES.BLOCKED },
      { x: 20, y: 9, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 8, enemy: 'scout', interval: 1.2 },
      { count: 12, enemy: 'scout', interval: 1.0 },
      { count: 18, enemy: 'swarmer', interval: 0.45 },
      { count: 6, enemy: 'mech', interval: 2.0 },
      { count: 10, enemy: 'scout', escort: { count: 3, enemy: 'mech' }, interval: 1.1 },
      { count: 12, enemy: 'shield_drone', interval: 1.3 },
      { count: 25, enemy: 'swarmer', interval: 0.35 },
      { count: 8, enemy: 'speeder', interval: 0.9 },
      { count: 10, enemy: 'infiltrator', interval: 1.2 },
      { count: 1, enemy: 'boss_titan', interval: 5.0, bossName: 'Goliath Titan Prototype' },
      { count: 12, enemy: 'regenerator', interval: 1.4 },
      { count: 10, enemy: 'flyer', interval: 1.3 },
      { count: 10, enemy: 'splitter', interval: 1.5 },
      { count: 16, enemy: 'mech', escort: { count: 8, enemy: 'shield_drone' }, interval: 1.0 },
      { count: 1, enemy: 'boss_titan', escort: { count: 14, enemy: 'speeder' }, interval: 3.0, bossName: 'Apex Goliath Titan' }
    ]
  },

  map_02: {
    id: 'map_02',
    name: 'Sector 02: Cyber Canyon',
    subtitle: 'Twin Conduit Gorge',
    difficulty: 'Tactician',
    startingCredits: 620,
    startingLives: 20,
    totalWaves: 18,
    theme: 'canyon',
    bgColor: '#100b14',
    gridColor: 'rgba(255, 0, 127, 0.08)',
    description: 'Two separate enemy convoys assault through opposing northern and southern trenches before converging at the nexus.',
    paths: [
      // Lane 1 (North-to-South)
      [
        { x: 0, y: 2 },
        { x: 8, y: 2 },
        { x: 8, y: 7 },
        { x: 17, y: 7 },
        { x: 17, y: 13 },
        { x: 23, y: 13 }
      ],
      // Lane 2 (South-to-North)
      [
        { x: 0, y: 13 },
        { x: 8, y: 13 },
        { x: 8, y: 8 },
        { x: 17, y: 8 },
        { x: 17, y: 2 },
        { x: 23, y: 2 }
      ]
    ],
    specialTiles: [
      { x: 9, y: 7, type: TILE_TYPES.HIGH_GROUND },
      { x: 9, y: 8, type: TILE_TYPES.HIGH_GROUND },
      { x: 16, y: 6, type: TILE_TYPES.POWER_GRID },
      { x: 16, y: 9, type: TILE_TYPES.AMPLIFIER },
      { x: 4, y: 7, type: TILE_TYPES.HIGH_GROUND },
      // Rock Formations
      { x: 4, y: 5, type: TILE_TYPES.BLOCKED },
      { x: 4, y: 10, type: TILE_TYPES.BLOCKED },
      { x: 12, y: 3, type: TILE_TYPES.BLOCKED },
      { x: 12, y: 12, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 12, enemy: 'scout', interval: 1.0 },
      { count: 18, enemy: 'swarmer', interval: 0.4 },
      { count: 8, enemy: 'mech', interval: 1.6 },
      { count: 14, enemy: 'speeder', interval: 0.8 },
      { count: 14, enemy: 'shield_drone', interval: 1.1 },
      { count: 16, enemy: 'infiltrator', interval: 0.9 },
      { count: 12, enemy: 'regenerator', interval: 1.3 },
      { count: 14, enemy: 'splitter', interval: 1.2 },
      { count: 16, enemy: 'flyer', interval: 1.0 },
      { count: 1, enemy: 'boss_overlord', interval: 4.0, bossName: 'Nexus Hive Overlord' },
      { count: 20, enemy: 'shield_drone', escort: { count: 10, enemy: 'mech' }, interval: 1.0 },
      { count: 32, enemy: 'swarmer', interval: 0.25 },
      { count: 16, enemy: 'speeder', interval: 0.6 },
      { count: 16, enemy: 'regenerator', interval: 1.1 },
      { count: 20, enemy: 'infiltrator', interval: 0.7 },
      { count: 18, enemy: 'splitter', interval: 1.0 },
      { count: 24, enemy: 'flyer', interval: 0.8 },
      { count: 2, enemy: 'boss_overlord', escort: { count: 20, enemy: 'swarmer' }, interval: 4.0, bossName: 'Twin Hive Sovereigns' }
    ]
  },

  map_03: {
    id: 'map_03',
    name: 'Sector 03: Frost Citadel',
    subtitle: 'Glacial Labyrinth Spiral',
    difficulty: 'Veteran',
    startingCredits: 680,
    startingLives: 20,
    totalWaves: 20,
    theme: 'frost',
    bgColor: '#081018',
    gridColor: 'rgba(0, 208, 255, 0.08)',
    description: 'A deep triple-spiral labyrinth carved into glacial ice. Enemies must travel a long winding distance under constant sniper fire.',
    paths: [
      [
        { x: 1, y: 0 },
        { x: 1, y: 14 },
        { x: 22, y: 14 },
        { x: 22, y: 2 },
        { x: 5, y: 2 },
        { x: 5, y: 11 },
        { x: 18, y: 11 },
        { x: 18, y: 6 },
        { x: 11, y: 6 },
        { x: 11, y: 8 }
      ]
    ],
    specialTiles: [
      { x: 3, y: 7, type: TILE_TYPES.HIGH_GROUND },
      { x: 8, y: 4, type: TILE_TYPES.POWER_GRID },
      { x: 15, y: 8, type: TILE_TYPES.AMPLIFIER },
      { x: 12, y: 8, type: TILE_TYPES.HIGH_GROUND },
      { x: 20, y: 8, type: TILE_TYPES.AMPLIFIER },
      // Ice Blocks
      { x: 3, y: 3, type: TILE_TYPES.BLOCKED },
      { x: 3, y: 12, type: TILE_TYPES.BLOCKED },
      { x: 20, y: 4, type: TILE_TYPES.BLOCKED },
      { x: 20, y: 12, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 14, enemy: 'scout', interval: 0.9 },
      { count: 22, enemy: 'swarmer', interval: 0.35 },
      { count: 12, enemy: 'regenerator', interval: 1.2 },
      { count: 16, enemy: 'shield_drone', interval: 1.0 },
      { count: 18, enemy: 'infiltrator', interval: 0.8 },
      { count: 14, enemy: 'speeder', interval: 0.7 },
      { count: 16, enemy: 'splitter', interval: 1.1 },
      { count: 18, enemy: 'mech', interval: 1.2 },
      { count: 20, enemy: 'flyer', interval: 0.9 },
      { count: 1, enemy: 'boss_titan', interval: 4.0, bossName: 'Glacial Frost Colossus' },
      { count: 25, enemy: 'regenerator', interval: 0.9 },
      { count: 40, enemy: 'swarmer', interval: 0.25 },
      { count: 22, enemy: 'shield_drone', interval: 0.8 },
      { count: 20, enemy: 'speeder', interval: 0.6 },
      { count: 22, enemy: 'infiltrator', interval: 0.7 },
      { count: 24, enemy: 'flyer', interval: 0.8 },
      { count: 22, enemy: 'splitter', interval: 0.9 },
      { count: 26, enemy: 'mech', escort: { count: 12, enemy: 'shield_drone' }, interval: 0.9 },
      { count: 32, enemy: 'regenerator', interval: 0.8 },
      { count: 1, enemy: 'boss_chronos', interval: 5.0, bossName: 'Chronos Singularity Prime' }
    ]
  },

  map_04: {
    id: 'map_04',
    name: 'Sector 04: Toxic Wasteland',
    subtitle: 'Corrosive Crossroads',
    difficulty: 'Hard',
    startingCredits: 720,
    startingLives: 20,
    totalWaves: 20,
    theme: 'toxic',
    bgColor: '#0d130a',
    gridColor: 'rgba(132, 204, 22, 0.08)',
    description: 'A 4-way diagonal intersection where waves cross each other in central killzones surrounded by acidic industrial terrain.',
    paths: [
      // Diagonal North-West to South-East
      [
        { x: 0, y: 1 },
        { x: 7, y: 1 },
        { x: 7, y: 6 },
        { x: 16, y: 6 },
        { x: 16, y: 14 },
        { x: 23, y: 14 }
      ],
      // Diagonal South-West to North-East
      [
        { x: 0, y: 14 },
        { x: 7, y: 14 },
        { x: 7, y: 9 },
        { x: 16, y: 9 },
        { x: 16, y: 1 },
        { x: 23, y: 1 }
      ]
    ],
    specialTiles: [
      { x: 11, y: 7, type: TILE_TYPES.HIGH_GROUND },
      { x: 12, y: 8, type: TILE_TYPES.HIGH_GROUND },
      { x: 11, y: 5, type: TILE_TYPES.AMPLIFIER },
      { x: 12, y: 10, type: TILE_TYPES.POWER_GRID },
      { x: 6, y: 7, type: TILE_TYPES.POWER_GRID },
      { x: 17, y: 8, type: TILE_TYPES.AMPLIFIER },
      // Acid Vat Obstacles
      { x: 11, y: 2, type: TILE_TYPES.BLOCKED },
      { x: 12, y: 2, type: TILE_TYPES.BLOCKED },
      { x: 11, y: 13, type: TILE_TYPES.BLOCKED },
      { x: 12, y: 13, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 16, enemy: 'mech', interval: 1.1 },
      { count: 22, enemy: 'scout', interval: 0.7 },
      { count: 20, enemy: 'shield_drone', interval: 0.9 },
      { count: 35, enemy: 'swarmer', interval: 0.3 },
      { count: 16, enemy: 'splitter', interval: 1.0 },
      { count: 22, enemy: 'infiltrator', interval: 0.7 },
      { count: 20, enemy: 'regenerator', interval: 1.0 },
      { count: 24, enemy: 'flyer', interval: 0.8 },
      { count: 22, enemy: 'speeder', interval: 0.6 },
      { count: 1, enemy: 'boss_overlord', interval: 3.5, bossName: 'Corrosive Hive Matriarch' },
      { count: 28, enemy: 'mech', escort: { count: 16, enemy: 'shield_drone' }, interval: 0.9 },
      { count: 30, enemy: 'splitter', interval: 0.8 },
      { count: 45, enemy: 'swarmer', interval: 0.2 },
      { count: 24, enemy: 'speeder', interval: 0.5 },
      { count: 28, enemy: 'infiltrator', interval: 0.6 },
      { count: 28, enemy: 'flyer', interval: 0.7 },
      { count: 32, enemy: 'regenerator', interval: 0.8 },
      { count: 30, enemy: 'mech', interval: 0.8 },
      { count: 36, enemy: 'shield_drone', interval: 0.6 },
      { count: 2, enemy: 'boss_titan', escort: { count: 22, enemy: 'speeder' }, interval: 4.0, bossName: 'Dual Toxic Colossi' }
    ]
  },

  map_05: {
    id: 'map_05',
    name: 'Sector 05: Void Core',
    subtitle: 'Trifecta Warp Rifts',
    difficulty: 'Expert',
    startingCredits: 800,
    startingLives: 20,
    totalWaves: 22,
    theme: 'void',
    bgColor: '#0e0818',
    gridColor: 'rgba(181, 23, 158, 0.08)',
    description: 'Triple simultaneous dimensional warp rifts spawn relentless converging columns towards the central generator.',
    paths: [
      // Top Rift
      [
        { x: 0, y: 2 },
        { x: 9, y: 2 },
        { x: 9, y: 7 },
        { x: 23, y: 7 }
      ],
      // Center Rift
      [
        { x: 0, y: 8 },
        { x: 23, y: 8 }
      ],
      // Bottom Rift
      [
        { x: 0, y: 13 },
        { x: 9, y: 13 },
        { x: 9, y: 9 },
        { x: 23, y: 9 }
      ]
    ],
    specialTiles: [
      { x: 10, y: 6, type: TILE_TYPES.AMPLIFIER },
      { x: 10, y: 10, type: TILE_TYPES.AMPLIFIER },
      { x: 15, y: 6, type: TILE_TYPES.HIGH_GROUND },
      { x: 15, y: 10, type: TILE_TYPES.HIGH_GROUND },
      { x: 19, y: 6, type: TILE_TYPES.POWER_GRID },
      { x: 19, y: 10, type: TILE_TYPES.POWER_GRID },
      // Void Crystals
      { x: 5, y: 5, type: TILE_TYPES.BLOCKED },
      { x: 5, y: 10, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 20, enemy: 'scout', interval: 0.8 },
      { count: 32, enemy: 'swarmer', interval: 0.3 },
      { count: 18, enemy: 'shield_drone', interval: 0.8 },
      { count: 20, enemy: 'infiltrator', interval: 0.7 },
      { count: 22, enemy: 'mech', interval: 0.9 },
      { count: 24, enemy: 'speeder', interval: 0.6 },
      { count: 22, enemy: 'splitter', interval: 0.9 },
      { count: 26, enemy: 'flyer', interval: 0.7 },
      { count: 24, enemy: 'regenerator', interval: 0.8 },
      { count: 1, enemy: 'boss_chronos', interval: 4.0, bossName: 'Warp Singularity Dreadnought' },
      { count: 32, enemy: 'shield_drone', escort: { count: 16, enemy: 'mech' }, interval: 0.7 },
      { count: 55, enemy: 'swarmer', interval: 0.18 },
      { count: 30, enemy: 'infiltrator', interval: 0.55 },
      { count: 28, enemy: 'speeder', interval: 0.5 },
      { count: 32, enemy: 'flyer', interval: 0.65 },
      { count: 30, enemy: 'splitter', interval: 0.75 },
      { count: 34, enemy: 'regenerator', interval: 0.75 },
      { count: 32, enemy: 'mech', interval: 0.75 },
      { count: 38, enemy: 'shield_drone', interval: 0.55 },
      { count: 2, enemy: 'boss_overlord', interval: 3.5, bossName: 'Dual Void Sovereigns' },
      { count: 42, enemy: 'flyer', escort: { count: 32, enemy: 'speeder' }, interval: 0.45 },
      { count: 2, enemy: 'boss_chronos', escort: { count: 2, enemy: 'boss_titan' }, interval: 4.5, bossName: 'Singularity & Titan Cataclysm' }
    ]
  },

  map_06: {
    id: 'map_06',
    name: 'Sector 06: Orbital Platform',
    subtitle: 'Skybridge Perimeter Bastion',
    difficulty: 'Expert',
    startingCredits: 850,
    startingLives: 20,
    totalWaves: 22,
    theme: 'orbital',
    bgColor: '#050711',
    gridColor: 'rgba(0, 243, 255, 0.1)',
    description: 'Suspended orbital bridges over open vacuum. Flying gunships bypass ground choke turns directly.',
    paths: [
      [
        { x: 0, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 1 },
        { x: 18, y: 1 },
        { x: 18, y: 14 },
        { x: 10, y: 14 },
        { x: 10, y: 8 },
        { x: 23, y: 8 }
      ]
    ],
    specialTiles: [
      { x: 7, y: 2, type: TILE_TYPES.HIGH_GROUND },
      { x: 17, y: 2, type: TILE_TYPES.HIGH_GROUND },
      { x: 9, y: 7, type: TILE_TYPES.POWER_GRID },
      { x: 11, y: 7, type: TILE_TYPES.AMPLIFIER },
      { x: 14, y: 10, type: TILE_TYPES.HIGH_GROUND },
      // Space Void Gaps
      { x: 1, y: 10, type: TILE_TYPES.BLOCKED },
      { x: 2, y: 10, type: TILE_TYPES.BLOCKED },
      { x: 21, y: 4, type: TILE_TYPES.BLOCKED },
      { x: 22, y: 4, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 18, enemy: 'flyer', interval: 0.9 },
      { count: 24, enemy: 'scout', interval: 0.7 },
      { count: 20, enemy: 'speeder', interval: 0.6 },
      { count: 22, enemy: 'shield_drone', interval: 0.8 },
      { count: 20, enemy: 'infiltrator', interval: 0.7 },
      { count: 24, enemy: 'flyer', interval: 0.7 },
      { count: 22, enemy: 'mech', interval: 0.9 },
      { count: 25, enemy: 'splitter', interval: 0.8 },
      { count: 24, enemy: 'regenerator', interval: 0.8 },
      { count: 1, enemy: 'boss_titan', interval: 4.0, bossName: 'Orbital Sky Titan' },
      { count: 30, enemy: 'flyer', escort: { count: 20, enemy: 'speeder' }, interval: 0.6 },
      { count: 35, enemy: 'shield_drone', interval: 0.6 },
      { count: 50, enemy: 'swarmer', interval: 0.2 },
      { count: 30, enemy: 'infiltrator', interval: 0.5 },
      { count: 32, enemy: 'mech', interval: 0.7 },
      { count: 36, enemy: 'flyer', interval: 0.5 },
      { count: 32, enemy: 'regenerator', interval: 0.7 },
      { count: 34, enemy: 'splitter', interval: 0.7 },
      { count: 38, enemy: 'speeder', interval: 0.45 },
      { count: 2, enemy: 'boss_overlord', interval: 3.5, bossName: 'Sky Sovereigns' },
      { count: 45, enemy: 'flyer', interval: 0.4 },
      { count: 2, enemy: 'boss_chronos', escort: { count: 25, enemy: 'flyer' }, interval: 4.0, bossName: 'Orbital Dreadnought Prime' }
    ]
  },

  map_07: {
    id: 'map_07',
    name: 'Sector 07: Magma Foundry',
    subtitle: 'Furnace Switchback Gauntlet',
    difficulty: 'Master',
    startingCredits: 900,
    startingLives: 20,
    totalWaves: 24,
    theme: 'magma',
    bgColor: '#160806',
    gridColor: 'rgba(249, 115, 22, 0.08)',
    description: 'A serpentine switchback through molten ore smelters. Position plasma weapons and long-range siege mortars for catastrophic splash.',
    paths: [
      [
        { x: 0, y: 1 },
        { x: 21, y: 1 },
        { x: 21, y: 5 },
        { x: 2, y: 5 },
        { x: 2, y: 9 },
        { x: 21, y: 9 },
        { x: 21, y: 14 },
        { x: 0, y: 14 }
      ]
    ],
    specialTiles: [
      { x: 6, y: 3, type: TILE_TYPES.HIGH_GROUND },
      { x: 15, y: 3, type: TILE_TYPES.AMPLIFIER },
      { x: 6, y: 7, type: TILE_TYPES.POWER_GRID },
      { x: 15, y: 7, type: TILE_TYPES.HIGH_GROUND },
      { x: 10, y: 11, type: TILE_TYPES.AMPLIFIER },
      { x: 18, y: 11, type: TILE_TYPES.POWER_GRID },
      // Lava Vats
      { x: 10, y: 3, type: TILE_TYPES.BLOCKED },
      { x: 10, y: 7, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 22, enemy: 'mech', interval: 0.8 },
      { count: 26, enemy: 'scout', interval: 0.6 },
      { count: 24, enemy: 'shield_drone', interval: 0.7 },
      { count: 40, enemy: 'swarmer', interval: 0.25 },
      { count: 24, enemy: 'splitter', interval: 0.8 },
      { count: 25, enemy: 'infiltrator', interval: 0.6 },
      { count: 26, enemy: 'regenerator', interval: 0.7 },
      { count: 28, enemy: 'flyer', interval: 0.6 },
      { count: 26, enemy: 'speeder', interval: 0.5 },
      { count: 1, enemy: 'boss_titan', interval: 3.5, bossName: 'Vulcan Forge Titan' },
      { count: 32, enemy: 'mech', escort: { count: 18, enemy: 'shield_drone' }, interval: 0.7 },
      { count: 34, enemy: 'splitter', interval: 0.7 },
      { count: 60, enemy: 'swarmer', interval: 0.15 },
      { count: 30, enemy: 'speeder', interval: 0.4 },
      { count: 32, enemy: 'infiltrator', interval: 0.5 },
      { count: 34, enemy: 'flyer', interval: 0.5 },
      { count: 36, enemy: 'regenerator', interval: 0.6 },
      { count: 35, enemy: 'mech', interval: 0.6 },
      { count: 40, enemy: 'shield_drone', interval: 0.5 },
      { count: 2, enemy: 'boss_overlord', interval: 3.0, bossName: 'Twin Magma Overlords' },
      { count: 40, enemy: 'flyer', escort: { count: 30, enemy: 'speeder' }, interval: 0.4 },
      { count: 42, enemy: 'mech', interval: 0.5 },
      { count: 45, enemy: 'regenerator', interval: 0.5 },
      { count: 2, enemy: 'boss_chronos', escort: { count: 2, enemy: 'boss_titan' }, interval: 4.0, bossName: 'Magma Singularity Sovereign' }
    ]
  },

  map_08: {
    id: 'map_08',
    name: 'Sector 08: Nexus Prime',
    subtitle: 'The Singularity Citadel',
    difficulty: 'Grandmaster',
    startingCredits: 1000,
    startingLives: 20,
    totalWaves: 25,
    theme: 'nexus',
    bgColor: '#060a14',
    gridColor: 'rgba(0, 255, 136, 0.08)',
    description: 'The final bastion of mankind. Four converging corridors channel relentless armies of titan mechs and biomechanical overlords into the central core.',
    paths: [
      // North-West to Center
      [
        { x: 0, y: 1 },
        { x: 11, y: 1 },
        { x: 11, y: 7 },
        { x: 23, y: 7 }
      ],
      // South-West to Center
      [
        { x: 0, y: 14 },
        { x: 11, y: 14 },
        { x: 11, y: 8 },
        { x: 23, y: 8 }
      ],
      // North-Center to Center
      [
        { x: 6, y: 0 },
        { x: 6, y: 5 },
        { x: 14, y: 5 },
        { x: 14, y: 7 },
        { x: 23, y: 7 }
      ],
      // South-Center to Center
      [
        { x: 6, y: 15 },
        { x: 6, y: 10 },
        { x: 14, y: 10 },
        { x: 14, y: 8 },
        { x: 23, y: 8 }
      ]
    ],
    specialTiles: [
      { x: 10, y: 6, type: TILE_TYPES.AMPLIFIER },
      { x: 12, y: 6, type: TILE_TYPES.POWER_GRID },
      { x: 10, y: 9, type: TILE_TYPES.HIGH_GROUND },
      { x: 12, y: 9, type: TILE_TYPES.HIGH_GROUND },
      { x: 15, y: 6, type: TILE_TYPES.AMPLIFIER },
      { x: 15, y: 9, type: TILE_TYPES.POWER_GRID },
      // Nexus Spire Monoliths
      { x: 5, y: 7, type: TILE_TYPES.BLOCKED },
      { x: 5, y: 8, type: TILE_TYPES.BLOCKED },
      { x: 18, y: 5, type: TILE_TYPES.BLOCKED },
      { x: 18, y: 10, type: TILE_TYPES.BLOCKED }
    ],
    waves: [
      { count: 25, enemy: 'scout', interval: 0.6 },
      { count: 40, enemy: 'swarmer', interval: 0.2 },
      { count: 26, enemy: 'shield_drone', interval: 0.6 },
      { count: 28, enemy: 'infiltrator', interval: 0.5 },
      { count: 28, enemy: 'mech', interval: 0.7 },
      { count: 30, enemy: 'speeder', interval: 0.45 },
      { count: 28, enemy: 'splitter', interval: 0.65 },
      { count: 32, enemy: 'flyer', interval: 0.55 },
      { count: 30, enemy: 'regenerator', interval: 0.65 },
      { count: 2, enemy: 'boss_titan', interval: 3.5, bossName: 'Twin Vanguard Colossi' },
      { count: 38, enemy: 'shield_drone', escort: { count: 20, enemy: 'mech' }, interval: 0.55 },
      { count: 70, enemy: 'swarmer', interval: 0.12 },
      { count: 36, enemy: 'infiltrator', interval: 0.45 },
      { count: 36, enemy: 'speeder', interval: 0.35 },
      { count: 40, enemy: 'flyer', interval: 0.45 },
      { count: 38, enemy: 'splitter', interval: 0.55 },
      { count: 40, enemy: 'regenerator', interval: 0.55 },
      { count: 42, enemy: 'mech', interval: 0.55 },
      { count: 48, enemy: 'shield_drone', interval: 0.45 },
      { count: 2, enemy: 'boss_overlord', interval: 3.0, bossName: 'Dual Nexus Hive Sovereigns' },
      { count: 50, enemy: 'flyer', escort: { count: 40, enemy: 'speeder' }, interval: 0.35 },
      { count: 50, enemy: 'mech', escort: { count: 30, enemy: 'regenerator' }, interval: 0.45 },
      { count: 60, enemy: 'infiltrator', interval: 0.3 },
      { count: 3, enemy: 'boss_titan', interval: 3.0, bossName: 'Triple Titan Siege' },
      { count: 3, enemy: 'boss_chronos', escort: { count: 30, enemy: 'flyer' }, interval: 4.0, bossName: 'Final Singularity Convergence' }
    ]
  }
};
