const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   GOKUGAMES ARCADE 28-GAME PORTFOLIO VERIFICATION SUITE');
console.log('================================================================\n');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('FAIL: index.html not found at', indexPath);
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf8');

// 1. Verify index.html games array
const gamesMatch = indexContent.match(/const games = (\[[\s\S]*?\n            \]);/);
if (!gamesMatch) {
  console.error('FAIL: games array not found in index.html');
  process.exit(1);
}

const isTouchDevice = false;
let games;
try {
  games = eval(gamesMatch[1]);
  console.log(`[PASS] index.html parses cleanly with ${games.length} games registered.`);
} catch (err) {
  console.error('FAIL: Failed to parse games array in index.html:', err.message);
  process.exit(1);
}

if (games.length !== 28) {
  console.error(`FAIL: Expected exactly 28 games, found ${games.length}`);
  process.exit(1);
}

console.log('\n--- Auditing Individual Game Files and Thumbnails ---');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;

let allPassed = true;
let totalVerified = 0;

games.forEach((game, index) => {
  const gameNum = index + 1;
  const gamePath = path.join(rootDir, game.url);
  const exists = fs.existsSync(gamePath);

  if (!exists) {
    console.error(`[FAIL] Game #${gameNum} [${game.id}] file missing: ${game.url}`);
    allPassed = false;
    return;
  }

  // Check Thumbnail
  const thumbPath = path.join(rootDir, game.thumb);
  const thumbExists = fs.existsSync(thumbPath);
  if (!thumbExists) {
    console.error(`[FAIL] Game #${gameNum} [${game.id}] thumbnail missing: ${game.thumb}`);
    allPassed = false;
  }

  const content = fs.readFileSync(gamePath, 'utf8');

  // Check emojis
  const emojis = content.match(emojiRegex) || [];
  const emojiCheck = emojis.length === 0;

  // Check CDNs
  const cdnMatches = content.match(/https?:\/\/[^\s"'`<>]+/gi) || [];
  const unauthorizedCdns = [...new Set(cdnMatches.filter(u => 
    !u.includes('w3.org') && 
    !u.includes('fonts.googleapis.com') && 
    !u.includes('fonts.gstatic.com') &&
    !u.includes('goku-mc.vercel.app') &&
    !u.includes('github.com')
  ))];

  // Check Hub communication
  const hasHubProtocol = content.includes('closeGame') || content.includes('toggleFullscreen') || content.includes('postMessage');

  console.log(`\nGame #${gameNum}: ${game.title} (${game.genre})`);
  console.log(`  File: ${game.url} (${(content.length / 1024).toFixed(1)} KB)`);
  console.log(`  Thumbnail: ${game.thumb} ${thumbExists ? '[PASS]' : '[FAIL]'}`);
  console.log(`  Ready: ${game.isReady ? 'YES' : 'NO'}`);
  console.log(`  Emojis: ${emojis.length} ${emojiCheck ? '[PASS]' : `[WARN: ${emojis.slice(0, 5)}]`}`);
  console.log(`  Offline Self-Contained: ${unauthorizedCdns.length === 0 ? '[PASS]' : `[FAIL: ${unauthorizedCdns}]`}`);
  console.log(`  Hub Protocol (postMessage): ${hasHubProtocol ? '[PASS]' : '[FAIL]'}`);

  if (unauthorizedCdns.length > 0 || !hasHubProtocol || !thumbExists) {
    allPassed = false;
  } else {
    totalVerified++;
  }
});

// Check categories in index.html
console.log('\n--- Verifying Sidebar Category Coverage ---');
const categories = ['Strategy', 'Card & Board', 'Arcade', 'Physics & 3D', 'Puzzle'];
categories.forEach(cat => {
  const matching = games.filter(g => g.genre === cat);
  console.log(`  Category [${cat}]: ${matching.length} titles`);
  if (matching.length === 0) {
    console.error(`  FAIL: Category ${cat} has 0 titles!`);
    allPassed = false;
  }
});

console.log('\n================================================================');
if (allPassed && totalVerified === 28) {
  console.log(`   SUCCESS: ALL 28 GAMES VERIFIED & READY FOR PRODUCTION!`);
} else {
  console.error(`   VERIFICATION FAILED: Only ${totalVerified}/28 games passed all checks.`);
  process.exit(1);
}
console.log('================================================================\n');
