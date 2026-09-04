/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * In-Game Custom Map Editor System
 */

import { CONFIG, TILE_TYPES } from '../core/constants.js';
import { storage } from '../core/storage.js';
import { events, EVENTS } from '../core/events.js';

export const BRUSH_MODES = {
  EMPTY: TILE_TYPES.EMPTY,
  BLOCKED: TILE_TYPES.BLOCKED,
  PATH: TILE_TYPES.PATH,
  SPAWN: TILE_TYPES.SPAWN,
  GOAL: TILE_TYPES.GOAL,
  HIGH_GROUND: TILE_TYPES.HIGH_GROUND,
  POWER_GRID: TILE_TYPES.POWER_GRID,
  AMPLIFIER: TILE_TYPES.AMPLIFIER
};

export class MapEditor {
  constructor() {
    this.cols = CONFIG.GRID_COLS;
    this.rows = CONFIG.GRID_ROWS;
    this.currentBrush = BRUSH_MODES.PATH;
    this.mapName = 'Custom Sector 01';
    this.mapDifficulty = 'Custom';
    
    this.grid = [];
    this.waypoints = []; // array of { x: col, y: row }
    this.initEmptyGrid();
  }

  initEmptyGrid() {
    this.grid = Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.cols }, (_, c) => BRUSH_MODES.EMPTY)
    );
    this.waypoints = [];
  }

  setBrush(brush) {
    this.currentBrush = brush;
  }

  paintTile(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

    if (this.currentBrush === BRUSH_MODES.PATH) {
      // Add waypoint to path
      const last = this.waypoints[this.waypoints.length - 1];
      if (!last || (last.x !== col || last.y !== row)) {
        this.waypoints.push({ x: col, y: row });
      }
      this.grid[row][col] = BRUSH_MODES.PATH;
    } else {
      this.grid[row][col] = this.currentBrush;
    }
  }

  clearWaypoints() {
    this.waypoints = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === BRUSH_MODES.PATH) {
          this.grid[r][c] = BRUSH_MODES.EMPTY;
        }
      }
    }
  }

  exportMapData() {
    // Extract special tiles
    const specialTiles = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.grid[r][c];
        if ([TILE_TYPES.HIGH_GROUND, TILE_TYPES.POWER_GRID, TILE_TYPES.AMPLIFIER, TILE_TYPES.BLOCKED].includes(type)) {
          specialTiles.push({ x: c, y: r, type });
        }
      }
    }

    const mapObject = {
      id: `custom_${Date.now()}`,
      name: this.mapName || 'Custom Sector',
      difficulty: this.mapDifficulty || 'Custom',
      startingCredits: 650,
      startingLives: 20,
      totalWaves: 20,
      theme: 'neon',
      paths: this.waypoints.length >= 2 ? [this.waypoints] : [[{ x: 0, y: 7 }, { x: 23, y: 7 }]],
      specialTiles,
      waves: [] // Will use dynamic wave generator
    };

    return mapObject;
  }

  saveToStorage() {
    const mapObj = this.exportMapData();
    storage.saveCustomMap(mapObj);
    events.emit(EVENTS.MAP_SAVED, { map: mapObj });
    events.emit(EVENTS.TOAST_NOTIFY, {
      title: 'MAP SAVED',
      message: `"${mapObj.name}" saved to LocalStorage!`,
      type: 'success'
    });
    return mapObj;
  }

  importMapData(jsonString) {
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      this.initEmptyGrid();
      this.mapName = parsed.name || 'Imported Sector';

      if (parsed.paths && parsed.paths[0]) {
        this.waypoints = parsed.paths[0];
        for (const pt of this.waypoints) {
          if (pt.x >= 0 && pt.x < this.cols && pt.y >= 0 && pt.y < this.rows) {
            this.grid[pt.y][pt.x] = BRUSH_MODES.PATH;
          }
        }
      }

      if (parsed.specialTiles) {
        for (const st of parsed.specialTiles) {
          if (st.x >= 0 && st.x < this.cols && st.y >= 0 && st.y < this.rows) {
            this.grid[st.y][st.x] = st.type;
          }
        }
      }

      return true;
    } catch (e) {
      console.error('[MapEditor] Import failed:', e);
      return false;
    }
  }

  render(ctx) {
    const tileSize = CONFIG.TILE_SIZE;

    // Render Editor Grid
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.grid[r][c];
        const tx = c * tileSize;
        const ty = r * tileSize;

        switch (type) {
          case BRUSH_MODES.PATH:
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(tx, ty, tileSize, tileSize);
            break;
          case BRUSH_MODES.HIGH_GROUND:
            ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = '#38bdf8';
            ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
            break;
          case BRUSH_MODES.POWER_GRID:
            ctx.fillStyle = 'rgba(181, 23, 158, 0.2)';
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = '#b5179e';
            ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
            break;
          case BRUSH_MODES.AMPLIFIER:
            ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = '#f59e0b';
            ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);
            break;
          case BRUSH_MODES.BLOCKED:
            ctx.fillStyle = '#334155';
            ctx.fillRect(tx, ty, tileSize, tileSize);
            break;
          default:
            ctx.fillStyle = '#0a0e1a';
            ctx.fillRect(tx, ty, tileSize, tileSize);
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx, ty, tileSize, tileSize);
      }
    }

    // Render Waypoint Lines
    if (this.waypoints.length >= 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo((this.waypoints[0].x + 0.5) * tileSize, (this.waypoints[0].y + 0.5) * tileSize);
      for (let i = 1; i < this.waypoints.length; i++) {
        ctx.lineTo((this.waypoints[i].x + 0.5) * tileSize, (this.waypoints[i].y + 0.5) * tileSize);
      }
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.stroke();

      // Nodes
      for (let i = 0; i < this.waypoints.length; i++) {
        const pt = this.waypoints[i];
        ctx.fillStyle = i === 0 ? '#00ff88' : (i === this.waypoints.length - 1 ? '#ff0055' : '#00f3ff');
        ctx.beginPath();
        ctx.arc((pt.x + 0.5) * tileSize, (pt.y + 0.5) * tileSize, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

export const editor = new MapEditor();
