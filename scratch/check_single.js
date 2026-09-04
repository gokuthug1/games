const fs = require('fs');

const file = process.argv[2] || 'FridayNightFunkin.html';
const content = fs.readFileSync(file, 'utf8');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
const emojis = content.match(emojiRegex) || [];
console.log(file, 'Emojis:', emojis.length, [...new Set(emojis)]);

const scripts = content.match(/<script[^>]*src=["']([^"']+)["']/gi) || [];
console.log(file, 'External scripts:', scripts);

const cdnMatches = content.match(/https?:\/\/[^\s"'`<>]+/gi) || [];
const cdns = [...new Set(cdnMatches.filter(u => !u.includes('w3.org') && !u.includes('fonts.googleapis.com') && !u.includes('fonts.gstatic.com')))];
console.log(file, 'CDNs:', cdns);
