/**
 * GameState — centralized, validated state machine.
 * Unrelated UI components cannot mutate gameplay state directly; they must
 * request a transition through here, and invalid transitions are rejected.
 */

import { EventBus, EVT } from './EventBus.js';

export const GameStates = Object.freeze({
  BOOT: 'BOOT',
  MENU: 'MENU',
  GAME_MODE_SELECT: 'GAME_MODE_SELECT',
  GARAGE: 'GARAGE',
  WEAPON_SELECT: 'WEAPON_SELECT',
  MAP_SELECT: 'MAP_SELECT',
  LOADING: 'LOADING',
  PLAYER_TURN: 'PLAYER_TURN',
  PROJECTILE_FLIGHT: 'PROJECTILE_FLIGHT',
  EXPLOSION: 'EXPLOSION',
  ENEMY_TURN: 'ENEMY_TURN',
  PAUSED: 'PAUSED',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
  SETTINGS: 'SETTINGS',
});

/** States that mean "a match is in progress". */
export const IN_MATCH = new Set([
  GameStates.LOADING,
  GameStates.PLAYER_TURN,
  GameStates.PROJECTILE_FLIGHT,
  GameStates.EXPLOSION,
  GameStates.ENEMY_TURN,
  GameStates.PAUSED,
  GameStates.VICTORY,
  GameStates.DEFEAT,
]);

/** Explicit allowed transitions. Anything else is rejected (defense in depth). */
const ALLOWED = {
  [GameStates.BOOT]: [GameStates.MENU, GameStates.SETTINGS],
  [GameStates.MENU]: [
    GameStates.GAME_MODE_SELECT,
    GameStates.GARAGE,
    GameStates.SETTINGS,
    GameStates.WEAPON_SELECT,
    GameStates.LOADING,
  ],
  [GameStates.GAME_MODE_SELECT]: [GameStates.MENU, GameStates.MAP_SELECT, GameStates.LOADING],
  [GameStates.MAP_SELECT]: [GameStates.GAME_MODE_SELECT, GameStates.WEAPON_SELECT, GameStates.LOADING],
  [GameStates.WEAPON_SELECT]: [GameStates.MAP_SELECT, GameStates.LOADING, GameStates.MENU],
  [GameStates.GARAGE]: [GameStates.MENU, GameStates.WEAPON_SELECT],
  [GameStates.LOADING]: [GameStates.PLAYER_TURN, GameStates.MENU],
  [GameStates.PLAYER_TURN]: [GameStates.PROJECTILE_FLIGHT, GameStates.PAUSED, GameStates.VICTORY, GameStates.DEFEAT],
  [GameStates.PROJECTILE_FLIGHT]: [GameStates.EXPLOSION, GameStates.PLAYER_TURN, GameStates.ENEMY_TURN, GameStates.VICTORY, GameStates.DEFEAT, GameStates.PAUSED],
  [GameStates.EXPLOSION]: [GameStates.PROJECTILE_FLIGHT, GameStates.PLAYER_TURN, GameStates.ENEMY_TURN, GameStates.VICTORY, GameStates.DEFEAT, GameStates.PAUSED],
  [GameStates.ENEMY_TURN]: [GameStates.PROJECTILE_FLIGHT, GameStates.PAUSED, GameStates.VICTORY, GameStates.DEFEAT],
  [GameStates.PAUSED]: [GameStates.PLAYER_TURN, GameStates.ENEMY_TURN, GameStates.EXPLOSION, GameStates.PROJECTILE_FLIGHT, GameStates.LOADING, GameStates.MENU, GameStates.SETTINGS],
  [GameStates.SETTINGS]: [GameStates.MENU, GameStates.PAUSED, GameStates.PLAYER_TURN, GameStates.ENEMY_TURN],
  [GameStates.VICTORY]: [GameStates.MENU, GameStates.LOADING],
  [GameStates.DEFEAT]: [GameStates.MENU, GameStates.LOADING],
};

export class GameState {
  constructor(bus = new EventBus()) {
    this.bus = bus;
    this.current = GameStates.BOOT;
    this.payload = null;
  }

  is(...states) {
    return states.includes(this.current);
  }

  inMatch() {
    return IN_MATCH.has(this.current);
  }

  /**
   * Request a state transition. Rejects invalid transitions (logged, ignored)
   * unless force=true is passed for internal recovery paths.
   */
  transition(to, payload = null, force = false) {
    if (!GameStates[to]) {
      console.error(`[GameState] unknown target state "${to}"`);
      return false;
    }
    if (!force && !(ALLOWED[this.current] || []).includes(to)) {
      console.warn(
        `[GameState] rejected transition ${this.current} -> ${to} (not allowed)`
      );
      return false;
    }
    const from = this.current;
    this.current = to;
    this.payload = payload;
    this.bus.emit(EVT.STATE_CHANGE, { from, to, payload });
    return true;
  }
}
