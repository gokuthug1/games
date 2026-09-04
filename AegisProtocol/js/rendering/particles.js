/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * High-Performance Particle Engine & Floating Text System
 */

import { COLORS } from '../core/constants.js';

export class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 2;
    this.endSize = 0;
    this.color = '#00f3ff';
    this.glowColor = null;
    this.alpha = 1;
    this.type = 'circle'; // 'circle', 'line', 'ring', 'spark', 'debris'
    this.rotation = 0;
    this.vRot = 0;
    this.drag = 0.98;
    this.gravity = 0;
  }

  init(options) {
    this.active = true;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || (Math.random() - 0.5) * 4;
    this.vy = options.vy || (Math.random() - 0.5) * 4;
    this.life = options.life || 0.5;
    this.maxLife = this.life;
    this.size = options.size || 3;
    this.endSize = options.endSize !== undefined ? options.endSize : 0;
    this.color = options.color || COLORS.CYAN;
    this.glowColor = options.glowColor || null;
    this.alpha = options.alpha !== undefined ? options.alpha : 1;
    this.type = options.type || 'circle';
    this.rotation = options.rotation || Math.random() * Math.PI * 2;
    this.vRot = options.vRot || (Math.random() - 0.5) * 0.2;
    this.drag = options.drag !== undefined ? options.drag : 0.96;
    this.gravity = options.gravity || 0;
  }

  update(dtSec) {
    if (!this.active) return;

    this.life -= dtSec;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.drag;
    this.vy = this.vy * this.drag + this.gravity;
    this.rotation += this.vRot;
  }

  render(ctx) {
    if (!this.active) return;

    const progress = 1 - (this.life / this.maxLife);
    const curAlpha = this.alpha * (1 - progress);
    const curSize = this.size + (this.endSize - this.size) * progress;
    if (curSize <= 0.1 || curAlpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = curAlpha;

    if (this.glowColor) {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 8;
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    switch (this.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(this.x, this.y, curSize, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'ring':
        ctx.lineWidth = Math.max(1, curSize * 0.2);
        ctx.beginPath();
        ctx.arc(this.x, this.y, curSize, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'spark':
        ctx.lineWidth = Math.max(1.5, curSize * 0.5);
        ctx.beginPath();
        ctx.moveTo(this.x - this.vx * 2, this.y - this.vy * 2);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        break;

      case 'debris':
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillRect(-curSize / 2, -curSize / 2, curSize, curSize);
        break;
    }

    ctx.restore();
  }
}

export class FloatingText {
  constructor() {
    this.active = false;
    this.text = '';
    this.x = 0;
    this.y = 0;
    this.vy = -1.2;
    this.life = 0;
    this.maxLife = 0.8;
    this.color = '#ffffff';
    this.size = 14;
    this.isCrit = false;
  }

  init(text, x, y, color = '#ffffff', isCrit = false) {
    this.active = true;
    this.text = text;
    this.x = x + (Math.random() - 0.5) * 16;
    this.y = y;
    this.vy = isCrit ? -2.0 : -1.2;
    this.life = isCrit ? 1.0 : 0.7;
    this.maxLife = this.life;
    this.color = color;
    this.size = isCrit ? 18 : 13;
    this.isCrit = isCrit;
  }

  update(dtSec) {
    if (!this.active) return;
    this.life -= dtSec;
    if (this.life <= 0) {
      this.active = false;
      return;
    }
    this.y += this.vy;
    this.vy *= 0.94;
  }

  render(ctx) {
    if (!this.active) return;
    const progress = 1 - (this.life / this.maxLife);
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${this.isCrit ? 'bold ' : ''}${this.size}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.isCrit ? 10 : 4;
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ParticleManager {
  constructor(maxParticles = 600, maxTexts = 60) {
    this.particles = Array.from({ length: maxParticles }, () => new Particle());
    this.texts = Array.from({ length: maxTexts }, () => new FloatingText());
  }

  spawn(options) {
    const p = this.particles.find(item => !item.active);
    if (p) {
      p.init(options);
    }
  }

  spawnText(text, x, y, color = '#ffffff', isCrit = false) {
    const t = this.texts.find(item => !item.active);
    if (t) {
      t.init(text, x, y, color, isCrit);
    }
  }

  // Pre-configured Particle FX Helpers

  spawnExplosion(x, y, radius = 40, color = COLORS.AMBER, glow = COLORS.AMBER_GLOW) {
    // Shockwave Ring
    this.spawn({
      x, y,
      type: 'ring',
      size: 4,
      endSize: radius * 1.4,
      life: 0.35,
      color,
      glowColor: glow
    });

    // Sparks & Shrapnel
    const count = Math.floor(radius / 2.5);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 6 + 2;
      this.spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: Math.random() > 0.4 ? 'spark' : 'circle',
        size: Math.random() * 4 + 2,
        endSize: 0,
        life: Math.random() * 0.4 + 0.2,
        color,
        glowColor: glow,
        drag: 0.94
      });
    }
  }

  spawnLaserHit(x, y, color = COLORS.CYAN) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: 'spark',
        size: 3,
        life: 0.2,
        color,
        glowColor: color,
        drag: 0.9
      });
    }
  }

  spawnCryoFrost(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 0.5;
      this.spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: 'debris',
        size: Math.random() * 4 + 2,
        endSize: 0.5,
        life: Math.random() * 0.5 + 0.3,
        color: '#cceeff',
        glowColor: '#00d0ff',
        drag: 0.92
      });
    }
  }

  spawnTeslaChain(x1, y1, x2, y2, color = COLORS.CYAN) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(3, Math.floor(dist / 20));
    
    let curX = x1;
    let curY = y1;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const targetX = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 16;
      const targetY = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 16;
      
      this.spawn({
        x: (curX + targetX) / 2,
        y: (curY + targetY) / 2,
        vx: 0, vy: 0,
        type: 'spark',
        size: 3,
        life: 0.12,
        color,
        glowColor: color
      });

      curX = targetX;
      curY = targetY;
    }
  }

  update(dtSec) {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) {
        this.particles[i].update(dtSec);
      }
    }
    for (let i = 0; i < this.texts.length; i++) {
      if (this.texts[i].active) {
        this.texts[i].update(dtSec);
      }
    }
  }

  render(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) {
        this.particles[i].render(ctx);
      }
    }
    for (let i = 0; i < this.texts.length; i++) {
      if (this.texts[i].active) {
        this.texts[i].render(ctx);
      }
    }
  }

  clear() {
    this.particles.forEach(p => p.active = false);
    this.texts.forEach(t => t.active = false);
  }
}

export const particles = new ParticleManager();
