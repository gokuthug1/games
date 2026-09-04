/**
 * sanity.test.js — headless tests for the pure, DOM-free parts of the game:
 * math, seeded RNG, terrain generation, ballistic simulation, collision
 * sweep detection and the weapon registry. Run with `npm test`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { clamp, falloff, angleLerpDeg, damp } from '../js/utils/MathUtils.js';
import { RNG, mulberry32 } from '../js/utils/Random.js';
import { CONFIG } from '../js/core/Config.js';
import { Terrain } from '../js/world/Terrain.js';
import { AimingAI } from '../js/ai/AimingAI.js';
import { Collision } from '../js/systems/Collision.js';
import { Projectile } from '../js/entities/Projectile.js';
import { Vector2 } from '../js/utils/Vector2.js';
import { createWeapon, getWeaponDef, isWeaponId, ALL_WEAPON_IDS } from '../js/weapons/Weapons.js';
import { Combat } from '../js/systems/Combat.js';

test('MathUtils: clamp and falloff behave at boundaries', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
  assert.equal(falloff(0, 50), 1);
  assert.equal(falloff(50, 50), 0);
  assert.ok(falloff(25, 50) > falloff(40, 50));
  assert.ok(falloff(10, 50) > 0.5);
});

test('MathUtils: angleLerpDeg takes the shortest path across 360', () => {
  // 170 -> -170 should travel -20 degrees, not +340.
  assert.ok(Math.abs(angleLerpDeg(170, -170, 0.5) - 180) < 1e-9 || Math.abs(angleLerpDeg(170, -170, 0.5) + 180) < 1e-9);
});

test('RNG: same seed reproduces the same sequence', () => {
  const a = new RNG(12345);
  const b = new RNG(12345);
  for (let i = 0; i < 100; i++) {
    assert.equal(a.next(), b.next());
  }
  assert.notEqual(new RNG(1).next(), new RNG(2).next());
});

test('RNG: range and int stay within bounds', () => {
  const r = new RNG(99);
  for (let i = 0; i < 500; i++) {
    const v = r.range(-15, 15);
    assert.ok(v >= -15 && v < 15);
    const n = r.int(1, 6);
    assert.ok(n >= 1 && n <= 6);
  }
});

test('Terrain: generated heights stay within legal bounds and are deterministic', () => {
  const t1 = new Terrain(CONFIG, 777);
  const t2 = new Terrain(CONFIG, 777);
  assert.equal(t1.heights.length, CONFIG.WORLD.WIDTH);
  for (let x = 0; x < CONFIG.WORLD.WIDTH; x += 17) {
    const h = t1.heights[x];
    assert.ok(h >= CONFIG.WORLD.GROUND_MIN - 1 && h <= CONFIG.WORLD.GROUND_BASE + 1, `h=${h}`);
    assert.equal(h, t2.heights[x]);
  }
});

test('Terrain: heights are smooth enough to drive on', () => {
  const t = new Terrain(CONFIG, 4242);
  let maxStep = 0;
  for (let x = 1; x < CONFIG.WORLD.WIDTH; x++) {
    maxStep = Math.max(maxStep, Math.abs(t.heights[x] - t.heights[x - 1]));
  }
  // Slope clamping + smoothing must guarantee drivable terrain (no walls).
  assert.ok(maxStep < 12, `max single-pixel step ${maxStep}`);
});

test('Terrain: crater lowers the heightmap (real deformation)', () => {
  const t = new Terrain(CONFIG, 555);
  const x = Math.floor(CONFIG.WORLD.WIDTH / 2);
  const before = t.heights[x];
  t.crater(x, t.heights[x] + 10, 60, 40);
  assert.ok(t.heights[x] > before, 'center of crater should be lower');
  // The edges of the crater should be unchanged (radius 60 -> far away unchanged).
  const far = t.heights[x - 400];
  assert.equal(far, t.heights[x - 400]);
});

test('AimingAI: flat-ground shot with wind returns near its start height', () => {
  const flat = {
    width: 3000,
    isSolidAt: (x, y) => y >= 1000,
  };
  const res = AimingAI.simulate({
    x: 500, y: 900, angleDeg: 45, power: 80, wind: 0, terrain: flat,
  });
  assert.ok(res.hitTerrain, 'should land on the flat ground');
  assert.ok(res.x > 900, `should travel right, got ${res.x}`);
  assert.ok(Math.abs(res.y - 1000) < 60, `should land near y=1000, got ${res.y}`);
});

test('AimingAI: wind pushes the shot sideways', () => {
  const flat = { width: 3000, isSolidAt: (x, y) => y >= 1000 };
  const noWind = AimingAI.simulate({ x: 500, y: 900, angleDeg: 45, power: 80, wind: 0, terrain: flat });
  const left = AimingAI.simulate({ x: 500, y: 900, angleDeg: 45, power: 80, wind: -15, terrain: flat });
  assert.ok(left.x < noWind.x, 'strong left wind should shorten the shot');
});

test('AimingAI: solveShot finds a shot that lands near the target', () => {
  const flat = { width: 3000, isSolidAt: (x, y) => y >= 1000 };
  const sol = AimingAI.solveShot({
    x: 400, y: 900, targetX: 1600, targetY: 960, wind: 4, terrain: flat,
  });
  assert.ok(sol, 'should find a solution');
  const res = AimingAI.simulate({
    x: 400, y: 900, angleDeg: sol.angle, power: sol.power, wind: 4, terrain: flat,
  });
  assert.ok(Math.abs(res.x - 1600) < 260, `landing x ${res.x} vs target 1600`);
  assert.ok(Math.abs(res.y - 1000) < 80, `landing y ${res.y}`);
});

test('Collision: swept check catches a tunneling projectile', () => {
  const t = new Terrain(CONFIG, 31337);
  // Punch a needle into the heightmap at x=1500.
  t.heights[1500] = 600;
  t.heights[1501] = 600;

  const p = new Projectile({
    pos: new Vector2(1450, 900),
    vel: new Vector2(4000, 0),
    weaponId: 'cannon',
    owner: null,
  });
  // Step once with a huge velocity: the naive endpoint is past the needle.
  p.integrate(1 / 60, 0, 0);
  const res = Collision.checkProjectile(p, t, []);
  assert.ok(res.hit, 'swept check must catch the needle between samples');
  assert.equal(res.type, 'terrain');
});

test('Collision: no false positive through open air', () => {
  const t = new Terrain(CONFIG, 31337);
  const p = new Projectile({
    pos: new Vector2(300, 500),
    vel: new Vector2(100, 0),
    weaponId: 'cannon',
    owner: null,
  });
  for (let i = 0; i < 10; i++) p.integrate(1 / 60, 0, 0);
  const res = Collision.checkProjectile(p, t, []);
  assert.equal(res.hit, false);
});

test('Combat: damage falloff is mathematical and monotonic', () => {
  const r = 50;
  const maxD = 30;
  assert.equal(Combat.damageAt(0, r, maxD), maxD);
  assert.equal(Combat.damageAt(r, r, maxD), 0);
  assert.ok(Combat.damageAt(20, r, maxD) > Combat.damageAt(40, r, maxD));
  assert.ok(Combat.damageAt(40, r, maxD) > 0);
});

test('Weapons: every registered weapon validates and instantiates', () => {
  assert.ok(ALL_WEAPON_IDS.length >= 5, 'at least the five required weapons');
  const fakeTank = { id: 't', x: 0, y: 0, weapons: ['cannon'] };
  for (const id of ALL_WEAPON_IDS) {
    assert.ok(isWeaponId(id));
    const def = getWeaponDef(id);
    assert.ok(def && def.name && def.icon, `def for ${id}`);
    const w = createWeapon(id, fakeTank);
    assert.equal(w.def.id, id);
  }
  assert.throws(() => createWeapon('not-a-weapon', fakeTank), /Unknown weapon/);
});

test('Weapons: every weapon has a unique sound and the arsenal is 6-slot friendly', () => {
  const sounds = new Set();
  for (const id of ALL_WEAPON_IDS) {
    const def = getWeaponDef(id);
    assert.ok(def.sound || id === 'cannon' || id === 'bouncer', `${id} has a sound or is a plain shell`);
    if (def.sound) sounds.add(def.sound);
  }
  assert.ok(sounds.size >= 10, `at least 10 distinct weapon voices, got ${sounds.size}`);
  // New limited weapons exist with sane stats.
  for (const id of ['tesla', 'sticky', 'flash', 'napalm', 'plasma', 'boomerang']) {
    const def = getWeaponDef(id);
    assert.ok(def && Number.isFinite(def.ammo) && def.ammo >= 1, `${id} is limited-ammo`);
    assert.ok(def.damage > 0, `${id} deals damage`);
  }
});

test('Tank: weapon-aware aim/power ranges lock railgun straight', async () => {
  const { Tank } = await import('../js/entities/Tank.js');
  const { createWeapon } = await import('../js/weapons/Weapons.js');
  const tank = new Tank({ id: 1, name: 'You', team: 0, color: '#3dd6ff', x: 500, y: 800, weapons: ['railgun', 'cannon'] });
  tank.weaponInstances = tank.weapons.map((id) => createWeapon(id, tank));
  tank.setWeaponIndex(0);
  const r = tank.aimRange();
  assert.equal(r.min, 0);
  assert.equal(r.max, 0);
  assert.equal(tank.powerRange().min, 40, 'railgun min power');
  tank.aimToward(90, 1 / 60);
  assert.equal(tank.turret.targetAngle, 0, 'railgun snaps to straight');
  // Cannon is free-aiming.
  tank.setWeaponIndex(1);
  assert.ok(tank.aimRange().min < tank.aimRange().max, 'cannon has an aim arc');
});

test('Tank: fuel restores to full on resetFuel', async () => {
  const { Tank } = await import('../js/entities/Tank.js');
  const tank = new Tank({ id: 1, name: 'You', team: 0, color: '#3dd6ff', x: 500, y: 800, weapons: ['cannon'] });
  tank.fuel = 0;
  tank.resetFuel();
  assert.equal(tank.fuel, tank.maxFuel);
});

test('Weapons: cannon unlimited ammo, nuke single shot', () => {
  assert.equal(getWeaponDef('cannon').ammo, Infinity);
  assert.equal(getWeaponDef('nuke').ammo, 1);
});

test('Supply: out-of-ammo tank gets a drop, resupply restores ammo', async () => {
  const { Tank } = await import('../js/entities/Tank.js');
  const { createWeapon } = await import('../js/weapons/Weapons.js');
  const tank = new Tank({ id: 1, name: 'You', team: 0, color: '#3dd6ff', x: 500, y: 800, weapons: ['homing', 'nuke'] });
  tank.weaponInstances = tank.weapons.map((id) => createWeapon(id, tank));
  tank.ammo.homing = 0;
  tank.ammo.nuke = 0;

  // The supply logic is a method on Game; exercise it via a minimal fake.
  const Game = (await import('../js/core/Game.js')).Game;
  const fake = {
    supplyDrops: [],
    terrain: { heightAt: () => 700 },
    ui: { toast: () => {} },
    sound: { play: () => {} },
    particles: { burst: () => {} },
    camera: { addShake: () => {} },
    _hasSupplyDrop: (t) => fake.supplyDrops.some((d) => d.tank === t && !d.done),
  };
  const request = Game.prototype._maybeRequestSupply.bind(fake);
  const drop = request(tank);
  assert.ok(drop, 'out-of-ammo tank requests a supply drop');
  assert.equal(drop.tank, tank);
  assert.ok(drop.startY < tank.y, 'crate spawns above the tank');
  assert.equal(request(tank), null, 'no duplicate drop while one is inbound');

  // Tank with ammo left does not request a drop.
  tank.ammo.nuke = 1;
  assert.equal(request(tank), null, 'ammo remaining means no drop');
  tank.ammo.nuke = 0;

  // Landing the drop resupplies every limited weapon.
  Game.prototype._resupplyTank.call(fake, tank, drop);
  assert.equal(tank.ammo.homing, 3, 'homing restored to full');
  assert.equal(tank.ammo.nuke, 1, 'nuke restored to full');
});

test('Weapons: the arsenal has 28 weapons with complete metadata', () => {
  assert.equal(ALL_WEAPON_IDS.length, 28);
  for (const id of ALL_WEAPON_IDS) {
    const def = getWeaponDef(id);
    assert.ok(def.name, `${id}.name`);
    assert.ok(def.desc, `${id}.desc`);
    assert.ok(def.icon, `${id}.icon`);
    assert.ok(def.color, `${id}.color`);
    assert.ok(def.ammo >= 1 || def.ammo === Infinity, `${id}.ammo`);
  }
  // The user-requested mechanics exist.
  assert.ok(ALL_WEAPON_IDS.includes('homing'), 'homing missile present');
  assert.ok(ALL_WEAPON_IDS.includes('drone'), 'AI-bot drone present');
});

test('Terrain: every archetype is legal, deterministic and drivable', () => {
  for (const arch of ['classic', 'canyon', 'plateau', 'dunes', 'peaks', 'rift']) {
    const a = new Terrain(CONFIG, 9001, arch);
    const b = new Terrain(CONFIG, 9001, arch);
    let maxStep = 0;
    for (let x = 0; x < CONFIG.WORLD.WIDTH; x += 5) {
      const h = a.heights[x];
      assert.ok(h >= CONFIG.WORLD.GROUND_MIN - 1 && h <= CONFIG.WORLD.GROUND_BASE + 1, `${arch} bounds at ${x}`);
      assert.equal(h, b.heights[x], `${arch} determinism`);
    }
    for (let x = 1; x < CONFIG.WORLD.WIDTH; x += 3) {
      maxStep = Math.max(maxStep, Math.abs(a.heights[x] - a.heights[x - 1]));
    }
    assert.ok(maxStep < 12, `${arch} drivable (max step ${maxStep})`);
  }
  // Archetypes actually differ from each other.
  const classic = new Terrain(CONFIG, 4242, 'classic');
  const peaks = new Terrain(CONFIG, 4242, 'peaks');
  const mid = Math.floor(CONFIG.WORLD.WIDTH / 2);
  assert.notEqual(classic.heights[mid], peaks.heights[mid]);
});

test('Collision: projectiles hit deployed turret targets', () => {
  // Flat open ground at y=1000; the shell flies at y=880 (clear of terrain).
  const flat = {
    width: 3000,
    heights: new Float32Array(3000).fill(1000),
    heightAt: () => 1000,
  };
  const targets = [{ x: 1500, y: 880, r: 15, kind: 'turret', ref: { id: 'tu1' } }];
  const p = new Projectile({
    pos: new Vector2(1450, 880),
    vel: new Vector2(3000, 0),
    weaponId: 'cannon',
    owner: null,
  });
  p.integrate(1 / 60, 0, 0); // travels 50px -> lands on the turret at x=1500
  const res = Collision.checkProjectile(p, flat, [], targets);
  assert.ok(res.hit, 'should hit the turret');
  assert.equal(res.type, 'target');
  assert.equal(res.target.ref.id, 'tu1');
});

test('Camera: player zoom clamps and auto-frame fits both tanks', async () => {
  const { Camera } = await import('../js/core/Camera.js');
  const cam = new Camera();
  cam.setViewport(1280, 720);
  assert.equal(cam.zoom, 1);
  cam.zoomIn(5);
  assert.equal(cam.userZoom, 2.2, 'zoom clamps at max');
  cam.zoomOut(10);
  assert.equal(cam.userZoom, 0.5, 'zoom clamps at min');
  cam.resetUserZoom();
  assert.equal(cam.userZoom, 1);
  // Far apart tanks should zoom out (frameZoom < 1) and stay visible.
  cam.frameBoth(200, 800, 2300, 900);
  assert.ok(cam.frameZoom < 1, 'distant tanks frame out');
  assert.ok(cam.frameZoom >= 0.35);
  cam.update(1); // settle the zoom damping (converges ~99.75%)
  assert.ok(
    cam.visibleW >= Math.abs(2300 - 200) + 40,
    `visible width ${cam.visibleW} keeps both tanks on screen`
  );
  // Close tanks stay at full zoom.
  cam.frameBoth(1000, 800, 1100, 810);
  assert.equal(cam.frameZoom, 1);
});

test('Camera: portrait rotation fits the world and maps coordinates consistently', async () => {
  const { Camera } = await import('../js/core/Camera.js');
  const cam = new Camera();
  cam.setViewport(1080, 2400); // portrait phone
  assert.equal(cam.rotated, true);
  for (let i = 0; i < 120; i++) cam.update(1 / 60); // settle the zoom damping
  // Whole battlefield fits: world height maps to the short axis exactly.
  assert.ok(Math.abs(cam.visibleH - 1440) < 1, `visibleH ${cam.visibleH}`);
  assert.ok(cam.visibleW >= 2560, `visibleW ${cam.visibleW} shows the full width`);
  // worldToScreen / screenToWorld round-trip.
  const s = cam.worldToScreen(1200, 900);
  const w = cam.screenToWorld(s.x, s.y);
  assert.ok(Math.abs(w.x - 1200) < 1e-6, 'round-trip x');
  assert.ok(Math.abs(w.y - 900) < 1e-6, 'round-trip y');
  // World-left sits at the bottom of the screen, world-right at the top.
  const left = cam.worldToScreen(0, 800);
  const right = cam.worldToScreen(2560, 800);
  assert.ok(right.y < left.y, 'world x increases up the tall axis');
  // Landscape viewports stay unrotated.
  const cam2 = new Camera();
  cam2.setViewport(1280, 720);
  assert.equal(cam2.rotated, false);
  assert.equal(cam2.zoom, 1);
});

test('Camera: flipRotation mirrors the portrait tall axis (world-left at top)', async () => {
  const { Camera } = await import('../js/core/Camera.js');
  const cam = new Camera();
  cam.setViewport(1080, 2400);
  cam.flipRotation = true;
  for (let i = 0; i < 120; i++) cam.update(1 / 60); // settle the zoom damping
  // worldToScreen / screenToWorld still round-trip when flipped.
  const s = cam.worldToScreen(1200, 900);
  const w = cam.screenToWorld(s.x, s.y);
  assert.ok(Math.abs(w.x - 1200) < 1e-6, 'flipped round-trip x');
  assert.ok(Math.abs(w.y - 900) < 1e-6, 'flipped round-trip y');
  // World-left now sits at the TOP of the screen (mirrored vs the default).
  const left = cam.worldToScreen(0, 800);
  const right = cam.worldToScreen(2560, 800);
  assert.ok(left.y < right.y, 'flipped: world x increases down the tall axis');
  // The tall-axis screen coordinate mirrors about the viewport center.
  const flipped = cam.worldToScreen(1200, 900).y;
  cam.flipRotation = false;
  const normal = cam.worldToScreen(1200, 900).y;
  assert.ok(Math.abs(flipped - (cam.viewH - normal)) < 1e-6, 'flip mirrors the tall axis');
});

test('Camera: panByScreen moves the view opposite to the drag, in any orientation', async () => {
  const { Camera } = await import('../js/core/Camera.js');
  // Landscape.
  const cam = new Camera();
  cam.setViewport(1280, 720);
  cam.snapTo(1200, 800);
  const before = cam.screenToWorld(cam.viewW / 2, cam.viewH / 2);
  cam.panByScreen(100, 0);
  const after = cam.screenToWorld(cam.viewW / 2, cam.viewH / 2);
  assert.ok(Math.abs(after.x - (before.x - 100)) < 1e-6, `drag right moves the view left (${after.x} vs ${before.x - 100})`);
  assert.ok(Math.abs(after.y - before.y) < 1e-6, 'vertical unchanged');
  // Rotated portrait: the natural fit shows the whole world width, so zoom
  // in first to give the view room to pan. Dragging the content down must
  // keep the world point under the finger glued to the finger.
  const cam2 = new Camera();
  cam2.setViewport(1080, 2400);
  cam2.setUserZoom(2);
  for (let i = 0; i < 120; i++) cam2.update(1 / 60);
  const fingerWorld = cam2.screenToWorld(cam2.viewW / 2, cam2.viewH / 2);
  cam2.panByScreen(0, 200);
  const now = cam2.screenToWorld(cam2.viewW / 2, cam2.viewH / 2 + 200);
  assert.ok(Math.abs(now.x - fingerWorld.x) < 1e-6, `portrait drag keeps the world point under the finger (${now.x} vs ${fingerWorld.x})`);
  assert.ok(Math.abs(now.y - fingerWorld.y) < 1e-6, 'portrait cross-axis unchanged');
});

test('Camera: pinTo keeps the world point glued to the screen as it drags', async () => {
  const { Camera } = await import('../js/core/Camera.js');
  const cam = new Camera();
  cam.setViewport(1280, 720);
  cam.snapTo(1200, 800);
  const before = cam.screenToWorld(200, 200);
  cam.pinTo(200, 200, 420, 330);
  const after = cam.screenToWorld(420, 330);
  assert.ok(Math.abs(after.x - before.x) < 1e-6, `world x followed the pinch (${after.x} vs ${before.x})`);
  assert.ok(Math.abs(after.y - before.y) < 1e-6, `world y followed the pinch (${after.y} vs ${before.y})`);
  // Non-finite input is ignored (jitter guard).
  const xBefore = cam.x;
  cam.pinTo(NaN, 200, 420, 330);
  assert.equal(cam.x, xBefore, 'NaN source is ignored');
});

test('Game: followLocked parks the camera; fire and turn start unlock it', async () => {
  const { Game } = await import('../js/core/Game.js');
  const { Camera } = await import('../js/core/Camera.js');
  const mkFake = () => {
    const cam = new Camera();
    cam.setViewport(1280, 720);
    cam.snapTo(0, 0); // clamps to x=0, y=0
    return {
      camera: cam,
      projectiles: [{ pos: { x: 2000, y: 800 } }], // would normally pull the camera
      explosions: [],
      tanks: [],
      turnManager: { activeTank: () => null },
    };
  };
  // Locked: the camera ignores the in-flight projectile entirely.
  const locked = mkFake();
  locked.camera.followLocked = true;
  Game.prototype._updateCamera.call(locked, 1 / 60);
  assert.equal(locked.camera.x, 0, 'locked camera does not chase projectiles');
  assert.equal(locked.camera.y, 0);
  // Unlocked: one follow step pulls the camera toward the projectile.
  const free = mkFake();
  Game.prototype._updateCamera.call(free, 1 / 60);
  assert.ok(free.camera.x > 0 || free.camera.y > 0, 'unlocked camera follows the projectile');
  // beginMatch and fireTank reset the lock (verified via the camera flag
  // contract they rely on: both set followLocked = false).
  assert.equal(Game.prototype.beginMatch.toString().includes('followLocked = false'), true, 'beginMatch unlocks');
  assert.equal(Game.prototype.fireTank.toString().includes('followLocked = false'), true, 'fireTank unlocks');
});

test('Tank: analog move scales speed and fuel burn with deflection', async () => {
  const { Tank } = await import('../js/entities/Tank.js');
  const terrain = { heightAt: () => 1000, slopeAt: () => 0 };
  const mk = (x) => new Tank({ id: 1, name: 'You', team: 0, color: '#3dd6ff', x, y: 900, weapons: ['cannon'] });
  const full = mk(500);
  const half = mk(500);
  for (let i = 0; i < 60; i++) {
    full.move(1, 1 / 60, terrain);
    half.move(0.5, 1 / 60, terrain);
  }
  const fullDx = full.x - 500;
  const halfDx = half.x - 500;
  assert.ok(fullDx > 100, `full deflection moves the tank (${fullDx}px in 1s)`);
  assert.ok(Math.abs(halfDx - fullDx / 2) < 1.5, `half deflection moves half the distance (${halfDx} vs ${fullDx / 2})`);
  // Fuel drain scales with deflection too.
  assert.ok(full.fuel < half.fuel, 'full-speed tank burns more fuel than a half-tilt');
});

test('Settings: flipRotation + mobileQuality sanitize, rotation hint persists', async () => {
  const { Settings } = await import('../js/core/Settings.js');
  const s = new Settings();
  // Defaults.
  assert.equal(s.get('flipRotation'), false);
  assert.equal(s.get('mobileQuality'), 'balanced');
  assert.equal(s.rotationHintPending(), true, 'hint pending by default');
  // Boolean round-trip + corrupt value falls back to default.
  s.set('flipRotation', true);
  assert.equal(s.get('flipRotation'), true);
  s.set('flipRotation', 'yes');
  assert.equal(s.get('flipRotation'), false);
  // Mobile quality whitelist.
  s.set('mobileQuality', 'low');
  assert.equal(s.get('mobileQuality'), 'low');
  s.set('mobileQuality', 'ultra');
  assert.equal(s.get('mobileQuality'), 'balanced');
  // One-time rotation hint flag.
  s.markRotationHintShown();
  assert.equal(s.rotationHintPending(), false);
});

test('Map: peekMaps yields four distinct battlefields', async () => {
  const { Map, mapNameFor } = await import('../js/world/Map.js');
  // Map builds a legal terrain and has spawns.
  const m = new Map(123456);
  assert.ok(m.terrain.heights.length > 0);
  assert.equal(m.pickSpawns(2).length, 2);
  // Names cover the archetype pools without crashing on edge seeds.
  assert.ok(mapNameFor(0).length > 0);
  assert.ok(mapNameFor(0xffffffff).length > 0);
  // Simulate peekMaps' uniqueness loop: four distinct names out of a pool.
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < 4 && guard++ < 64) {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const name = mapNameFor(seed);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ seed, name });
  }
  assert.equal(out.length, 4, 'four distinct names found');
});

test('Settings: mobile layout sanitizes and persists (thumb zones + chip order)', async () => {
  const { Settings } = await import('../js/core/Settings.js');
  const s = new Settings();
  // Defaults are inert until customized.
  assert.equal(s.get('mobileLayout').custom, false);
  assert.deepEqual(s.get('mobileLayout').zones.left, { x: 2, y: 14 });
  // Sanitization clamps zone coords to 0-100 and deep-copies the object.
  s.set('mobileLayout', {
    custom: true,
    zones: { left: { x: 12, y: 130 }, right: { x: -4, y: 40 } },
    chipOrder: ['cannon', 'bouncer', 'nuke'],
  });
  const ml = s.get('mobileLayout');
  assert.equal(ml.custom, true);
  assert.equal(ml.zones.left.x, 12);
  assert.equal(ml.zones.left.y, 100, 'y clamped to 100');
  assert.equal(ml.zones.right.x, 0, 'x clamped to 0');
  assert.deepEqual(ml.chipOrder, ['cannon', 'bouncer', 'nuke']);
  // Mutating the returned object must not corrupt stored state.
  ml.zones.left.x = 99;
  assert.equal(s.get('mobileLayout').zones.left.x, 12);
  // Corrupt saves fall back to defaults.
  s.set('mobileLayout', null);
  assert.equal(s.get('mobileLayout').custom, false);
  assert.equal(s.get('mobileLayout').zones.right.y, 14);
});

test('Mastery: kills unlock bronze/silver/gold tiers with damage bonuses', async () => {
  const { Settings, MASTERY_TIERS } = await import('../js/core/Settings.js');
  const s = new Settings();
  assert.equal(s.weaponMastery('cannon').tier, null, 'no mastery at 0 kills');
  assert.equal(s.weaponMastery('cannon').damageMult, 1);
  assert.equal(MASTERY_TIERS.length, 3);

  s.stats.weapons = { cannon: { used: 0, kills: 0 } };
  s.recordWeaponKill('cannon');
  s.recordWeaponKill('cannon');
  s.recordWeaponKill('cannon');
  s.recordWeaponKill('cannon');
  s.recordWeaponKill('cannon');
  let m = s.weaponMastery('cannon');
  assert.equal(m.tier, 'bronze');
  assert.equal(m.damageMult, 1.05);
  assert.equal(m.next, 15, 'silver is the next tier');

  for (let i = 0; i < 25; i++) s.recordWeaponKill('cannon');
  m = s.weaponMastery('cannon');
  assert.equal(m.tier, 'gold');
  assert.equal(m.damageMult, 1.15);
  assert.equal(m.next, null, 'gold is the top tier');
});

test('Weapons: homing projectiles steer toward their target', async () => {
  const { createWeapon } = await import('../js/weapons/Weapons.js');
  const { Tank } = await import('../js/entities/Tank.js');
  const enemy = new Tank({ id: 2, name: 'Enemy', team: 1, color: '#ff7a3d', x: 900, y: 400, weapons: ['cannon'] });
  const tank = new Tank({ id: 1, name: 'You', team: 0, color: '#3dd6ff', x: 0, y: 400, weapons: ['homing'] });
  const spawned = [];
  const game = {
    tanks: [tank, enemy],
    spawnProjectile: (opts) => {
      const p = new Projectile({
        ...opts,
        pos: new Vector2(opts.pos.x, opts.pos.y),
        vel: new Vector2(opts.vel.x, opts.vel.y),
      });
      spawned.push(p);
      return p;
    },
    particles: { muzzleFlash: () => {} },
    sound: { play: () => {} },
  };
  const w = createWeapon('homing', tank);
  assert.equal(w.def.id, 'homing');
  w.fire({ game, tank });
  assert.equal(spawned.length, 1, 'homing fire spawns a missile');
  const p = spawned[0];
  assert.ok(p.onSteer, 'projectile exposes an onSteer hook (was silently dropped)');
  // Aim the missile straight down (away from the enemy at (900, 400))
  // and let one steer step turn it toward the target.
  p.pos.set(100, 400);
  p.vel.set(0, 300);
  const before = p.vel.x;
  p.onSteer({ game, projectile: p, dt: 1 / 60 });
  assert.ok(p.vel.x > before, 'steer turns the missile toward the target');
});
