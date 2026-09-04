/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Mathematically Modelled Tower Entity, Predictive Ballistics & PID Tracking
 */

import { TOWERS_DATA } from '../data/towers_data.js';
import { TARGET_PRIORITIES, CONFIG, MATH_MODELS, COLORS, DAMAGE_MULTIPLIERS } from '../core/constants.js';
import { Projectile } from './projectile.js';
import { particles } from '../rendering/particles.js';
import { audio } from '../core/audio.js';
import { state } from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

let towerIdCounter = 1;

export class Tower {
  constructor(typeId, gridX, gridY, options = {}) {
    this.id = towerIdCounter++;
    this.typeId = typeId;
    this.proto = TOWERS_DATA[typeId] || TOWERS_DATA.gatling;
    
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = (gridX + 0.5) * CONFIG.TILE_SIZE;
    this.y = (gridY + 0.5) * CONFIG.TILE_SIZE;
    
    this.tier = 1;
    this.chosenBranch = null; // 'A' or 'B'
    this.totalInvestedCost = this.proto.cost;
    
    this.name = this.proto.name;
    this.damageType = this.proto.damageType;
    this.color = this.proto.color;
    this.glowColor = this.proto.glowColor;
    
    // Stats
    this.stats = { ...this.proto.baseStats };
    this.recalculateStats();
    
    // Combat state
    this.targetPriority = TARGET_PRIORITIES.OPTIMAL;
    this.currentTarget = null;
    this.predictedAimPos = { x: this.x, y: this.y };
    this.angle = 0; // facing direction (radians)
    this.angularVelocity = 0; // rad/s for PID controller
    this.fireCooldown = 0; // seconds remaining until next shot
    this.recoilOffset = 0;
    this.muzzleFlashTimer = 0;
    
    // Stats metrics
    this.totalDamageDealt = 0;
    this.totalKills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    
    // External aura buffs from Beacons / High Ground / Research
    this.buffModifiers = {
      damageMult: 1.0,
      rangeMult: 1.0,
      fireRateMult: 1.0,
      critChance: 0
    };
  }

  get currentRange() {
    return this.stats.range * (this.buffModifiers.rangeMult || 1.0);
  }

  get currentDamage() {
    return this.stats.damage * (this.buffModifiers.damageMult || 1.0);
  }

  get currentFireRate() {
    return this.stats.fireRate * (this.buffModifiers.fireRateMult || 1.0);
  }

  get baseDPS() {
    return this.currentDamage * this.currentFireRate;
  }

  get coverageArea() {
    return Math.PI * Math.pow(this.currentRange, 2);
  }

  recalculateStats() {
    this.stats = { ...this.proto.baseStats };

    // Apply Tier Upgrades
    for (let t = 2; t <= this.tier; t++) {
      const tierData = this.proto.tiers[t - 1];
      if (tierData && tierData.statModifiers) {
        Object.assign(this.stats, tierData.statModifiers);
      }
    }

    // Apply Branch Promotion
    if (this.chosenBranch && this.proto.branches[this.chosenBranch]) {
      const branchData = this.proto.branches[this.chosenBranch];
      if (branchData.statModifiers) {
        Object.assign(this.stats, branchData.statModifiers);
      }
    }
  }

  upgradeTier() {
    if (this.tier >= 3) return false;
    const nextTier = this.proto.tiers[this.tier];
    if (!nextTier) return false;

    if (state.spendCredits(nextTier.cost)) {
      this.tier++;
      this.totalInvestedCost += nextTier.cost;
      this.recalculateStats();
      audio.playUpgrade();
      particles.spawnExplosion(this.x, this.y, 40, this.color, this.glowColor);
      particles.spawnText(`TIER ${this.tier}`, this.x, this.y - 20, this.color, true);
      events.emit(EVENTS.TOWER_UPGRADED, { tower: this });
      return true;
    }
    return false;
  }

  promoteBranch(branchKey) {
    if (this.tier < 3 || this.chosenBranch) return false;
    const branch = this.proto.branches[branchKey];
    if (!branch) return false;

    if (state.spendCredits(branch.cost)) {
      this.chosenBranch = branchKey;
      this.totalInvestedCost += branch.cost;
      this.name = branch.name;
      this.recalculateStats();
      audio.playUpgrade();
      particles.spawnExplosion(this.x, this.y, 60, this.color, this.glowColor);
      particles.spawnText('SPECIALIZED!', this.x, this.y - 25, '#ffb703', true);
      events.emit(EVENTS.TOWER_UPGRADED, { tower: this });
      return true;
    }
    return false;
  }

  getSellRefund() {
    return Math.floor(this.totalInvestedCost * 0.70);
  }

  sell() {
    const refund = this.getSellRefund();
    state.addCredits(refund);
    audio.playUIClick();
    particles.spawnExplosion(this.x, this.y, 30, '#ef4444', 'rgba(239, 68, 68, 0.4)');
    particles.spawnText(`+${refund}`, this.x, this.y, '#00ff88', true);
    events.emit(EVENTS.TOWER_SOLD, { tower: this, refund });
  }

  setTargetPriority(priority) {
    this.targetPriority = priority;
    events.emit(EVENTS.TOWER_TARGET_CHANGED, { tower: this, priority });
  }

  /**
   * Analytical Predictive Ballistics Lead Interception Solver:
   * Solves quadratic equation: |(p0 - t0) + v_e * t|^2 = (s_p * t)^2
   */
  solvePredictiveIntercept(enemy, projectileSpeed) {
    if (!enemy || !enemy.active) return null;

    // If instantaneous beam weapon or stationary enemy
    if (projectileSpeed >= 9000 || (Math.abs(enemy.vx) < 0.1 && Math.abs(enemy.vy) < 0.1)) {
      return { x: enemy.x, y: enemy.y, time: 0 };
    }

    const rx = enemy.x - this.x;
    const ry = enemy.y - this.y;
    const vx = enemy.vx || 0;
    const vy = enemy.vy || 0;

    // A t^2 + B t + C = 0
    const A = (vx * vx + vy * vy) - (projectileSpeed * projectileSpeed);
    const B = 2.0 * (rx * vx + ry * vy);
    const C = rx * rx + ry * ry;

    // Linear case if |v_e| == s_p
    if (Math.abs(A) < MATH_MODELS.LEAD_TOLERANCE_EPSILON) {
      if (Math.abs(B) > MATH_MODELS.LEAD_TOLERANCE_EPSILON) {
        const t = -C / B;
        if (t > 0) return { x: enemy.x + vx * t, y: enemy.y + vy * t, time: t };
      }
      return { x: enemy.x, y: enemy.y, time: 0 };
    }

    const discriminant = B * B - 4.0 * A * C;
    if (discriminant < 0) {
      // No real intercept solution exists (target outrunning projectile trajectory)
      return { x: enemy.x, y: enemy.y, time: 0 };
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-B - sqrtDisc) / (2.0 * A);
    const t2 = (-B + sqrtDisc) / (2.0 * A);

    let t = -1;
    if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
    else if (t1 > 0) t = t1;
    else if (t2 > 0) t = t2;

    if (t > 0) {
      const leadX = enemy.x + vx * t;
      const leadY = enemy.y + vy * t;
      return { x: leadX, y: leadY, time: t };
    }

    return { x: enemy.x, y: enemy.y, time: 0 };
  }

  /**
   * Gaussian Kernel Density Cluster Optimizer for AoE Mortars
   * Finds spatial coordinate p* maximizing: sum_i Weight(e_i) * exp(-|p - x_i|^2 / (2 * sigma^2))
   */
  findOptimalAoECluster(enemies) {
    const sigma = MATH_MODELS.GAUSSIAN_CLUSTER_SIGMA;
    const twoSigmaSq = 2.0 * sigma * sigma;
    let bestPos = null;
    let maxDensity = -1;

    for (const candidate of enemies) {
      if (!candidate.active || !candidate.isTargetable) continue;
      const dToTower = Math.hypot(candidate.x - this.x, candidate.y - this.y);
      const minRange = this.stats.minRange || 0;
      if (dToTower > this.currentRange || dToTower < minRange) continue;

      let currentDensity = 0;
      for (const other of enemies) {
        if (other.active) {
          const dSq = Math.pow(candidate.x - other.x, 2) + Math.pow(candidate.y - other.y, 2);
          const weight = other.isBoss ? 3.0 : 1.0;
          currentDensity += weight * Math.exp(-dSq / twoSigmaSq);
        }
      }

      if (currentDensity > maxDensity) {
        maxDensity = currentDensity;
        bestPos = { x: candidate.x, y: candidate.y };
      }
    }

    return bestPos;
  }

  /**
   * Collinear Ray Sweep Optimizer for Railgun Piercing
   * Finds the angle theta maximizing sum of intersected targets along line ray
   */
  findOptimalRailgunAngle(enemies) {
    let bestTarget = null;
    let maxIntersectionWeight = -1;

    for (const candidate of enemies) {
      if (!candidate.active || !candidate.isTargetable) continue;
      const dToTower = Math.hypot(candidate.x - this.x, candidate.y - this.y);
      if (dToTower > this.currentRange) continue;

      const rayAngle = Math.atan2(candidate.y - this.y, candidate.x - this.x);
      const cosA = Math.cos(rayAngle);
      const sinA = Math.sin(rayAngle);

      let totalWeight = 0;
      for (const other of enemies) {
        if (other.active) {
          const dx = other.x - this.x;
          const dy = other.y - this.y;
          // Perpendicular distance from other to ray: |dx * sinA - dy * cosA|
          const perpDist = Math.abs(dx * sinA - dy * cosA);
          if (perpDist <= other.size + 8 && (dx * cosA + dy * sinA) > 0) {
            totalWeight += other.effectiveHitPoints;
          }
        }
      }

      if (totalWeight > maxIntersectionWeight) {
        maxIntersectionWeight = totalWeight;
        bestTarget = candidate;
      }
    }

    return bestTarget;
  }

  update(dtSec, enemies, projectiles) {
    // Beacon towers do not shoot directly; they pulse buff auras
    if (this.typeId === 'support') {
      this.updateSupportBeacon(dtSec, enemies);
      return;
    }

    // Cooldown decrement
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dtSec;
    }

    // Recoil recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dtSec * 22);
    }
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dtSec;
    }

    // Target Selection with Mathematical Heuristics
    this.acquireTarget(enemies);

    // Turret Rotation with Proportional-Derivative (PID) Angular Tracking
    if (this.currentTarget && this.currentTarget.active) {
      const projSpeed = this.stats.projectileSpeed || 600;
      const intercept = this.solvePredictiveIntercept(this.currentTarget, projSpeed);
      
      this.predictedAimPos = intercept ? { x: intercept.x, y: intercept.y } : { x: this.currentTarget.x, y: this.currentTarget.y };

      const targetAngle = Math.atan2(this.predictedAimPos.y - this.y, this.predictedAimPos.x - this.x);
      
      // Calculate minimal angular difference delta_theta in [-pi, pi]
      let angleDiff = targetAngle - this.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2.0;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2.0;

      // PID Angular Velocity Integration: a = Kp * error - Kd * velocity
      const angularAcc = MATH_MODELS.PID_KP * angleDiff - MATH_MODELS.PID_KD * this.angularVelocity;
      this.angularVelocity += angularAcc * dtSec;
      this.angle += this.angularVelocity * dtSec;

      // Check if aim is aligned within precision tolerance to fire
      if (this.fireCooldown <= 0 && Math.abs(angleDiff) < 0.28) {
        this.fire(projectiles, enemies);
      }
    } else {
      this.angularVelocity *= 0.90; // Damped idle rotation
    }
  }

  acquireTarget(enemies) {
    // Validate current target
    if (this.currentTarget) {
      if (!this.currentTarget.active || !this.currentTarget.isTargetable) {
        this.currentTarget = null;
      } else {
        const dist = Math.hypot(this.currentTarget.x - this.x, this.currentTarget.y - this.y);
        const minDist = this.stats.minRange || 0;
        if (dist > this.currentRange || dist < minDist) {
          this.currentTarget = null;
        }
      }
    }

    // Specialized Mathematical Solvers
    if (this.typeId === 'railgun' && this.targetPriority === TARGET_PRIORITIES.OPTIMAL) {
      this.currentTarget = this.findOptimalRailgunAngle(enemies);
      return;
    }

    // Filter candidate pool
    const candidates = [];
    const maxRange = this.currentRange;
    const minRange = this.stats.minRange || 0;

    for (const e of enemies) {
      if (e.active && e.isTargetable) {
        const dist = Math.hypot(e.x - this.x, e.y - this.y);
        if (dist <= maxRange && dist >= minRange) {
          candidates.push(e);
        }
      }
    }

    if (candidates.length === 0) {
      this.currentTarget = null;
      return;
    }

    // Multi-Variable Mathematical Utility Evaluation
    switch (this.targetPriority) {
      case TARGET_PRIORITIES.OPTIMAL: {
        const dmgType = this.damageType;
        candidates.sort((a, b) => {
          // Utility U(e) calculation:
          // 1. Progress ratio to core (distanceTravelled)
          const pA = a.distanceTravelled;
          const pB = b.distanceTravelled;

          // 2. Multiplier efficiency vs enemy armor type
          const multA = (DAMAGE_MULTIPLIERS[dmgType]?.[a.armorType] || 1.0);
          const multB = (DAMAGE_MULTIPLIERS[dmgType]?.[b.armorType] || 1.0);

          // 3. EHP and threat weighting
          const scoreA = (pA * 0.45) + (multA * 300) + (a.isBoss ? 400 : 0) + (a.shield > 0 && dmgType === 'ENERGY' ? 250 : 0);
          const scoreB = (pB * 0.45) + (multB * 300) + (b.isBoss ? 400 : 0) + (b.shield > 0 && dmgType === 'ENERGY' ? 250 : 0);

          return scoreB - scoreA;
        });
        break;
      }

      case TARGET_PRIORITIES.FIRST:
        candidates.sort((a, b) => b.distanceTravelled - a.distanceTravelled);
        break;

      case TARGET_PRIORITIES.LAST:
        candidates.sort((a, b) => a.distanceTravelled - b.distanceTravelled);
        break;

      case TARGET_PRIORITIES.STRONGEST:
        candidates.sort((a, b) => b.effectiveHitPoints - a.effectiveHitPoints);
        break;

      case TARGET_PRIORITIES.WEAKEST:
        candidates.sort((a, b) => a.hp - b.hp);
        break;

      case TARGET_PRIORITIES.FASTEST:
        candidates.sort((a, b) => b.currentSpeed - a.currentSpeed);
        break;

      case TARGET_PRIORITIES.CLOSEST:
        candidates.sort((a, b) => {
          const dA = Math.hypot(a.x - this.x, a.y - this.y);
          const dB = Math.hypot(b.x - this.x, b.y - this.y);
          return dA - dB;
        });
        break;

      case TARGET_PRIORITIES.FLYING:
        candidates.sort((a, b) => (b.isFlying ? 1 : 0) - (a.isFlying ? 1 : 0) || b.distanceTravelled - a.distanceTravelled);
        break;

      case TARGET_PRIORITIES.BOSS:
        candidates.sort((a, b) => (b.isBoss ? 1 : 0) - (a.isBoss ? 1 : 0) || b.effectiveHitPoints - a.effectiveHitPoints);
        break;
    }

    this.currentTarget = candidates[0];
  }

  fire(projectiles, allEnemies) {
    if (!this.currentTarget) return;

    this.fireCooldown = 1.0 / this.currentFireRate;
    this.recoilOffset = 4.5;
    this.muzzleFlashTimer = 0.08;
    this.shotsFired++;

    const barrelOffset = 18;
    const spawnX = this.x + Math.cos(this.angle) * barrelOffset;
    const spawnY = this.y + Math.sin(this.angle) * barrelOffset;

    const isCrit = Math.random() < ((this.stats.critChance || 0) + (this.buffModifiers.critChance || 0));

    switch (this.typeId) {
      case 'gatling': {
        audio.playShoot('GATLING');
        projectiles.push(new Projectile({
          tower: this,
          target: this.currentTarget,
          targetPos: this.predictedAimPos,
          x: spawnX, y: spawnY,
          damage: this.currentDamage,
          damageType: this.damageType,
          speed: this.stats.projectileSpeed || 600,
          color: this.color,
          glowColor: this.glowColor,
          type: 'bullet',
          splashRadius: this.stats.splashRadius || 0,
          isCrit
        }));
        break;
      }

      case 'laser': {
        audio.playShoot('LASER');
        if (this.stats.multiBeamCount && this.stats.multiBeamCount > 1) {
          const nearby = allEnemies.filter(e => e.active && Math.hypot(e.x - this.x, e.y - this.y) <= this.currentRange).slice(0, this.stats.multiBeamCount);
          for (const target of nearby) {
            this.applyLaserHit(target, spawnX, spawnY, isCrit);
          }
        } else {
          this.applyLaserHit(this.currentTarget, spawnX, spawnY, isCrit);
        }
        break;
      }

      case 'cryo': {
        audio.playShoot('CRYO');
        projectiles.push(new Projectile({
          tower: this,
          target: this.currentTarget,
          targetPos: this.predictedAimPos,
          x: spawnX, y: spawnY,
          damage: this.currentDamage,
          damageType: this.damageType,
          speed: this.stats.projectileSpeed || 350,
          color: this.color,
          glowColor: this.glowColor,
          type: 'acid_drop',
          splashRadius: this.stats.splashRadius || 60,
          slowFactor: this.stats.slowFactor || 0.4,
          slowDuration: this.stats.slowDuration || 2.5,
          freezeChance: this.stats.freezeChance || 0,
          freezeDuration: this.stats.freezeDuration || 1.0,
          isCrit
        }));
        break;
      }

      case 'tesla': {
        audio.playShoot('TESLA');
        this.dischargeTeslaChain(this.currentTarget, allEnemies, spawnX, spawnY);
        break;
      }

      case 'mortar': {
        audio.playShoot('KINETIC');
        // AoE Cluster density optimization coordinate
        const clusterTarget = this.findOptimalAoECluster(allEnemies) || this.predictedAimPos;
        projectiles.push(new Projectile({
          tower: this,
          targetPos: clusterTarget,
          x: spawnX, y: spawnY,
          damage: this.currentDamage,
          damageType: this.damageType,
          speed: this.stats.projectileSpeed || 220,
          color: this.color,
          glowColor: this.glowColor,
          type: 'mortar_shell',
          splashRadius: this.stats.splashRadius || 80,
          isArc: true,
          burnDps: this.stats.burnDps || 0,
          burnDuration: this.stats.napalmGroundDuration || 0,
          isCrit
        }));
        break;
      }

      case 'plasma': {
        audio.playShoot('ENERGY');
        projectiles.push(new Projectile({
          tower: this,
          target: this.currentTarget,
          targetPos: this.predictedAimPos,
          x: spawnX, y: spawnY,
          damage: this.currentDamage,
          damageType: this.damageType,
          speed: this.stats.projectileSpeed || 400,
          color: this.color,
          glowColor: this.glowColor,
          type: 'bullet',
          splashRadius: this.stats.splashRadius || 45,
          burnDps: this.stats.burnDps || 30,
          burnDuration: this.stats.burnDuration || 3.0,
          isCrit
        }));
        break;
      }

      case 'railgun': {
        audio.playShoot('RAILGUN');
        projectiles.push(new Projectile({
          tower: this,
          angle: this.angle,
          x: spawnX, y: spawnY,
          damage: this.currentDamage,
          damageType: this.damageType,
          speed: 2200,
          color: this.color,
          glowColor: this.glowColor,
          type: 'rail_slug',
          pierceCount: this.stats.pierceLimit || 4,
          life: 0.5,
          isCrit
        }));
        break;
      }

      case 'acid': {
        audio.playShoot('CRYO');
        projectiles.push(new Projectile({
          tower: this,
          target: this.currentTarget,
          targetPos: this.predictedAimPos,
          x: spawnX, y: spawnY,
          damage: this.currentDamage,
          damageType: this.damageType,
          speed: 320,
          color: this.color,
          glowColor: this.glowColor,
          type: 'acid_drop',
          acidStacks: 2,
          isCrit
        }));
        break;
      }

      case 'missile': {
        audio.playShoot('MISSILE');
        const count = this.stats.missilesPerSalvo || 2;
        for (let i = 0; i < count; i++) {
          const spreadAngle = this.angle + (i - (count - 1) / 2.0) * 0.22;
          projectiles.push(new Projectile({
            tower: this,
            target: this.currentTarget,
            angle: spreadAngle,
            x: spawnX, y: spawnY,
            damage: this.currentDamage,
            damageType: this.damageType,
            speed: this.stats.projectileSpeed || 380,
            color: this.color,
            glowColor: this.glowColor,
            type: 'missile',
            splashRadius: this.stats.splashRadius || 50,
            isCrit
          }));
        }
        break;
      }
    }
  }

  applyLaserHit(target, startX, startY, isCrit) {
    if (!target || !target.active) return;
    
    particles.spawn({
      x: (startX + target.x) / 2,
      y: (startY + target.y) / 2,
      size: 4, endSize: 0,
      life: 0.12,
      color: this.color,
      glowColor: this.glowColor
    });

    particles.spawnLaserHit(target.x, target.y, this.color);
    target.takeDamage(this.currentDamage, this.damageType, this, isCrit);

    if (this.stats.burnDamage) {
      target.modifiers.add('BURN', 2.0, 1.0, { dps: this.stats.burnDamage });
    }
  }

  dischargeTeslaChain(primaryTarget, allEnemies, startX, startY) {
    let current = primaryTarget;
    let fromX = startX;
    let fromY = startY;
    const hitSet = new Set([primaryTarget.id]);
    const maxChains = this.stats.chainTargets || 3;
    const chainRange = this.stats.chainRange || 90;
    let currentDmg = this.currentDamage;

    for (let c = 0; c < maxChains; c++) {
      if (!current || !current.active) break;

      particles.spawnTeslaChain(fromX, fromY, current.x, current.y, this.color);
      current.takeDamage(currentDmg, this.damageType, this, false);
      current.modifiers.add('ELECTRIFIED', 1.5, 1.0, { dps: 15 });

      fromX = current.x;
      fromY = current.y;
      currentDmg *= (this.stats.chainDecay || 0.8);

      let nextTarget = null;
      let minD = chainRange;

      for (const other of allEnemies) {
        if (other.active && !hitSet.has(other.id)) {
          const d = Math.hypot(other.x - fromX, other.y - fromY);
          if (d <= minD) {
            minD = d;
            nextTarget = other;
          }
        }
      }

      if (nextTarget) {
        hitSet.add(nextTarget.id);
        current = nextTarget;
      } else {
        break;
      }
    }
  }

  updateSupportBeacon(dtSec, enemies) {
    if (this.stats.revealsCloak) {
      for (const e of enemies) {
        if (e.active && e.isCloaked && Math.hypot(e.x - this.x, e.y - this.y) <= this.currentRange) {
          e.reveal(2.0);
        }
      }
    }

    if (this.stats.energyGenPerSec) {
      state.setEnergy(state.energy + this.stats.energyGenPerSec * dtSec);
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Tower Platform Base
    ctx.fillStyle = '#101726';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 6;

    const baseSize = CONFIG.TILE_SIZE * 0.42;
    ctx.beginPath();
    ctx.rect(-baseSize, -baseSize, baseSize * 2, baseSize * 2);
    ctx.fill();
    ctx.stroke();

    // Base Tier Dots
    ctx.fillStyle = this.color;
    for (let i = 0; i < this.tier; i++) {
      const dotX = -baseSize + 6 + i * 8;
      const dotY = baseSize - 6;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Rotating Turret Body with PID heading angle
    ctx.rotate(this.angle);

    const recoilX = -this.recoilOffset;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;

    this.renderTurretGeometry(ctx, recoilX);

    // Muzzle Flash
    if (this.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(recoilX + 22, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderTurretGeometry(ctx, recoilX) {
    const r = 12;

    switch (this.typeId) {
      case 'gatling':
        ctx.fillStyle = '#334155';
        ctx.fillRect(recoilX + 4, -4, 14, 3);
        ctx.fillRect(recoilX + 4, 1, 14, 3);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(recoilX, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'laser':
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(recoilX + 4, -3);
        ctx.lineTo(recoilX + 18, -1.5);
        ctx.lineTo(recoilX + 18, 1.5);
        ctx.lineTo(recoilX + 4, 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(recoilX + 17, -2, 2, 4);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(recoilX, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'cryo':
        ctx.fillStyle = '#00d0ff';
        ctx.beginPath();
        ctx.moveTo(recoilX + 2, -6);
        ctx.lineTo(recoilX + 16, -10);
        ctx.lineTo(recoilX + 16, 10);
        ctx.lineTo(recoilX + 2, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(recoilX, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'tesla':
        ctx.fillStyle = '#b5179e';
        ctx.beginPath();
        ctx.arc(recoilX + 10, 0, 5, 0, Math.PI * 2);
        ctx.arc(recoilX + 18, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(recoilX, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'mortar':
        ctx.fillStyle = '#475569';
        ctx.fillRect(recoilX + 2, -5, 18, 10);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(recoilX, 0, r * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'railgun':
        ctx.fillStyle = '#34d399';
        ctx.fillRect(recoilX + 4, -4, 24, 2);
        ctx.fillRect(recoilX + 4, 2, 24, 2);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(recoilX, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'missile':
        ctx.fillStyle = '#f97316';
        ctx.fillRect(recoilX - 4, -9, 18, 18);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(recoilX + 10, -7, 4, 4);
        ctx.fillRect(recoilX + 10, 3, 4, 4);
        break;

      case 'support':
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        break;

      default:
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
  }

  renderRange(ctx, isValidPlacement = true) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRange, 0, Math.PI * 2);
    
    ctx.fillStyle = isValidPlacement ? COLORS.RANGE_VALID : COLORS.RANGE_INVALID;
    ctx.fill();

    ctx.strokeStyle = isValidPlacement ? COLORS.RANGE_BORDER : COLORS.CRIMSON;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();

    // Lead targeting vector ray to predicted aim point
    if (this.currentTarget && this.predictedAimPos) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.predictedAimPos.x, this.predictedAimPos.y);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      // Predicted interception crosshair
      ctx.beginPath();
      ctx.arc(this.predictedAimPos.x, this.predictedAimPos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0055';
      ctx.fill();
    }

    if (this.stats.minRange) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.stats.minRange, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
      ctx.stroke();
    }

    ctx.restore();
  }
}
