/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Mathematically Modelled Enemy Entity & Boss Tactical AI
 */

import { ENEMIES_DATA, ARMOR_TYPES } from '../data/enemies_data.js';
import { DAMAGE_MULTIPLIERS, MATH_MODELS, COLORS } from '../core/constants.js';
import { ModifierManager } from './modifier.js';
import { particles } from '../rendering/particles.js';
import { audio } from '../core/audio.js';
import { state } from '../core/state.js';
import { events, EVENTS } from '../core/events.js';

let enemyIdCounter = 1;

export class Enemy {
  constructor(typeId, pathWaypoints, waveLevel = 1, options = {}) {
    const proto = ENEMIES_DATA[typeId] || ENEMIES_DATA.scout;
    this.id = enemyIdCounter++;
    this.protoId = typeId;
    this.name = options.customName || proto.name;
    this.armorType = proto.armorType || ARMOR_TYPES.LIGHT;
    this.waveLevel = waveLevel;
    
    // Mathematical Wave Scaling Formulas:
    // HP(w) = HP_0 * (1 + HP_BASE_COEFF * w)^HP_EXPONENT
    const hpFactor = Math.pow(1 + MATH_MODELS.HP_BASE_COEFF * (waveLevel - 1), MATH_MODELS.HP_EXPONENT);
    const shieldFactor = Math.pow(1 + MATH_MODELS.SHIELD_BASE_COEFF * (waveLevel - 1), MATH_MODELS.SHIELD_EXPONENT);
    const armorBonus = Math.floor(MATH_MODELS.ARMOR_SCALE_COEFF * Math.pow(waveLevel - 1, MATH_MODELS.ARMOR_SCALE_EXPONENT));
    
    this.maxHp = Math.round((proto.hp || 100) * hpFactor * (options.hpMultiplier || 1));
    this.hp = this.maxHp;
    
    this.maxShield = Math.round((proto.shield || 0) * shieldFactor * (options.shieldMultiplier || 1));
    this.shield = this.maxShield;
    this.shieldRegen = proto.shieldRegen || 0;
    
    this.baseArmor = (proto.armor || 0) + armorBonus;
    this.baseSpeed = proto.speed || 100;
    this.bounty = Math.round((proto.bounty || 10) * (1 + (waveLevel - 1) * MATH_MODELS.BOUNTY_SCALE_COEFF));
    this.scoreValue = Math.round((proto.scoreValue || 20) * waveLevel);
    
    this.size = proto.size || 16;
    this.color = proto.color || '#00f3ff';
    this.glowColor = proto.glowColor || 'rgba(0, 243, 255, 0.4)';
    this.shape = proto.shape || 'triangle';
    
    this.isBoss = proto.isBoss || false;
    this.isFlying = proto.isFlying || false;
    this.isCloaked = proto.isCloaked || false;
    this.revealedTimer = 0;
    this.regenRate = proto.regenRate || 0;
    this.splitsInto = proto.splitsInto || null;
    this.splitCount = proto.splitCount || 0;
    this.specialAbility = proto.specialAbility || null;
    this.abilityTimer = 0;
    
    // Path traversal with Arc-Length Parameterization
    this.path = pathWaypoints; // array of { x: worldPxX, y: worldPxY }
    this.currentWaypointIndex = 0;
    
    if (this.path && this.path.length > 0) {
      this.x = this.path[0].x;
      this.y = this.path[0].y;
    } else {
      this.x = 0;
      this.y = 0;
    }
    
    this.angle = 0;
    this.vx = 0; // Instantaneous velocity X (px/s)
    this.vy = 0; // Instantaneous velocity Y (px/s)
    this.distanceTravelled = 0;
    this.active = true;
    
    // Repulsion / Flocking Offset Vectors (smooth flock dispersion)
    this.offsetX = 0;
    this.offsetY = 0;
    this.repulsionVx = 0;
    this.repulsionVy = 0;

    // Incoming DPS Tracker for Predictive Boss Countermeasures
    this.recentDamageWindow = []; // { timestamp, damage }
    
    // Status Effects Manager
    this.modifiers = new ModifierManager(this);
  }

  /**
   * Calculates Effective Hit Points (EHP) accounting for Shields and Armor mitigation:
   * EHP = HP * (1 + kappa * Armor / 100) + Shield
   */
  get effectiveHitPoints() {
    const armorMitigationMultiplier = 1 + (MATH_MODELS.ARMOR_KAPPA * this.currentArmor) / 100;
    return (this.hp * armorMitigationMultiplier) + this.shield;
  }

  get currentSpeed() {
    return this.baseSpeed * this.modifiers.getSpeedMultiplier();
  }

  get currentArmor() {
    return this.modifiers.getEffectiveArmor(this.baseArmor);
  }

  get isTargetable() {
    return this.active;
  }

  reveal(duration = 3.0) {
    this.revealedTimer = Math.max(this.revealedTimer, duration);
  }

  /**
   * Computes estimated Time-To-Death based on differential incoming DPS
   */
  estimateTimeToDeath() {
    const now = performance.now();
    // Prune entries older than 2.0 seconds
    this.recentDamageWindow = this.recentDamageWindow.filter(d => now - d.timestamp < 2000);
    const totalRecentDamage = this.recentDamageWindow.reduce((acc, cur) => acc + cur.damage, 0);
    const dpsIncoming = totalRecentDamage / 2.0;

    if (dpsIncoming <= 0.1) return 999.0;
    return (this.hp + this.shield) / dpsIncoming;
  }

  update(dtSec, allEnemies) {
    if (!this.active) return;

    // 1. Status effect tick updates
    this.modifiers.update(dtSec);

    // 2. Stealth timer & Proximity Detection
    if (this.revealedTimer > 0) {
      this.revealedTimer -= dtSec;
    }

    // Auto-reveal if near any active player defense tower (< 140px)
    if (this.isCloaked && this.revealedTimer <= 0 && state.towers) {
      for (const t of state.towers) {
        if (Math.hypot(t.x - this.x, t.y - this.y) <= 140) {
          this.reveal(3.5);
          break;
        }
      }
    }

    // 3. Health & Shield Differential Calculus (Regeneration)
    if (this.regenRate > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dtSec);
    }
    if (this.shieldRegen > 0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * dtSec);
    }

    // 4. Mathematical Flocking / Neighbor Repulsion Vector Field (Reynolds Dispersion)
    if (allEnemies && !this.isBoss && !this.isFlying) {
      this.computeNeighborRepulsion(allEnemies, dtSec);
    }

    // 5. Boss Adaptive Mathematical Countermeasures
    if (this.isBoss) {
      this.updateBossMathematicalAI(dtSec, allEnemies);
    }

    // 6. Kinematic Movement & Velocity Vector Calculation
    this.updateKinematics(dtSec);
  }

  computeNeighborRepulsion(allEnemies, dtSec) {
    const sepRadius = MATH_MODELS.FLOCK_SEPARATION_RADIUS;
    const forceCoeff = MATH_MODELS.FLOCK_REPULSION_FORCE;
    let forceX = 0;
    let forceY = 0;

    for (const neighbor of allEnemies) {
      if (neighbor !== this && neighbor.active && !neighbor.isBoss && !neighbor.isFlying) {
        const dx = this.x - neighbor.x;
        const dy = this.y - neighbor.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > 0.01 && distSq < sepRadius * sepRadius) {
          const dist = Math.sqrt(distSq);
          // Inverse square repulsion vector: F = (k / r^2) * (r_hat)
          const repulsionMag = forceCoeff / (distSq + 4.0);
          forceX += (dx / dist) * repulsionMag;
          forceY += (dy / dist) * repulsionMag;
        }
      }
    }

    // Integrate repulsion velocities with damping
    this.repulsionVx = (this.repulsionVx + forceX * dtSec) * MATH_MODELS.FLOCK_DAMPING;
    this.repulsionVy = (this.repulsionVy + forceY * dtSec) * MATH_MODELS.FLOCK_DAMPING;

    // Apply soft bounded offset perpendicular to path vector
    this.offsetX = Math.max(-12, Math.min(12, this.offsetX + this.repulsionVx * dtSec));
    this.offsetY = Math.max(-12, Math.min(12, this.offsetY + this.repulsionVy * dtSec));
  }

  updateKinematics(dtSec) {
    if (!this.path || this.path.length <= 1) return;

    if (this.isFlying) {
      // Linear trajectory towards final goal coordinate
      const goal = this.path[this.path.length - 1];
      const dx = goal.x - this.x;
      const dy = goal.y - this.y;
      const dist = Math.hypot(dx, dy);
      this.angle = Math.atan2(dy, dx);

      const speed = this.currentSpeed;
      this.vx = Math.cos(this.angle) * speed;
      this.vy = Math.sin(this.angle) * speed;

      const moveDist = speed * dtSec;
      if (dist <= moveDist + 4) {
        this.reachGoal();
      } else {
        this.x += this.vx * dtSec;
        this.y += this.vy * dtSec;
        this.distanceTravelled += moveDist;
      }
      return;
    }

    // Ground Waypoint Arc-Length Progression
    const targetWaypoint = this.path[this.currentWaypointIndex + 1];
    if (!targetWaypoint) {
      this.reachGoal();
      return;
    }

    const dx = targetWaypoint.x - (this.x - this.offsetX);
    const dy = targetWaypoint.y - (this.y - this.offsetY);
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    const speed = this.currentSpeed;
    const tangentVx = Math.cos(this.angle) * speed;
    const tangentVy = Math.sin(this.angle) * speed;

    this.vx = tangentVx + this.repulsionVx;
    this.vy = tangentVy + this.repulsionVy;

    const moveDist = speed * dtSec;

    if (dist <= moveDist + 2) {
      this.x = targetWaypoint.x + this.offsetX;
      this.y = targetWaypoint.y + this.offsetY;
      this.distanceTravelled += dist;
      this.currentWaypointIndex++;

      if (this.currentWaypointIndex >= this.path.length - 1) {
        this.reachGoal();
      }
    } else {
      this.x += (tangentVx * dtSec);
      this.y += (tangentVy * dtSec);
      this.distanceTravelled += moveDist;
    }
  }

  updateBossMathematicalAI(dtSec, allEnemies) {
    this.abilityTimer += dtSec;
    const ttd = this.estimateTimeToDeath();
    const hpRatio = this.hp / this.maxHp;

    // Mathematical condition 1: Shield Recovery Pulse triggered when shield falls below 20% or on timer
    if (this.specialAbility === 'SHIELD_RECOVERY_PULSE') {
      const shieldRatio = this.shield / this.maxShield;
      if ((shieldRatio < 0.25 || this.abilityTimer >= 7.5) && this.abilityTimer >= 4.0) {
        this.abilityTimer = 0;
        const recoveryAmount = Math.round(this.maxShield * 0.45);
        this.shield = Math.min(this.maxShield, this.shield + recoveryAmount);
        particles.spawnExplosion(this.x, this.y, 65, '#38bdf8', 'rgba(56, 189, 248, 0.7)');
        particles.spawnText(`+${recoveryAmount} SHIELD SURGE`, this.x, this.y - 30, '#38bdf8', true);
        audio.playShoot('ENERGY');
      }
    }

    // Mathematical condition 2: Hive Overlord Swarm Escort Synthesis
    else if (this.specialAbility === 'SPAWN_SWARM_ESCORT') {
      if ((ttd < 5.0 || this.abilityTimer >= 6.0) && this.abilityTimer >= 3.5) {
        this.abilityTimer = 0;
        const escortCount = hpRatio < 0.5 ? 5 : 3;
        particles.spawnExplosion(this.x, this.y, 55, '#8b5cf6', 'rgba(139, 92, 246, 0.7)');
        particles.spawnText(`SYNTHESIS: ${escortCount} ESCORTS`, this.x, this.y - 30, '#8b5cf6', true);

        if (allEnemies) {
          for (let i = 0; i < escortCount; i++) {
            const escort = new Enemy('swarmer', this.path.slice(this.currentWaypointIndex), this.waveLevel);
            escort.x = this.x + (Math.random() - 0.5) * 24;
            escort.y = this.y + (Math.random() - 0.5) * 24;
            escort.distanceTravelled = this.distanceTravelled;
            allEnemies.push(escort);
          }
        }
      }
    }

    // Mathematical condition 3: Chronos Singularity Warp Leap
    else if (this.specialAbility === 'TIME_WARP_TELEPORT') {
      if (hpRatio < 0.50 && !this.hasWarped) {
        this.hasWarped = true;
        this.currentWaypointIndex = Math.min(this.path.length - 2, this.currentWaypointIndex + 2);
        const nextWp = this.path[this.currentWaypointIndex];
        if (nextWp) {
          particles.spawnExplosion(this.x, this.y, 70, '#06b6d4', 'rgba(6, 182, 212, 0.8)');
          this.x = nextWp.x;
          this.y = nextWp.y;
          particles.spawnExplosion(this.x, this.y, 70, '#00ff88', 'rgba(0, 255, 136, 0.8)');
          particles.spawnText('WARP DISTORTION LEAP', this.x, this.y - 35, '#06b6d4', true);
          audio.playShoot('RAILGUN');
        }
      }
    }
  }

  takeDamage(rawDamage, damageType = 'KINETIC', sourceTower = null, isCrit = false) {
    if (!this.active) return 0;

    // Reveal cloaking upon taking any damage
    if (this.isCloaked) {
      this.reveal(4.0);
    }

    // 1. Matrix Type Effectiveness Multiplier
    const typeMap = DAMAGE_MULTIPLIERS[damageType] || DAMAGE_MULTIPLIERS.KINETIC;
    const typeMultiplier = typeMap[this.armorType] || 1.0;
    
    // 2. Status Modifier Multiplier (Mark of Death / Thermal Shock)
    const statusMult = this.modifiers.getDamageMultiplier();
    
    let effectiveDamage = rawDamage * typeMultiplier * statusMult;

    // 3. Critical Strike Multiplier
    if (isCrit) {
      const critMultiplier = sourceTower?.stats?.critMultiplier || 2.0;
      effectiveDamage *= critMultiplier;
    }

    let damageApplied = 0;

    // 4. Differential Deflector Shield Absorption
    if (this.shield > 0) {
      let shieldDmg = effectiveDamage;
      if (damageType === 'ENERGY' || damageType === 'SHOCK') {
        shieldDmg *= 1.35; // Energy resonance bonus vs plasma shields
      }

      if (this.shield >= shieldDmg) {
        this.shield -= shieldDmg;
        damageApplied = shieldDmg;
        effectiveDamage = 0;
      } else {
        effectiveDamage -= this.shield;
        damageApplied += this.shield;
        this.shield = 0;
        particles.spawnExplosion(this.x, this.y, 32, '#00d0ff', 'rgba(0, 208, 255, 0.6)');
        audio.playExplosion(0.8);
      }
    }

    // 5. Rigorous Armor Mitigation Formula:
    // Reduction(A) = 100 / (100 + kappa * Armor)
    if (effectiveDamage > 0) {
      let mitigatedDmg = effectiveDamage;
      if (damageType !== 'TRUE_DAMAGE') {
        const armorVal = this.currentArmor;
        const armorReduction = 100 / (100 + MATH_MODELS.ARMOR_KAPPA * armorVal);
        mitigatedDmg *= armorReduction;
      }

      this.hp -= mitigatedDmg;
      damageApplied += mitigatedDmg;
      state.totalDamageDealt += mitigatedDmg;
      if (sourceTower) {
        sourceTower.totalDamageDealt += mitigatedDmg;
      }
    }

    // Record incoming damage timestamp for Boss TTD evaluation
    if (this.isBoss) {
      this.recentDamageWindow.push({ timestamp: performance.now(), damage: damageApplied });
    }

    // Spawn floating combat text
    const textCol = isCrit ? '#ff0055' : (damageType === 'ENERGY' ? '#00f3ff' : '#ffffff');
    particles.spawnText(`${Math.round(damageApplied)}`, this.x, this.y, textCol, isCrit);

    events.emit(EVENTS.ENEMY_DAMAGED, { enemy: this, damage: damageApplied, type: damageType });

    if (this.hp <= 0) {
      this.die();
    }

    return damageApplied;
  }

  die() {
    if (!this.active) return;
    this.active = false;

    // Explosion effects
    const expRadius = this.isBoss ? 85 : (this.size * 2.2);
    particles.spawnExplosion(this.x, this.y, expRadius, this.color, this.glowColor);
    audio.playExplosion(this.isBoss ? 2.0 : 0.8);

    // Record bounty and stats
    state.recordKill(this);
    events.emit(EVENTS.ENEMY_KILLED, { enemy: this });

    // Handle Splitter multiplication
    if (this.splitsInto && this.splitCount > 0 && state.enemies) {
      for (let i = 0; i < this.splitCount; i++) {
        const mini = new Enemy(this.splitsInto, this.path.slice(this.currentWaypointIndex), this.waveLevel);
        mini.x = this.x + (Math.random() - 0.5) * 18;
        mini.y = this.y + (Math.random() - 0.5) * 18;
        mini.distanceTravelled = this.distanceTravelled;
        state.enemies.push(mini);
      }
    }
  }

  reachGoal() {
    if (!this.active) return;
    this.active = false;
    
    // Bosses deal 5 lives damage, standard enemies deal 1-2
    const damageToPlayer = this.isBoss ? 5 : (this.armorType === ARMOR_TYPES.HEAVY ? 2 : 1);
    state.takeDamage(damageToPlayer);
    
    particles.spawnExplosion(this.x, this.y, 45, '#ff0055', 'rgba(255, 0, 85, 0.7)');
    audio.playAlarm();
    events.emit(EVENTS.ENEMY_REACHED_GOAL, { enemy: this, livesLost: damageToPlayer });
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Cloaking opacity
    if (this.isCloaked && this.revealedTimer <= 0) {
      ctx.globalAlpha = 0.25;
    } else if (this.isCloaked) {
      ctx.globalAlpha = 0.85;
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = this.isBoss ? 18 : 8;
    ctx.lineWidth = 2;

    const r = this.size;

    // Procedural Vector Geometry based on shape
    switch (this.shape) {
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(-r * 0.7, -r * 0.7);
        ctx.lineTo(-r * 0.4, 0);
        ctx.lineTo(-r * 0.7, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(0, -r * 0.6);
        ctx.lineTo(-r, 0);
        ctx.lineTo(0, r * 0.6);
        ctx.closePath();
        ctx.fill();
        break;

      case 'square':
        ctx.beginPath();
        ctx.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);
        break;

      case 'hexagon':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'chevron':
        ctx.beginPath();
        ctx.moveTo(r * 1.1, 0);
        ctx.lineTo(-r * 0.8, -r * 0.9);
        ctx.lineTo(-r * 0.3, 0);
        ctx.lineTo(-r * 0.8, r * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'star': {
        ctx.beginPath();
        const spikes = 5;
        const outerR = r * 1.1;
        const innerR = r * 0.5;
        for (let i = 0; i < spikes * 2; i++) {
          const rad = (i * Math.PI) / spikes - Math.PI / 2;
          const dist = i % 2 === 0 ? outerR : innerR;
          const px = Math.cos(rad) * dist;
          const py = Math.sin(rad) * dist;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(r * 1.2, 0);
        ctx.lineTo(-r * 0.7, -r * 0.7);
        ctx.lineTo(-r * 0.3, 0);
        ctx.lineTo(-r * 0.7, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'double_circle':
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'boss_titan':
        ctx.beginPath();
        ctx.rect(-r, -r * 0.8, r * 2, r * 1.6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
        break;

      case 'boss_hive':
      case 'boss_singularity':
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
    }

    ctx.restore();

    // Render Health & Shield Bars above unit
    this.renderStatusBars(ctx);
  }

  renderStatusBars(ctx) {
    if (!this.active || this.hp >= this.maxHp && this.shield >= this.maxShield) return;

    const barWidth = Math.max(28, this.size * 2);
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.size - 10;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // HP Fill
    const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    ctx.fillStyle = this.isBoss ? COLORS.CRIMSON : COLORS.EMERALD;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Shield Bar
    if (this.maxShield > 0 && this.shield > 0) {
      const shieldRatio = Math.max(0, Math.min(1, this.shield / this.maxShield));
      ctx.fillStyle = COLORS.CYAN;
      ctx.fillRect(barX, barY - 3, barWidth * shieldRatio, 2);
    }

    ctx.restore();
  }
}
