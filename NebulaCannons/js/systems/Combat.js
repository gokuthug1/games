/**
 * Combat — mathematical explosion resolution: distance falloff damage,
 * terrain deformation, knockback and all the visual/audio feedback.
 * Pure-ish: `explode` takes a game context object so it stays decoupled
 * from the Game implementation.
 */

import { CONFIG } from '../core/Config.js';
import { EVT } from '../core/EventBus.js';
import { clamp, falloff } from '../utils/MathUtils.js';

export const Combat = {
  /**
   * Damage at distance `d` from blast center.
   * @param {number} d distance px
   * @param {number} radius blast radius px
   * @param {number} maxDamage damage at center
   * @param {number} exponent falloff curve (higher = sharper dropoff)
   */
  damageAt(d, radius, maxDamage, exponent = 1.6) {
    return maxDamage * falloff(d, radius, exponent);
  },

  /**
   * Apply a full explosion.
   * @param {object} ctx
   * @param {object} ctx.game game instance
   * @param {number} ctx.x world x
   * @param {number} ctx.y world y
   * @param {number} ctx.radius blast radius
   * @param {number} ctx.damage max damage
   * @param {object} ctx.owner firing tank (may be null)
   * @param {boolean} [ctx.deform=true] deform terrain
   * @param {number} [ctx.craterDepth] explicit crater depth (default radius*0.5)
   * @param {number} [ctx.shake=0] screen shake px
   * @param {string} [ctx.color] blast color
   * @param {number} [ctx.exponent] falloff exponent
   */
  explode(ctx) {
    const game = ctx.game;
    const { x, y, radius } = ctx;
    const owner = ctx.owner || null;
    const deform = ctx.deform !== false;
    const color = ctx.color || CONFIG.COLORS.ACCENT;
    const shake = ctx.shake || 0;
    // Attribute the kill to the weapon (fallback to the firer's active weapon).
    const weaponId = ctx.weaponId || (owner && owner.activeWeaponId) || null;
    // Progression: the human player's mastered weapons deal bonus damage.
    const damage = game.masteryDamage(owner, weaponId, ctx.damage || 0);

    // 1. Terrain deformation (so tanks settle before damage is applied).
    if (deform) {
      const depth = ctx.craterDepth !== undefined ? ctx.craterDepth : radius * 0.5;
      game.terrain.crater(x, y, radius, depth);
    }

    // 2. Tank damage with distance falloff + knockback.
    const W = CONFIG.WORLD.WIDTH;
    for (const tank of game.tanks) {
      if (!tank.alive) continue;
      const d = Math.hypot(tank.x - x, tank.y - y);
      if (d >= radius) continue;
      const dmg = Combat.damageAt(d, radius, damage, ctx.exponent);
      if (dmg <= 0) continue;
      if (tank === owner && !game.settings.get('selfDamage')) continue;

      const destroyed = tank.takeDamage(dmg);
      game.bus.emit(EVT.TANK_STATS, {
        id: tank.id,
        health: tank.health,
        fuel: tank.fuel,
        power: tank.power,
        angle: tank.turret.angle,
      });

      // Knockback away from the blast, then re-conform to terrain.
      if (d > 6) {
        const strength = clamp(1 - d / radius, 0, 1) * 30;
        const nx = (tank.x - x) / d;
        tank.x = clamp(tank.x + nx * strength, 0, W);
        tank.restOn(game.terrain);
      }

      if (destroyed) {
        game.onTankDestroyed(tank, owner, weaponId);
      } else if (tank !== owner) {
        game.settings.recordStat('directHits', 1);
      }
      game.sound.play('damage', { pitch: 0.8 + Math.random() * 0.4 });
    }

    // 3. Visuals + feedback.
    game.spawnExplosionEntity({ x, y, radius, color });
    game.particles.explosionBurst({ x, y, radius, color });
    game.particles.smokeAt(x, y - radius * 0.15, Math.min(14, Math.ceil(radius / 9)), color);
    if (shake > 0) game.camera.addShake(shake);
    game.sound.play('explosion', { size: radius });
  },

  /**
   * Small impact without damage (e.g. Bouncer terrain contact).
   */
  poof(game, x, y, color = '#9aa7c7') {
    game.particles.burst({
      x, y, count: 8, kind: 'smoke', color0: '#7c8499', color1: '#3a4054',
      speedMin: 10, speedMax: 50, lifeMin: 0.3, lifeMax: 0.7,
      sizeMin: 4, sizeMax: 9, grav: -20,
    });
    game.sound.play('bounce', {});
  },
};
