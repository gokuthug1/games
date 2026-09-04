const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '../index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const gamesArray = `            const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;

            const games = [
                { 
                    id: "td-desktop",
                    title: "Candy Tower Defense", 
                    genre: "Strategy", 
                    url: "Tower-Defense.html", 
                    thumb: "assets/thumbnails/candy-td.jpg",
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
                    thumb: "assets/thumbnails/candy-td.jpg",
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
                    thumb: "assets/thumbnails/chess-studio.jpg",
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
                    thumb: "assets/thumbnails/aegis-vector.jpg",
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
                    thumb: "assets/thumbnails/blackjack-royal.jpg",
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
                    thumb: "assets/thumbnails/solitaire-classic.jpg",
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
                    thumb: "assets/thumbnails/nebula-cannons.jpg",
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
                    thumb: "assets/thumbnails/stack-physics.jpg",
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
                    thumb: "assets/thumbnails/fnf-rhythm.jpg",
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
                    thumb: "assets/thumbnails/goku-mc.jpg",
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
                    thumb: "assets/thumbnails/neon-snake.jpg",
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
                    thumb: "assets/thumbnails/cyber-breakout.jpg",
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
                    thumb: "assets/thumbnails/asteroids-vector.jpg",
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
                    thumb: "assets/thumbnails/sugar-match3.jpg",
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
                    thumb: "assets/thumbnails/matrix-2048.jpg",
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
                    thumb: "assets/thumbnails/connect4-ai.jpg",
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
                },
                { 
                    id: "cyber-minesweeper",
                    title: "Cyber Minesweeper", 
                    genre: "Puzzle", 
                    url: "Minesweeper.html", 
                    thumb: "assets/thumbnails/cyber-minesweeper.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Futuristic tactical minefield sweeper with safe first-click generation, chording auto-clear, and 3 standard tiers.",
                    badge: "First-Click Safe",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Puzzle", "Minesweeper", "Tactical", "Logic", "Chording", "Retro"],
                    controls: [
                        { key: "Left Click / Tap", action: "Reveal cyber sensory grid sector" },
                        { key: "Right Click / Flag Mode", action: "Deploy threat warning flag on suspected mine" },
                        { key: "Double Click / Number", action: "Chord auto-clear remaining adjacent unflagged cells" },
                        { key: "Smiley Button", action: "Re-initialize neural sensor field" }
                    ]
                },
                { 
                    id: "cyber-tetris",
                    title: "Cyber Tetris Matrix", 
                    genre: "Arcade", 
                    url: "Tetris.html", 
                    thumb: "assets/thumbnails/cyber-tetris.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Guideline-compliant arcade falling block stacker featuring SRS rotation, ghost projections, hold slot, and 7-bag generator.",
                    badge: "SRS Rotation",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Arcade", "Tetris", "Blocks", "Matrix", "Retro", "Combos"],
                    controls: [
                        { key: "Left / Right (A / D)", action: "Shift falling tetromino horizontally" },
                        { key: "Up Arrow / W", action: "Rotate tetromino 90 degrees clockwise with wall kicks" },
                        { key: "Down Arrow / S", action: "Soft drop for faster descent (+1 score/row)" },
                        { key: "Spacebar", action: "Hard drop instantly into landing matrix (+2 score/row)" },
                        { key: "C Key / Shift", action: "Swap active piece with hold chamber slot" }
                    ]
                },
                { 
                    id: "neon-pacman",
                    title: "Neon Pac-Man Maze", 
                    genre: "Arcade", 
                    url: "Pacman.html", 
                    thumb: "assets/thumbnails/neon-pacman.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Vibrant neon vector retro maze runner with authentic 4-ghost AI personalities, power pellet fright mode, and fruit multipliers.",
                    badge: "4 Ghost AIs",
                    rating: "4.9 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Arcade", "Pacman", "Retro", "Maze", "Ghosts", "Classic"],
                    controls: [
                        { key: "Arrow Keys / WASD", action: "Steer Pac-Man with responsive pre-turn buffering" },
                        { key: "Swipe Screen / D-Pad", action: "Touch controls for mobile maze navigation" },
                        { key: "Power Pellets", action: "Turn ghosts blue and hunt them for 200 to 1600 bonus pts" }
                    ]
                },
                { 
                    id: "cyber-flappy",
                    title: "Cyber Flappy Jet", 
                    genre: "Arcade", 
                    url: "Flappy.html", 
                    thumb: "assets/thumbnails/cyber-flappy.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "One-button cyber jet flight corridor with particle rocket thrusters, glowing neon laser gates, and physics trajectory.",
                    badge: "One-Button Flight",
                    rating: "4.7 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Arcade", "Flappy", "Flying", "Jet", "Neon", "Addictive"],
                    controls: [
                        { key: "Space / Up Arrow", action: "Fire thruster impulse to ascend" },
                        { key: "Tap / Click Screen", action: "Mobile impulse boost" }
                    ]
                },
                { 
                    id: "cyber-pong",
                    title: "Cyber Pong Duel", 
                    genre: "Arcade", 
                    url: "Pong.html", 
                    thumb: "assets/thumbnails/cyber-pong.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "High-octane neon cyber pong and air hockey with paddle spin deflection, accelerating rally physics, and 2-player local mode.",
                    badge: "Solo & 2P Local",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["Arcade", "Pong", "Air Hockey", "Duel", "2 Players", "Versus"],
                    controls: [
                        { key: "W / S or Up / Down", action: "Glide player paddle vertically" },
                        { key: "Touch / Mouse Drag", action: "Direct responsive paddle tracking" },
                        { key: "Mode Selector", action: "Switch between Solo vs Cyber AI and 2-Player Local" }
                    ]
                },
                { 
                    id: "cyber-wordle",
                    title: "Cyber Word Matrix", 
                    genre: "Puzzle", 
                    url: "Wordle.html", 
                    thumb: "assets/thumbnails/cyber-wordle.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Cyber cryptographic 5-letter word decryption terminal with 6 attempts, virtual keyboard, and comprehensive local dictionary.",
                    badge: "Word Decryptor",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Puzzle", "Wordle", "Terminal", "Brain", "Vocabulary", "Logic"],
                    controls: [
                        { key: "Keyboard / Virtual Keys", action: "Type 5-letter cipher guess" },
                        { key: "Enter Key", action: "Submit and decrypt row with color feedback" },
                        { key: "Backspace / DEL", action: "Erase previous typed character" }
                    ]
                },
                { 
                    id: "cyber-typer",
                    title: "Cyber Laser Typer", 
                    genre: "Arcade", 
                    url: "Typing.html", 
                    thumb: "assets/thumbnails/cyber-typer.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "Laser turret speed typing defense matrix. Blast descending cyber missiles with real-time WPM calculation and laser beams.",
                    badge: "WPM Defense",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Landscape",
                    tags: ["Arcade", "Typing", "Laser", "Defense", "Speed", "WPM"],
                    controls: [
                        { key: "Type Initial Letter", action: "Lock laser turret onto descending target word" },
                        { key: "Type Remaining Letters", action: "Discharge rapid plasma bolts to vaporize missile" },
                        { key: "Space / Enter", action: "Start / restart defense simulation" }
                    ]
                },
                { 
                    id: "neon-memory",
                    title: "Neon Memory Matrix", 
                    genre: "Puzzle", 
                    url: "Memory.html", 
                    thumb: "assets/thumbnails/neon-memory.jpg",
                    isMobile: true, 
                    isTrending: true,
                    isReady: true,
                    desc: "3D holographic flip-card memory challenge featuring 18 custom geometric vector icons, move counters, and 3 grid sizes.",
                    badge: "18 Cyber Icons",
                    rating: "4.8 ★",
                    developer: "gokuthug1",
                    releaseDate: "2026",
                    orientation: "Responsive",
                    tags: ["Puzzle", "Memory", "Card Flip", "Visual", "Brain", "Casual"],
                    controls: [
                        { key: "Click / Tap Card", action: "Flip card face up to reveal cyber icon" },
                        { key: "Match Pairs", action: "Pair matching symbols to lock them into matrix" },
                        { key: "Grid Size Buttons", action: "Choose Casual (4x4), Medium (6x4), or Master (6x6)" }
                    ]
                }
            ];`;

// Replace games array in indexContent
const gamesRegex = /const isTouchDevice = [\s\S]*?const games = \[[\s\S]*?\n            \];/;
if (!gamesRegex.test(indexContent)) {
    console.error("FAIL: games regex did not match in index.html");
    process.exit(1);
}

indexContent = indexContent.replace(gamesRegex, gamesArray);

// Now update renderCatalog to include the thumbnail image
const oldRenderCard = `                    return \`
                    <article class="game-card surface-panel rounded-xl flex flex-col justify-between p-5 \${!isPlayable ? 'opacity-60' : ''}">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-3">
                                <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">\${game.genre}</span>
                                <div class="flex items-center gap-1 flex-wrap justify-end">
                                    \${badgesHtml}
                                </div>
                            </div>
                            
                            <h3 class="text-lg font-bold text-white mb-2 leading-snug">
                                \${game.title}
                            </h3>
                            
                            <p class="text-xs text-slate-400 leading-relaxed mb-4">
                                \${game.desc}
                            </p>
                        </div>`;

const newRenderCard = `                    return \`
                    <article class="game-card surface-panel rounded-xl flex flex-col justify-between p-4 \${!isPlayable ? 'opacity-60' : ''}">
                        <div>
                            <!-- Game Thumbnail Banner -->
                            <div class="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-slate-900 border border-slate-800 group">
                                <img src="\${game.thumb || 'assets/thumbnails/' + game.id + '.jpg'}" alt="\${game.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
                                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                                <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-200 bg-slate-900/90 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-700/60">\${game.genre}</span>
                                    <div class="flex items-center gap-1">\${badgesHtml}</div>
                                </div>
                            </div>
                            
                            <h3 class="text-base font-bold text-white mb-1.5 leading-snug">
                                \${game.title}
                            </h3>
                            
                            <p class="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">
                                \${game.desc}
                            </p>
                        </div>`;

if (!indexContent.includes(oldRenderCard)) {
    console.error("FAIL: oldRenderCard not found in index.html");
    process.exit(1);
}

indexContent = indexContent.replace(oldRenderCard, newRenderCard);

// Also update renderPlayNext to include the thumbnail
const oldPlayNext = `                    return \`
                        <div class="surface-panel p-3.5 rounded-xl flex items-center justify-between gap-3 border border-slate-800 hover:border-slate-700 transition-colors">
                            <div>
                                <h4 class="text-xs sm:text-sm font-bold text-white mb-0.5">\${g.title}</h4>
                                <span class="text-[11px] text-slate-400">\${g.genre}</span>
                            </div>
                            \${playable ? \`
                                <button type="button" onclick="GameHub.openGame('\${g.id}')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition-colors flex-shrink-0">
                                    Play
                                </button>
                            \` : \`
                                <span class="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded font-semibold">Soon</span>
                            \`}
                        </div>
                    \`;`;

const newPlayNext = `                    return \`
                        <div class="surface-panel p-2.5 rounded-xl flex items-center justify-between gap-3 border border-slate-800 hover:border-slate-700 transition-colors">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <img src="\${g.thumb || 'assets/thumbnails/' + g.id + '.jpg'}" alt="\${g.title}" class="w-12 h-9 rounded object-cover flex-shrink-0 border border-slate-700" loading="lazy">
                                <div class="min-w-0">
                                    <h4 class="text-xs font-bold text-white mb-0.5 truncate">\${g.title}</h4>
                                    <span class="text-[10px] text-slate-400">\${g.genre}</span>
                                </div>
                            </div>
                            \${playable ? \`
                                <button type="button" onclick="GameHub.openGame('\${g.id}')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition-colors flex-shrink-0">
                                    Play
                                </button>
                            \` : \`
                                <span class="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded font-semibold">Soon</span>
                            \`}
                        </div>
                    \`;`;

if (indexContent.includes(oldPlayNext)) {
    indexContent = indexContent.replace(oldPlayNext, newPlayNext);
}

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log("SUCCESS: index.html updated with 24 games and thumbnail imagery!");
