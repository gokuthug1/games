/**
 * Physics — projectile motion helpers.
 *
 * Coordinate system: y is DOWN in screen space, so gravity is positive and
 * an "up" shot has a negative vertical velocity component. Angles are in
 * degrees measured counter-clockwise from east (0 = east, 90 = up).
 *
 * The integration lives on Projectile.integrate so the AI can reuse the
 * exact same code path; these helpers build initial conditions and compute
 * wind acceleration.
 */

import { CONFIG } from '../core/Config.js';
import { degToRad } from '../utils/MathUtils.js';

export const Physics = {
  /**
   * Horizontal acceleration caused by wind for a projectile of the given mass.
   * @param {number} wind signed wind units (-15..15)
   * @param {number} mass projectile mass (heavier -> less wind influence)
   */
  windAcceleration(wind, mass = 1) {
    return (wind * CONFIG.PHYSICS.WIND_SCALE) / mass;
  },

  /**
   * Initial velocity vector for a shot.
   * @param {number} angleDeg degrees from east, CCW (90 = up)
   * @param {number} power 0..100
   * @returns {{vx: number, vy: number}} px/s
   */
  initialVelocity(angleDeg, power) {
    const speed = power * CONFIG.PHYSICS.POWER_SCALE;
    const a = degToRad(angleDeg);
    return {
      vx: Math.cos(a) * speed,
      vy: -Math.sin(a) * speed, // up = negative y
    };
  },

  /**
   * Advance a projectile one fixed step. Thin wrapper over the entity method
   * so systems never duplicate integration math.
   */
  step(projectile, dt, wind, gravity = CONFIG.PHYSICS.GRAVITY) {
    projectile.integrate(dt, Physics.windAcceleration(wind, projectile.mass), gravity);
  },
};
