const fs = require('fs');
const path = require('path');

const files = [
  'C:/Users/jb/Desktop/BlackJack.html',
  'C:/Users/jb/Desktop/chess.html',
  'C:/Users/jb/Desktop/fnf.html',
  'C:/Users/jb/Desktop/Stack.html',
  'C:/Users/jb/Downloads/Tower/index.html',
  'C:/Users/jb/Desktop/Nebula Cannons/index.html'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  console.log('==============================');
  console.log('File:', f);
  const scriptMatches = content.match(/<script[^>]*src=["']([^"']+)["']/gi) || [];
  console.log('Scripts:', scriptMatches);
  const cdnMatches = content.match(/https?:\/\/[^\s"'`<>]+/gi) || [];
  const uniqueCdns = [...new Set(cdnMatches.filter(u => !u.includes('w3.org') && !u.includes('fonts.googleapis.com') && !u.includes('fonts.gstatic.com')))];
  console.log('External URLs (excluding fonts/svg):', uniqueCdns);

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
  const emojis = content.match(emojiRegex) || [];
  const uniqueEmojis = [...new Set(emojis)];
  console.log('Emojis count:', emojis.length, 'Unique:', uniqueEmojis.slice(0, 15));
}
