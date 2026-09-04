/**
 * EventBus — tiny pub/sub used to decouple UI from gameplay.
 * The HUD observes game state through events; it never mutates it directly.
 */

export const EVT = Object.freeze({
  STATE_CHANGE: 'state:change',
  MATCH_START: 'match:start',
  MATCH_END: 'match:end',
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  WIND_CHANGE: 'wind:change',
  TANK_STATS: 'tank:stats', // { id, health, fuel, power, angle }
  TANK_DESTROYED: 'tank:destroyed',
  WEAPON_CHANGE: 'weapon:change', // { id, weapons: [{id, ammo}], activeIndex }
  PAUSE_CHANGE: 'pause:change',
  SETTINGS_CHANGE: 'settings:change',
  ONLINE_STATUS: 'online:status',
  TOAST: 'toast', // { text, kind }
});

export class EventBus {
  constructor() {
    this._map = new Map();
  }

  on(ev, fn) {
    if (!this._map.has(ev)) this._map.set(ev, new Set());
    this._map.get(ev).add(fn);
    return () => this.off(ev, fn);
  }

  once(ev, fn) {
    const off = this.on(ev, (data) => {
      off();
      fn(data);
    });
    return off;
  }

  off(ev, fn) {
    const set = this._map.get(ev);
    if (set) set.delete(fn);
  }

  emit(ev, data) {
    const set = this._map.get(ev);
    if (!set) return;
    // Copy so handlers can subscribe/unsubscribe mid-emit safely.
    for (const fn of [...set]) {
      try {
        fn(data);
      } catch (err) {
        console.error(`[EventBus] handler for "${ev}" threw`, err);
      }
    }
  }

  clear() {
    this._map.clear();
  }
}
