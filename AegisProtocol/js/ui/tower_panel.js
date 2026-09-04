/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Tower Build Dock & Live Inspector Panel
 */

import { TOWERS_DATA } from '../data/towers_data.js';
import { TARGET_PRIORITIES } from '../core/constants.js';
import { state } from '../core/state.js';
import { events, EVENTS } from '../core/events.js';
import { getIcon } from '../rendering/svg_icons.js';
import { tooltips } from './tooltip_system.js';

export class TowerPanelManager {
  constructor() {
    this.dockContainer = document.getElementById('tower-build-dock');
    this.inspectorContainer = document.getElementById('tower-inspector-drawer');
    this.initBuildDock();
    this.initListeners();
  }

  initBuildDock() {
    if (!this.dockContainer) return;
    this.dockContainer.innerHTML = '';

    const towerKeys = Object.keys(TOWERS_DATA);
    towerKeys.forEach((key, idx) => {
      const tower = TOWERS_DATA[key];
      const btn = document.createElement('button');
      btn.className = 'tower-build-btn';
      btn.dataset.towerType = key;
      btn.innerHTML = `
        <div class="tower-btn-header">
          <span class="hotkey-badge">${idx + 1}</span>
          <span class="tower-cost">${getIcon('CREDITS')} ${tower.cost}</span>
        </div>
        <div class="tower-btn-name">${tower.shortName}</div>
        <div class="tower-btn-role">${tower.role}</div>
      `;

      btn.addEventListener('click', () => {
        if (state.selectedTowerType === key) {
          state.clearSelection();
        } else {
          state.setSelectedTower(key);
        }
        this.updateDockActiveStates();
      });

      // Hover tooltip
      btn.addEventListener('mouseenter', (e) => {
        const tip = `
          <div class="tooltip-title">${tower.name}</div>
          <div class="tooltip-sub">${tower.role} (${tower.damageType})</div>
          <div class="tooltip-body">${tower.lore}</div>
          <div class="tooltip-stats">
            <div>${getIcon('DAMAGE')} Damage: <b>${tower.baseStats.damage}</b></div>
            <div>${getIcon('FIRE_RATE')} Fire Rate: <b>${tower.baseStats.fireRate}/s</b></div>
            <div>${getIcon('RANGE')} Range: <b>${tower.baseStats.range}px</b></div>
          </div>
        `;
        tooltips.show(tip, e.clientX, e.clientY);
      });

      btn.addEventListener('mouseleave', () => tooltips.hide());

      this.dockContainer.appendChild(btn);
    });
  }

  initListeners() {
    events.on(EVENTS.TOWER_SELECTED, ({ entity }) => {
      this.updateInspector(entity);
      this.updateDockActiveStates();
    });

    events.on(EVENTS.CREDITS_CHANGED, () => {
      this.updateDockAffordability();
    });

    events.on(EVENTS.TOWER_UPGRADED, ({ tower }) => {
      if (state.selectedEntity === tower) {
        this.updateInspector(tower);
      }
    });
  }

  updateDockActiveStates() {
    if (!this.dockContainer) return;
    const buttons = this.dockContainer.querySelectorAll('.tower-build-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.towerType === state.selectedTowerType);
    });
  }

  updateDockAffordability() {
    if (!this.dockContainer) return;
    const buttons = this.dockContainer.querySelectorAll('.tower-build-btn');
    buttons.forEach(btn => {
      const type = btn.dataset.towerType;
      const proto = TOWERS_DATA[type];
      if (proto) {
        btn.classList.toggle('unaffordable', state.credits < proto.cost);
      }
    });
  }

  updateInspector(tower) {
    if (!this.inspectorContainer) return;

    if (!tower || !tower.stats) {
      this.inspectorContainer.classList.remove('active');
      return;
    }

    this.inspectorContainer.classList.add('active');

    const nextTierData = tower.tier < 3 ? tower.proto.tiers[tower.tier] : null;
    const branchA = tower.proto.branches?.A;
    const branchB = tower.proto.branches?.B;

    let upgradeBtnHtml = '';
    if (nextTierData) {
      const canAfford = state.credits >= nextTierData.cost;
      upgradeBtnHtml = `
        <button id="btn-upgrade-tier" class="action-btn upgrade-btn ${canAfford ? '' : 'unaffordable'}">
          ${getIcon('UPGRADE')} UPGRADE (Tier ${tower.tier + 1}) - ${getIcon('CREDITS')} ${nextTierData.cost}
        </button>
      `;
    } else if (tower.tier === 3 && !tower.chosenBranch) {
      upgradeBtnHtml = `
        <div class="branch-choice-container">
          <button id="btn-branch-a" class="action-btn branch-btn">
            ${getIcon('UPGRADE')} [A] ${branchA?.name} (${getIcon('CREDITS')} ${branchA?.cost})
          </button>
          <button id="btn-branch-b" class="action-btn branch-btn">
            ${getIcon('UPGRADE')} [B] ${branchB?.name} (${getIcon('CREDITS')} ${branchB?.cost})
          </button>
        </div>
      `;
    } else if (tower.chosenBranch) {
      upgradeBtnHtml = `<div class="max-tier-label">${getIcon('CHECK')} APEX SPECIALIZATION ACTIVE</div>`;
    }

    this.inspectorContainer.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-title">${tower.name}</div>
        <div class="inspector-badge">TIER ${tower.tier} ${tower.chosenBranch ? `(${tower.chosenBranch})` : ''}</div>
        <button id="btn-close-inspector" class="icon-btn">${getIcon('CLOSE')}</button>
      </div>

      <div class="inspector-stats-grid">
        <div class="stat-box">
          <span class="stat-label">${getIcon('DAMAGE')} Damage</span>
          <span class="stat-val">${Math.round(tower.currentDamage)}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">${getIcon('FIRE_RATE')} Fire Rate</span>
          <span class="stat-val">${tower.currentFireRate.toFixed(1)}/s</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">${getIcon('DAMAGE')} Base DPS</span>
          <span class="stat-val" style="color: var(--cyan);">${Math.round(tower.baseDPS)}/s</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">${getIcon('RANGE')} Range</span>
          <span class="stat-val">${Math.round(tower.currentRange)}px</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">${getIcon('TARGET')} Area</span>
          <span class="stat-val">${Math.round(tower.coverageArea / 1000)}k px²</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">${getIcon('SKULL')} Total Dmg</span>
          <span class="stat-val">${Math.round(tower.totalDamageDealt)}</span>
        </div>
      </div>

      <div class="targeting-selector-section">
        <div class="section-label">${getIcon('TARGET')} TARGETING AI PROTOCOL:</div>
        <div class="targeting-buttons">
          ${Object.values(TARGET_PRIORITIES).map(p => `
            <button class="target-chip ${tower.targetPriority === p ? 'active' : ''}" data-priority="${p}">
              ${p}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="inspector-actions">
        ${upgradeBtnHtml}
        <button id="btn-sell-tower" class="action-btn sell-btn">
          ${getIcon('SELL')} RECYCLE (+${getIcon('CREDITS')} ${tower.getSellRefund()})
        </button>
      </div>
    `;

    // Bind event listeners
    this.inspectorContainer.querySelector('#btn-close-inspector')?.addEventListener('click', () => {
      state.clearSelection();
    });

    this.inspectorContainer.querySelector('#btn-upgrade-tier')?.addEventListener('click', () => {
      tower.upgradeTier();
    });

    this.inspectorContainer.querySelector('#btn-branch-a')?.addEventListener('click', () => {
      tower.promoteBranch('A');
    });

    this.inspectorContainer.querySelector('#btn-branch-b')?.addEventListener('click', () => {
      tower.promoteBranch('B');
    });

    this.inspectorContainer.querySelector('#btn-sell-tower')?.addEventListener('click', () => {
      const tile = state.currentMapData?.getTile(tower.gridX, tower.gridY);
      if (tile) state.currentMapData.removeTower(tower.gridX, tower.gridY);
      
      const idx = state.towers.indexOf(tower);
      if (idx >= 0) state.towers.splice(idx, 1);

      tower.sell();
      state.clearSelection();
    });

    this.inspectorContainer.querySelectorAll('.target-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        tower.setTargetPriority(chip.dataset.priority);
        this.updateInspector(tower);
      });
    });
  }
}
