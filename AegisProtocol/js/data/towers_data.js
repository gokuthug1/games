/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Tower Archetypes, 3-Tier Upgrades & Specialization Branches
 */

import { DAMAGE_TYPES, COLORS } from '../core/constants.js';

export const TOWERS_DATA = {
  gatling: {
    id: 'gatling',
    name: 'Gatling Sentry',
    shortName: 'Gatling',
    role: 'Rapid Kinetic Fire',
    cost: 100,
    damageType: DAMAGE_TYPES.KINETIC,
    color: '#00f3ff',
    glowColor: 'rgba(0, 243, 255, 0.4)',
    baseStats: {
      damage: 18,
      fireRate: 4.5, // attacks per second
      range: 150,
      turnSpeed: 8.0,
      projectileSpeed: 600,
      accuracy: 0.95
    },
    lore: 'Rapid-cycling rotary autocannon calibrated for shredding unarmored scouts and swarms.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Gatling Mk.I',
        desc: 'Standard twin-barrel rapid autocannon.'
      },
      {
        level: 2,
        cost: 120,
        name: 'Gatling Mk.II - Vulcan',
        desc: '+50% Fire Rate, +15% Range, enhanced muzzle velocity.',
        statModifiers: { damage: 26, fireRate: 6.5, range: 175 }
      },
      {
        level: 3,
        cost: 240,
        name: 'Gatling Mk.III - Phalanx',
        desc: 'Quad depleted-uranium barrels with armor shredding kinetic rounds.',
        statModifiers: { damage: 42, fireRate: 9.0, range: 200, armorPenetration: 0.25 }
      }
    ],
    branches: {
      A: {
        id: 'gatling_minigun_array',
        name: 'Apex Rotary Array',
        cost: 450,
        desc: 'Insane 18 shots/sec suppression storm with ramping fire rate.',
        statModifiers: { damage: 55, fireRate: 16.0, range: 210, rampingRate: true }
      },
      B: {
        id: 'gatling_flak_shredder',
        name: 'Flak Heavy Autocannon',
        cost: 480,
        desc: 'Kinetic explosive micro-flak shells that deal small area-of-effect damage.',
        statModifiers: { damage: 95, fireRate: 5.5, range: 230, splashRadius: 45 }
      }
    }
  },

  laser: {
    id: 'laser',
    name: 'Pulse Laser',
    shortName: 'Laser',
    role: 'Shield Melter & Precision Beam',
    cost: 140,
    damageType: DAMAGE_TYPES.ENERGY,
    color: '#ff007f',
    glowColor: 'rgba(255, 0, 127, 0.4)',
    baseStats: {
      damage: 48,
      fireRate: 1.6,
      range: 180,
      turnSpeed: 6.0,
      projectileSpeed: 9999, // instant beam
      beamDuration: 0.18
    },
    lore: 'Focused high-coherence laser emitter. Obliterates energy shielding instantaneously.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Pulse Laser Mk.I',
        desc: 'Coherent beam pulse emitter.'
      },
      {
        level: 2,
        cost: 160,
        name: 'Pulse Laser Mk.II - Prism',
        desc: 'Prismatic refraction lens yields higher damage and +20% beam range.',
        statModifiers: { damage: 85, fireRate: 2.0, range: 220 }
      },
      {
        level: 3,
        cost: 320,
        name: 'Pulse Laser Mk.III - Tachyon',
        desc: 'Sustained tachyon burn. Ignites targets for secondary thermal damage.',
        statModifiers: { damage: 160, fireRate: 2.4, range: 260, burnDamage: 30 }
      }
    ],
    branches: {
      A: {
        id: 'laser_continuous_lance',
        name: 'Supercharged Continuous Lance',
        cost: 550,
        desc: 'Continuous non-stop cutting beam that increases in damage the longer it stays on target.',
        statModifiers: { damage: 220, isContinuous: true, rampMultiplier: 2.5, range: 280 }
      },
      B: {
        id: 'laser_prism_diffractor',
        name: 'Prism Diffractor Array',
        cost: 520,
        desc: 'Splits main laser into 3 simultaneous high-energy beams targeting multiple targets.',
        statModifiers: { damage: 140, multiBeamCount: 3, range: 250 }
      }
    }
  },

  cryo: {
    id: 'cryo',
    name: 'Cryo Projector',
    shortName: 'Cryo',
    role: 'Area Slow & Deep Freeze',
    cost: 125,
    damageType: DAMAGE_TYPES.CRYO,
    color: '#00d0ff',
    glowColor: 'rgba(0, 208, 255, 0.4)',
    baseStats: {
      damage: 15,
      fireRate: 1.2,
      range: 140,
      turnSpeed: 5.0,
      projectileSpeed: 350,
      slowFactor: 0.40, // 40% slow
      slowDuration: 2.5,
      splashRadius: 60
    },
    lore: 'Disperses sub-zero liquid nitrogen aerosol clouds that cripple enemy velocity and freeze armor.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Cryo Projector Mk.I',
        desc: 'Aerosol cold canister launcher.'
      },
      {
        level: 2,
        cost: 140,
        name: 'Cryo Projector Mk.II - Blizzard',
        desc: 'Expands slow cloud radius and increases slow magnitude to 55%.',
        statModifiers: { damage: 28, range: 165, slowFactor: 0.55, splashRadius: 80 }
      },
      {
        level: 3,
        cost: 280,
        name: 'Cryo Projector Mk.III - Permafrost',
        desc: 'Consecutive hits lock targets in complete solid ice freeze for 1.2 seconds.',
        statModifiers: { damage: 52, range: 190, slowFactor: 0.65, freezeChance: 0.4, freezeDuration: 1.2 }
      }
    ],
    branches: {
      A: {
        id: 'cryo_absolute_zero',
        name: 'Absolute Zero Core',
        cost: 500,
        desc: 'Periodic subatomic flash freeze waves that freeze all non-boss enemies in wide radius.',
        statModifiers: { damage: 90, range: 220, slowFactor: 0.80, aoeFreezeInterval: 6.0 }
      },
      B: {
        id: 'cryo_frostbite_shatter',
        name: 'Frostbite Shatter Cannon',
        cost: 530,
        desc: 'Frozen enemies take +40% bonus damage from all kinetic and explosive towers.',
        statModifiers: { damage: 110, range: 200, shatterMultiplier: 1.40 }
      }
    }
  },

  tesla: {
    id: 'tesla',
    name: 'Tesla Coil',
    shortName: 'Tesla',
    role: 'Chain Lightning Shock',
    cost: 160,
    damageType: DAMAGE_TYPES.SHOCK,
    color: '#b5179e',
    glowColor: 'rgba(181, 23, 158, 0.4)',
    baseStats: {
      damage: 55,
      fireRate: 1.0,
      range: 160,
      turnSpeed: 10.0,
      chainTargets: 3,
      chainRange: 90,
      chainDecay: 0.8,
      stunDuration: 0.15
    },
    lore: 'High-voltage arc transmitter that jumps across dense enemy formations, shocking shields and stalling electronics.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Tesla Coil Mk.I',
        desc: 'Discharges 3-target electric chain.'
      },
      {
        level: 2,
        cost: 180,
        name: 'Tesla Coil Mk.II - Overload',
        desc: 'Jumps up to 5 targets and deals +60% shock damage.',
        statModifiers: { damage: 95, chainTargets: 5, range: 185, stunDuration: 0.25 }
      },
      {
        level: 3,
        cost: 350,
        name: 'Tesla Coil Mk.III - Megavolt',
        desc: 'High frequency discharge leaps 8 times and permanently strips 30% of target shields.',
        statModifiers: { damage: 175, chainTargets: 8, range: 210, shieldStrip: 0.30 }
      }
    ],
    branches: {
      A: {
        id: 'tesla_storm_spire',
        name: 'Tempest Storm Spire',
        cost: 600,
        desc: 'Summons violent electrical storm clouds that continuously zap all enemies within range.',
        statModifiers: { damage: 240, chainTargets: 12, range: 240, stormAura: true }
      },
      B: {
        id: 'tesla_emp_disruptor',
        name: 'EMP Cascade Generator',
        cost: 580,
        desc: 'Every 4th shock releases a massive EMP blast that shuts down enemy special abilities and boss engines.',
        statModifiers: { damage: 210, range: 220, empInterval: 4, empStunDuration: 1.8 }
      }
    }
  },

  mortar: {
    id: 'mortar',
    name: 'Heavy Artillery',
    shortName: 'Mortar',
    role: 'Long-Range Area Ballistics',
    cost: 200,
    damageType: DAMAGE_TYPES.KINETIC,
    color: '#ffb703',
    glowColor: 'rgba(255, 183, 3, 0.4)',
    baseStats: {
      damage: 130,
      fireRate: 0.45,
      range: 280,
      minRange: 75,
      turnSpeed: 2.5,
      projectileSpeed: 220,
      splashRadius: 75,
      isArc: true
    },
    lore: 'High-caliber ballistic siege mortar. Devastating ground bombardment with a minimum dead zone.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Artillery Mk.I',
        desc: 'High-arc ballistic explosive shell.'
      },
      {
        level: 2,
        cost: 220,
        name: 'Artillery Mk.II - Siegehowitzer',
        desc: '+80% Blast Radius, +65% kinetic payload damage.',
        statModifiers: { damage: 225, range: 320, splashRadius: 95 }
      },
      {
        level: 3,
        cost: 420,
        name: 'Artillery Mk.III - Earthshaker',
        desc: 'Heavy cluster munition shells leaving craters that stun ground units upon detonation.',
        statModifiers: { damage: 410, range: 360, splashRadius: 120, groundStun: 0.5 }
      }
    ],
    branches: {
      A: {
        id: 'mortar_nuke_silo',
        name: 'Tactical Warhead Launcher',
        cost: 750,
        desc: 'Fires slow, colossal tactical nuclear warheads that annihilate entire waves in a massive firestorm.',
        statModifiers: { damage: 1200, fireRate: 0.22, range: 420, splashRadius: 180, residualRadiation: true }
      },
      B: {
        id: 'mortar_napalm_barrage',
        name: 'Inferno Carpet Mortar',
        cost: 680,
        desc: 'Fires a 3-shell volley of sticky napalm that ignites the ground for 8 seconds.',
        statModifiers: { damage: 320, fireRate: 0.60, range: 350, napalmGroundDuration: 8.0, burnDps: 80 }
      }
    }
  },

  plasma: {
    id: 'plasma',
    name: 'Plasma Blaster',
    shortName: 'Plasma',
    role: 'Armor-Melting Superheat',
    cost: 180,
    damageType: DAMAGE_TYPES.THERMAL,
    color: '#ff3b30',
    glowColor: 'rgba(255, 59, 48, 0.4)',
    baseStats: {
      damage: 80,
      fireRate: 1.1,
      range: 170,
      turnSpeed: 4.5,
      projectileSpeed: 400,
      splashRadius: 40,
      burnDuration: 3.0,
      burnDps: 25
    },
    lore: 'Superheated ionized gas spheres that melt heavy plating and leave residual melting thermal burn.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Plasma Blaster Mk.I',
        desc: 'Ionized gas globule launcher.'
      },
      {
        level: 2,
        cost: 200,
        name: 'Plasma Blaster Mk.II - Solar',
        desc: '+60% impact damage, increased thermal burn dot.',
        statModifiers: { damage: 145, range: 195, burnDps: 50, splashRadius: 55 }
      },
      {
        level: 3,
        cost: 380,
        name: 'Plasma Blaster Mk.III - Fusion',
        desc: 'Fusion-grade plasma disintegrates enemy armor by 50% permanently.',
        statModifiers: { damage: 270, range: 220, burnDps: 90, armorMeltPercent: 0.50 }
      }
    ],
    branches: {
      A: {
        id: 'plasma_sunfire_cannon',
        name: 'Sunfire Fusion Cannon',
        cost: 650,
        desc: 'Fires high-velocity micro-stars that pierce through targets and explode at maximum range.',
        statModifiers: { damage: 520, fireRate: 1.2, range: 250, piercing: true, splashRadius: 80 }
      },
      B: {
        id: 'plasma_magma_mortar',
        name: 'Volcanic Plasma Core',
        cost: 620,
        desc: 'Creates a persistent pool of molten magma that amplifies all incoming damage by 35%.',
        statModifiers: { damage: 290, fireRate: 1.5, magmaVulnerability: 0.35, splashRadius: 100 }
      }
    }
  },

  railgun: {
    id: 'railgun',
    name: 'Railgun Sniper',
    shortName: 'Railgun',
    role: 'Hyper-Velocity Piercing Anti-Titan',
    cost: 250,
    damageType: DAMAGE_TYPES.TRUE_DAMAGE,
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    baseStats: {
      damage: 280,
      fireRate: 0.35,
      range: 350,
      turnSpeed: 3.0,
      projectileSpeed: 9999, // instantaneous pierce beam
      pierceLimit: 4,
      critChance: 0.20,
      critMultiplier: 2.5
    },
    lore: 'Electromagnetic rail accelerator that fires solid tungsten slugs at Mach 7, penetrating all targets in a direct line.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Railgun Mk.I',
        desc: 'Linear accelerator punching through up to 4 targets.'
      },
      {
        level: 2,
        cost: 280,
        name: 'Railgun Mk.II - Hyperion',
        desc: 'Up to 8 penetrations, +75% damage and +25% range.',
        statModifiers: { damage: 510, range: 420, pierceLimit: 8, critChance: 0.25 }
      },
      {
        level: 3,
        cost: 500,
        name: 'Railgun Mk.III - Oblivion',
        desc: 'Infinite piercing line with 40% critical chance and massive boss damage.',
        statModifiers: { damage: 980, range: 480, pierceLimit: 99, critChance: 0.40, critMultiplier: 3.0 }
      }
    ],
    branches: {
      A: {
        id: 'railgun_orbital_uplink',
        name: 'Orbital Gauss Kinetic Strike',
        cost: 850,
        desc: 'Synchronizes with orbital satellites. Delivers devastating 3,000+ damage strikes to highest-HP enemy anywhere on map.',
        statModifiers: { damage: 3200, fireRate: 0.20, range: 9999, globalRange: true, bossSlayer: 1.5 }
      },
      B: {
        id: 'railgun_tachyon_repeater',
        name: 'Tachyon Hyper-Accelerator',
        cost: 800,
        desc: 'Drastically reduces capacitor recharge time, allowing rapid-fire railgun shots.',
        statModifiers: { damage: 620, fireRate: 1.2, range: 450, pierceLimit: 12 }
      }
    }
  },

  acid: {
    id: 'acid',
    name: 'Bio Corrosive Sprayer',
    shortName: 'Corrosive',
    role: 'Armor Shred & Stacking Acid DoT',
    cost: 135,
    damageType: DAMAGE_TYPES.CORROSIVE,
    color: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.4)',
    baseStats: {
      damage: 12,
      fireRate: 3.0,
      range: 130,
      turnSpeed: 6.0,
      projectileSpeed: 300,
      acidStacksMax: 10,
      acidDpsPerStack: 8,
      armorReductionPerStack: 2
    },
    lore: 'Pressurized caustic compound sprayer. Stacks acid toxins on targets to dissolve thick armor plates.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Acid Sprayer Mk.I',
        desc: 'Emits a wide cone of caustic mist.'
      },
      {
        level: 2,
        cost: 150,
        name: 'Acid Sprayer Mk.II - Vitriol',
        desc: 'Increases cone width, stack cap to 15, and corrosion duration.',
        statModifiers: { damage: 22, range: 155, acidStacksMax: 15, acidDpsPerStack: 14 }
      },
      {
        level: 3,
        cost: 300,
        name: 'Acid Sprayer Mk.III - Biohazard',
        desc: 'Max acid stacks cause targets to burst in a puddle of acid upon death.',
        statModifiers: { damage: 45, range: 180, acidStacksMax: 20, acidDpsPerStack: 24, acidDeathBurst: true }
      }
    ],
    branches: {
      A: {
        id: 'acid_catalyst_overdose',
        name: 'Apex Bioweapon Projector',
        cost: 540,
        desc: 'Acid stacks spread virally to all adjacent enemies when an infected host dies.',
        statModifiers: { damage: 85, range: 200, contagionRadius: 80, acidDpsPerStack: 40 }
      },
      B: {
        id: 'acid_molecular_dissolver',
        name: 'Molecular Disintegrator',
        cost: 560,
        desc: 'Completely strips 100% of armor from any target afflicted by 10+ stacks.',
        statModifiers: { damage: 120, range: 190, fullArmorStrip: true }
      }
    }
  },

  missile: {
    id: 'missile',
    name: 'Missile Battery',
    shortName: 'Missiles',
    role: 'Homing Multi-Target Heavy Salvo',
    cost: 220,
    damageType: DAMAGE_TYPES.KINETIC,
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    baseStats: {
      damage: 90,
      fireRate: 0.6,
      range: 260,
      turnSpeed: 4.0,
      projectileSpeed: 380,
      homingForce: 8.0,
      missilesPerSalvo: 2,
      splashRadius: 50
    },
    lore: 'Smart-guided micro-missile battery with intelligent threat-tracking avionics. Excellent vs fast and airborne targets.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Missile Pod Mk.I',
        desc: 'Fires 2 guided missiles per volley.'
      },
      {
        level: 2,
        cost: 240,
        name: 'Missile Pod Mk.II - Hellfire',
        desc: 'Fires 4 guided missiles per salvo with improved warheads.',
        statModifiers: { damage: 130, missilesPerSalvo: 4, range: 300, splashRadius: 65 }
      },
      {
        level: 3,
        cost: 450,
        name: 'Missile Pod Mk.III - Swarm Vector',
        desc: 'Fires 6 high-acceleration missiles that prioritize fastest and flying targets.',
        statModifiers: { damage: 190, missilesPerSalvo: 6, range: 350, splashRadius: 80 }
      }
    ],
    branches: {
      A: {
        id: 'missile_macross_swarm',
        name: 'Aegis Swarm Fortress',
        cost: 720,
        desc: 'Fires a continuous deluge of 12 micro-missiles locking on to up to 6 targets simultaneously.',
        statModifiers: { damage: 140, missilesPerSalvo: 12, fireRate: 0.8, range: 380, multiTargetLock: true }
      },
      B: {
        id: 'missile_bunker_buster',
        name: 'Titan Heavy Cruise Missile',
        cost: 700,
        desc: 'Fires a massive cruise missile every 4 seconds dealing huge single-target and splash damage.',
        statModifiers: { damage: 1400, missilesPerSalvo: 1, fireRate: 0.25, range: 450, splashRadius: 150 }
      }
    }
  },

  support: {
    id: 'support',
    name: 'Aegis Command Beacon',
    shortName: 'Beacon',
    role: 'Aura Buff & Tactical Overcharge',
    cost: 175,
    damageType: DAMAGE_TYPES.TRUE_DAMAGE,
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    baseStats: {
      damage: 0,
      fireRate: 0,
      range: 160,
      buffDamagePercent: 0.15, // +15% damage to nearby towers
      buffRangePercent: 0.10,  // +10% range
      buffFireRatePercent: 0.10 // +10% fire rate
    },
    lore: 'Tactical coordination uplink. Emits targeting telemetry that boosts damage, range, and fire rate of adjacent defensive batteries.',
    tiers: [
      {
        level: 1,
        cost: 0,
        name: 'Command Beacon Mk.I',
        desc: '+15% Damage, +10% Range & Fire Rate to adjacent towers.'
      },
      {
        level: 2,
        cost: 180,
        name: 'Command Beacon Mk.II - Relay',
        desc: 'Expands aura radius to 200px and increases damage buff to +25%.',
        statModifiers: { range: 200, buffDamagePercent: 0.25, buffRangePercent: 0.15, buffFireRatePercent: 0.15 }
      },
      {
        level: 3,
        cost: 360,
        name: 'Command Beacon Mk.III - Matrix',
        desc: '+35% Damage buff, +20% Critical Strike chance to all covered towers.',
        statModifiers: { range: 230, buffDamagePercent: 0.35, buffCritChance: 0.20 }
      }
    ],
    branches: {
      A: {
        id: 'support_energy_grid',
        name: 'Quantum Overclock Station',
        cost: 600,
        desc: 'Provides +40% fire rate and periodically charges commander ability energy.',
        statModifiers: { range: 250, buffFireRatePercent: 0.40, energyGenPerSec: 1.5 }
      },
      B: {
        id: 'support_orbital_relay',
        name: 'Orbital Reconnaissance Satellite',
        cost: 580,
        desc: 'Reveals stealth/cloaked enemies across the entire battlefield and increases critical damage by 50%.',
        statModifiers: { range: 280, revealsCloak: true, buffCritDamage: 0.50 }
      }
    }
  }
};
