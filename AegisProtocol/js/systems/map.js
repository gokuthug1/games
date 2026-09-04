/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Map & Grid System Manager
 */

import { CONFIG, TILE_TYPES } from '../core/constants.js';

export class GameMap {
  constructor(mapData) {
    this.data = mapData;
    this.id = mapData.id;
    this.name = mapData.name;
    this.cols = CONFIG.GRID_COLS;
    this.rows = CONFIG.GRID_ROWS;
    this.tileSize = CONFIG.TILE_SIZE;
    
    // Grid: 2D array [rows][cols] of tile objects
    this.grid = [];
    this.paths = []; // array of paths, each path is an array of waypoint pixel coords {x, y}
    this.rawPaths = mapData.paths || [];
    
    this.initGrid();
    this.buildPaths();
  }

  initGrid() {
    this.grid = Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.cols }, (_, c) => ({
        col: c,
        row: r,
        type: TILE_TYPES.EMPTY,
        tower: null,
        isPath: false,
        isBlocked: false
      }))
    );

    // Apply special tiles (high ground, power grid, amplifiers)
    if (this.data.specialTiles) {
      for (const st of this.data.specialTiles) {
        if (this.isValidTile(st.x, st.y)) {
          this.grid[st.y][st.x].type = st.type;
        }
      }
    }
  }

  buildPaths() {
    this.paths = [];

    for (const pathPoints of this.rawPaths) {
      const pixelWaypoints = [];

      for (let i = 0; i < pathPoints.length; i++) {
        const pt = pathPoints[i];
        pixelWaypoints.push({
          x: (pt.x + 0.5) * this.tileSize,
          y: (pt.y + 0.5) * this.tileSize,
          gridX: pt.x,
          gridY: pt.y
        });

        // Mark tiles along path
        if (i < pathPoints.length - 1) {
          const next = pathPoints[i + 1];
          this.markPathSegment(pt.x, pt.y, next.x, next.y);
        }
      }

      this.paths.push(pixelWaypoints);
    }
  }

  markPathSegment(x0, y0, x1, y1) {
    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);

    let curX = x0;
    let curY = y0;

    while (true) {
      if (this.isValidTile(curX, curY)) {
        this.grid[curY][curX].isPath = true;
        this.grid[curY][curX].type = TILE_TYPES.PATH;
      }

      if (curX === x1 && curY === y1) break;

      if (curX !== x1) curX += dx;
      else if (curY !== y1) curY += dy;
    }
  }

  isValidTile(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  getTile(col, row) {
    if (!this.isValidTile(col, row)) return null;
    return this.grid[row][col];
  }

  getTileAtWorldPos(worldX, worldY) {
    const col = Math.floor(worldX / this.tileSize);
    const row = Math.floor(worldY / this.tileSize);
    return this.getTile(col, row);
  }

  canPlaceTower(col, row) {
    const tile = this.getTile(col, row);
    if (!tile) return false;
    if (tile.isPath || tile.type === TILE_TYPES.PATH) return false;
    if (tile.isBlocked || tile.type === TILE_TYPES.BLOCKED) return false;
    if (tile.tower !== null) return false;
    return true;
  }

  placeTower(col, row, tower) {
    const tile = this.getTile(col, row);
    if (tile && this.canPlaceTower(col, row)) {
      tile.tower = tower;
      // Apply tile specific buffs if on special tile
      if (tile.type === TILE_TYPES.HIGH_GROUND) {
        tower.buffModifiers.rangeMult = 1.15;
        tower.buffModifiers.damageMult = 1.10;
      } else if (tile.type === TILE_TYPES.POWER_GRID) {
        tower.buffModifiers.fireRateMult = 1.25;
      } else if (tile.type === TILE_TYPES.AMPLIFIER) {
        tower.buffModifiers.critChance = 0.25;
      }
      return true;
    }
    return false;
  }

  removeTower(col, row) {
    const tile = this.getTile(col, row);
    if (tile && tile.tower) {
      tile.tower = null;
      return true;
    }
    return false;
  }

  render(ctx) {
    // 1. Render Grid Tiles
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        const tx = c * this.tileSize;
        const ty = r * this.tileSize;

        // Render Special Tile Bases
        switch (tile.type) {
          case TILE_TYPES.HIGH_GROUND:
            ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
            ctx.fillRect(tx + 2, ty + 2, this.tileSize - 4, this.tileSize - 4);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx + 4, ty + 4, this.tileSize - 8, this.tileSize - 8);
            break;

          case TILE_TYPES.POWER_GRID:
            ctx.fillStyle = 'rgba(181, 23, 158, 0.12)';
            ctx.fillRect(tx + 2, ty + 2, this.tileSize - 4, this.tileSize - 4);
            ctx.strokeStyle = '#b5179e';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx + 4, ty + 4, this.tileSize - 8, this.tileSize - 8);
            break;

          case TILE_TYPES.AMPLIFIER:
            ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
            ctx.fillRect(tx + 2, ty + 2, this.tileSize - 4, this.tileSize - 4);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx + 4, ty + 4, this.tileSize - 8, this.tileSize - 8);
            break;

          case TILE_TYPES.BLOCKED:
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            break;
        }

        // Grid Outline
        ctx.strokeStyle = this.data.gridColor || 'rgba(30, 41, 59, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);
      }
    }

    // 2. Render Path Conduits with Animated Flow
    this.renderPaths(ctx);
  }

  renderPaths(ctx) {
    const time = performance.now() / 1000;

    for (const path of this.paths) {
      if (path.length < 2) continue;

      ctx.save();
      // Outer path road groove
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.strokeStyle = '#141e33';
      ctx.lineWidth = this.tileSize * 0.75;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Neon Guide Track Line
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.lineDashOffset = -time * 30; // animated pulsing flow
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Spawn Point Vector Marker
      const spawn = path[0];
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(spawn.x, spawn.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Exit / Core Goal Point Vector Marker
      const goal = path[path.length - 1];
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
