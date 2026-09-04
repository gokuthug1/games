/**
 * main — entry point. Boots the Game once the DOM is ready.
 * Modules are deferred, so the DOM is already parsed here.
 */

import { Game } from './core/Game.js';
import { debug } from './utils/Debug.js';

function boot() {
  const root = document.getElementById('app');
  if (!root) {
    console.error('[main] missing #app element');
    return;
  }
  try {
    const game = new Game(root);
    // Exposed for debugging/troubleshooting (see README).
    window.__game = game;
    debug.log('Nebula Cannons booted', game.state.current);
  } catch (err) {
    console.error('[main] failed to boot the game', err);
    const msg = document.getElementById('boot-error');
    if (msg) msg.hidden = false;
  }
}

boot();
