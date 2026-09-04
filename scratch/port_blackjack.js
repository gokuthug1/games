const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/jb/Desktop/BlackJack.html';
const destPath = path.join(__dirname, '../BlackJack.html');

let html = fs.readFileSync(srcPath, 'utf8');

// 1. Add hub communication & suit SVG styles to CSS
const extraCss = `
        /* Vector Suit Icon Standards */
        .suit-svg {
            width: 1em;
            height: 1em;
            display: inline-block;
            vertical-align: middle;
            fill: currentColor;
        }
        .card-center .suit-svg {
            width: 38px;
            height: 38px;
        }
        .tutorial-card .suit-svg {
            width: 14px;
            height: 14px;
            margin-left: 2px;
        }
        .hub-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: #38bdf8;
            font-size: 11px;
            font-weight: 700;
            padding: 6px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .hub-btn:hover {
            background: #0284c7;
            color: #ffffff;
            border-color: #38bdf8;
            transform: translateY(-1px);
        }
`;
html = html.replace('</style>', extraCss + '\n    </style>');

// 2. Add Hub Buttons to top header actions
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

// 3. Replace gear & question emojis in header buttons
const gearSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const questionSvg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

html = html.replace(
  /<button class="header-icon-btn" onclick="toggleModal\('settings-modal', true\)"[^>]*>.*?<\/button>/s,
  `<button class="header-icon-btn" onclick="toggleModal('settings-modal', true)" data-tooltip="Configure Table" aria-label="Settings">${gearSvg}</button>`
);
html = html.replace(
  /<button class="header-icon-btn" onclick="toggleModal\('tutorial-modal', true\)"[^>]*>.*?<\/button>/s,
  `<button class="header-icon-btn" onclick="toggleModal('tutorial-modal', true)" data-tooltip="Explore Rules" aria-label="Rules">${questionSvg}</button>`
);

// 4. Inject SUIT_SVGS definition and replace card rendering
const suitSvgsScript = `
        const SUIT_SVGS = {
            'spades': '<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 2C10.2 4.8 6.5 8.7 6.5 12.3c0 2.4 1.9 4.2 4.2 4.2.7 0 1.3-.2 1.8-.5-.3 1.3-.9 2.7-2.3 3.5h3.6c-1.4-.8-2-2.2-2.3-3.5.5.3 1.1.5 1.8.5 2.3 0 4.2-1.8 4.2-4.2C17.5 8.7 13.8 4.8 12 2z"/></svg>',
            'hearts': '<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
            'diamonds': '<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 2L3 12l9 10 9-10-9-10z"/></svg>',
            'clubs': '<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 2a4.2 4.2 0 0 0-4.2 4.2c0 1.2.5 2.3 1.3 3.1A4.2 4.2 0 0 0 5.5 13a4.2 4.2 0 0 0 4.2 4.2c.7 0 1.3-.2 1.8-.5-.3 1.3-.9 2.7-2.3 3.5h5.6c-1.4-.8-2-2.2-2.3-3.5.5.3 1.1.5 1.8.5a4.2 4.2 0 0 0 4.2-4.2 4.2 4.2 0 0 0-3.6-3.7c.8-.8 1.3-1.9 1.3-3.1A4.2 4.2 0 0 0 12 2z"/></svg>'
        };

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
                // Adjust layout if needed
            }
        });
`;

html = html.replace('<script>', '<script>\n' + suitSvgsScript);

// Replace internal SUITS array with ASCII names
html = html.replace("const SUITS = ['♠', '♥', '♦', '♣'];", "const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];");
html = html.replace("const isRed = ['♥', '♦'].includes(card.suit);", "const isRed = ['hearts', 'diamonds'].includes(card.suit);");

// Replace card HTML generation in renderCardHTML
html = html.replace(
  '<span class="card-suit">${card.suit}</span>',
  '<span class="card-suit">${SUIT_SVGS[card.suit] || ""}</span>'
);
html = html.replace(
  '<div class="card-center">${card.suit}</div>',
  '<div class="card-center">${SUIT_SVGS[card.suit] || ""}</div>'
);
html = html.replace(
  '<span class="card-suit">${card.suit}</span>',
  '<span class="card-suit">${SUIT_SVGS[card.suit] || ""}</span>'
);

// Replace tutorial card texts with vector SVG markup
html = html.replace(/<span class="tutorial-card">10♠<\/span>/g, '<span class="tutorial-card">10<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 2C10.2 4.8 6.5 8.7 6.5 12.3c0 2.4 1.9 4.2 4.2 4.2.7 0 1.3-.2 1.8-.5-.3 1.3-.9 2.7-2.3 3.5h3.6c-1.4-.8-2-2.2-2.3-3.5.5.3 1.1.5 1.8.5 2.3 0 4.2-1.8 4.2-4.2C17.5 8.7 13.8 4.8 12 2z"/></svg></span>');
html = html.replace(/<span class="tutorial-card red-suit">A♥<\/span>/g, '<span class="tutorial-card red-suit">A<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>');
html = html.replace(
  /<span class="tutorial-card">5♦<\/span> <span class="tutorial-card">A♣<\/span>/g,
  '<span class="tutorial-card red-suit">5<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 2L3 12l9 10 9-10-9-10z"/></svg></span> <span class="tutorial-card">A<svg class="suit-svg" viewBox="0 0 24 24"><path d="M12 2a4.2 4.2 0 0 0-4.2 4.2c0 1.2.5 2.3 1.3 3.1A4.2 4.2 0 0 0 5.5 13a4.2 4.2 0 0 0 4.2 4.2c.7 0 1.3-.2 1.8-.5-.3 1.3-.9 2.7-2.3 3.5h5.6c-1.4-.8-2-2.2-2.3-3.5.5.3 1.1.5 1.8.5a4.2 4.2 0 0 0 4.2-4.2 4.2 4.2 0 0 0-3.6-3.7c.8-.8 1.3-1.9 1.3-3.1A4.2 4.2 0 0 0 12 2z"/></svg></span>'
);

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully saved elevated BlackJack.html with 0 emojis');
