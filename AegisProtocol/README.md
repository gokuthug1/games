# AEGIS PROTOCOL: VECTOR DEFENSE

A complete, feature-dense 2D Vector Sci-Fi Tower Defense game built using **HTML5 Canvas**, **CSS3**, **modular ES6 JavaScript**, and a built-in **Web Audio API procedural sound engine**.

---

## Zero-Emoji Policy
This codebase strictly enforces a **Zero-Emoji Policy**. All icons, status glyphs, buttons, and HUD elements are rendered via precision inline SVG vector paths and HTML5 Canvas vector geometries.

---

## Key Features

- **10 Distinct Defense Towers**:
  - `Gatling Sentry`: High rate-of-fire kinetic autocannon.
  - `Pulse Laser`: Coherent beam emitter specializing in destroying energy shields.
  - `Cryo Projector`: Liquid nitrogen dispersal unit that slows and deep freezes targets.
  - `Tesla Coil`: High-voltage electrical arc transmitter with multi-target chain lightning.
  - `Heavy Artillery`: Long-range ballistic mortar shells with area-of-effect damage.
  - `Plasma Blaster`: Superheated ionized gas spheres that melt armor with residual burn.
  - `Railgun Sniper`: Hyper-velocity tungsten slugs that pierce through multiple enemies.
  - `Bio Corrosive Sprayer`: Pressurized caustic acid that stacks corrosion and shreds armor.
  - `Missile Battery`: Smart-tracking micro-missile salvo prioritizing fast and airborne threats.
  - `Aegis Command Beacon`: Tactical aura station that amplifies damage, range, and fire rate of adjacent towers.

- **3-Tier Upgrades & Apex Specialization Branches**:
  - Every tower can be upgraded to Tier 2 and Tier 3.
  - At Tier 3, towers can be promoted into one of two unique **Apex Specializations** (e.g., Tactical Nuke Silo vs Inferno Carpet Mortar; Continuous Lance vs Prism Diffractor).

- **12 Enemy Archetypes & Multi-Phase Bosses**:
  - Vector Scouts, Nanite Swarmers, Armored Striders, Shield Bearers, Stealth Infiltrators, Bio Mutagenic Behemoths, Sonic Interceptors, Hydra Splitters, Valkyrie Gunships.
  - **Mega Bosses**: Goliath Titan Mech, Nexus Hive Overlord, Chronos Singularity Dreadnought.

- **Tactical Boot Camp (Interactive Onboarding Tutorial)**:
  - 8-stage interactive guided tutorial with UI spotlights, directive action tasks, and +5 Research Credit graduation reward.
  - Step-by-step guidance on placement, high ground terrain, wave control, elemental weapon counters, live tower inspection, branch promotions, targeting protocols, and active commander powers.

- **8 Handcrafted Campaign Theaters & Unique Topologies**:
  - `Sector 01: Neon Outpost` - S-curve learning circuit with central battery chokepoint.
  - `Sector 02: Cyber Canyon` - Dual intersecting north & south diagonal trenches.
  - `Sector 03: Frost Citadel` - Triple-spiral concentric glacial labyrinth.
  - `Sector 04: Toxic Wasteland` - 4-way diagonal crossroads with acidic killzones.
  - `Sector 05: Void Core` - Trifecta warp rifts converging simultaneously on the central core.
  - `Sector 06: Orbital Platform` - Outer skybridge perimeter with flying interceptor flyways.
  - `Sector 07: Magma Foundry` - Serpentine furnace switchback with lava hazard channels.
  - `Sector 08: Nexus Prime` - Quad-channel final bastion with moving multi-phase Titan mechs.
  - Dynamic special terrain tiles: *High Ground* (+15% Range/Damage), *Power Grid* (-25% Cooldown), *Amplifier* (+25% Critical Strike Chance), and *Obstacles*.

- **Autonomous Commander AI Agent (Advanced Mathematical Policy Engine)**:
  - **Full Context Situational Awareness**: Reads real-time bank credits, lives, energy, current & upcoming wave composition (EHP, shields, armor, swarms, flying, boss mechs), tower portfolio DPS, and map pathway coverage heatmaps.
  - **Multi-Step Lookahead & Pre-Building**: Inspects upcoming wave threat matrices to construct/upgrade hard counters prior to wave launch.
  - **Support Beacon Synergy Optimization**: Evaluates neighbor adjacency matrices $\sum \text{DPS}_{\text{adj}} \times 0.20$ to position Command Beacons at maximal synergy hubs.
  - **Dynamic Micro-Targeting Adjustments**: Dynamically assigns optimal individual tower targeting priorities (e.g. Railgun $\to$ `BOSS`/`STRONGEST`, Gatling $\to$ `FASTEST`, Mortar $\to$ `OPTIMAL` Gaussian cluster centroids).
  - **Automated Research Lab Investment**: Evaluates Tech Tree perk synergies with active weapon portfolios and automatically unlocks perks using earned combat stars.
  - **Emergency Defense & Strategic Relocation**: Detects terminal breach vectors ($T_{\text{breach}} < 3.5\text{s}$) and calculates if recycling distant inactive batteries generates needed liquidity to save the core.
  - **Reasoning Timeline Drawer (`[L]`)**: Displays a real-time chronological stream of thinking steps, mathematical formulas, and interactive grid target locating.

- **High-Quality Vector SVG Favicon**:
  - Embedded directly as an optimized SVG data URI featuring the Aegis cybernetic defense shield and vector laser core.

- **Persistent Tech Tree & Research Lab**:
  - 4 research branches: *Ballistics & Kinetics*, *Beam & Laser Physics*, *Cryo & Superheat*, *Command & Logistics*.
  - Earn research credits from campaign stars and achievements.

- **Integrated Sector Map Editor**:
  - Brush-based canvas editor to paint custom pathways, obstacles, and amplifier nodes.
  - Save custom maps directly to LocalStorage or test play immediately in sandbox mode.

- **Web Audio API Procedural Sound Engine**:
  - Dynamic sound synthesis for laser beams, gatling bursts, rockets, explosions, and UI clicks.
  - Procedural background cyberpunk synth music arpeggiator (zero external MP3/WAV dependencies).

---

## Tactical Hotkeys

| Hotkey | Action |
|---|---|
| `1` - `9` | Select Defense Battery for Placement |
| `Space` | Toggle Pause / Resume |
| `F` | Cycle Game Speed (1x, 2x, 4x, 8x) |
| `A` | Toggle Autonomous Commander AI Agent (Autoplay) |
| `N` | Trigger Next Wave |
| `Q`, `W`, `E`, `R`, `T` | Activate Commander Abilities |
| `Esc` / `Right-Click` | Deselect Tower / Cancel Target Reticle |

---

## Damage Calculation Formula

$$\text{Final Damage} = \text{Base Damage} \times \text{Multiplier}_{\text{Type}} \times \text{Multiplier}_{\text{Status}} \times \text{Armor Reduction}$$

Where:
$$\text{Armor Reduction} = \frac{100}{100 + \text{Armor} \times 3}$$

- **Kinetic**: $+30\%$ vs Light armor, normal vs heavy.
- **Energy**: $+75\%$ vs Shields, $-25\%$ vs heavy plating.
- **Cryo**: $+40\%$ vs Biological regenerators, inflicts Slow & Freeze.
- **Thermal**: $+30\%$ vs Heavy armor, applies persistent Burn DoT.
- **Corrosive**: Stacks acid to permanently shred enemy armor.
- **True Damage**: Ignores all Armor and Shield mitigation.

---

## Running the Game

### Option 1: Using Python Server (Recommended)
```bash
python server.py
```
This will automatically launch `http://localhost:8000/index.html` in your default web browser.

### Option 2: Direct Browser Launch
Open `index.html` directly in any modern web browser that supports ES6 modules (Chrome, Edge, Firefox, Safari).
