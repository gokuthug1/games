const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === '.freebuff' || entry.name === 'node_modules') continue;
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy Aegis Protocol
const towerSrc = 'C:/Users/jb/Downloads/Tower';
const towerDest = path.join(__dirname, '../AegisProtocol');
console.log('Copying Aegis Protocol from', towerSrc, 'to', towerDest);
copyDirSync(towerSrc, towerDest);

// Elevate AegisProtocol/index.html with Hub controls
const aegisIndex = path.join(towerDest, 'index.html');
let aegisHtml = fs.readFileSync(aegisIndex, 'utf8');

const hubBarAegis = `
    <!-- Hub Navigation Overlay -->
    <div style="position: fixed; top: 12px; left: 12px; z-index: 9999; display: flex; gap: 8px;">
      <button onclick="returnToHub()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(10,13,20,0.85);backdrop-filter:blur(8px);border:1px solid #00f3ff;color:#00f3ff;padding:6px 14px;border-radius:6px;font-family:monospace;font-size:11px;font-weight:bold;cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        HUB
      </button>
      <button onclick="toggleHubFullscreen()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(10,13,20,0.85);backdrop-filter:blur(8px);border:1px solid #00f3ff;color:#00f3ff;padding:6px 14px;border-radius:6px;font-family:monospace;font-size:11px;font-weight:bold;cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        FULLSCREEN
      </button>
    </div>
    <script>
      function returnToHub() {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ action: 'closeGame' }, '*');
        } else {
          window.location.href = '../index.html';
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
    </script>
`;

if (!aegisHtml.includes('returnToHub()')) {
  aegisHtml = aegisHtml.replace('<body>', '<body>\n' + hubBarAegis);
  fs.writeFileSync(aegisIndex, aegisHtml, 'utf8');
  console.log('Elevated AegisProtocol/index.html with Hub controls');
}

// 2. Copy Nebula Cannons
const nebulaSrc = 'C:/Users/jb/Desktop/Nebula Cannons';
const nebulaDest = path.join(__dirname, '../NebulaCannons');
console.log('Copying Nebula Cannons from', nebulaSrc, 'to', nebulaDest);
copyDirSync(nebulaSrc, nebulaDest);

// Elevate NebulaCannons/index.html with Hub controls
const nebulaIndex = path.join(nebulaDest, 'index.html');
let nebulaHtml = fs.readFileSync(nebulaIndex, 'utf8');

const hubBarNebula = `
    <!-- Hub Navigation Overlay -->
    <div style="position: fixed; top: 12px; left: 12px; z-index: 9999; display: flex; gap: 8px;">
      <button onclick="returnToHub()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);border:1px solid #38bdf8;color:#38bdf8;padding:6px 14px;border-radius:9999px;font-family:sans-serif;font-size:11px;font-weight:bold;cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        HUB
      </button>
      <button onclick="toggleHubFullscreen()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);border:1px solid #38bdf8;color:#38bdf8;padding:6px 14px;border-radius:9999px;font-family:sans-serif;font-size:11px;font-weight:bold;cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        FULLSCREEN
      </button>
    </div>
    <script>
      function returnToHub() {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ action: 'closeGame' }, '*');
        } else {
          window.location.href = '../index.html';
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
    </script>
`;

if (!nebulaHtml.includes('returnToHub()')) {
  nebulaHtml = nebulaHtml.replace('<body>', '<body>\n' + hubBarNebula);
  fs.writeFileSync(nebulaIndex, nebulaHtml, 'utf8');
  console.log('Elevated NebulaCannons/index.html with Hub controls');
}
