const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/jb/Desktop/Stack.html';
const destPath = path.join(__dirname, '../AnimalStack.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 1. Replace Matter.js CDN with local vendored library
html = html.replace(
  'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js',
  'libs/matter.min.js'
);

// 2. Define standard vector SVG strings for all former emojis
const SVG_ICONS = {
  paw: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display:inline-block;vertical-align:middle;"><path d="M12 10c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-5 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm10 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8.5 5.5c.8-1.5 2.1-2.5 3.5-2.5s2.7 1 3.5 2.5c.6 1.1.2 2.5-.9 3.1-1.3.8-3.9.9-5.2 0-1.1-.6-1.5-2-1-3.1z"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display:inline-block;vertical-align:middle;"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`,
  question: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  robot: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4m-4 5h.01m8 0h.01"/></svg>`,
  users: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="15 18 9 12 15 6"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:inline-block;vertical-align:middle;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ffb703" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>`,
  book: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#3a86ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style="display:inline-block;vertical-align:middle;"><polygon points="5 18 19 18 21 9 16 12 12 6 8 12 3 9 5 18"/></svg>`,
  smile: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  cool: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/><path d="M4 10h16M7 10c0 1.5 1 2.5 2.5 2.5S12 11.5 12 10m0 0c0 1.5 1 2.5 2.5 2.5S17 11.5 17 10"/></svg>`,
  hard: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`
};

// 3. Add Hub Controls & clean CSS
const hubCss = `
    .hub-bar {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      pointer-events: none;
    }
    .hub-btn {
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(30, 32, 34, 0.85);
      border: 2px solid var(--color-border);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 9999px;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transition: all 0.15s ease;
      font-family: var(--font-ui);
    }
    .hub-btn:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
      transform: translateY(-1px);
    }
`;
html = html.replace('</style>', hubCss + '\n  </style>');

// Add Hub bar inside #device-wrapper
const hubBarHtml = `
    <div class="hub-bar">
      <button class="hub-btn" onclick="returnToHub()" title="Return to Arcade Hub">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>HUB</span>
      </button>
      <button class="hub-btn" onclick="toggleHubFullscreen()" title="Toggle Fullscreen">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
    </div>
`;
html = html.replace('<div id="device-wrapper">', '<div id="device-wrapper">\n' + hubBarHtml);

// 4. Replace DOM emojis
// Title
html = html.replace('Animal Stack 🐾 — Remastered Arcade Physics', 'Animal Stack — Remastered Arcade Physics');
// Sound icon
html = html.replace('<span id="sound-icon" aria-hidden="true">🔊</span>', `<span id="sound-icon" aria-hidden="true">${SVG_ICONS.sound}</span>`);
// Trophy icon
html = html.replace('<span class="trophy-icon" aria-hidden="true">🏆</span>', `<span class="trophy-icon" aria-hidden="true">${SVG_ICONS.trophy}</span>`);
// Question icon
html = html.replace('<span aria-hidden="true">❓</span>', `<span aria-hidden="true">${SVG_ICONS.question}</span>`);
// Mascot emoji in start menu
html = html.replace('<span id="mascot-emoji">😈</span>', `<span id="mascot-emoji">${SVG_ICONS.hard}</span>`);
// Star ribbon
html = html.replace('<div class="star-ribbon">★ PRO</div>', `<div class="star-ribbon">${SVG_ICONS.star} PRO</div>`);
// Difficulty buttons
html = html.replace(/😊\s*EASY/, `${SVG_ICONS.smile} EASY`);
html = html.replace(/😎\s*MED/, `${SVG_ICONS.cool} MED`);
html = html.replace(/😈\s*HARD/, `${SVG_ICONS.hard} HARD`);
// Menu mode buttons
html = html.replace('<span aria-hidden="true">🏆</span> Play Solo Challenge', `<span aria-hidden="true">${SVG_ICONS.trophy}</span> Play Solo Challenge`);
html = html.replace('<span aria-hidden="true">🤖</span> Play vs. Smart Bot', `<span aria-hidden="true">${SVG_ICONS.robot}</span> Play vs. Smart Bot`);
html = html.replace('<span aria-hidden="true">👥</span> Pass &amp; Play vs. Friend', `<span aria-hidden="true">${SVG_ICONS.users}</span> Pass &amp; Play vs. Friend`);
// Back button chevron
html = html.replace('<span aria-hidden="true">❮</span>', `<span aria-hidden="true">${SVG_ICONS.chevronLeft}</span>`);
// Turn indicator
html = html.replace('<span id="turn-chip-icon" aria-hidden="true">👉</span>', `<span id="turn-chip-icon" aria-hidden="true">${SVG_ICONS.arrowRight}</span>`);
// Instructions hint
html = html.replace('<span>↔️ Drag to aim &bull; 🔄 Tap to spin</span>', '<span>Drag to aim &bull; Tap to spin</span>');
// Modal icons
html = html.replace('<div class="modal-trophy-hero" id="modal-gov-icon" aria-hidden="true">🎉</div>', `<div class="modal-trophy-hero" id="modal-gov-icon" aria-hidden="true">${SVG_ICONS.sparkles}</div>`);
html = html.replace('<div class="modal-trophy-hero" aria-hidden="true">📖</div>', `<div class="modal-trophy-hero" aria-hidden="true">${SVG_ICONS.book}</div>`);

// Replace JS emoji updates in GameEngine
html = html.replace("if (icon) icon.innerText = this.muted ? '🔇' : '🔊';",
  `if (icon) icon.innerHTML = this.muted ? '${SVG_ICONS.mute}' : '${SVG_ICONS.sound}';`);

html = html.replace("emoji.innerText = '😊';", `emoji.innerHTML = '${SVG_ICONS.smile}';`);
html = html.replace("emoji.innerText = '😎';", `emoji.innerHTML = '${SVG_ICONS.cool}';`);
html = html.replace("emoji.innerText = '😈';", `emoji.innerHTML = '${SVG_ICONS.hard}';`);

html = html.replace("icon.innerText = '👉';", `icon.innerHTML = '${SVG_ICONS.arrowRight}';`);
html = html.replace("icon.innerText = '🤖';", `icon.innerHTML = '${SVG_ICONS.robot}';`);
html = html.replace("icon.innerText = this.turn === 'player1' ? '👤' : '👥';",
  `icon.innerHTML = this.turn === 'player1' ? '${SVG_ICONS.user}' : '${SVG_ICONS.users}';`);

html = html.replace("let icon = '💥';", `let icon = '${SVG_ICONS.sparkles}';`);
html = html.replace("icon = '🏆';", `icon = '${SVG_ICONS.trophy}';`);
html = html.replace("icon = '🤖';", `icon = '${SVG_ICONS.robot}';`);
html = html.replace(/icon = '👑';/g, `icon = '${SVG_ICONS.crown}';`);

// 5. Add Hub protocol methods to script
const hubScript = `
  function returnToHub() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'closeGame' }, '*');
    } else {
      window.location.href = 'index.html';
    }
  }

  function toggleHubFullscreen() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'toggleFullscreen' }, '*');
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.action === 'parentFullscreenChange') {
      window.dispatchEvent(new Event('resize'));
    }
  });
`;

html = html.replace('<script>', '<script>\n' + hubScript);

fs.writeFileSync(destPath, html, 'utf8');
console.log('Saved elevated AnimalStack.html');
