/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Projectile & Ballistics Physics System
 */

import { particles } from '../rendering/particles.js';
import { audio } from '../core/audio.js';
import { COLORS } from '../core/constants.js';

let projectileIdCounter = 1;

export class Projectile {
  constructor(options) {
    this.id = projectileIdCounter++;
    this.tower = options.tower;
    this.target = options.target;
    this.targetPos = options.targetPos ? { ...options.targetPos } : (this.target ? { x: this.target.x, y: this.target.y } : { x: 0, y: 0 });
    
    this.x = options.x;
    this.y = options.y;
    this.startX = options.x;
    this.startY = options.y;
    
    this.damage = options.damage || 10;
    this.damageType = options.damageType || 'KINETIC';
    this.speed = options.speed || 500;
    this.color = options.color || COLORS.CYAN;
    this.glowColor = options.glowColor || COLORS.CYAN_GLOW;
    this.type = options.type || 'bullet'; // 'bullet', 'laser_beam', 'missile', 'mortar_shell', 'rail_slug', 'acid_drop'
    
    this.splashRadius = options.splashRadius || 0;
    this.pierceCount = options.pierceCount || 0;
    this.hitEnemies = new Set();
    
    // Missile homing params
    this.angle = options.angle !== undefined ? options.angle : Math.atan2(this.targetPos.y - this.y, this.targetPos.x - this.x);
    this.turnRate = options.turnRate || 6.0;
    
    // Ballistic Arc params
    this.isArc = options.isArc || false;
    this.arcHeight = options.arcHeight || 60;
    this.totalDistance = Math.hypot(this.targetPos.x - this.startX, this.targetPos.y - this.startY);
    this.distanceTraveled = 0;
    
    // Special payloads
    this.slowFactor = options.slowFactor || 0;
    this.slowDuration = options.slowDuration || 0;
    this.freezeChance = options.freezeChance || 0;
    this.freezeDuration = options.freezeDuration || 0;
    this.burnDps = options.burnDps || 0;
    this.burnDuration = options.burnDuration || 0;
    this.acidStacks = options.acidStacks || 0;
    this.isCrit = options.isCrit || false;
    
    // Lifetime / Expiry
    this.life = options.life || 3.0;
    this.active = true;
  }

  update(dtSec, enemies) {
    if (!this.active) return;
    this.life -= dtSec;
    if (this.life <= 0) {
      this.destroy();
      return;
    }

    switch (this.type) {
      case 'bullet':
        this.updateBullet(dtSec, enemies);
        break;

      case 'missile':
        this.updateMissile(dtSec, enemies);
        break;

      case 'mortar_shell':
        this.updateMortar(dtSec, enemies);
        break;

      case 'acid_drop':
        this.updateAcid(dtSec, enemies);
        break;

      case 'rail_slug':
        this.updateRailSlug(dtSec, enemies);
        break;
    }
  }

  updateBullet(dtSec, enemies) {
    // If targeted enemy still alive, update trajectory vector slightly
    if (this.target && this.target.active) {
      this.targetPos.x = this.target.x;
      this.targetPos.y = this.target.y;
    }

    const dx = this.targetPos.x - this.x;
    const dy = this.targetPos.y - this.y;
    const dist = Math.hypot(dx, dy);
    const moveDist = this.speed * dtSec;

    if (dist <= moveDist + 8) {
      this.x = this.targetPos.x;
      this.y = this.targetPos.y;
      this.onHit(this.target, enemies);
    } else {
      this.x += (dx / dist) * moveDist;
      this.y += (dy / dist) * moveDist;
      
      // Particle bullet trail
      if (Math.random() > 0.6) {
        particles.spawn({
          x: this.x, y: this.y,
          size: 2, endSize: 0,
          life: 0.15,
          color: this.color,
          alpha: 0.6
        });
      }
    }
  }

  updateMissile(dtSec, enemies) {
    // Retarget if current target died
    if ((!this.target || !this.target.active) && enemies.length > 0) {
      let closest = null;
      let minD = Infinity;
      for (const e of enemies) {
        if (e.active) {
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d < minD) {
            minD = d;
            closest = e;
          }
        }
      }
      this.target = closest;
    }

    if (this.target && this.target.active) {
      this.targetPos.x = this.target.x;
      this.targetPos.y = this.target.y;
    }

    const targetAngle = Math.atan2(this.targetPos.y - this.y, this.targetPos.x - this.x);
    
    // Smooth angle interpolation
    let angleDiff = targetAngle - this.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    
    this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate * dtSec);

    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;

    this.x += vx * dtSec;
    this.y += vy * dtSec;

    // Rocket exhaust particle smoke
    particles.spawn({
      x: this.x - Math.cos(this.angle) * 8,
      y: this.y - Math.sin(this.angle) * 8,
      vx: -Math.cos(this.angle) * 20 + (Math.random() - 0.5) * 10,
      vy: -Math.sin(this.angle) * 20 + (Math.random() - 0.5) * 10,
      size: 3, endSize: 0.5,
      life: 0.25,
      color: '#f97316',
      glowColor: '#ea580c',
      alpha: 0.8
    });

    const distToTarget = Math.hypot(this.targetPos.x - this.x, this.targetPos.y - this.y);
    if (distToTarget < 16) {
      this.onHit(this.target, enemies);
    }
  }

  updateMortar(dtSec, enemies) {
    const dx = this.targetPos.x - this.startX;
    const dy = this.targetPos.y - this.startY;
    const totalDist = this.totalDistance || 1;

    this.distanceTraveled += this.speed * dtSec;
    const progress = Math.min(1.0, this.distanceTraveled / totalDist);

    this.x = this.startX + dx * progress;
    this.y = this.startY + dy * progress;

    // Simulated arc elevation height
    this.currentElevation = Math.sin(progress * Math.PI) * this.arcHeight;

    // Trail
    if (Math.random() > 0.5) {
      particles.spawn({
        x: this.x,
        y: this.y - this.currentElevation,
        size: 3, endSize: 0,
        life: 0.2,
        color: '#ffb703',
        alpha: 0.5
      });
    }

    if (progress >= 1.0) {
      this.onHit(null, enemies);
    }
  }

  updateAcid(dtSec, enemies) {
    const dx = this.targetPos.x - this.x;
    const dy = this.targetPos.y - this.y;
    const dist = Math.hypot(dx, dy);
    const moveDist = this.speed * dtSec;

    if (dist <= moveDist + 10) {
      this.onHit(this.target, enemies);
    } else {
      this.x += (dx / dist) * moveDist;
      this.y += (dy / dist) * moveDist;
      
      particles.spawn({
        x: this.x + (Math.random() - 0.5) * 6,
        y: this.y + (Math.random() - 0.5) * 6,
        size: 3, endSize: 0,
        life: 0.18,
        color: '#84cc16',
        alpha: 0.6
      });
    }
  }

  updateRailSlug(dtSec, enemies) {
    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;

    this.x += vx * dtSec;
    this.y += vy * dtSec;

    // Check line intersection with enemies
    for (const enemy of enemies) {
      if (enemy.active && !this.hitEnemies.has(enemy.id)) {
        const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (dist <= enemy.size + 10) {
          this.hitEnemies.add(enemy.id);
          this.applyDamage(enemy);
          particles.spawnLaserHit(enemy.x, enemy.y, this.color);

          if (this.hitEnemies.size >= this.pierceCount) {
            this.destroy();
            return;
          }
        }
      }
    }
  }

  onHit(directTarget, allEnemies) {
    if (this.splashRadius > 0) {
      // Area of Effect damage
      audio.playExplosion(this.splashRadius > 90 ? 1.5 : 1.0);
      particles.spawnExplosion(this.x, this.y, this.splashRadius, this.color, this.glowColor);

      for (const enemy of allEnemies) {
        if (enemy.active) {
          const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
          if (d <= this.splashRadius + enemy.size) {
            // Falloff factor from center
            const falloff = 1.0 - (d / (this.splashRadius + enemy.size)) * 0.4;
            this.applyDamage(enemy, falloff);
          }
        }
      }
    } else if (directTarget && directTarget.active) {
      this.applyDamage(directTarget);
      particles.spawnLaserHit(this.x, this.y, this.color);
    }

    this.destroy();
  }

  applyDamage(enemy, multiplier = 1.0) {
    let finalDamage = this.damage * multiplier;
    
    // Status effect attachments
    if (this.slowFactor > 0) {
      enemy.modifiers.add('SLOW', this.slowDuration, this.slowFactor);
    }
    if (this.freezeChance > 0 && Math.random() < this.freezeChance) {
      enemy.modifiers.add('FREEZE', this.freezeDuration, 1.0);
      particles.spawnCryoFrost(enemy.x, enemy.y);
    }
    if (this.burnDps > 0) {
      enemy.modifiers.add('BURN', this.burnDuration, 1.0, { dps: this.burnDps });
    }
    if (this.acidStacks > 0) {
      enemy.modifiers.add('CORROSION', 4.0, 1.0, { stacks: this.acidStacks, dpsPerStack: 10, armorShredPerStack: 2 });
    }

    enemy.takeDamage(finalDamage, this.damageType, this.tower, this.isCrit);
  }

  destroy() {
    this.active = false;
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    
    if (this.type === 'mortar_shell') {
      const renderY = this.y - (this.currentElevation || 0);
      
      // Shadow on the ground
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shell in flight
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, renderY, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'missile') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      ctx.fillStyle = this.color;
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 8;

      // Precision Missile geometry
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'rail_slug') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      ctx.strokeStyle = this.color;
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
    } else {
      // Standard bullet / acid drop
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
