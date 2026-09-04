/**
 * UIManager — owns the HUD, menu screens and modals, and decides which is
 * visible based on game state. The UI layer observes the game; it never
 * becomes the source of truth for gameplay.
 */

import { HUD } from './HUD.js';
import { MenuManager } from './MenuManager.js';
import { ModalManager } from './ModalManager.js';
import { GameStates } from '../core/GameState.js';
import { EVT } from '../core/EventBus.js';

const MENU_SCREENS = new Set([
  GameStates.MENU, GameStates.GAME_MODE_SELECT, GameStates.GARAGE,
  GameStates.WEAPON_SELECT, GameStates.MAP_SELECT, GameStates.SETTINGS,
]);

export class UIManager {
  /**
   * @param {object} game
   * @param {HTMLElement} hudRoot
   * @param {HTMLElement} menuRoot
   * @param {HTMLElement} modalRoot
   */
  constructor(game, hudRoot, menuRoot, modalRoot) {
    this.game = game;
    this.modals = new ModalManager(modalRoot);
    this.menu = new MenuManager(menuRoot, game, this.modals);
    this.hud = new HUD(hudRoot, game);

    game.bus.on(EVT.STATE_CHANGE, (d) => this._onState(d));
  }

  _onState({ to }) {
    // The HUD belongs to the battlefield: keep it off every menu screen so
    // interactive controls never linger behind an overlay.
    const matchView = new Set([
      GameStates.LOADING, GameStates.PLAYER_TURN, GameStates.PROJECTILE_FLIGHT,
      GameStates.EXPLOSION, GameStates.ENEMY_TURN, GameStates.VICTORY,
      GameStates.DEFEAT,
    ]);
    this.hud.root.classList.toggle('hud-hidden', !matchView.has(to));
    switch (to) {
      case GameStates.MENU:
        this.menu.showScreen('main');
        break;
      case GameStates.GAME_MODE_SELECT:
        this.menu.showScreen('modes');
        break;
      case GameStates.MAP_SELECT:
        this.menu.showScreen('maps');
        break;
      case GameStates.WEAPON_SELECT:
        this.menu.showScreen('loadout');
        break;
      case GameStates.GARAGE:
        this.menu.showScreen('garage');
        break;
      case GameStates.SETTINGS:
        this.menu.showScreen('settings');
        break;
      case GameStates.LOADING:
        this.menu.hideAll();
        break;
      case GameStates.PAUSED:
        this.menu.showScreen('pause');
        break;
      case GameStates.VICTORY:
      case GameStates.DEFEAT:
        this.menu.showScreen('result');
        break;
      default:
        this.menu.hideAll();
        break;
    }
  }

  toast(text) {
    this.hud.toast(text);
  }

  setOnlineStatus(text, kind = '') {
    this.menu.setOnlineStatus(text, kind);
  }
}
