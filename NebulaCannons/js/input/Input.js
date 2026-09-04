/**
 * Input — aggregates keyboard, mouse, touch and HUD buttons into one
 * per-frame intent object the Game reads. Discretes (fire, weapon switch,
 * pause) are edge-triggered: they fire once per press.
 */

import { KeyboardInput } from './KeyboardInput.js';
import { MouseInput } from './MouseInput.js';
import { TouchInput } from './TouchInput.js';

export class Input {
  /**
   * @param {object} game
   * @param {HTMLCanvasElement} canvas
   */
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;

    this.keyboard = new KeyboardInput(this, () => game.settings.get('bindings'));
    this.mouse = new MouseInput(this, canvas);
    this.touch = new TouchInput(this, canvas);

    this.pointer = { x: 0, y: 0, active: false };
    this.pointerMoved = false; // true only after an actual mouse gesture
    this.sliderPower = null;
    this.aimLocked = false; // right-click toggles: freezes the turret angle
    this._touchFlags = new Set();
    this._joystickX = 0; // -1..1 horizontal joystick deflection (touch)

    // Edge-triggered queue.
    this._discrete = new Set();
    this.rebindCapture = null;
    this._heldState = {
      moveLeft: false, moveRight: false, aimUp: false, aimDown: false,
      powerUp: false, powerDown: false,
    };
  }

  /** Called by KeyboardInput on a discrete press. */
  press(action) {
    this._discrete.add(action);
  }

  /**
   * Horizontal joystick (touch): stores the analog deflection for the `move`
   * getter. The deadzone is applied when reading `move`, and Tank.move scales
   * its speed by the deflection so a small tilt creeps and a hard push runs.
   * @param {number} v -1..1 deflection; 0 releases.
   */
  setJoystick(v) {
    this._joystickX = v;
  }

  /** Set by HUD touch buttons. */
  setTouch(action, active) {
    if (active) this._touchFlags.add(action);
    else this._touchFlags.delete(action);
    if (action === 'fire' && active) this._discrete.add('fire');
    if (action === 'weaponNext' && active) this._discrete.add('weaponNext');
    if (action === 'weaponPrev' && active) this._discrete.add('weaponPrev');
    if (action === 'pause' && active) this._discrete.add('pause');
  }

  setPowerFromSlider(v) {
    this.sliderPower = v;
  }

  /** Toggle the aim lock (right-click). Returns the new state. */
  toggleAimLock() {
    this.aimLocked = !this.aimLocked;
    return this.aimLocked;
  }

  adjustPowerFromWheel(dir) {
    this._discrete.add(dir > 0 ? 'powerUpTick' : 'powerDownTick');
  }

  /** Wheel now controls camera zoom (power has keys + slider + touch). */
  zoomFromWheel(dir) {
    this._discrete.add(dir > 0 ? 'zoomInTick' : 'zoomOutTick');
  }

  setWeaponIndex(i) {
    this.game.requestWeaponIndex(i);
  }

  clearAll() {
    this._discrete.clear();
    this._touchFlags.clear();
    this._joystickX = 0;
    this.pointer.active = false;
    this.pointerMoved = false;
    this.sliderPower = null;
    for (const k of Object.keys(this._heldState)) this._heldState[k] = false;
  }

  /** Called once per frame; returns true if a discrete action was consumed. */
  consume(action) {
    if (this._discrete.has(action)) {
      this._discrete.delete(action);
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------- reads

  get move() {
    const k = this.keyboard;
    const t = this._touchFlags;
    // Discrete sources (keyboard, touch buttons) are full-strength and win
    // over the analog joystick when held.
    let v = 0;
    if (k.held('moveLeft') || t.has('moveLeft')) v -= 1;
    if (k.held('moveRight') || t.has('moveRight')) v += 1;
    if (v !== 0) return v;
    // Joystick deflection is analog: past the deadzone it drives Tank.move
    // at a speed proportional to the deflection.
    const j = this._joystickX;
    if (Math.abs(j) > 0.25) return j;
    return 0;
  }

  get aim() {
    const k = this.keyboard;
    const t = this._touchFlags;
    let v = 0;
    if (k.held('aimUp') || t.has('aimUp')) v -= 1;
    if (k.held('aimDown') || t.has('aimDown')) v += 1;
    return v;
  }

  get power() {
    const k = this.keyboard;
    const t = this._touchFlags;
    let v = 0;
    if (k.held('powerUp') || t.has('powerUp')) v += 1;
    if (k.held('powerDown') || t.has('powerDown')) v -= 1;
    return v;
  }

  get firePressed() {
    return this.consume('fire');
  }

  get weaponNextPressed() {
    return this.consume('weaponNext');
  }

  get weaponPrevPressed() {
    return this.consume('weaponPrev');
  }

  get pausePressed() {
    return this.consume('pause');
  }

  /** Wheel-based power nudges. */
  get powerTicks() {
    let n = 0;
    while (this.consume('powerUpTick')) n += 1;
    while (this.consume('powerDownTick')) n -= 1;
    return n;
  }

  /** Wheel-based camera zoom nudges. */
  get zoomTicks() {
    let n = 0;
    while (this.consume('zoomInTick')) n += 1;
    while (this.consume('zoomOutTick')) n -= 1;
    return n;
  }

  get zoomInPressed() {
    return this.consume('zoomIn');
  }

  get zoomOutPressed() {
    return this.consume('zoomOut');
  }

  /** Take the slider power if set (clears it). */
  takeSliderPower() {
    const v = this.sliderPower;
    this.sliderPower = null;
    return v;
  }
}
