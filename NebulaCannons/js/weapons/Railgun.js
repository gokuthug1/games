/**
 * Railgun — an instant, wind-immune beam. No projectile flight: a ray is
 * cast from the barrel along the aim line and damages the first enemy tank
 * it intersects. Terrain does not block it (the beam is a straight line).
 */

import { WeaponBase } from './WeaponBase.js';
import { EVT } from '../core/EventBus.js';

const RANGE = 1500;

export class Railgun extends WeaponBase {
  static get DEF() {
    return {
      id: 'railgun',
      name: 'Railgun',
      desc: 'Instant beam — wind ignored, massive single-target damage.',
      icon: 'railgun',
      color: '#7ef2ff',
      sound: 'laser',
      damage: 55,
      blastRadius: 26,
      ammo: 1,
      // Straight-line beam weapon: locked flat toward the enemy.
      fixedAngle: 0,
      minPower: 40,
      maxPower: 100,
    };
  }

  fire(ctx) {
    const { game, tank } = ctx;
    const tip = tank.getBarrelTip();
    const a = (tank.turret.angle * Math.PI) / 180;
    const dx = Math.cos(a) * RANGE;
    const dy = -Math.sin(a) * RANGE;

    // Raycast: closest enemy tank within the beam band.
    let hitTank = null;
    let bestProj = Infinity;
    const len2 = RANGE * RANGE;
    for (const t of game.tanks) {
      if (!t.alive || t === tank) continue;
      const tx = t.x;
      const ty = t.y - t.height * 0.1;
      const proj = ((tx - tip.x) * dx + (ty - tip.y) * dy) / len2;
      if (proj < 0 || proj > 1) continue;
      const px = tip.x + dx * proj;
      const py = tip.y + dy * proj;
      if (Math.hypot(tx - px, ty - py) > t.hitRadius) continue;
      if (proj < bestProj) {
        bestProj = proj;
        hitTank = t;
      }
    }

    game.beams.push({
      x1: tip.x,
      y1: tip.y,
      x2: tip.x + dx,
      y2: tip.y + dy,
      color: '#7ef2ff',
      width: 3,
      life: 0.25,
      maxLife: 0.25,
    });
    game.particles.muzzleFlash(tip.x, tip.y, tank.turret.angle, this.def.color);
    game.sound.play('fire');
    tank.turret.recoil = tank.turret.recoilMax;

    if (hitTank) {
      const destroyed = hitTank.takeDamage(game.masteryDamage(tank, this.def.id, this.def.damage));
      game.bus.emit(EVT.TANK_STATS, game._tankStatsPayload(hitTank));
      if (destroyed) {
        game.onTankDestroyed(hitTank, tank);
      } else {
        game.settings.recordStat('directHits', 1);
      }
      game.sound.play('damage');
      game.camera.addShake(9);
    }
  }

  onImpact() {
    // No projectile — nothing to resolve on impact.
  }
}
