/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Tech Tree / Research Lab Matrix
 */

export const RESEARCH_BRANCHES = {
  KINETIC: 'Ballistics & Kinetics',
  ENERGY: 'Beam & Laser Physics',
  ELEMENTAL: 'Cryo & Superheat',
  COMMAND: 'Command & Logistics'
};

export const RESEARCH_DATA = [
  // --- BRANCH 1: BALLISTICS & KINETICS ---
  {
    id: 'tech_kinetic_1',
    branch: RESEARCH_BRANCHES.KINETIC,
    name: 'Depleted Uranium Munitions',
    cost: 2,
    icon: 'DAMAGE_KINETIC',
    desc: 'Increases all Kinetic tower damage (Gatling, Mortar, Missile) by +10%.',
    effects: { kineticDamage: 0.10 },
    prerequisites: []
  },
  {
    id: 'tech_kinetic_2',
    branch: RESEARCH_BRANCHES.KINETIC,
    name: 'Advanced Rifling & Accurizers',
    cost: 3,
    icon: 'RANGE',
    desc: 'Increases range of Gatling Sentries and Railguns by +15%.',
    effects: { kineticRange: 0.15 },
    prerequisites: ['tech_kinetic_1']
  },
  {
    id: 'tech_kinetic_3',
    branch: RESEARCH_BRANCHES.KINETIC,
    name: 'Hyper-Velocity Slugs',
    cost: 5,
    icon: 'DAMAGE',
    desc: 'Railguns ignore 50% of armor and gain +25% critical strike damage.',
    effects: { railgunArmorPierce: 0.50, railgunCritDmg: 0.25 },
    prerequisites: ['tech_kinetic_2']
  },
  {
    id: 'tech_kinetic_4',
    branch: RESEARCH_BRANCHES.KINETIC,
    name: 'Smart Salvo Avionics',
    cost: 8,
    icon: 'TARGET',
    desc: 'Missile Batteries fire +1 additional missile per volley.',
    effects: { bonusMissiles: 1 },
    prerequisites: ['tech_kinetic_3']
  },

  // --- BRANCH 2: BEAM & LASER PHYSICS ---
  {
    id: 'tech_energy_1',
    branch: RESEARCH_BRANCHES.ENERGY,
    name: 'Coherent Frequency Crystals',
    cost: 2,
    icon: 'DAMAGE_ENERGY',
    desc: 'Increases Pulse Laser and Tesla Coil damage by +12%.',
    effects: { energyDamage: 0.12 },
    prerequisites: []
  },
  {
    id: 'tech_energy_2',
    branch: RESEARCH_BRANCHES.ENERGY,
    name: 'Superconductor Relays',
    cost: 3,
    icon: 'DAMAGE_SHOCK',
    desc: 'Tesla Coils chain to +2 additional targets with 20% less damage decay.',
    effects: { teslaExtraChains: 2, teslaDecayReduction: 0.20 },
    prerequisites: ['tech_energy_1']
  },
  {
    id: 'tech_energy_3',
    branch: RESEARCH_BRANCHES.ENERGY,
    name: 'Tachyon Overcharge',
    cost: 5,
    icon: 'FIRE_RATE',
    desc: 'Pulse Lasers ramp up their attack rate by +25% the longer they target a single enemy.',
    effects: { laserRampRate: 0.25 },
    prerequisites: ['tech_energy_2']
  },
  {
    id: 'tech_energy_4',
    branch: RESEARCH_BRANCHES.ENERGY,
    name: 'Shield Resonance Disruptor',
    cost: 8,
    icon: 'SHIELD',
    desc: 'All Energy and Shock attacks deal +100% bonus damage to enemy shields.',
    effects: { shieldBonusDamage: 1.0 },
    prerequisites: ['tech_energy_3']
  },

  // --- BRANCH 3: CRYO & SUPERHEAT ---
  {
    id: 'tech_elemental_1',
    branch: RESEARCH_BRANCHES.ELEMENTAL,
    name: 'Sub-Zero Cryogens',
    cost: 2,
    icon: 'DAMAGE_CRYO',
    desc: 'Increases Cryo Projector slow duration by +1.0 second and slow intensity by +10%.',
    effects: { cryoDuration: 1.0, cryoSlowFactor: 0.10 },
    prerequisites: []
  },
  {
    id: 'tech_elemental_2',
    branch: RESEARCH_BRANCHES.ELEMENTAL,
    name: 'Caustic Molecular Catalysts',
    cost: 3,
    icon: 'DAMAGE_THERMAL',
    desc: 'Acid Sprayers stack corrosion 50% faster and reduce armor by +3 per stack.',
    effects: { acidRate: 0.50, acidArmorShred: 3 },
    prerequisites: ['tech_elemental_1']
  },
  {
    id: 'tech_elemental_3',
    branch: RESEARCH_BRANCHES.ELEMENTAL,
    name: 'Thermonuclear Plasma Cores',
    cost: 5,
    icon: 'DAMAGE_THERMAL',
    desc: 'Plasma Blaster explosion radius increased by +35% and leaves magma burn for 5s.',
    effects: { plasmaRadius: 0.35, plasmaBurnTime: 5.0 },
    prerequisites: ['tech_elemental_2']
  },
  {
    id: 'tech_elemental_4',
    branch: RESEARCH_BRANCHES.ELEMENTAL,
    name: 'Deep Thermal Shock',
    cost: 8,
    icon: 'DAMAGE',
    desc: 'Enemies suffering from both Cryo and Thermal damage take +50% amplified damage from all sources.',
    effects: { thermalShockAmplifier: 0.50 },
    prerequisites: ['tech_elemental_3']
  },

  // --- BRANCH 4: COMMAND & LOGISTICS ---
  {
    id: 'tech_command_1',
    branch: RESEARCH_BRANCHES.COMMAND,
    name: 'Emergency Reserve Funding',
    cost: 2,
    icon: 'CREDITS',
    desc: 'Start every campaign mission with +150 bonus credits.',
    effects: { startingCredits: 150 },
    prerequisites: []
  },
  {
    id: 'tech_command_2',
    branch: RESEARCH_BRANCHES.COMMAND,
    name: 'Aegis Structural Hardening',
    cost: 3,
    icon: 'LIVES',
    desc: 'Base maximum defense lives increased by +5.',
    effects: { bonusLives: 5 },
    prerequisites: ['tech_command_1']
  },
  {
    id: 'tech_command_3',
    branch: RESEARCH_BRANCHES.COMMAND,
    name: 'Orbital Strike Overcharge',
    cost: 5,
    icon: 'ABILITY_ORBITAL',
    desc: 'Commander abilities cool down 25% faster and Orbital Strike deals +50% damage.',
    effects: { abilityCooldownReduction: 0.25, orbitalDamageBonus: 0.50 },
    prerequisites: ['tech_command_2']
  },
  {
    id: 'tech_command_4',
    branch: RESEARCH_BRANCHES.COMMAND,
    name: 'Quantum Bounty Algorithms',
    cost: 8,
    icon: 'ENERGY',
    desc: 'Gain +20% bonus credits for every kill and earn 8% interest per wave (up to 250 credits).',
    effects: { killBountyMultiplier: 0.20, interestRateBonus: 0.03, maxInterestBonus: 100 },
    prerequisites: ['tech_command_3']
  }
];
