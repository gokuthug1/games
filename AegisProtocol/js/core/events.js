/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Event Bus Architecture
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for event "${event}":`, err);
        }
      }
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export const events = new EventBus();

export const EVENTS = {
  // Game Lifecycle
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_OVER: 'game:over',
  GAME_VICTORY: 'game:victory',
  GAME_SPEED_CHANGE: 'game:speed_change',
  
  // Economy & Resources
  CREDITS_CHANGED: 'resource:credits_changed',
  LIVES_CHANGED: 'resource:lives_changed',
  ENERGY_CHANGED: 'resource:energy_changed',
  SCORE_CHANGED: 'resource:score_changed',
  
  // Wave Events
  WAVE_PREPARE: 'wave:prepare',
  WAVE_START: 'wave:start',
  WAVE_SPAWN_ENEMY: 'wave:spawn_enemy',
  WAVE_COMPLETE: 'wave:complete',
  BOSS_SPAWNED: 'wave:boss_spawned',
  BOSS_DEFEATED: 'wave:boss_defeated',
  
  // Combat Events
  ENEMY_DAMAGED: 'combat:enemy_damaged',
  ENEMY_KILLED: 'combat:enemy_killed',
  ENEMY_REACHED_GOAL: 'combat:enemy_reached_goal',
  TOWER_PLACED: 'combat:tower_placed',
  TOWER_UPGRADED: 'combat:tower_upgraded',
  TOWER_SOLD: 'combat:tower_sold',
  TOWER_SELECTED: 'combat:tower_selected',
  TOWER_TARGET_CHANGED: 'combat:tower_target_changed',
  ABILITY_TRIGGERED: 'combat:ability_triggered',
  
  // UI & System
  SCREEN_CHANGED: 'ui:screen_changed',
  TOAST_NOTIFY: 'ui:toast_notify',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  MAP_SAVED: 'editor:map_saved',
  AUTONOMOUS_AI_TOGGLED: 'ai:autonomous_toggled',
  AUTONOMOUS_AI_DECISION: 'ai:decision_made'
};
