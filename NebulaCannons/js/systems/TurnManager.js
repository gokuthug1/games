/**
 * TurnManager — owns turn order, wind, and the controlled turn sequence:
 *
 *   start turn -> roll wind -> (human input | AI drives) -> fire
 *   -> projectiles fly -> explosions resolve -> victory check -> next turn
 *
 * A turn never ends while projectiles or explosions are still active; the
 * Game calls onEffectsResolved() once everything has settled.
 */

import { GameStates } from '../core/GameState.js';
import { EVT } from '../core/EventBus.js';
import { CONFIG } from '../core/Config.js';
import { debug } from '../utils/Debug.js';

export class TurnManager {
  /**
   * @param {object} game Game instance
   */
  constructor(game) {
    this.game = game;
    this.players = []; // [{ type: 'human'|'ai', tank, name }]
    this.currentIndex = 0;
    this.turnNumber = 0;
    this.wind = 0;
  }

  setup(players) {
    this.players = players;
    this.currentIndex = 0;
    this.turnNumber = 0;
  }

  activePlayer() {
    return this.players[this.currentIndex];
  }

  activeTank() {
    return this.players[this.currentIndex]?.tank || null;
  }

  rollWind() {
    const P = CONFIG.PHYSICS;
    this.wind = this.game.rng.int(P.WIND_MIN, P.WIND_MAX);
    this.game.bus.emit(EVT.WIND_CHANGE, { wind: this.wind });
    return this.wind;
  }

  /** Begin the match: first turn. */
  begin() {
    this.turnNumber = 0;
    this.startTurn(0);
  }

  /** Start the turn for player at `index`. */
  startTurn(index) {
    const player = this.players[index];
    if (!player) return;
    this.currentIndex = index;
    // New turn: hand the camera back to auto-follow (unlock player pan).
    this.game.camera.followLocked = false;

    // EMP Wave: a stunned player's next turn is cancelled (flag cleared once).
    if (player.tank.stunned) {
      player.tank.stunned = false;
      if (this.game.ui) this.game.ui.toast(`${player.name} is EMP-shocked — turn skipped`);
      this.game.sound.play('error');
      this.game.bus.emit(EVT.TURN_END, { playerIndex: index, skipped: true });
      const next = (index + 1) % this.players.length;
      this.startTurn(next);
      return;
    }

    this.turnNumber += 1;
    this.rollWind();

    // Fresh movement allowance each turn; fuel fully restores when depleted.
    player.tank.resetFuel();
    if (this.game.ui) {
      this.game.bus.emit(EVT.TANK_STATS, this.game._tankStatsPayload(player.tank));
      // Keep the HUD weapon chips in sync with the incoming tank. Without
      // this, the chips only refresh on fire/switch and show the previous
      // tank's loadout at the start of every turn.
      this.game.bus.emit(EVT.WEAPON_CHANGE, this.game.weaponChangePayload(player.tank));
    }

    // A tank whose turn begins with no ammo calls in a supply drop.
    this.game._maybeRequestSupply(player.tank);

    const state =
      player.type === 'ai' ? GameStates.ENEMY_TURN : GameStates.PLAYER_TURN;
    if (!this.game.state.transition(state, { playerIndex: index })) {
      console.warn(`[TurnManager] startTurn(${index}) rejected: state is "${this.game.state.current}" and "${state}" is not reachable from here.`);
    }

    this.game.bus.emit(EVT.TURN_START, {
      playerIndex: index,
      name: player.name,
      color: player.tank.color,
      type: player.type,
      wind: this.wind,
      turn: this.turnNumber,
    });

    this.game.camera.followTarget(player.tank.x, player.tank.y - 40);

    if (player.type === 'ai') {
      this.game.ai.beginTurn(player.tank);
    }
  }

  /** Fire the active tank's current weapon. */
  fire() {
    const tank = this.activeTank();
    if (!tank || !this.game.state.is(GameStates.PLAYER_TURN, GameStates.ENEMY_TURN)) {
      return false;
    }
    const fired = this.game.fireTank(tank);
    if (fired) {
      this.game.state.transition(GameStates.PROJECTILE_FLIGHT);
    }
    return fired;
  }

  /**
   * Called by the Game when all projectiles and explosions have resolved.
   * Checks victory, then advances the turn.
   */
  onEffectsResolved() {
    if (this.game.checkVictory()) return;
    this.game.bus.emit(EVT.TURN_END, { playerIndex: this.currentIndex });
    const next = (this.currentIndex + 1) % this.players.length;
    debug.log('turn resolved', this.currentIndex, '->', next, 'state', this.game.state.current);
    this.startTurn(next);
  }
}
