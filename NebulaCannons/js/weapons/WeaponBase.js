/**
 * WeaponBase — abstract interface shared by every weapon.
 * Subclasses override fire() and onImpact(); the static DEF object carries
 * balance/UI metadata so new weapons are pure data + two methods.
 */

import { Physics } from '../systems/Physics.js';

export class WeaponBase {
  /**
   * @param {import('../entities/Tank.js').Tank} tank the tank wielding this weapon
   */
  constructor(tank) {
    if (new.target === WeaponBase) {
      throw new Error('WeaponBase is abstract; create a concrete weapon class.');
    }
    this.tank = tank;
  }

  /** Static metadata: { id, name, desc, icon, color, damage, blastRadius, ammo } */
  static get DEF() {
    throw new Error('Weapon must define static DEF metadata.');
  }

  static get ID() {
    return this.DEF.id;
  }

  get def() {
    return this.constructor.DEF;
  }

  /** Fired by the tank: spawn projectiles and visual/sound feedback. */
  fire(ctx) {
    throw new Error(`Weapon "${this.def.id}" must implement fire().`);
  }

  /**
   * Called when one of this weapon's projectiles impacts.
   * @param {object} ctx { game, projectile, x, y, hitTank }
   * @param {object} hit raw collision result { type, tank }
   */
  onImpact(ctx, hit) {
    throw new Error(`Weapon "${this.def.id}" must implement onImpact().`);
  }

  /** Helper: standard single-shot launch shared by most weapons. */
  _launchShell(ctx, opts = {}) {
    const { game, tank } = ctx;
    const tip = tank.getBarrelTip();
    const { vx, vy } = Physics.initialVelocity(tank.turret.angle, tank.power);

    let proj;
    proj = game.spawnProjectile({
      pos: { x: tip.x, y: tip.y },
      vel: { x: vx, y: vy },
      weaponId: this.def.id,
      owner: tank,
      color: opts.color || '#ffe14d',
      mass: opts.mass || 1,
      radius: opts.radius || 5,
      maxLife: opts.maxLife,
      onImpact: (hit) =>
        this.onImpact({ game, projectile: proj, x: hit.x, y: hit.y, hitTank: hit.tank }, hit),
      onSplit: opts.onSplit ? () => opts.onSplit({ game, projectile: proj }) : null,
      onSteer: opts.onSteer ? (c) => opts.onSteer({ game, projectile: proj, dt: c.dt }) : null,
      splitDistance: opts.splitDistance || 0,
      bouncesLeft: opts.bouncesLeft || 0,
      bounceFactor: opts.bounceFactor,
      trailColor: opts.trailColor,
      trailInterval: opts.trailInterval,
    });

    tank.turret.recoil = tank.turret.recoilMax;
    game.particles.muzzleFlash(tip.x, tip.y, tank.turret.angle, this.def.color);
    // Every weapon has its own firing voice (see SoundManager synth
    // switch + assets/sound/*.wav); plain shells default to 'fire'.
    game.sound.play(this.def.sound || 'fire');
    return proj;
  }
}
