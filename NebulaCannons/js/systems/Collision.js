/**
 * Collision — collision queries between projectiles, terrain and tanks.
 *
 * Instead of point sampling (which can tunnel through thin features), the
 * projectile's travel segment is checked continuously:
 *   - terrain: sweep the terrain columns crossed by the segment and test the
 *     linear height function against the heightmap at each column,
 *   - tanks:   point-vs-segment distance (circle vs segment).
 */

export const Collision = {
  /**
   * Swept projectile collision over the segment [prevPos, pos].
   * @param {import('../entities/Projectile.js').Projectile} p
   * @param {import('../world/Terrain.js').Terrain} terrain
   * @param {Array} tanks
   * @param {Array} [targets] extra circle targets ({x, y, r, kind, ref}) —
   *   deployed turrets and mines.
   * @returns {{hit: boolean, type?: string, x?: number, y?: number, tank?: object, target?: object}}
   */
  checkProjectile(p, terrain, tanks, targets) {
    const x0 = p.prevPos.x;
    const y0 = p.prevPos.y;
    const x1 = p.pos.x;
    const y1 = p.pos.y;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) return { hit: false };

    // World bounds (the box is convex, so checking both endpoints suffices).
    if (
      x1 < -160 || x1 > terrain.width + 160 ||
      y1 > terrain.height + 240 || y1 < -600
    ) {
      return { hit: true, type: 'bounds', x: x1, y: y1 };
    }

    // ---- Terrain: continuous column sweep along the segment ----
    const c0 = Math.max(0, Math.floor(Math.min(x0, x1)));
    const c1 = Math.min(terrain.width - 1, Math.ceil(Math.max(x0, x1)));
    if (Math.abs(dx) > 1e-6) {
      for (let c = c0; c <= c1; c++) {
        const t = (c - x0) / dx;
        const segY = y0 + dy * t;
        if (segY >= terrain.heights[c]) {
          return { hit: true, type: 'terrain', x: c, y: terrain.heights[c] };
        }
      }
    } else {
      // Pure vertical segment: single-column check.
      const cx = Math.round(x1);
      if (y1 >= terrain.heightAt(cx)) {
        return { hit: true, type: 'terrain', x: cx, y: terrain.heightAt(cx) };
      }
    }

    // ---- Tanks: point-vs-segment (no tunneling possible) ----
    const invLen2 = 1 / (dx * dx + dy * dy);
    for (const t of tanks) {
      if (!t.alive) continue;
      if (t === p.owner && p.life < 0.25) continue;
      const tx = t.x;
      const ty = t.y - t.height * 0.1;
      const proj = ((tx - x0) * dx + (ty - y0) * dy) * invLen2;
      const s = proj < 0 ? 0 : proj > 1 ? 1 : proj;
      const cx = x0 + dx * s;
      const cy = y0 + dy * s;
      const ddx = cx - tx;
      const ddy = cy - ty;
      const rr = t.hitRadius + p.radius;
      if (ddx * ddx + ddy * ddy <= rr * rr) {
        return { hit: true, type: 'tank', x: cx, y: cy, tank: t };
      }
    }

    // ---- Extra circle targets (turrets, mines) ----
    if (Array.isArray(targets)) {
      for (const tg of targets) {
        const proj = ((tg.x - x0) * dx + (tg.y - y0) * dy) * invLen2;
        const s = proj < 0 ? 0 : proj > 1 ? 1 : proj;
        const cx = x0 + dx * s;
        const cy = y0 + dy * s;
        const ddx = cx - tg.x;
        const ddy = cy - tg.y;
        const rr = (tg.r || 12) + p.radius;
        if (ddx * ddx + ddy * ddy <= rr * rr) {
          return { hit: true, type: 'target', x: cx, y: cy, target: tg };
        }
      }
    }

    return { hit: false };
  },
};
