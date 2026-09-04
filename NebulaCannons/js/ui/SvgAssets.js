/**
 * SvgAssets — reusable SVG templates for ALL interface graphics.
 * No raster images are used anywhere in the UI. Every icon is generated
 * as an inline SVG string so it stays crisp at any resolution and DPI.
 *
 * Icons use `currentColor` where sensible so CSS can tint them per state.
 */

/** Wrap inner markup in a full <svg> element. */
function svg(inner, w = 24, h = 24, cls = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// ---------------------------------------------------------------------------
// Real asset files: when the AssetManager has loaded `assets/svg/*.svg`, the
// icons/logo below prefer the file artwork and only fall back to the inline
// templates when a file is missing. The files are complete designs, so the
// wrapper must NOT inject fill/stroke defaults — it only sizes the viewBox.
// ---------------------------------------------------------------------------

// The registry lives on globalThis so every module instance of SvgAssets
// shares it. Dev servers that cache-bust imports per-importer can otherwise
// instantiate several copies of this module; Game registers the file art on
// its copy while the HUD/menus read from theirs, which silently drops every
// icon that exists only as file artwork (the weapons without inline
// fallbacks render as question marks).
const _fileSvgs = globalThis.__nebulaSvgFileSvgs || (globalThis.__nebulaSvgFileSvgs = {}); // key -> { viewBox, inner }

function parseSvgFile(text) {
  const vb = text.match(/viewBox="([^"]+)"/);
  const open = text.match(/<svg[^>]*>/i);
  const rootAttrs = open ? open[0] : '';
  const inner = text
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');
  return { viewBox: vb ? vb[1] : null, inner, rootAttrs };
}

/** Register loaded SVG files (keyed like 'ui/gear', 'weapons/cannon'). */
export function registerSvgFiles(map) {
  for (const [key, text] of Object.entries(map || {})) {
    if (typeof text === 'string' && text.includes('<svg')) {
      _fileSvgs[key] = parseSvgFile(text);
    }
  }
}

function wrapFile(f, w, h, cls) {
  const parts = f.viewBox ? f.viewBox.split(/\s+/).map(Number) : [0, 0, w, h];
  const vw = parts[2] || w;
  const vh = parts[3] || h;
  // Preserve presentation attributes that lived on the file's root <svg>
  // (fill/stroke/etc) so icons don't silently fall back to black-fill.
  const pick = (name) => {
    const m = new RegExp(`\\s${name}="([^"]+)"`).exec(f.rootAttrs);
    return m ? m[1] : null;
  };
  const attrs = [
    pick('fill') ? `fill="${pick('fill')}"` : '',
    pick('stroke') ? `stroke="${pick('stroke')}"` : '',
    pick('stroke-width') ? `stroke-width="${pick('stroke-width')}"` : '',
    pick('stroke-linecap') ? `stroke-linecap="${pick('stroke-linecap')}"` : '',
    pick('stroke-linejoin') ? `stroke-linejoin="${pick('stroke-linejoin')}"` : '',
  ].filter(Boolean).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${w}" height="${h}" class="${cls}" ${attrs} aria-hidden="true">${f.inner}</svg>`;
}

export const Svg = {
  svg,

  heart(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M12 20.5s-7.5-4.7-9.5-9.2C1.2 8 3 4.8 6.2 4.8c2 0 3.6 1.1 4.4 2.8h2.8c.8-1.7 2.4-2.8 4.4-2.8 3.2 0 5 3.2 3.7 6.5-2 4.5-9.5 9.2-9.5 9.2z"/>`,
      w, h, cls
    );
  },

  fuel(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M5 4h9v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4zM9.5 7h3.5M5 13h9"/><path d="M14 8h3l2 3v7a1.8 1.8 0 0 1-3.5 0V11"/>`,
      w, h, cls
    );
  },

  wind(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>`,
      w, h, cls
    );
  },

  windArrow(dir = 1, w = 24, h = 24, cls = '') {
    const arrow = dir >= 0
      ? `<path d="M4 12h14M13 6l6 6-6 6"/>`
      : `<path d="M20 12H6M11 6l-6 6 6 6"/>`;
    return svg(arrow, w, h, cls);
  },

  gear(w = 24, h = 24, cls = '') {
    return svg(
      `<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19"/>`,
      w, h, cls
    );
  },

  pause(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M8 5v14M16 5v14"/>`,
      w, h, cls
    );
  },

  play(w = 24, h = 24, cls = '') {
    return svg(`<path d="M7 4.5l13 7.5-13 7.5v-15z"/>`, w, h, cls);
  },

  back(w = 24, h = 24, cls = '') {
    return svg(`<path d="M14.5 4.5 7 12l7.5 7.5"/>`, w, h, cls);
  },

  close(w = 24, h = 24, cls = '') {
    return svg(`<path d="M6 6l12 12M18 6 6 18"/>`, w, h, cls);
  },

  crosshair(w = 24, h = 24, cls = '') {
    return svg(
      `<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>`,
      w, h, cls
    );
  },

  bolt(w = 24, h = 24, cls = '') {
    return svg(`<path d="M13 2 4.5 14H11l-1 8 8.5-12H12l1-8z"/>`, w, h, cls);
  },

  trophy(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 14v4M8.5 21h7M9.5 18h5"/>`,
      w, h, cls
    );
  },

  skull(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M12 3a8 8 0 0 0-8 8c0 3 1.6 4.9 3 6v3h10v-3c1.4-1.1 3-3 3-6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/>`,
      w, h, cls
    );
  },

  question(w = 24, h = 24, cls = '') {
    return svg(
      `<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.2 1-1.2 2.1M12 17h.01"/>`,
      w, h, cls
    );
  },

  keyboard(w = 24, h = 24, cls = '') {
    return svg(
      `<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9.5 14h5"/>`,
      w, h, cls
    );
  },

  touch(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M8 12.5V6a2 2 0 1 1 4 0v-1a2 2 0 1 1 4 0v2a2 2 0 1 1 4 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4l-2.5-3.6a1.8 1.8 0 0 1 3-2z"/>`,
      w, h, cls
    );
  },

  info(w = 24, h = 24, cls = '') {
    return svg(
      `<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>`,
      w, h, cls
    );
  },

  fire(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M12 3s5 4.2 5 8.5a5 5 0 0 1-10 0C7 7.2 12 3 12 3z"/><path d="M12 21a2.5 2.5 0 0 0 2.5-2.5c0-1.4-1.4-2.6-2.5-4-1.1 1.4-2.5 2.6-2.5 4A2.5 2.5 0 0 0 12 21z"/>`,
      w, h, cls
    );
  },

  arrowLeft(w = 24, h = 24, cls = '') {
    return svg(`<path d="M19 12H5M11 6l-6 6 6 6"/>`, w, h, cls);
  },

  arrowRight(w = 24, h = 24, cls = '') {
    return svg(`<path d="M5 12h14M13 6l6 6-6 6"/>`, w, h, cls);
  },

  arrowUp(w = 24, h = 24, cls = '') {
    return svg(`<path d="M12 19V5M6 11l6-6 6 6"/>`, w, h, cls);
  },

  arrowDown(w = 24, h = 24, cls = '') {
    return svg(`<path d="M12 5v14M6 13l6 6 6-6"/>`, w, h, cls);
  },

  target(w = 24, h = 24, cls = '') {
    return svg(
      `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>`,
      w, h, cls
    );
  },

  lock(w = 24, h = 24, cls = '') {
    return svg(
      `<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3M12 14.5v2.4"/>`,
      w, h, cls
    );
  },

  minimap(w = 24, h = 24, cls = '') {
    return svg(
      `<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><path d="M12 8.5v7M8.5 12h7"/>`,
      w, h, cls
    );
  },

  shield(w = 24, h = 24, cls = '') {
    return svg(
      `<path d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V6l8-3.5z"/>`,
      w, h, cls
    );
  },

  // ------------------------------------------------------------ weapons

  weaponIcon(id, w = 28, h = 28, cls = '') {
    const file = _fileSvgs[`weapons/${id}`];
    if (file) return wrapFile(file, w, h, cls);
    const fn = this.weaponIcons[id];
    return fn ? fn(w, h, cls) : this.question(w, h, cls);
  },

  weaponIcons: {
    cannon(w = 28, h = 28, cls = '') {
      return svg(
        `<path d="M2.5 17h6v3h-6zM8 18.5h13M21 18.5V15l-5-4h-8"/><circle cx="5.5" cy="18.5" r="3"/>`,
        w, h, cls
      );
    },
    cluster(w = 28, h = 28, cls = '') {
      return svg(
        `<circle cx="14" cy="14" r="4.5"/><circle cx="14" cy="4.5" r="2.4"/><circle cx="22.5" cy="9" r="2.4"/><circle cx="19" cy="19.5" r="2.4"/><circle cx="6" cy="20" r="2.4"/><circle cx="3.5" cy="9" r="2.4"/>`,
        w, h, cls
      );
    },
    nuke(w = 28, h = 28, cls = '') {
      return svg(
        `<path d="M14 4.5a7 7 0 0 1 7 7c0 2.4-1 3.7-1.6 5H8.6C8 15.2 7 13.9 7 11.5a7 7 0 0 1 7-7z"/><path d="M9 18.5h10M11 21.5h6M10.5 9a4 4 0 0 1 7 0"/>`,
        w, h, cls
      );
    },
    splitter(w = 28, h = 28, cls = '') {
      return svg(
        `<path d="M3 15h8v-2h5.5M21 7v8h-4.5"/><path d="M14.5 13h3v3M21 15l-3.5 3.5"/>`,
        w, h, cls
      );
    },
    dirt(w = 28, h = 28, cls = '') {
      return svg(
        `<path d="M3 19c2.5-6 6-6 8.5 0s6-6 8.5 0M3 19h22"/>`,
        w, h, cls
      );
    },
    bouncer(w = 28, h = 28, cls = '') {
      return svg(
        `<circle cx="21" cy="7" r="4"/><path d="M3 19c3-8 6-6 7-2l2 1M12 18c2-6 5-8 6-7"/>`,
        w, h, cls
      );
    },
  },

  // ------------------------------------------------------------ logo

  logo(w = 320, h = 96, cls = '') {
    if (_fileSvgs.logo) return wrapFile(_fileSvgs.logo, w, h, cls);
    return svg(
      `<g stroke-width="2">
        <path d="M12 78h70a10 10 0 0 0 10-10V14a10 10 0 0 0-10-10H12"/>
        <path d="M52 20v22M38 32h28"/>
        <circle cx="52" cy="52" r="7"/>
        <path d="M52 59v14"/>
      </g>
      <g stroke-width="1.5">
        <path d="M118 26h60a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8h-60zM152 22v10"/>
        <circle cx="118" cy="40" r="4"/><circle cx="178" cy="40" r="4"/>
        <path d="M205 34h34l10 10-10 10h-34z"/>
      </g>
      <path d="M240 30l6-6 6 6-6 6z" stroke-width="1.5"/>`,
      w, h, cls
    );
  },

  /** Decorative chevron divider used between menu items. */
  chevron(w = 16, h = 16, cls = '') {
    return svg(`<path d="M6 3l6 5-6 5"/>`, w, h, cls);
  },
};

// Prefer the real icon files (when loaded) over the inline templates above.
const FILE_ICON_NAMES = {
  heart: 'ui/heart', fuel: 'ui/fuel', wind: 'ui/wind', gear: 'ui/gear',
  pause: 'ui/pause', play: 'ui/play', back: 'ui/back', close: 'ui/close',
  crosshair: 'ui/crosshair', bolt: 'ui/bolt', trophy: 'ui/trophy',
  skull: 'ui/skull', question: 'ui/question', keyboard: 'ui/keyboard',
  touch: 'ui/touch', info: 'ui/info', fire: 'ui/fire',
  arrowLeft: 'ui/arrow-left', arrowRight: 'ui/arrow-right',
  arrowUp: 'ui/arrow-up', arrowDown: 'ui/arrow-down',
  target: 'ui/target', shield: 'ui/shield', chevron: 'ui/chevron',
  lock: 'ui/lock', minimap: 'ui/minimap',
};
for (const [method, key] of Object.entries(FILE_ICON_NAMES)) {
  const orig = Svg[method].bind(Svg);
  Svg[method] = function (w, h, cls) {
    const file = _fileSvgs[key];
    if (file) return wrapFile(file, w, h, cls);
    return orig(w, h, cls);
  };
}
