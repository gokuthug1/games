/**
 * AssetManager — loads the game's real asset files (SVG artwork and WAV
 * audio) with a graceful-fallback contract:
 *
 *   - Every file is optional. If it is missing, unreadable or too slow,
 *     the game keeps working with its built-in procedural fallbacks
 *     (inline SVG icons + Web Audio synthesis).
 *   - `load()` resolves even when individual files fail, so the game never
 *     blocks on assets.
 *   - A hard timeout caps the total wait so the menu is never delayed
 *     more than a fraction of a second.
 *
 * Loaded SVG text is registered with SvgAssets (icons/logo) or converted
 * into drawable `Image`s (tank sprites, background layers). WAV files are
 * kept as raw ArrayBuffers — the SoundManager decodes them lazily on the
 * first user gesture so the AudioContext is created exactly once.
 */

const SVG_FILES = [
  // logo + backgrounds
  'logo', 'bg-menu', 'bg-nebula',
  // tank sprites
  'tanks/tank-a', 'tanks/tank-b', 'tanks/tank-wreck',
  // weapon icons
  'weapons/cannon', 'weapons/cluster', 'weapons/nuke',
  'weapons/splitter', 'weapons/dirt', 'weapons/bouncer',
  'weapons/homing', 'weapons/drone', 'weapons/fireball',
  'weapons/railgun', 'weapons/barrage', 'weapons/mine',
  'weapons/turret', 'weapons/emp', 'weapons/gravity',
  'weapons/cryo', 'weapons/leech', 'weapons/shield',
  'weapons/airstrike', 'weapons/orbital', 'weapons/sniper',
  'weapons/smoke', 'weapons/tesla', 'weapons/sticky',
  'weapons/flash', 'weapons/napalm', 'weapons/plasma', 'weapons/boomerang',
  // ui icons
  'ui/gear', 'ui/pause', 'ui/play', 'ui/back', 'ui/close', 'ui/heart',
  'ui/fuel', 'ui/wind', 'ui/trophy', 'ui/skull', 'ui/keyboard', 'ui/touch',
  'ui/shield', 'ui/info', 'ui/question', 'ui/target', 'ui/crosshair',
  'ui/bolt', 'ui/chevron', 'ui/fire', 'ui/arrow-left', 'ui/arrow-right',
  'ui/arrow-up', 'ui/arrow-down',
];

const AUDIO_FILES = [
  'fire', 'explosion', 'bounce', 'split', 'thud', 'damage', 'click',
  'hover', 'victory', 'defeat', 'error', 'move', 'music',
];

const IMAGE_FILES = ['tanks/tank-a', 'tanks/tank-b', 'tanks/tank-wreck', 'bg-nebula'];

const LOAD_TIMEOUT_MS = 5000;

export class AssetManager {
  constructor(base = 'assets') {
    this.base = base.replace(/\/+$/, '');
    /** key -> raw svg text */
    this.svgs = {};
    /** key -> Image (created from svg text) */
    this.images = {};
    /** name -> ArrayBuffer (wav) */
    this.audioRaw = {};
    this.loaded = false;
    this.failed = [];
    this._imageRequests = new Map();
  }

  /**
   * Fetch every asset. Resolves with a summary; never rejects.
   * @param {(progress: number) => void} [onProgress] 0..1
   */
  async load(onProgress) {
    const tasks = [];
    const total = SVG_FILES.length + AUDIO_FILES.length;
    let done = 0;
    const tick = () => {
      done += 1;
      if (onProgress) onProgress(Math.min(1, done / total));
    };

    for (const key of SVG_FILES) {
      tasks.push(
        this._fetchText(key)
          .then((text) => { this.svgs[key] = text; })
          .catch(() => this.failed.push(key))
          .finally(tick)
      );
    }
    for (const name of AUDIO_FILES) {
      tasks.push(
        this._fetchArrayBuffer(`sound/${name}.wav`)
          .then((buf) => { this.audioRaw[name] = buf; })
          .catch(() => this.failed.push(`sound/${name}`))
          .finally(tick)
      );
    }

    await Promise.race([
      Promise.allSettled(tasks),
      new Promise((resolve) => setTimeout(resolve, LOAD_TIMEOUT_MS)),
    ]);

    // Rasterize the SVG artwork we need on canvas into Image objects.
    for (const key of IMAGE_FILES) {
      const text = this.svgs[key];
      if (text) this._imageFromSvg(key, text);
    }

    this.loaded = true;
    return { ok: total - this.failed.length, total, failed: this.failed };
  }

  /** Map of every loaded svg: key -> full svg text. */
  svgTexts() {
    return { ...this.svgs };
  }

  /** Raw WAV bytes for a sound name, or null. */
  audio(name) {
    return this.audioRaw[name] || null;
  }

  /** An Image for a key, or null if unavailable/not-yet-loaded. */
  image(key) {
    return this.images[key] || null;
  }

  // ------------------------------------------------------------ internals

  async _fetchText(key) {
    const res = await fetch(`${this.base}/svg/${key}.svg`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  async _fetchArrayBuffer(relPath) {
    const res = await fetch(`${this.base}/${relPath}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  }

  /** Build a drawable Image from inline SVG text (data URL — works offline). */
  _imageFromSvg(key, text) {
    if (this._imageRequests.has(key)) return;
    const img = new Image();
    this._imageRequests.set(key, img);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    img.onload = () => {
      if (img.complete && img.naturalWidth > 0) this.images[key] = img;
    };
    img.onerror = () => this.failed.push(key);
    img.src = dataUrl;
  }
}
