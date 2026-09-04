/**
 * Debug — gated logging helpers. Everything is silent unless enabled,
 * so normal gameplay stays unobtrusive. Enabled via settings or ?debug=1.
 */

const debug = {
  enabled: false,

  /** Overlay hooks filled in by the Game once UI exists. */
  overlay: null,

  setEnabled(v) {
    debug.enabled = !!v;
  },

  log(...args) {
    if (debug.enabled) console.log('[debug]', ...args);
  },

  info(...args) {
    if (debug.enabled) console.info('[debug]', ...args);
  },

  warn(...args) {
    // Warnings are useful during development even when debug is off.
    if (debug.enabled || true) console.warn('[debug]', ...args);
  },

  error(...args) {
    console.error('[debug]', ...args);
  },

  time(label) {
    if (debug.enabled) console.time(`[debug] ${label}`);
  },

  timeEnd(label) {
    if (debug.enabled) console.timeEnd(`[debug] ${label}`);
  },
};

/** Parse ?debug=1 from the URL at load time. */
try {
  const params = new URLSearchParams(window.location.search);
  debug.enabled = params.get('debug') === '1';
} catch {
  /* non-browser environment */
}

export { debug };
