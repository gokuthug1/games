/**
 * KeyboardInput — captures key events into the shared Input state.
 * Key mapping is read from Settings.bindings (remappable in the settings UI).
 */

export class KeyboardInput {
  /**
   * @param {object} input shared Input
   * @param {() => object} getBindings returns { action: [codes] }
   */
  constructor(input, getBindings) {
    this.input = input;
    this.getBindings = getBindings;
    this._down = new Set();

    this._onKeyDown = (e) => {
      const code = e.code;
      if (!code) return;
      // Let rebind capture work without triggering gameplay.
      if (this.input.rebindCapture && this.input.rebindCapture(e)) return;

      const bindings = this.getBindings();
      for (const [action, codes] of Object.entries(bindings)) {
        if (codes.includes(code)) {
          e.preventDefault();
          if (
            action === 'fire' || action === 'weaponNext' || action === 'weaponPrev' ||
            action === 'pause' || action === 'zoomIn' || action === 'zoomOut'
          ) {
            if (!e.repeat) this.input.press(action);
          } else {
            this._down.add(action);
          }
          break;
        }
      }
    };

    this._onKeyUp = (e) => {
      const bindings = this.getBindings();
      for (const [action, codes] of Object.entries(bindings)) {
        if (codes.includes(e.code)) {
          this._down.delete(action);
          break;
        }
      }
    };

    this._onBlur = () => {
      this._down.clear();
      this.input.clearAll();
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  /** Resolve held direction for the given action names (positive then negative). */
  held(...actions) {
    for (const a of actions) if (this._down.has(a)) return true;
    return false;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
