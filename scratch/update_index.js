const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Update Sidebar Genres in HTML
const newGenresHtml = `
                <!-- Genres Section -->
                <div>
                    <h2 class="sidebar-heading text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Genres</h2>
                    <ul class="space-y-1">
                        <li>
                            <button type="button" data-filter="Strategy" class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-sm text-left">
                                <svg class="w-5 h-5 flex-shrink-0 text-sky-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                                <span class="sidebar-text">Strategy</span>
                            </button>
                        </li>
                        <li>
                            <button type="button" data-filter="Card & Board" class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-sm text-left">
                                <svg class="w-5 h-5 flex-shrink-0 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                <span class="sidebar-text">Card &amp; Board</span>
                            </button>
                        </li>
                        <li>
                            <button type="button" data-filter="Arcade" class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-sm text-left">
                                <svg class="w-5 h-5 flex-shrink-0 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                                <span class="sidebar-text">Arcade</span>
                            </button>
                        </li>
                        <li>
                            <button type="button" data-filter="Physics & 3D" class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-sm text-left">
                                <svg class="w-5 h-5 flex-shrink-0 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                <span class="sidebar-text">Physics &amp; 3D</span>
                            </button>
                        </li>
                        <li>
                            <button type="button" data-filter="Puzzle" class="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-sm text-left">
                                <svg class="w-5 h-5 flex-shrink-0 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                <span class="sidebar-text">Puzzle</span>
                            </button>
                        </li>
                    </ul>
                </div>
`;

// Replace existing genres block
const oldGenresRegex = /<!-- Genres Section -->[\s\S]*?<\/aside>/;
html = html.replace(oldGenresRegex, newGenresHtml + '\n            </div>\n        </aside>');

// 2. Define the complete 16 games array
const complete16GamesJS = `
            const games = [
                { 
                    id: "td-desktop",
                    title: "Candy Tower Defense", 
                    genre: "Strategy", 
                    url: "Tower-Defense.html", 
                    altUrl: "Tower-DefenseM.html",
                    altId: "td-mobile",
                    isMobile: false,  
                    isTrending: true,
                    isReady: true,
                    desc: "Desktop Edition with full mouse controls, hotkeys, Aegis AI Commander, and mathematical combat depth.",
                    badge: !isTouchDevice ? "Recommended" : null,
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "March 2026",
                    orientation: "Landscape",
                    tags: ["Strategy", "Tower Defense", "AI Commander", "Math Engine", "Hotkeys", "Tactical"],
                    controls: [
                        { key: "Left Click", action: "Select tower to build / inspect placed tower" },
                        { key: "1 – 8 Keys", action: "Quick-select towers 1 through 8" },
                        { key: "Space", action: "Start wave / Toggle pause" },
                        { key: "P", action: "Pause or resume combat simulation" },
                        { key: "U", action: "Upgrade selected tower to next tier" },
                        { key: "S", action: "Sell selected tower for refund" },
                        { key: "T", action: "Cycle priority (First, Last, Strong, Weak)" },
                        { key: "Esc", action: "Deselect tower or close inspector" },
                        { key: "A", action: "Toggle Aegis Autonomous AI Commander" }
                    ]
                },
                { 
                    id: "td-mobile",
                    title: "Candy TD Mobile", 
                    genre: "Strategy", 
                    url: "Tower-DefenseM.html", 
                    altUrl: "Tower-Defense.html",
                    altId: "td-desktop",
                    isMobile: true,   
                    isTrending: true,
                    isReady: true,
                    desc: "Touch-optimized edition designed specifically for smartphones, tablets, and gesture controls.",
                    badge: isTouchDevice ? "Recommended" : "Touch Ready",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "March 2026",
                    orientation: "Portrait",
                    tags: ["Strategy", "Tower Defense", "AI Commander", "Touch Ready", "Mobile", "Casual"],
                    controls: [
                        { key: "Tap Bottom Menu", action: "Select tower archetype to build" },
                        { key: "Tap Green Pasture", action: "Place tower (green highlight = valid)" },
                        { key: "Tap Placed Tower", action: "Open upgrade & target inspector drawer" },
                        { key: "Tap Mode Pills", action: "Switch target priority (First, Last, Strong, Weak)" },
                        { key: "Top HUD Icons", action: "AI Commander, pause, audio, speed, ranges" }
                    ]
                },
                { 
                    id: "chess-studio",
                    title: "Grandmaster Chess Studio", 
                    genre: "Card & Board", 
                    url: "Chess.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Premier vector chess studio featuring Minimax AI engine, PGN move logs, evaluation bar, and board themes.",
                    badge: "Grandmaster AI",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Board", "Chess", "Minimax AI", "PGN History", "Themes", "Tabletop"],
                    controls: [
                        { key: "Left Click / Tap", action: "Select piece and view valid move highlights" },
                        { key: "Drag & Drop", action: "Smoothly drag piece to target square" },
                        { key: "Flip Button", action: "Invert board orientation (White/Black perspective)" },
                        { key: "Sound Toggle", action: "Mute or enable procedural chess audio" },
                        { key: "Settings Modal", action: "Configure AI difficulty depth and visual themes" }
                    ]
                },
                { 
                    id: "aegis-vector",
                    title: "Aegis Protocol: Vector Defense", 
                    genre: "Strategy", 
                    url: "AegisProtocol/index.html", 
                    isMobile: false, 
                    isTrending: true,
                    isReady: true,
                    desc: "Hardcore sci-fi tactical vector defense featuring an 8-sector campaign, research tech tree, and map editor.",
                    badge: "Campaign + Editor",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["Strategy", "Vector Sci-Fi", "Tech Tree", "Campaign", "Map Editor", "Hardcore"],
                    controls: [
                        { key: "Left Click", action: "Select and deploy defense turrets" },
                        { key: "Right Click", action: "Clear selection or cancel build preview" },
                        { key: "Space / Hotkeys", action: "Trigger sector abilities and wave launch" },
                        { key: "Research Lab", action: "Upgrade vector modules and unlock prototype turrets" },
                        { key: "HUB Button", action: "Return to Arcade Hub anytime" }
                    ]
                },
                { 
                    id: "blackjack-royal",
                    title: "Royal Blackjack Casino", 
                    genre: "Card & Board", 
                    url: "BlackJack.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Authentic Vegas-rules casino blackjack featuring hand splitting, double-down, insurance, and realistic chip physics.",
                    badge: "Vegas Rules",
                    rating: "4.7 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["Casino", "Blackjack", "Cards", "Vegas", "Bankroll", "Chips"],
                    controls: [
                        { key: "Click / Tap Chips", action: "Select wager denomination ($5, $25, $100, $500, $1K)" },
                        { key: "Deal Button", action: "Commit bet and deal initial hands" },
                        { key: "Hit Button", action: "Request an additional card" },
                        { key: "Stand Button", action: "End turn and let dealer play" },
                        { key: "Double / Split", action: "Double wager or split matching ranks" }
                    ]
                },
                { 
                    id: "solitaire-classic",
                    title: "Classic Klondike Solitaire", 
                    genre: "Card & Board", 
                    url: "Solitaire.html", 
                    isMobile: true, 
                    isTrending: false,
                    isReady: true,
                    desc: "Timeless Klondike Solitaire with smart single-tap auto-move, foundation auto-complete, and unlimited undo.",
                    badge: "Auto Complete",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Card Game", "Solitaire", "Klondike", "Auto Finish", "Undo", "Relaxing"],
                    controls: [
                        { key: "Tap Card", action: "Smart auto-move to foundation or valid column" },
                        { key: "Tap Stock Deck", action: "Draw next card or recycle waste pile" },
                        { key: "Undo Button", action: "Revert previous card moves seamlessly" },
                        { key: "Auto Finish", action: "Cascade remaining cards into foundations on clear" }
                    ]
                },
                { 
                    id: "nebula-cannons",
                    title: "Nebula Cannons", 
                    genre: "Physics & 3D", 
                    url: "NebulaCannons/index.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Neon 2D turn-based artillery duel with destructible procedural terrain, 20+ exotic weapons, and predictive bot AI.",
                    badge: "20+ Weapons",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["Artillery", "Physics", "Destruction", "Neon", "Turn-Based", "Weapons"],
                    controls: [
                        { key: "Angle & Power Sliders", action: "Calibrate turret elevation and muzzle velocity" },
                        { key: "Weapon Tray", action: "Select from 20+ projectile types (Nuke, Cluster, Laser)" },
                        { key: "Fire Button", action: "Discharge weapon towards enemy coordinates" },
                        { key: "Movement Fuel", action: "Reposition tank across destructible terrain" }
                    ]
                },
                { 
                    id: "stack-physics",
                    title: "Animal Stack Arcade", 
                    genre: "Physics & 3D", 
                    url: "AnimalStack.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Remastered Matter.js 2D physics stacking arcade with combo multipliers, wobble tipping, and smart bot duel.",
                    badge: "Matter.js Physics",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Portrait",
                    tags: ["Physics", "Matter.js", "Arcade", "Stacking", "Bot Duel", "Casual"],
                    controls: [
                        { key: "Drag / Aim Cursor", action: "Position swinging crane over target platform" },
                        { key: "Rotate Buttons / R", action: "Rotate animal block 45 degrees clockwise" },
                        { key: "Drop Button / Space", action: "Release animal into the physics stack" },
                        { key: "Difficulty Toggle", action: "Switch between Easy, Medium, and Pro Hardcore" }
                    ]
                },
                { 
                    id: "fnf-rhythm",
                    title: "Friday Night Funkin' Web", 
                    genre: "Physics & 3D", 
                    url: "FridayNightFunkin.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Full procedural Web Audio rhythm synth engine featuring zero latency, on-screen touch arrows, and AI BotPlay.",
                    badge: "Web Synth",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["Rhythm", "Synth", "Music", "FNF", "BotPlay", "Touch Ready"],
                    controls: [
                        { key: "D / F / J / K or Arrows", action: "Hit Left, Down, Up, and Right incoming rhythm notes" },
                        { key: "Mobile Touch Buttons", action: "Tap on-screen colored arrows on mobile devices" },
                        { key: "B Key / Top Button", action: "Toggle Autonomous BotPlay instantly" },
                        { key: "Space / Enter", action: "Confirm selections in story and song menu" }
                    ]
                },
                { 
                    id: "goku-mc",
                    title: "Minecraft Web 3D (GokuMC)", 
                    genre: "Physics & 3D", 
                    url: "GokuMC.html", 
                    isMobile: false, 
                    isTrending: true,
                    isReady: true,
                    desc: "3D voxel sandbox with infinite seeded terrain, inventory system, block mining and building powered by WebGPU and Three.js.",
                    badge: "3D WebGPU",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["3D Sandbox", "Voxel", "Minecraft", "WebGPU", "Three.js", "Exploration"],
                    controls: [
                        { key: "W / A / S / D", action: "Walk forward, strafe left, back, right" },
                        { key: "Mouse Look", action: "Aim first-person camera (Pointer Lock)" },
                        { key: "Left Click", action: "Break and harvest targeted voxel block" },
                        { key: "Right Click", action: "Place selected inventory block onto face" },
                        { key: "Space / Shift", action: "Jump / Sneak across edges" },
                        { key: "1 – 9 / Scroll", action: "Select active hotbar tool or block" },
                        { key: "E Key", action: "Open / Close survival inventory matrix" }
                    ]
                },
                { 
                    id: "neon-snake",
                    title: "Retro Neon Snake 2.0", 
                    genre: "Arcade", 
                    url: "Snake.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Vibrant neon vector snake with particle trails, speed scaling, bonus gold crystals, and virtual D-pad.",
                    badge: "Arcade Classic",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Arcade", "Retro", "Snake", "Neon", "Particles", "High Score"],
                    controls: [
                        { key: "Arrow Keys / WASD", action: "Steer snake direction (Up, Down, Left, Right)" },
                        { key: "Swipe / D-Pad", action: "Swipe screen or tap mobile on-screen D-pad buttons" },
                        { key: "Space / P", action: "Pause and resume game session" }
                    ]
                },
                { 
                    id: "cyber-breakout",
                    title: "Cyber Breakout", 
                    genre: "Arcade", 
                    url: "Breakout.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Action brick smasher with laser paddle weapons, multi-ball cascades, particle detonations, and dynamic deflection calculus.",
                    badge: "Laser Power-Up",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Arcade", "Breakout", "Action", "Lasers", "Multi-Ball", "Bricks"],
                    controls: [
                        { key: "Mouse / Touch Move", action: "Smoothly guide paddle across lower defense corridor" },
                        { key: "Left / Right Arrows", action: "Keyboard paddle navigation" },
                        { key: "Click / Tap Screen", action: "Launch initial ball or fire dual laser blasters" },
                        { key: "Space / P", action: "Pause simulation" }
                    ]
                },
                { 
                    id: "asteroids-vector",
                    title: "Vector Space Asteroids", 
                    genre: "Arcade", 
                    url: "Asteroids.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Vector wireframe space shooter with Newtonian inertia physics, toroidal screen wrap, splitting asteroids, and saucer combat.",
                    badge: "Vector Physics",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["Arcade", "Asteroids", "Shooter", "Inertia", "Space", "Vector"],
                    controls: [
                        { key: "Left / Right (A / D)", action: "Rotate scout ship heading" },
                        { key: "Up Arrow / W", action: "Engage inertia thrusters with particle propulsion" },
                        { key: "Space / S / Fire", action: "Discharge rapid vector plasma bolts" },
                        { key: "Mobile Buttons", action: "On-screen virtual rotate, thrust, and fire controls" }
                    ]
                },
                { 
                    id: "sugar-match3",
                    title: "Sugar Match-3 Blitz", 
                    genre: "Puzzle", 
                    url: "Match3.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Fast-paced match-3 candy puzzle with cascade gravity physics, combo multiplier chimes, and 60-second blitz mode.",
                    badge: "Blitz Mode",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Puzzle", "Match 3", "Combos", "Blitz", "Juicy", "Casual"],
                    controls: [
                        { key: "Tap / Click Drag", action: "Drag candy to swap with adjacent neighbor" },
                        { key: "Touch Swipe", action: "Swipe across screen to trigger fast swaps" },
                        { key: "Match 3 or More", action: "Pop gems to trigger cascading gravity drops" }
                    ]
                },
                { 
                    id: "matrix-2048",
                    title: "Cyber 2048 Matrix", 
                    genre: "Puzzle", 
                    url: "2048.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Futuristic 2048 number puzzle with mathematical Expectimax AI auto-solver, undo stack, and neon tile animations.",
                    badge: "Minimax Solver",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Puzzle", "2048", "Math", "AI Solver", "Matrix", "Brain"],
                    controls: [
                        { key: "Arrow Keys / WASD", action: "Slide and merge numbers in 4 directions" },
                        { key: "Touch Swipe", action: "Swipe across mobile screen to slide grid" },
                        { key: "AI Solver Button", action: "Engage autonomous Expectimax heuristic solver" },
                        { key: "Undo Button", action: "Revert previous slide state" }
                    ]
                },
                { 
                    id: "connect4-ai",
                    title: "Connect 4 Tactical AI", 
                    genre: "Card & Board", 
                    url: "Connect4.html", 
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Classic vertical checkers featuring depth-5 Alpha-Beta pruning AI engine, gravity drops, and 2-player pass & play.",
                    badge: "Alpha-Beta AI",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Board", "Tabletop", "Connect 4", "Alpha-Beta AI", "Tactical", "Strategy"],
                    controls: [
                        { key: "Click / Tap Column", action: "Drop colored cyber chip into chosen slot" },
                        { key: "Mode Toggle", action: "Switch between Vs. AI Bot and 2 Players Pass & Play" },
                        { key: "Reset Button", action: "Clear board and begin fresh round" }
                    ]
                }
            ];
`;

// Replace existing `const games = [...]` with complete 16 titles
const oldGamesRegex = /const games = \[[\s\S]*?\n            \];/;
html = html.replace(oldGamesRegex, complete16GamesJS.trim());

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated index.html with all 16 games and updated categories!');
