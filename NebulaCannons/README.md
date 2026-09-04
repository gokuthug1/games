# Nebula Cannons ⚙️

A neon 2D turn-based artillery duel — original code, art and audio, built as a
framework-free vanilla JavaScript game. Inspired by the artillery genre
(Tank Stars, Worms, Scorched Earth) but with its own identity: hand-crafted
SVG artwork, synthesized WAV audio, no CDNs, no remote fonts, no external
anything.

**Offline-first.** Open it, pick a mode, and blast your opponent through
destructible neon terrain. Every pixel and sound byte ships with the game;
the procedural fallbacks that powered earlier versions are still in place, so
the game works even if an asset file is missing.

---

## Quick start

### 1. Launch (local, offline)

ES modules are blocked when opening `index.html` directly from `file://`, so
serve the folder with any static server:

```bash
# Option A — the bundled game server (also enables Online mode)
python3 server/server.py          # then open http://localhost:8765

# Option B — any static server
python3 -m http.server 8080       # then open http://localhost:8080

# Option C — if you have Node
npm start                         # same as Option A
npm run serve                     # same as Option B
```

The game is fully playable offline in **Player vs AI** and **2 Player (local
pass-and-play)** modes. No internet access is required at any point.

### 2. Optional online mode (two browsers on one network)

Online play needs the bundled Python server (stdlib-only, no dependencies):

```bash
python3 server/server.py          # http://localhost:8765
```

1. Host: **Play → Online → Create room** — share the 5-letter room code.
2. Guest (another browser/device on the same network): **Play → Online →
   Join**, enter the code.
3. The host picks the battlefield and both loadouts, then **Start Battle**.
   Both clients simulate the same seeded match; the server only relays
   turns, shots and tank state.

> The online server is **optional**. All local modes work without it.

### 3. Configure

- **Settings** (main menu or pause) — master/SFX/music volume, AI difficulty,
  self-damage, trajectory preview, UI scale, reduced motion, debug mode, and
  full keyboard rebinding (click a key row, press the new key, Esc to cancel).
- **Garage** — your stats and weapon unlocks. Weapons unlock by destroying
  tanks: Cluster Bomb (1), Homing Missile (2), Splitter (3), Fireball (4),
  Dirt Maker (5), Mortar Barrage (6), Proximity Mine (7), Nuke (8), Cryo
  (9), Smokescreen (10), Leech (11), Railgun (12), Gravity Bomb (13),
  Sniper (14), Shield (15), Orbital Strike (16), EMP (18), Auto-Turret
  (20), Airstrike (22), Sticky Bomb (24), Drone (25), Flashbang (26),
  Napalm (28), Plasma (30), Tesla (32), Boomerang (34).

### 4. Debug mode

- Settings → Debug mode, or open the game with `?debug=1` (e.g.
  `http://localhost:8765/?debug=1`).
- Shows FPS, game state, wind, projectile/particle counts and tank
  coordinates in the top-left corner of the canvas.
- `window.__game` exposes the live `Game` instance in the console.

---

## Controls

| Action            | Keyboard                       | Mouse / Touch                 |
| ----------------- | ------------------------------ | ----------------------------- |
| Move              | `A`/`D` or `←`/`→`             | joystick — drag left/right    |
| Aim turret        | `W`/`S` or `↑`/`↓`             | move/drag cursor over battlefield |
| Power             | `Z`/`X` or `+`/`−`             | scroll wheel, slider, buttons |
| Fire              | `Space`                        | FIRE button                   |
| Switch weapon     | `Q`/`E` or `[`/`]`             | HUD weapon chips              |
| Zoom camera       | `I`/`O` or mouse wheel          | pinch (touch)                 |
| Weapon wheel      | —                               | radial picker (touch)         |
| Lock turret angle | `Right-click` (context menu suppressed) | —                 |
| Mini-map          | —                               | corner toggle (all devices)   |
| Pause             | `Esc` or `P`                   | pause button                  |

All keyboard bindings are remappable in **Settings → Controls**.

---

## Game modes

- **Player vs AI** — one human vs a computer commander. Four difficulties
  (Recruit → Apex) with progressively better ballistic prediction.
- **2 Players** — pass-and-play on the same device; the HUD always shows
  whose turn it is, and the other player's tank can't be controlled by
  accident.
- **Online** — head-to-head over the optional local server.

---

## Gameplay systems

- **Destructible terrain** — procedural seeded heightmaps (hills, valleys,
  flat areas, fair spawns). Explosions carve real craters with raised rims
  into the heightmap; the Dirt Maker piles real cover. Rendering is cached
  to an offscreen canvas and rebuilt only on deformation.
- **Real projectile physics** — gravity, per-shot wind, and mass (heavy
  shells resist wind). Swept continuous collision prevents tunneling. The
  trajectory preview uses the exact same integration as the simulation.
- **Wind** — rolled every turn, shown as arrows + strength, pushes shots.
- **22 distinct weapons** — Cannon (reliable, ∞ ammo), Cluster Bomb
  (bursts into 6 bomblets), Nuke (map-sized crater, one shot), Splitter
  (divides mid-flight into 3 shells), Dirt Maker (builds terrain), Bouncer
  (ricochets up to 3 times), plus Homing Missile (locks on in range), Drone
  (fires a random weapon for you), Fireball, Railgun, Mortar Barrage,
  Proximity Mine, Auto-Turret, EMP Wave (skips the enemy turn), Gravity
  Bomb, Cryo Round, Leech (heals on hit), Shield, Airstrike, Orbital
  Strike, Sniper Round, Smokescreen (blocks AI targeting), Tesla Coil
  (chain lightning + stun), Sticky Bomb (detonates at turn end), Flashbang
  (blinds and skips a turn), Napalm (burning pool), Plasma Mortar (huge
  knockback) and Boomerang (hits on the way out and back).
- **Six-weapon loadouts** — pick up to 6 weapons per tank from the loadout
  screen (Auto-pick fills all slots). Unlimited weapons (Cannon, Bouncer)
  anchor the kit; limited ones run dry over a match.
- **Supply drops** — if a tank runs completely out of ammo, a supply crate
  falls from the sky onto its exact position and refills every limited
  weapon. Unlimited weapons never run dry.
- **Weapon voices** — every weapon has its own distinct firing sound (28
  real WAVs + Web Audio synth fallback) and its own VFX (trails, beams,
  zones, flashes) keyed by weapon id.
- **Combat math** — damage falls off smoothly with distance
  (`maxDamage × (1 − d/radius)^k`), knockback, terrain deformation,
  self-damage (toggleable).
- **Turn system** — a turn never ends until every projectile, split and
  explosion has resolved. Win by destroying the enemy tank (or draw on
  mutual destruction).
- **AI** — solves firing solutions by *simulating the same physics* the game
  runs (angle/power search against terrain + wind), then injects difficulty-
  tuned aiming error. It can be fooled by hills just like a player.
- **Audio** — 32 real WAV files (per-weapon firing voices, shots,
  explosions, ricochets, UI clicks, victory/defeat jingles and an 8.7s
  ambient music loop) generated by `scripts/generate-audio.py` (pure-Python
  `wave` synth) and decoded via Web Audio. If a file is missing, the
  built-in Web Audio synthesizer plays the same effect instead.
  Volume-mixed master/SFX/music, global mute via system.
- **Artwork** — 36 real SVG files under `assets/svg/` (logo, menu backdrop,
  parallax nebula layer, tank hull sprites, wreck sprite, weapon icons and
the full UI icon set). Icons/logo are injected as inline SVG so CSS
  `color` tinting still works; tank sprites and the nebula render on canvas
  with the procedural drawings as fallback.
- **Persistence** — settings, bindings, stats and the mobile touch layout in
  `localStorage`, with sanitization and graceful fallbacks if storage is
  unavailable or corrupt.
- **Mobile layout** — the last-used thumb-zone positions and weapon chip order
  are remembered. Held upright, the battlefield rotates 90° to fill the whole
  screen (no letterbox) and the touch controls relocate to the screen edges; a
  dismissible "rotate device" overlay still suggests landscape. Positions are
  adjustable in **Settings → Touch layout** (drag the clusters) and the weapon
  chip order is reordered on the loadout slots. Movement uses a horizontal
  joystick that only drives left/right.
- **Mobile performance** — the render pixel ratio is capped on touch devices,
  window resize is debounced (no canvas-realloc storms from the URL bar), and
  expensive backdrop-blur filters are dropped on coarse pointers.
- **Mastery readouts** — the match results screen shows which weapons earned
  kills and lifetime progress toward the next mastery tier (Bronze/Silver/Gold
  add +5%/+10%/+15% damage).
- **Mini-map** — a corner toggle renders a zoomed-out preview of the whole
  battlefield with both tanks, the live camera viewport and in-flight
  projectiles.

---

## Architecture

```
index.html
css/        main.css · menu.css · hud.css · responsive.css
assets/
├── svg/        logo · bg-menu · bg-nebula · tanks/ (3) · weapons/ (6) · ui/ (24)
└── sound/      13 synthesized WAV files (fire, explosion, music, …)
js/
├── main.js                     entry point (boots Game)
├── core/       Config · EventBus · GameState · GameLoop · Camera ·
│               AssetManager · Settings · Persistence · Game (orchestrator)
├── world/      TerrainGenerator · Terrain · Map · Environment
├── entities/   Tank · Projectile · Explosion · Particle
├── systems/    Physics · Collision · Combat · TurnManager ·
│               ParticleSystem · AISystem (facade)
├── weapons/    WeaponBase · registry + Cannon, ClusterBomb, Nuke,
│               Splitter, DirtMaker, Bouncer
├── ai/         AIController · AimingAI (ballistic solver) · Difficulty
├── ui/         UIManager · HUD · MenuManager · ModalManager · SvgAssets
├── input/      Input · KeyboardInput · MouseInput · TouchInput
├── audio/      SoundManager (WAV buffers + procedural fallback)
└── net/        NetClient (optional online)
server/server.py    stdlib WebSocket relay + static file server (optional)
tests/              headless sanity tests (node --test)
scripts/            syntax checker · generate-audio.py (asset synth)
```

Data flow follows the spec:

```
Input → Game State → Simulation/Physics → Entities → Renderer → Canvas
```

- **State machine** — every transition is validated against an explicit
  allow-list (`core/GameState.js`); invalid transitions are rejected.
- **UI is decoupled** — the HUD/menus observe the EventBus and never mutate
  gameplay state.
- **Deterministic core** — seeded RNG + fixed-timestep physics make matches
  reproducible (which is what makes online sync possible).
- **Asset-aware SVG** — `core/AssetManager.js` fetches every file in
  `assets/` with a progress callback and a hard timeout. Loaded SVG text is
  registered with `ui/SvgAssets.js` (icons/logo prefer the files, falling
  back to inline templates) and rasterized to `Image`s for canvas use (tank
  sprites, nebula layer). WAV bytes are handed to `SoundManager`, which
  decodes them lazily on the first user gesture so the AudioContext is
  created exactly once.
- **Everything SVG/canvas** — UI icons, banners, crosshairs, weapon icons
  and logos are SVG (files when available, inline templates otherwise); the
  game world is procedural canvas. Zero raster assets, zero network.

### Adding content

- **New weapon** — create `js/weapons/MyWeapon.js` (extends `WeaponBase`,
  implement `fire()`/`onImpact()` + static `DEF` metadata), register it in
  `js/weapons/Weapons.js`, add `assets/svg/weapons/<id>.svg` (or an icon in
  `SvgAssets.js`) and balance it in `core/Config.js`.
- **New tank look** — add a hull sprite at `assets/svg/tanks/<id>.svg`
  (viewBox `0 0 64 30`, dome seat at `32 12`); the procedural `Tank.draw()`
  remains the fallback.
- **New sound** — extend `scripts/generate-audio.py` with a synth function
  and `write_wav(...)` call, then run `npm run assets`. Add the name to
  `SoundManager.loadBuffers()`'s list.
- **New map flavor** — the generator already varies terrain per seed; tune
  amplitudes in `world/TerrainGenerator.js`.

---

## Balance & configuration

Every gameplay constant lives in `js/core/Config.js` — gravity, wind range,
power scaling, tank speed/health/fuel, weapon stats, AI weights, camera,
particle caps, colors. No magic numbers in the gameplay code.

---

## Development

```bash
npm run check     # syntax-check every module (node --check)
npm test          # headless logic tests (node --test tests/)
npm run assets    # regenerate the WAV files in assets/sound (Python stdlib)
```

Audio assets are generated by `scripts/generate-audio.py` — a pure-Python
`wave` + `math` synthesizer (no numpy, no pip). The generated files are
committed, so `npm run assets` is only needed after editing the script.

Tests cover the pure/DOM-free core: math, seeded RNG, terrain generation
(bounds, determinism, drivability, real crater deformation), ballistic
simulation + wind, the AI solver's accuracy, swept collision (tunneling),
damage falloff, and the weapon registry.

---

## Notes & decisions

- **Coordinate system**: y points *down* (screen space). Angles are degrees
  counter-clockwise from east (0° = right, 90° = up, 180° = left).
- **Self-damage** is on by default (classic artillery risk/reward) and can be
  disabled in Settings.
- The trajectory preview stops at the first terrain/bounds impact and marks
  the landing point; for weapons with a locked/limited aiming arc it also
  draws a translucent fan (or a single lock ray for fixed-angle weapons) so
  the blocked shot is clear before firing.
- Per-weapon mastery: kills tracked in the garage unlock Bronze/Silver/Gold
  tiers that add +5%/+10%/+15% damage to the human player's shots with that
  weapon.
- The optional Python server is stdlib-only (no FastAPI install needed) and
  implements the WebSocket protocol directly; it's small enough to read in
  one sitting (`server/server.py`).
- Online mode v1: the host configures the match; guests control only their
  own tank. The server relays, never simulates — both clients run the
  identical seeded simulation.

## Credits

Original game by the Nebula Cannons project. Engine: vanilla JS + Canvas.
Art: hand-crafted SVG (logo, tank sprites, icons, backgrounds) rendered with
a procedural canvas world. Audio: WAV files synthesized by a pure-Python
script, decoded with Web Audio, with a procedural synthesizer as fallback.
No frameworks, no CDNs, no network required.
