/**
 * Sticky — a bomb that sticks to whatever it hits (tank or terrain) and
 * detonates when the turn ends. Stuck to a tank it guarantees a hit.
 * Unique 'sticky' voice + blinking stuck-bomb VFX.
 */

import { WeaponBase } from './WeaponBase.js';
import { Combat } from '../systems/Combat.js';
import { EVT } from '../core/EventBus.js';

export class Sticky extends WeaponBase {
  static get DEF() {
    return {
      id: 'sticky',
      name: 'Sticky Bomb',
      desc: 'Sticks to the enemy and detonates at the end of the turn.',
      icon: 'sticky',
      color: '#ffb347',
      sound: 'sticky',
      damage: 48,
      blastRadius: 40,
      ammo: 2,
      minAngle: 15,
      maxAngle: 165,
      minPower: 30,
      maxPower: 100,
    };
  }

  fire(ctx) {
    this._launchShell(ctx, {
      color: '#ffd28a',
      mass: 1.0,
      radius: 4,
      trailColor: '#ffb347',
      // Never ricochet: it sticks where it lands.
      bouncesLeft: 0,
      onImpact: (hit) => {
        const game = ctx.game;
        // Attach to the tank if we hit one, else stick to the ground.
        const host = hit.hitTank && hit.hitTank.alive ? hit.hitTank : null;
        const anchor = host ? { x: host.x, y: host.y - host.height * 0.2 } : { x: hit.x, y: hit.y };
        // Detonate when the current turn fully resolves.
        game._deferred.push({
          t: 0.9,
          fn: () => {
            const cx = host && host.alive ? host.x : anchor.x;
            const cy = host && host.alive ? host.y - host.height * 0.2 : anchor.y;
            Combat.explode({
              game,
              x: cx,
              y: cy,
              radius: this.def.blastRadius,
              damage: this.def.damage,
              owner: this.tank,
              color: '#ffb347',
              shake: 9,
            });
            game.sound.play('sticky');
          },
        });
        // Visual: a blinking bomb attached at the anchor until detonation.
        game.beams.push({
          x1: anchor.x, y1: anchor.y,
          x2: anchor.x, y2: anchor.y,
          color: '#ffb347',
          width: 10,
          life: 0.9, maxLife: 0.9,
        });
      },
    });
  }

  onImpact() {
    // Handled entirely in fire()'s onImpact hook (we override the shell's
    // impact so the bomb sticks instead of exploding immediately).
  }
}
