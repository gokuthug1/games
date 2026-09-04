/**
 * server.test.js — boots the real local server (server/server.py) and
 * verifies its cache-busting rewrite never fragments a module across
 * importers.
 *
 * Regression test for the missing-weapon-icons bug: when server.py stamped
 * every import with the IMPORTER's mtime, each file that imports
 * SvgAssets.js resolved a different URL, so the browser created isolated
 * module instances and module-level state (the SVG file registry) never
 * reached the HUD/menus. The fix stamps with the TARGET module's mtime, so
 * every importer of a module must receive the exact same `?v=` value.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Grab a free TCP port (closed again immediately; small race, fine for tests). */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

/** Poll GET / until the server answers (or the deadline passes). */
async function waitForServer(port, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return true;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

/** Recursively list the game's js modules as posix relative paths. */
function walkJs(dir, base, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJs(p, base, out);
    else if (e.name.endsWith('.js')) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

/** Resolve a relative module specifier against an importer's directory. */
function resolveSpec(importerRel, spec) {
  const importerPosix = importerRel.split('/');
  const dir = importerPosix.slice(0, -1).join('/') || '.';
  const joined = path.posix.join(dir, spec);
  return path.posix.normalize(joined);
}

test('server.py: every importer of a module gets the same ?v= stamp', async () => {
  const port = await freePort();
  const child = spawn('python3', ['server/server.py', '--port', String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Drain child output so a slow test never deadlocks on a full pipe.
  child.stdout.resume();
  child.stderr.resume();

  try {
    assert.ok(await waitForServer(port), 'server boots and answers GET /');
    const base = `http://127.0.0.1:${port}`;
    const jsFiles = walkJs(path.join(ROOT, 'js'), path.join(ROOT, 'js'));
    assert.ok(jsFiles.length >= 50, `found the game modules (${jsFiles.length})`);

    // target module -> set of stamps seen across its importers, and the
    // set of importer files that reference it (for the meaningfulness check)
    const stamps = new Map();
    const importers = new Map();
    let unstamped = [];
    let served = 0;

    for (const rel of jsFiles) {
      const res = await fetch(`${base}/js/${rel}`);
      assert.equal(res.status, 200, `GET js/${rel}`);
      const src = await res.text();
      served++;

      // Stamped relative specifiers, e.g. `from './core/Game.js?v=123'` or
      // `import "./ui/SvgAssets.js?v=123"`.
      const stamped = /(['"])(\.\.?\/[^'"?]+)\?v=(\d+)\1/g;
      let m;
      while ((m = stamped.exec(src))) {
        const spec = m[2];
        const stamp = Number(m[3]);
        const target = resolveSpec(rel, spec);
        if (!stamps.has(target)) stamps.set(target, new Set());
        stamps.get(target).add(stamp);
        if (!importers.has(target)) importers.set(target, new Set());
        importers.get(target).add(rel);
      }

      // Any relative import that escaped the stamping would silently break
      // module identity — that is the exact bug this guards against.
      const bare = /(['"])(\.\.?\/[^'"?]+)\1/g;
      while ((m = bare.exec(src))) unstamped.push(`${rel} -> ${m[2]}`);
    }

    assert.equal(served, jsFiles.length, 'every js module was fetched');
    assert.deepEqual(unstamped, [], 'no relative import escaped the ?v= stamping');
    assert.ok(stamps.size >= 40, `a meaningful module graph was seen (${stamps.size} targets)`);

    // The core invariant: one stamp per target across ALL its importers.
    for (const [target, set] of stamps) {
      assert.equal(set.size, 1, `${target} must have one stamp across importers, got ${[...set]}`);
    }

    // The regression case specifically: SvgAssets.js is imported by several
    // modules; they must ALL agree on one stamp (the set-size-1 check above
    // already guarantees it), the import graph must be non-trivial, and the
    // shared stamp must be the target's own mtime (not any importer's).
    const svgTarget = 'ui/SvgAssets.js';
    assert.ok(stamps.has(svgTarget), 'SvgAssets.js is imported by the game');
    assert.ok(
      importers.get(svgTarget).size >= 3,
      `several modules import SvgAssets.js (${importers.get(svgTarget).size}: ${[...importers.get(svgTarget)].join(', ')})`
    );
    assert.equal(stamps.get(svgTarget).size, 1, 'all importers agree on a single stamp');
    const stamp = [...stamps.get(svgTarget)][0];
    const onDisk = Math.floor(fs.statSync(path.join(ROOT, 'js', svgTarget)).mtimeMs);
    assert.ok(Math.abs(stamp - onDisk) <= 2, `SvgAssets.js stamped with its OWN mtime (${stamp} vs disk ${onDisk})`);
  } finally {
    child.kill();
    // Give the child a moment to exit, then force it if needed.
    await new Promise((r) => setTimeout(r, 200));
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
