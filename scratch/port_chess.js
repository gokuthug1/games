const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/jb/Desktop/chess.html';
const destPath = path.join(__dirname, '../Chess.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 1. Add hub button styling and SVG icon styling
const hubCss = `
    .hub-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .hub-btn:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
      transform: translateY(-1px);
    }
    .btn-svg-icon {
      width: 15px;
      height: 15px;
      display: inline-block;
      vertical-align: middle;
    }
`;
html = html.replace('</style>', hubCss + '\n  </style>');

// 2. Replace header buttons with SVG icons and add Hub + Fullscreen buttons
const soundSvg = `<svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const muteSvg = `<svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
const flipSvg = `<svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`;
const gearSvg = `<svg class="btn-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

html = html.replace(
  '<button class="header-btn" id="btn-header-sound" title="Toggle Sound">🔊 Sound</button>',
  `<button class="header-btn" id="btn-header-sound" title="Toggle Sound">${soundSvg} Sound</button>`
);
html = html.replace(
  '<button class="header-btn" id="btn-header-flip" title="Flip Board">🔄 Flip</button>',
  `<button class="header-btn" id="btn-header-flip" title="Flip Board">${flipSvg} Flip</button>`
);
html = html.replace(
  '<button class="header-btn" id="btn-header-settings" title="Settings">⚙️ Settings</button>',
  `<button class="header-btn" id="btn-header-settings" title="Settings">${gearSvg} Settings</button>`
);

// Add Hub and Fullscreen buttons before the existing header buttons
const hubButtonsHtml = `
      <button class="hub-btn" onclick="returnToHub()" title="Return to Arcade Hub">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>HUB</span>
      </button>
      <button class="hub-btn" onclick="toggleHubFullscreen()" title="Toggle Fullscreen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
`;
html = html.replace('<div class="header-actions">', '<div class="header-actions">' + hubButtonsHtml);

// 3. Replace dynamic textContent toggle with SVG content
html = html.replace(
  'e.currentTarget.textContent = chessSound.enabled ? "🔊 Sound" : "🔇 Muted";',
  `const isSnd = chessSound.enabled;
      e.currentTarget.innerHTML = (isSnd ? '${soundSvg}' : '${muteSvg}') + (isSnd ? ' Sound' : ' Muted');`
);

// 4. Inject hub communication protocol methods
const hubProtocolScript = `
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
        if (typeof chessBoard !== 'undefined' && chessBoard.resize) {
          chessBoard.resize();
        }
      }
    });
`;
html = html.replace('<script>', '<script>\n' + hubProtocolScript);

fs.writeFileSync(destPath, html, 'utf8');
console.log('Saved elevated Chess.html');
