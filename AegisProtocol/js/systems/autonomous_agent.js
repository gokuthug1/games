/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Advanced Autonomous Commander AI Agent & Strategic Decision Policy Engine
 * 
 * Strict Zero-Emoji Compliance: Full contextual awareness, mathematical utility optimization,
 * multi-step lookahead, dynamic micro-targeting, research investing, and reasoning timeline.
 */

import { state, GAME_SCREENS, GAME_MODES } from '../core/state.js';
import { events, EVENTS } from '../core/events.js';
import { TOWERS_DATA } from '../data/towers_data.js';
import { abilities } from './abilities.js';
import { CONFIG, TILE_TYPES, MATH_MODELS, TARGET_PRIORITIES } from '../core/constants.js';
import { Tower } from '../entities/tower.js';
import { techTree } from './tech_tree.js';
import { audio } from '../core/audio.js';

export class AutonomousAgent {
  constructor() {
    this.isEnabled = false;
    this.decisionIntervalMs = 400; // Decision loop tick every 400ms
    this.lastDecisionTime = 0;
    this.lastActionLog = 'AUTONOMOUS AI ONLINE // AWAITING MISSION';
    this.decisionCount = 0;
    this.history = [];
    this.maxHistoryLength = 150;

    // Target wave goal: AI plays until this wave is completed then pauses
    this.targetWave = null;
    this._targetWaveCompleted = false;
    
    // Telemetry memory
    this.telemetry = {
      threatEHP: 0,
      defenseDPS: 0,
      coverageBottleneckIndex: 0,
      activeShieldRatio: 0,
      activeArmorRatio: 0,
      swarmRatio: 0,
      recommendedArchetype: 'gatling',
      emergencyBreachAlert: false,
      bestAction: null
    };

    this.initEventListeners();
  }

  /**
   * Set a target wave: the AI activates, plays until that wave is complete, then pauses.
   */
  setTargetWave(waveNum) {
    this.targetWave = waveNum;
    this._targetWaveCompleted = false;

    // Auto-enable AI if it isn't on yet
    if (!this.isEnabled) {
      this.toggle();
    } else {
      events.emit('agent:target_wave_set', { targetWave: waveNum });
    }

    this.recordThinkingStep({
      category: 'STATUS',
      title: `TARGET SET: WAVE ${waveNum}`,
      formula: `Goal = W${waveNum} | Mode = AUTONOMOUS | Auto-Pause On Complete`,
      rationale: `Autonomous simulation objective locked to Wave ${waveNum}. AI will manage all tactical decisions until that wave is cleared, then pause the simulation.`,
      gridPos: null
    });
  }

  clearTargetWave() {
    const prev = this.targetWave;
    this.targetWave = null;
    this._targetWaveCompleted = false;
    events.emit('agent:target_wave_cleared', {});
    if (prev !== null) {
      this.recordThinkingStep({
        category: 'STATUS',
        title: 'TARGET WAVE CLEARED',
        formula: 'Goal = NULL | Mode = CONTINUOUS',
        rationale: `Target Wave ${prev} objective cancelled. AI continues in unrestricted continuous mode.`,
        gridPos: null
      });
    }
  }

  initEventListeners() {
    events.on(EVENTS.SCREEN_CHANGED, ({ screenId }) => {
      if (screenId === GAME_SCREENS.GAMEPLAY && this.history.length === 0) {
        this.recordThinkingStep({
          category: 'STATUS',
          title: 'SYSTEM INITIALIZATION',
          formula: 'E_grid = 100% | C_bank = 500 CR | W_01',
          rationale: 'Battlefield sensor matrix online. Commencing mathematical threat assessment and tactical grid calibration.',
          gridPos: null
        });
      }
    });

    // Listen for wave completions to check target
    events.on(EVENTS.WAVE_COMPLETE, ({ wave }) => {
      if (this.isEnabled && this.targetWave !== null && wave >= this.targetWave && !this._targetWaveCompleted) {
        this._targetWaveCompleted = true;

        this.recordThinkingStep({
          category: 'STATUS',
          title: `TARGET REACHED: WAVE ${this.targetWave} COMPLETE`,
          formula: `Wave ${wave} >= Target ${this.targetWave} | Pausing simulation`,
          rationale: `Autonomous mission objective achieved. Wave ${this.targetWave} has been cleared. Pausing the simulation as instructed.`,
          gridPos: null
        });

        // Pause after short delay so the wave-complete animation plays
        setTimeout(() => {
          if (!state.isPaused) {
            state.togglePause();
          }
          events.emit('agent:target_wave_reached', { targetWave: this.targetWave });
          this.clearTargetWave();
        }, 900);
      }
    });

    events.on(EVENTS.GAME_OVER, () => {
      this.recordThinkingStep({
        category: 'STATUS',
        title: 'TACTICAL RETREAT',
        formula: 'Lives = 0 | Defeat Vector Encountered',
        rationale: 'Core breached by enemy vanguard. Archiving combat telemetry for future strategic iterations.',
        gridPos: null
      });
      this.clearTargetWave();
    });

    events.on(EVENTS.GAME_VICTORY, () => {
      this.recordThinkingStep({
        category: 'STATUS',
        title: 'MISSION VICTORY',
        formula: 'Waves Cleared = 100% | Core Integrity Preserved',
        rationale: 'Sector completely secured. Tactical grid defense density proved mathematically unassailable.',
        gridPos: null
      });
    });
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    this.recordThinkingStep({
      category: 'STATUS',
      title: this.isEnabled ? 'COMMANDER AI ENGAGED' : 'MANUAL OVERRIDE',
      formula: `Mode = ${this.isEnabled ? 'AUTONOMOUS' : 'MANUAL'} | Speed = ${state.gameSpeed}x`,
      rationale: this.isEnabled 
        ? 'Autonomous AI policy assumed full operational command. Executing automated ROI optimization, ability targeting, research investment, and wave pacing.' 
        : 'Commander returned tactical control to manual operator.',
      gridPos: null
    });

    events.emit(EVENTS.AUTONOMOUS_AI_TOGGLED, { isEnabled: this.isEnabled });
    events.emit(EVENTS.TOAST_NOTIFY, {
      title: this.isEnabled ? 'AI COMMANDER ACTIVATED' : 'MANUAL CONTROL ENGAGED',
      message: this.isEnabled ? 'Autonomous AI is now calculating optimal tactical moves.' : 'Autonomous mode disabled.',
      type: this.isEnabled ? 'success' : 'info'
    });
    audio.playUIClick();
    return this.isEnabled;
  }

  setEnabled(enabled) {
    if (this.isEnabled !== enabled) {
      this.toggle();
    }
  }

  update(nowTimestamp, mapInstance, waveManagerInstance) {
    if (!this.isEnabled || !state.isPlaying || state.isPaused) return;

    if (nowTimestamp - this.lastDecisionTime >= this.decisionIntervalMs) {
      this.lastDecisionTime = nowTimestamp;
      this.executeAutonomousCycle(mapInstance, waveManagerInstance);
    }
  }

  /**
   * Master Autonomous Decision & Action Cycle
   */
  executeAutonomousCycle(mapInstance, waveManagerInstance) {
    if (!mapInstance || !state.currentMapData) return;

    // 1. Gather Full Context Battlefield Telemetry
    this.analyzeBattlefield(mapInstance, waveManagerInstance);

    // 2. Micro-Manage Dynamic Targeting Priorities Across Active Towers
    this.optimizeTowerTargeting();

    // 3. Automated Tech Tree Research Investment
    this.evaluateResearchInvestment();

    // 4. Evaluate and Trigger High-Priority Tactical Commander Abilities
    if (this.evaluateCommanderAbilities()) {
      return;
    }

    // 5. Emergency Relocation / Breach Prevention
    if (this.evaluateEmergencyDefense(mapInstance)) {
      return;
    }

    // 6. Dynamic Wave Pacing & Speed Management
    this.evaluateWavePacing(waveManagerInstance);

    // 7. Mathematical Tower Construction, Upgrades & Synergy Beacons
    this.evaluateDefenseInvestments(mapInstance);
  }

  /**
   * Full Context State Analysis & Multi-Step Threat Vector Decomposition
   */
  analyzeBattlefield(mapInstance, waveManagerInstance) {
    const enemies = state.enemies;
    const towers = state.towers;

    // A. Aggregate Defense Power: Total DPS across active grid
    let totalDPS = 0;
    for (const t of towers) {
      totalDPS += t.baseDPS;
    }
    this.telemetry.defenseDPS = totalDPS;

    // B. Threat Matrix Decomposition
    let totalEHP = 0;
    let totalShields = 0;
    let totalArmor = 0;
    let swarmCount = 0;
    let flyingCount = 0;
    let bossActive = false;
    let minTimeToBreach = 999;

    for (const e of enemies) {
      if (e.active) {
        totalEHP += e.effectiveHitPoints;
        totalShields += e.shield;
        totalArmor += e.currentArmor;
        if (e.isSwarm) swarmCount++;
        if (e.isFlying) flyingCount++;
        if (e.isBoss) bossActive = true;

        const pathLen = mapInstance.paths?.[0]?.length ? mapInstance.paths[0].length * CONFIG.TILE_SIZE : 1000;
        const remainingDist = Math.max(1, pathLen - e.distanceTravelled);
        const ttb = remainingDist / (e.currentSpeed || 100);
        if (ttb < minTimeToBreach) {
          minTimeToBreach = ttb;
        }
      }
    }

    this.telemetry.threatEHP = totalEHP;
    this.telemetry.activeShieldRatio = totalEHP > 0 ? (totalShields / totalEHP) : 0;
    this.telemetry.activeArmorRatio = totalEHP > 0 ? ((totalArmor * 10) / totalEHP) : 0;
    this.telemetry.swarmRatio = enemies.length > 0 ? (swarmCount / enemies.length) : 0;
    this.telemetry.emergencyBreachAlert = minTimeToBreach < 3.5;

    // C. Multi-Step Lookahead: Inspect Next Wave's composition if wave is inactive
    let nextWaveEnemy = null;
    if (waveManagerInstance && !waveManagerInstance.waveActive) {
      const nextConfig = waveManagerInstance.getCurrentWaveConfig();
      if (nextConfig) {
        nextWaveEnemy = nextConfig.enemy;
      }
    }

    // D. Elemental Demand Vector Calculus:
    if (bossActive || totalEHP > 4500 || (nextWaveEnemy && nextWaveEnemy.includes('boss'))) {
      this.telemetry.recommendedArchetype = 'railgun';
    } else if (this.telemetry.activeShieldRatio > 0.30 || nextWaveEnemy === 'shield_drone') {
      this.telemetry.recommendedArchetype = 'laser';
    } else if (this.telemetry.activeArmorRatio > 0.28 || nextWaveEnemy === 'mech') {
      this.telemetry.recommendedArchetype = 'plasma';
    } else if (flyingCount > 2 || nextWaveEnemy === 'flyer') {
      this.telemetry.recommendedArchetype = 'missile';
    } else if (this.telemetry.swarmRatio > 0.35 || nextWaveEnemy === 'swarmer' || nextWaveEnemy === 'speeder') {
      this.telemetry.recommendedArchetype = (towers.some(t => t.typeId === 'cryo')) ? 'mortar' : 'cryo';
    } else if (!towers.some(t => t.typeId === 'support') && towers.length >= 3) {
      this.telemetry.recommendedArchetype = 'support';
    } else {
      this.telemetry.recommendedArchetype = 'gatling';
    }
  }

  /**
   * Dynamic Micro-Targeting Optimization: Assigns optimal priorities to individual towers
   */
  optimizeTowerTargeting() {
    const enemies = state.enemies;
    if (enemies.length === 0) return;

    const hasBoss = enemies.some(e => e.active && e.isBoss);
    const hasShields = this.telemetry.activeShieldRatio > 0.25;

    for (const t of state.towers) {
      if (t.typeId === 'railgun' || t.typeId === 'laser') {
        const targetPriority = hasBoss ? TARGET_PRIORITIES.BOSS : (hasShields ? TARGET_PRIORITIES.STRONGEST : TARGET_PRIORITIES.OPTIMAL);
        if (t.targetPriority !== targetPriority) {
          t.setTargetPriority(targetPriority);
        }
      } else if (t.typeId === 'gatling' || t.typeId === 'tesla') {
        const targetPriority = this.telemetry.swarmRatio > 0.3 ? TARGET_PRIORITIES.FASTEST : TARGET_PRIORITIES.OPTIMAL;
        if (t.targetPriority !== targetPriority) {
          t.setTargetPriority(targetPriority);
        }
      } else if (t.typeId === 'missile') {
        const targetPriority = enemies.some(e => e.active && e.isFlying) ? TARGET_PRIORITIES.FLYING : TARGET_PRIORITIES.FIRST;
        if (t.targetPriority !== targetPriority) {
          t.setTargetPriority(targetPriority);
        }
      }
    }
  }

  /**
   * Automated Tech Tree Research Valuation & Investment
   */
  evaluateResearchInvestment() {
    const researchPoints = techTree.getResearchPoints();
    if (researchPoints <= 0 || !techTree.techs) return;

    let bestTech = null;
    let maxTechWeight = -1;

    for (const tech of techTree.techs) {
      if (techTree.canUnlock(tech.id)) {
        let weight = 1.0;
        if (tech.branch?.includes('Ballistics') && state.towers.some(t => t.damageType === 'KINETIC')) weight += 2.0;
        if (tech.branch?.includes('Laser') && state.towers.some(t => t.damageType === 'ENERGY' || t.damageType === 'SHOCK')) weight += 2.0;
        if (tech.branch?.includes('Cryo') && state.towers.some(t => ['CRYO', 'THERMAL', 'CORROSIVE'].includes(t.damageType))) weight += 2.0;
        if (tech.branch?.includes('Command')) weight += 1.5;

        if (weight > maxTechWeight) {
          maxTechWeight = weight;
          bestTech = tech;
        }
      }
    }

    if (bestTech && techTree.unlock(bestTech.id)) {
      this.recordThinkingStep({
        category: 'APEX_PROMOTION',
        title: `RESEARCH UNLOCKED: ${bestTech.name}`,
        formula: `Cost: ${bestTech.cost} Points | Branch: ${bestTech.branch}`,
        rationale: `Invested earned combat research points into [${bestTech.name}] (${bestTech.desc}) to permanently enhance portfolio efficiency.`,
        gridPos: null
      });
    }
  }

  /**
   * Emergency Tactical Relocation & Defense Allocation
   */
  evaluateEmergencyDefense(mapInstance) {
    if (!this.telemetry.emergencyBreachAlert || state.enemies.length === 0) return false;

    // If core is under immediate breach threat and bank is low, check if selling distant tower saves the core
    const criticalEnemy = state.enemies.find(e => e.active && e.distanceTravelled > 800);
    if (criticalEnemy && state.credits < 150 && state.towers.length >= 3) {
      // Find a distant, inactive tower near the spawn
      const uselessTower = state.towers.find(t => {
        const distToCritical = Math.hypot(t.x - criticalEnemy.x, t.y - criticalEnemy.y);
        return distToCritical > t.currentRange * 1.5 && t.tier <= 2;
      });

      if (uselessTower) {
        const refund = uselessTower.getSellRefund();
        const tileC = uselessTower.gridX;
        const tileR = uselessTower.gridY;
        
        mapInstance.removeTower(tileC, tileR);
        state.towers = state.towers.filter(t => t !== uselessTower);
        uselessTower.sell();

        this.recordThinkingStep({
          category: 'TACTICAL_VALUATION',
          title: `EMERGENCY RECYCLE: ${uselessTower.name}`,
          formula: `Refund: +${refund} CR | Breach Alert at (${Math.round(criticalEnemy.x)}, ${Math.round(criticalEnemy.y)})`,
          rationale: `Recycled distant, inactive battery at [${tileC}, ${tileR}] to liquidate ${refund} credits for immediate terminal perimeter defense.`,
          gridPos: { col: tileC, row: tileR, x: uselessTower.x, y: uselessTower.y }
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Mathematical Commander Ability Valuation & Invocation
   */
  evaluateCommanderAbilities() {
    const enemies = state.enemies;
    if (enemies.length === 0) return false;

    // 1. Supply Drop: Liquidity injection if energy is abundant
    if (abilities.canCast('supply_drop') && state.energy >= 60 && state.credits < 300) {
      abilities.triggerAbility('supply_drop', 0, 0);
      this.recordThinkingStep({
        category: 'COMMANDER_POWER',
        title: 'DEPLOY SUPPLY DROP',
        formula: 'Energy >= 60 | Bank < 300 CR -> +250 CR Liquidity',
        rationale: 'Energy reserves are surplus while tactical bank reserves are deficient for upcoming tier upgrades. Injected orbital credit supply.',
        gridPos: null
      });
      return true;
    }

    // 2. Orbital Beam Strike: Maximum Cluster EHP Density
    if (abilities.canCast('orbital_strike')) {
      const radius = abilities.abilities.orbital_strike.radius || 100;
      let bestClusterPos = null;
      let maxClusterEHP = -1;

      for (const candidate of enemies) {
        if (!candidate.active) continue;
        let clusterEHP = 0;
        for (const other of enemies) {
          if (other.active && Math.hypot(other.x - candidate.x, other.y - candidate.y) <= radius) {
            clusterEHP += other.effectiveHitPoints;
          }
        }
        if (clusterEHP > maxClusterEHP) {
          maxClusterEHP = clusterEHP;
          bestClusterPos = { x: candidate.x, y: candidate.y };
        }
      }

      if (bestClusterPos && maxClusterEHP >= 800) {
        abilities.triggerAbility('orbital_strike', bestClusterPos.x, bestClusterPos.y);
        this.recordThinkingStep({
          category: 'COMMANDER_POWER',
          title: 'ORBITAL BEAM STRIKE',
          formula: `Target EHP = ${Math.round(maxClusterEHP)} >= 800 | Centroid (${Math.round(bestClusterPos.x)}, ${Math.round(bestClusterPos.y)})`,
          rationale: `Calculated high-density enemy mass containing ${Math.round(maxClusterEHP)} cumulative EHP. Fired precision satellite particle beam to vaporize cluster.`,
          gridPos: { x: bestClusterPos.x, y: bestClusterPos.y }
        });
        return true;
      }
    }

    // 3. Cryo Flash Freeze: Critical Core Breach Prevention
    if (abilities.canCast('cryo_nova')) {
      const criticalEnemy = enemies.find(e => e.active && e.distanceTravelled > 700 && e.hp > 120);
      if (criticalEnemy) {
        abilities.triggerAbility('cryo_nova', criticalEnemy.x, criticalEnemy.y);
        this.recordThinkingStep({
          category: 'COMMANDER_POWER',
          title: 'CRYO FLASH FREEZE',
          formula: `Threat Distance = ${Math.round(criticalEnemy.distanceTravelled)}px > 700px | Core Perimeter Alert`,
          rationale: `Hostile vanguard approached within terminal striking distance of the Aegis Core. Deployed cryogenic nova to freeze sector for 4.0s.`,
          gridPos: { x: criticalEnemy.x, y: criticalEnemy.y }
        });
        return true;
      }
    }

    // 4. EMP Blackout Pulse: High Shield Saturation Shutdown
    if (abilities.canCast('emp_overcharge')) {
      let totalActiveShields = 0;
      for (const e of enemies) {
        if (e.active) totalActiveShields += e.shield;
      }
      if (totalActiveShields >= 600) {
        abilities.triggerAbility('emp_overcharge', 0, 0);
        this.recordThinkingStep({
          category: 'COMMANDER_POWER',
          title: 'EMP BLACKOUT PULSE',
          formula: `Active Shields = ${Math.round(totalActiveShields)} >= 600 | EMP Wave Triggered`,
          rationale: `Plasma deflector shield saturation reached critical mass. Discharged global electromagnetic shockwave to strip all shields and stun mechs.`,
          gridPos: null
        });
        return true;
      }
    }

    // 5. Nanite Overclock: Maximizing Concentrated DPS Output
    if (abilities.canCast('nanite_repair') && state.towers.length >= 3) {
      let bestTowerClusterPos = null;
      let maxClusterDPS = -1;
      const radius = abilities.abilities.nanite_repair.radius || 140;

      for (const t of state.towers) {
        let clusterDPS = 0;
        for (const other of state.towers) {
          if (Math.hypot(other.x - t.x, other.y - t.y) <= radius) {
            clusterDPS += other.baseDPS;
          }
        }
        if (clusterDPS > maxClusterDPS) {
          maxClusterDPS = clusterDPS;
          bestTowerClusterPos = { x: t.x, y: t.y };
        }
      }

      if (bestTowerClusterPos && maxClusterDPS >= 250 && this.telemetry.threatEHP > 1000) {
        abilities.triggerAbility('nanite_repair', bestTowerClusterPos.x, bestTowerClusterPos.y);
        this.recordThinkingStep({
          category: 'COMMANDER_POWER',
          title: 'NANITE OVERCLOCK',
          formula: `Cluster DPS = ${Math.round(maxClusterDPS)}/s | Threat EHP = ${Math.round(this.telemetry.threatEHP)}`,
          rationale: `Heavy hostiles engaged central battery perimeter. Overclocked high-density tower hub to double fire rate and damage output.`,
          gridPos: { x: bestTowerClusterPos.x, y: bestTowerClusterPos.y }
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Autonomous Wave Management & Speed Acceleration
   */
  evaluateWavePacing(waveManagerInstance) {
    if (!waveManagerInstance) return;

    if (!waveManagerInstance.waveActive && !waveManagerInstance.isSpawning) {
      const nextWaveNum = state.currentWave + 1;
      const estimatedRequiredDPS = Math.pow(nextWaveNum, 1.15) * 16.0;

      if (this.telemetry.defenseDPS >= estimatedRequiredDPS || state.towers.length >= 1) {
        waveManagerInstance.startNextWave();
        this.recordThinkingStep({
          category: 'WAVE_PACING',
          title: `INITIATE WAVE ${nextWaveNum}`,
          formula: `Defense DPS = ${Math.round(this.telemetry.defenseDPS)} >= Req (${Math.round(estimatedRequiredDPS)})`,
          rationale: `Current perimeter defense output exceeds wave ${nextWaveNum} threat projection. Autonomously accelerated wave launch to compound interest.`,
          gridPos: null
        });
      }
    }

    // Adaptive Combat Speed Control
    if (this.telemetry.threatEHP > 8000 || state.enemies.some(e => e.active && e.isBoss)) {
      if (state.gameSpeed > 2) {
        state.setSpeedIndex(1); // Drop to 2x during Titan boss encounters for precision
      }
    } else if (state.enemies.length === 0 && state.gameSpeed < 4) {
      state.setSpeedIndex(2); // Speed up to 4x between waves
    }
  }

  /**
   * Mathematical Investment Valuation: Compares New Construction vs Upgrades vs Branch Promotions vs Beacon Synergies
   */
  evaluateDefenseInvestments(mapInstance) {
    const credits = state.credits;
    if (credits < 100) return;

    // 1. Evaluate Branch Promotions on Max Tier 3 Towers
    const branchCandidate = state.towers.find(t => t.tier === 3 && !t.chosenBranch);
    if (branchCandidate) {
      const proto = branchCandidate.proto;
      const branchKey = (this.telemetry.threatEHP > 4000 || this.telemetry.swarmRatio < 0.3) ? 'A' : 'B';
      const branchData = proto.branches?.[branchKey];
      if (branchData && credits >= branchData.cost) {
        branchCandidate.promoteBranch(branchKey);
        this.recordThinkingStep({
          category: 'APEX_PROMOTION',
          title: `PROMOTE ${branchCandidate.name} [${branchKey}]`,
          formula: `Cost: ${branchData.cost} CR | Branch: ${branchData.name}`,
          rationale: `Upgraded ${branchCandidate.name} at [${branchCandidate.gridX}, ${branchCandidate.gridY}] to Apex Specialization (${branchData.name}) to counter specialized threats.`,
          gridPos: { col: branchCandidate.gridX, row: branchCandidate.gridY, x: branchCandidate.x, y: branchCandidate.y }
        });
        return;
      }
    }

    // 2. Evaluate Upgrades on Existing Placed Towers
    let bestUpgradeTower = null;
    let maxUpgradeROI = -1;

    for (const t of state.towers) {
      if (t.tier < 3) {
        const nextTier = t.proto.tiers[t.tier];
        if (nextTier && credits >= nextTier.cost) {
          const deltaDamage = (nextTier.statModifiers?.damage || t.stats.damage * 1.5) - t.stats.damage;
          const deltaRate = (nextTier.statModifiers?.fireRate || t.stats.fireRate) - t.stats.fireRate;
          const deltaDPS = (deltaDamage * t.stats.fireRate) + (t.stats.damage * deltaRate);
          
          const tile = mapInstance.getTile(t.gridX, t.gridY);
          const tileBonus = tile?.type === TILE_TYPES.HIGH_GROUND ? 1.3 : (tile?.type === TILE_TYPES.AMPLIFIER ? 1.25 : 1.0);
          const roi = (deltaDPS / nextTier.cost) * tileBonus;

          if (roi > maxUpgradeROI) {
            maxUpgradeROI = roi;
            bestUpgradeTower = t;
          }
        }
      }
    }

    // 3. Support Beacon Synergy Optimization:
    let bestBeaconTile = null;
    let maxBeaconSynergy = -1;

    if (this.telemetry.recommendedArchetype === 'support' && credits >= TOWERS_DATA.support.cost) {
      const beaconRange = TOWERS_DATA.support.baseStats.range;
      for (let r = 0; r < mapInstance.rows; r++) {
        for (let c = 0; c < mapInstance.cols; c++) {
          if (mapInstance.canPlaceTower(c, r)) {
            const worldX = (c + 0.5) * CONFIG.TILE_SIZE;
            const worldY = (r + 0.5) * CONFIG.TILE_SIZE;
            
            let coveredDPS = 0;
            for (const t of state.towers) {
              if (t.typeId !== 'support' && Math.hypot(t.x - worldX, t.y - worldY) <= beaconRange) {
                coveredDPS += t.baseDPS;
              }
            }
            if (coveredDPS > maxBeaconSynergy && coveredDPS >= 120) {
              maxBeaconSynergy = coveredDPS;
              bestBeaconTile = { col: c, row: r };
            }
          }
        }
      }
    }

    if (bestBeaconTile && maxBeaconSynergy >= 150 && credits >= TOWERS_DATA.support.cost) {
      if (state.spendCredits(TOWERS_DATA.support.cost)) {
        const tower = new Tower('support', bestBeaconTile.col, bestBeaconTile.row);
        techTree.applyPerksToTower(tower);
        mapInstance.placeTower(bestBeaconTile.col, bestBeaconTile.row, tower);
        state.towers.push(tower);
        
        audio.playPlacement();
        events.emit(EVENTS.TOWER_PLACED, { tower });
        
        this.recordThinkingStep({
          category: 'CONSTRUCTION',
          title: 'CONSTRUCT COMMAND BEACON',
          formula: `Synergy = +20% on ${Math.round(maxBeaconSynergy)} DPS | Grid [${bestBeaconTile.col}, ${bestBeaconTile.row}]`,
          rationale: `Constructed Aegis Command Beacon at hub coordinate [${bestBeaconTile.col}, ${bestBeaconTile.row}] to amplify adjacent defense battery cluster.`,
          gridPos: { col: bestBeaconTile.col, row: bestBeaconTile.row, x: tower.x, y: tower.y }
        });
        return;
      }
    }

    // 4. Standard Defense Battery Construction Optimization
    const targetType = this.telemetry.recommendedArchetype;
    const proto = TOWERS_DATA[targetType] || TOWERS_DATA.gatling;

    let bestBuildTile = null;
    let maxBuildUtility = -1;

    if (credits >= proto.cost) {
      const range = proto.baseStats.range;
      const cols = mapInstance.cols;
      const rows = mapInstance.rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (mapInstance.canPlaceTower(c, r)) {
            const worldX = (c + 0.5) * CONFIG.TILE_SIZE;
            const worldY = (r + 0.5) * CONFIG.TILE_SIZE;

            let pathExposure = 0;
            for (const path of mapInstance.paths) {
              for (const pt of path) {
                if (Math.hypot(pt.x - worldX, pt.y - worldY) <= range) {
                  pathExposure++;
                }
              }
            }

            if (pathExposure > 0) {
              const tile = mapInstance.getTile(c, r);
              let tileMultiplier = 1.0;
              if (tile.type === TILE_TYPES.HIGH_GROUND) tileMultiplier = 1.40;
              else if (tile.type === TILE_TYPES.POWER_GRID) tileMultiplier = 1.25;
              else if (tile.type === TILE_TYPES.AMPLIFIER) tileMultiplier = 1.35;

              let overlapCount = 0;
              for (const existing of state.towers) {
                if (Math.hypot(existing.x - worldX, existing.y - worldY) < range * 0.6) {
                  overlapCount++;
                }
              }

              const utility = (pathExposure * tileMultiplier) - (overlapCount * 1.5);
              if (utility > maxBuildUtility) {
                maxBuildUtility = utility;
                bestBuildTile = { col: c, row: r };
              }
            }
          }
        }
      }
    }

    // Compare Marginal ROI of Upgrade vs Building New Battery
    if (bestUpgradeTower && (maxUpgradeROI * 100 > maxBuildUtility || !bestBuildTile)) {
      bestUpgradeTower.upgradeTier();
      this.recordThinkingStep({
        category: 'ROI_UPGRADE',
        title: `UPGRADE ${bestUpgradeTower.name} -> TIER ${bestUpgradeTower.tier}`,
        formula: `Marginal ROI = ${maxUpgradeROI.toFixed(3)} DPS/CR | Base DPS -> ${Math.round(bestUpgradeTower.baseDPS)}/s`,
        rationale: `Evaluated marginal rate of return. Upgrading ${bestUpgradeTower.name} at [${bestUpgradeTower.gridX}, ${bestUpgradeTower.gridY}] yielded superior DPS efficiency compared to new ground placement.`,
        gridPos: { col: bestUpgradeTower.gridX, row: bestUpgradeTower.gridY, x: bestUpgradeTower.x, y: bestUpgradeTower.y }
      });
    } else if (bestBuildTile && credits >= proto.cost) {
      if (state.spendCredits(proto.cost)) {
        const tower = new Tower(targetType, bestBuildTile.col, bestBuildTile.row);
        techTree.applyPerksToTower(tower);
        mapInstance.placeTower(bestBuildTile.col, bestBuildTile.row, tower);
        state.towers.push(tower);
        
        audio.playPlacement();
        events.emit(EVENTS.TOWER_PLACED, { tower });
        
        this.recordThinkingStep({
          category: 'CONSTRUCTION',
          title: `CONSTRUCT ${tower.name}`,
          formula: `Utility = ${maxBuildUtility.toFixed(1)} | Archetype Demand: ${targetType.toUpperCase()} | Cost: ${proto.cost} CR`,
          rationale: `Constructed ${tower.name} at optimal sector grid [${bestBuildTile.col}, ${bestBuildTile.row}] to counter active wave vulnerability matrix.`,
          gridPos: { col: bestBuildTile.col, row: bestBuildTile.row, x: tower.x, y: tower.y }
        });
      }
    }
  }

  recordThinkingStep({ category, title, formula, rationale, gridPos }) {
    this.decisionCount++;
    const step = {
      id: this.decisionCount,
      timestamp: this.formatGameTimestamp(),
      wave: state.currentWave,
      category: category || 'TACTICAL_VALUATION',
      title: title || 'TACTICAL VALUATION',
      formula: formula || '',
      rationale: rationale || '',
      gridPos: gridPos || null,
      telemetry: { ...this.telemetry }
    };

    this.history.unshift(step);
    if (this.history.length > this.maxHistoryLength) {
      this.history.pop();
    }

    this.lastActionLog = `${step.title} // ${step.formula}`;
    events.emit(EVENTS.AUTONOMOUS_AI_DECISION, { step, log: this.lastActionLog, history: this.history });
  }

  formatGameTimestamp() {
    const elapsedSec = (performance.now() / 1000) % 3600;
    const mins = Math.floor(elapsedSec / 60);
    const secs = (elapsedSec % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
  }

  clearHistory() {
    this.history = [];
    events.emit('ai:history_cleared');
  }
}

export const autonomousAgent = new AutonomousAgent();
