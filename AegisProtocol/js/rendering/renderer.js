/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Master Canvas Vector Rendering Pipeline & Visual Effects Engine
 */

import { CONFIG, COLORS } from '../core/constants.js';
import { Camera } from './camera.js';
import { particles } from './particles.js';
import { state } from '../core/state.js';
import { TOWERS_DATA } from '../data/towers_data.js';
import { events } from '../core/events.js';

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera(canvas);
    
    // Set internal resolution
    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;

    // AI Timeline Grid Spotlight animation
    this.targetSpotlight = null; // { x, y, radius, timer, maxTimer, label }

    events.on('ai:highlight_target', ({ gridPos }) => {
      if (!gridPos) return;
      const worldX = gridPos.x !== undefined ? gridPos.x : (gridPos.col + 0.5) * CONFIG.TILE_SIZE;
      const worldY = gridPos.y !== undefined ? gridPos.y : (gridPos.row + 0.5) * CONFIG.TILE_SIZE;
      
      this.targetSpotlight = {
        x: worldX,
        y: worldY,
        timer: 4.0,
        maxTimer: 4.0,
        label: gridPos.col !== undefined ? `SECTOR [${gridPos.col}, ${gridPos.row}]` : 'TARGET VECTOR'
      };
    });
  }

  clear() {
    this.ctx.fillStyle = '#070a13';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(map, towers, enemies, projectiles) {
    this.clear();
    this.camera.apply(this.ctx);

    const now = performance.now() / 1000;

    // 1. Render Map Terrain, Grid & Pathway Energy Conduits
    if (map) {
      map.render(this.ctx);
      this.renderPathwayEnergyPulses(map, now);
    }

    // 2. Render Hover Range Indicators & Selection Circles
    this.renderPlacementPreview(map);
    this.renderSelectionRange();

    // 3. Render Towers Base & Turrets
    for (const tower of towers) {
      tower.render(this.ctx);
    }

    // 4. Render Enemies & Status Bars
    for (const enemy of enemies) {
      if (enemy.active) {
        enemy.render(this.ctx);
      }
    }

    // 5. Render Projectiles & Laser Beams
    for (const p of projectiles) {
      if (p.active) {
        p.render(this.ctx);
      }
    }

    // 6. Render Particle Systems & Floating Texts
    particles.render(this.ctx);

    // 7. Render AI Timeline Grid Target Spotlight
    this.renderAIGridSpotlight();

    // 8. Render Active Commander Ability Reticle
    this.renderAbilityReticle();

    this.camera.restore(this.ctx);
  }

  renderPathwayEnergyPulses(map, timeSec) {
    if (!map.paths || map.paths.length === 0) return;

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 8;
    this.ctx.setLineDash([8, 16]);
    this.ctx.lineDashOffset = -timeSec * 45;

    for (const path of map.paths) {
      if (path.length < 2) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        this.ctx.lineTo(path[i].x, path[i].y);
      }
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderAIGridSpotlight() {
    if (!this.targetSpotlight || this.targetSpotlight.timer <= 0) return;

    const spot = this.targetSpotlight;
    const progress = spot.timer / spot.maxTimer;
    const pulse = Math.sin(performance.now() / 150) * 6;
    const r = 32 + pulse;

    this.ctx.save();
    this.ctx.translate(spot.x, spot.y);

    // Outer rotating reticle ring
    this.ctx.rotate(performance.now() / 800);
    this.ctx.strokeStyle = '#b5179e';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#f472b6';
    this.ctx.shadowBlur = 16;
    this.ctx.setLineDash([12, 8]);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner reticle brackets
    this.ctx.rotate(-performance.now() / 400);
    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    this.ctx.stroke();

    // Target crosshairs
    this.ctx.beginPath();
    this.ctx.moveTo(-r * 1.3, 0);
    this.ctx.lineTo(r * 1.3, 0);
    this.ctx.moveTo(0, -r * 1.3);
    this.ctx.lineTo(0, r * 1.3);
    this.ctx.stroke();

    // Target Label
    this.ctx.rotate(0);
    this.ctx.font = 'bold 11px Courier New, monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(spot.label, 0, r + 18);

    this.ctx.restore();

    // Decrement timer
    spot.timer -= (1 / 60);
  }

  renderPlacementPreview(map) {
    if (!state.selectedTowerType || !map) return;

    const towerProto = TOWERS_DATA[state.selectedTowerType];
    if (!towerProto) return;

    const gridX = state.mouseGridX;
    const gridY = state.mouseGridY;
    const isValid = map.canPlaceTower(gridX, gridY) && state.credits >= towerProto.cost;
    state.isPlacementValid = isValid;

    const worldX = (gridX + 0.5) * CONFIG.TILE_SIZE;
    const worldY = (gridY + 0.5) * CONFIG.TILE_SIZE;
    const range = towerProto.baseStats.range;

    this.ctx.save();
    // Range Circle
    this.ctx.beginPath();
    this.ctx.arc(worldX, worldY, range, 0, Math.PI * 2);
    this.ctx.fillStyle = isValid ? COLORS.RANGE_VALID : COLORS.RANGE_INVALID;
    this.ctx.fill();
    this.ctx.strokeStyle = isValid ? COLORS.RANGE_BORDER : COLORS.CRIMSON;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    this.ctx.stroke();

    // Tower Tile Ghost
    this.ctx.fillStyle = isValid ? 'rgba(0, 243, 255, 0.3)' : 'rgba(255, 0, 85, 0.3)';
    this.ctx.fillRect(gridX * CONFIG.TILE_SIZE, gridY * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    this.ctx.strokeStyle = isValid ? '#00f3ff' : '#ff0055';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(gridX * CONFIG.TILE_SIZE, gridY * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

    this.ctx.restore();
  }

  renderSelectionRange() {
    if (!state.selectedEntity) return;

    if (state.selectedEntity instanceof Object && state.selectedEntity.currentRange) {
      state.selectedEntity.renderRange(this.ctx, true);
    }
  }

  renderAbilityReticle() {
    if (!state.activeAbilityTargeting) return;

    const ability = state.activeAbilityTargeting;
    const radius = ability.radius || 100;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(state.mouseWorldX, state.mouseWorldY, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
    this.ctx.fill();
    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 12;
    this.ctx.setLineDash([4, 4]);
    this.ctx.stroke();

    // Crosshair center lines
    this.ctx.beginPath();
    this.ctx.moveTo(state.mouseWorldX - 16, state.mouseWorldY);
    this.ctx.lineTo(state.mouseWorldX + 16, state.mouseWorldY);
    this.ctx.moveTo(state.mouseWorldX, state.mouseWorldY - 16);
    this.ctx.lineTo(state.mouseWorldX, state.mouseWorldY + 16);
    this.ctx.stroke();

    this.ctx.restore();
  }
}
