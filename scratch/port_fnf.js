const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/jb/Desktop/fnf.html';
const destPath = path.join(__dirname, '../FridayNightFunkin.html');

let html = fs.readFileSync(srcPath, 'utf8');

// Add Hub header & touch overlay styles
const extraCss = `
    /* Arcade Hub Controls & Mobile Overlay */
    .hub-header {
      position: fixed;
      top: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      pointer-events: none;
    }
    .hub-btn-group {
      display: flex;
      gap: 8px;
      pointer-events: auto;
    }
    .hub-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 9999px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .hub-btn:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
      transform: translateY(-1px);
    }
    .hub-btn.active-bot {
      background: rgba(225, 29, 72, 0.9);
      border-color: #f43f5e;
      color: #ffffff;
    }

    /* Mobile Touch Arrow Bar */
    #mobile-touch-bar {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      z-index: 999;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
    }
    .touch-note-btn {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(6px);
      border: 3px solid rgba(255, 255, 255, 0.25);
      cursor: pointer;
      touch-action: manipulation;
      transition: transform 0.08s ease, filter 0.08s ease;
    }
    .touch-note-btn:active, .touch-note-btn.pressed {
      transform: scale(0.92);
      filter: brightness(1.4);
    }
    .touch-note-btn.left { border-color: #c24b99; box-shadow: 0 0 15px rgba(194, 75, 153, 0.4); color: #c24b99; }
    .touch-note-btn.down { border-color: #00ffff; box-shadow: 0 0 15px rgba(0, 255, 255, 0.4); color: #00ffff; }
    .touch-note-btn.up { border-color: #12fa05; box-shadow: 0 0 15px rgba(18, 250, 5, 0.4); color: #12fa05; }
    .touch-note-btn.right { border-color: #f9393f; box-shadow: 0 0 15px rgba(249, 57, 63, 0.4); color: #f9393f; }
    .touch-note-btn svg { width: 32px; height: 32px; fill: currentColor; }

    @media (max-height: 600px) {
      .touch-note-btn { width: 50px; height: 50px; }
      .touch-note-btn svg { width: 26px; height: 26px; }
    }
`;

html = html.replace('</style>', extraCss + '\n  </style>');

// Add Hub header HTML and Touch Bar HTML right after <body>
const hubHtml = `
  <!-- Arcade Hub Overlay -->
  <div class="hub-header">
    <div class="hub-btn-group">
      <button class="hub-btn" onclick="returnToHub()" title="Return to Arcade Hub">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>HUB</span>
      </button>
      <button class="hub-btn" onclick="toggleHubFullscreen()" title="Toggle Fullscreen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
    </div>
    <div class="hub-btn-group">
      <button id="btn-toggle-botplay" class="hub-btn" onclick="toggleBotPlayUI()" title="Toggle AI BotPlay (B key)">
        <span>BOTPLAY: OFF</span>
      </button>
    </div>
  </div>

  <!-- Mobile On-Screen Touch Controls -->
  <div id="mobile-touch-bar">
    <button class="touch-note-btn left" data-dir="0" aria-label="Left Arrow">
      <svg viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7v14z"/></svg>
    </button>
    <button class="touch-note-btn down" data-dir="1" aria-label="Down Arrow">
      <svg viewBox="0 0 24 24"><path d="M5 9l7 7 7-7H5z"/></svg>
    </button>
    <button class="touch-note-btn up" data-dir="2" aria-label="Up Arrow">
      <svg viewBox="0 0 24 24"><path d="M5 15l7-7 7 7H5z"/></svg>
    </button>
    <button class="touch-note-btn right" data-dir="3" aria-label="Right Arrow">
      <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7V5z"/></svg>
    </button>
  </div>
`;

html = html.replace('<body>', '<body>\n' + hubHtml);

// Inject Hub JS communication & touch button listeners
const extraJs = `
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

  function toggleBotPlayUI() {
    if (window.__gameInstance) {
      window.__gameInstance.settings.autoPlay = !window.__gameInstance.settings.autoPlay;
      window.__gameInstance.saveSettings();
      updateBotPlayBtn();
    }
  }

  function updateBotPlayBtn() {
    const btn = document.getElementById('btn-toggle-botplay');
    if (!btn || !window.__gameInstance) return;
    const isBot = window.__gameInstance.settings.autoPlay;
    btn.classList.toggle('active-bot', isBot);
    btn.querySelector('span').textContent = 'BOTPLAY: ' + (isBot ? 'ON' : 'OFF');
  }

  // Bind touch note buttons
  function initTouchControls(game) {
    window.__gameInstance = game;
    updateBotPlayBtn();

    const buttons = document.querySelectorAll('.touch-note-btn');
    buttons.forEach(btn => {
      const dir = parseInt(btn.getAttribute('data-dir'), 10);
      
      const press = (e) => {
        e.preventDefault();
        audio.init();
        audio.resume();
        btn.classList.add('pressed');

        if (game.state === 'PLAYING' && !game.settings.autoPlay) {
          game.keysHeld[dir] = true;
          game.handlePlayerInput(dir);
        } else if (game.state === 'TITLE' || game.state === 'GAME_OVER') {
          audio.playMenuConfirm();
          if (game.state === 'TITLE') game.state = 'MAIN_MENU';
          else if (game.state === 'GAME_OVER') game.startSong(game.currentSong);
        } else if (game.state === 'MAIN_MENU') {
          if (dir === 1) { // Down
            game.selectedMenuIndex = (game.selectedMenuIndex + 1) % 3;
            audio.playMenuScroll();
          } else if (dir === 2) { // Up
            game.selectedMenuIndex = (game.selectedMenuIndex - 1 + 3) % 3;
            audio.playMenuScroll();
          } else { // Confirm
            audio.playMenuConfirm();
            if (game.selectedMenuIndex === 0) game.startSong(SONGS[0]);
            else if (game.selectedMenuIndex === 1) game.state = 'SONG_SELECT';
            else if (game.selectedMenuIndex === 2) { game.previousState = 'MAIN_MENU'; game.state = 'SETTINGS'; }
          }
        }
      };

      const release = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (game.state === 'PLAYING' && !game.settings.autoPlay) {
          game.keysHeld[dir] = false;
        }
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
    });

    // Touch tap canvas to advance menus
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.addEventListener('pointerdown', () => {
        audio.init();
        audio.resume();
        if (game.state === 'TITLE') {
          audio.playMenuConfirm();
          game.state = 'MAIN_MENU';
        }
      });
    }
  }

  // Safe pointerdown audio unlock
  window.addEventListener('pointerdown', () => {
    audio.init();
    audio.resume();
  }, { once: true });
`;

html = html.replace('const game = new Game();', 'const game = new Game();\ninitTouchControls(game);');
html = html.replace('<script>', '<script>\n' + extraJs);

fs.writeFileSync(destPath, html, 'utf8');
console.log('Saved elevated FridayNightFunkin.html');
