/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Autonomous AI Thinking Steps & Decision Timeline UI Manager
 * 
 * Strict Zero-Emoji Compliance: High precision SVG iconography, smooth CSS transitions,
 * telemetry breakdowns, and interactive grid spotlight targeting.
 */

import { autonomousAgent } from '../systems/autonomous_agent.js';
import { events, EVENTS } from '../core/events.js';
import { getIcon } from '../rendering/svg_icons.js';
import { state } from '../core/state.js';
import { audio } from '../core/audio.js';

export class AITimelineManager {
  constructor() {
    this.container = null;
    this.toggleBtn = null;
    this.entriesList = null;
    this.filterChips = [];
    this.activeFilter = 'ALL';
    this.isOpen = false;
    this.highlightedGridPos = null;

    if (typeof document !== 'undefined') {
      this.initDOM();
    }
    this.initEventListeners();
  }

  initDOM() {
    if (typeof document === 'undefined') return;

    this.container = document.getElementById('ai-timeline-drawer');
    this.toggleBtn = document.getElementById('btn-toggle-ai-log');
    this.entriesList = document.getElementById('ai-timeline-entries');
    this.filterChips = document.querySelectorAll('.ai-filter-chip');

    this.toggleBtn?.addEventListener('click', () => {
      this.toggleDrawer();
    });

    document.getElementById('btn-close-ai-timeline')?.addEventListener('click', () => {
      this.closeDrawer();
    });

    document.getElementById('btn-clear-ai-timeline')?.addEventListener('click', () => {
      autonomousAgent.clearHistory();
      this.render();
      audio.playUIClick();
    });

    this.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.dataset.filter || 'ALL';
        this.render();
        audio.playUIClick();
      });
    });
  }

  initEventListeners() {
    events.on(EVENTS.AUTONOMOUS_AI_DECISION, ({ step }) => {
      if (this.isOpen) {
        this.prependStepElement(step);
      }
    });

    events.on('ai:history_cleared', () => {
      if (this.entriesList) {
        this.entriesList.innerHTML = '<div class="ai-timeline-empty">TIMELINE CLEARED // AWAITING NEW AGENT STEPS</div>';
      }
    });

    events.on(EVENTS.AUTONOMOUS_AI_TOGGLED, ({ isEnabled }) => {
      if (this.toggleBtn) {
        this.toggleBtn.classList.toggle('active', isEnabled);
      }
    });
  }

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    if (!this.container) this.initDOM();
    if (this.container) {
      this.container.classList.toggle('active', this.isOpen);
      if (this.isOpen) {
        this.render();
      }
    }
    audio.playUIClick();
  }

  openDrawer() {
    this.isOpen = true;
    if (!this.container) this.initDOM();
    if (this.container) {
      this.container.classList.add('active');
      this.render();
    }
  }

  closeDrawer() {
    this.isOpen = false;
    if (this.container) {
      this.container.classList.remove('active');
    }
    audio.playUIClick();
  }

  getFilteredHistory() {
    const history = autonomousAgent.history || [];
    if (this.activeFilter === 'ALL') return history;
    return history.filter(item => item.category === this.activeFilter);
  }

  render() {
    if (!this.entriesList) return;

    const history = this.getFilteredHistory();
    if (history.length === 0) {
      this.entriesList.innerHTML = `
        <div class="ai-timeline-empty">
          ${getIcon('INFO')}
          <span>NO THINKING STEPS RECORDED FOR CURRENT FILTER</span>
        </div>
      `;
      return;
    }

    this.entriesList.innerHTML = '';
    history.forEach(step => {
      const el = this.createStepElement(step);
      this.entriesList.appendChild(el);
    });
  }

  prependStepElement(step) {
    if (!this.entriesList) return;
    if (this.activeFilter !== 'ALL' && step.category !== this.activeFilter) return;

    const emptyMsg = this.entriesList.querySelector('.ai-timeline-empty');
    if (emptyMsg) emptyMsg.remove();

    const el = this.createStepElement(step);
    el.classList.add('new-step-animate');
    this.entriesList.insertBefore(el, this.entriesList.firstChild);

    // Limit DOM elements for performance
    while (this.entriesList.children.length > 80) {
      this.entriesList.removeChild(this.entriesList.lastChild);
    }
  }

  createStepElement(step) {
    const el = document.createElement('div');
    el.className = `ai-step-card category-${step.category.toLowerCase()}`;
    el.dataset.stepId = step.id;

    const categoryBadge = this.getCategoryBadge(step.category);

    el.innerHTML = `
      <div class="step-card-header">
        <div class="step-card-meta">
          <span class="step-index">#${step.id}</span>
          <span class="step-time">${step.timestamp}</span>
          <span class="step-wave">WAVE ${step.wave || 1}</span>
          ${categoryBadge}
        </div>
        ${step.gridPos ? `<button class="step-locate-btn" title="Highlight target coordinate on grid">${getIcon('TARGET')} LOCATE</button>` : ''}
      </div>

      <div class="step-card-title">${step.title}</div>
      
      ${step.formula ? `
        <div class="step-card-formula">
          <span class="formula-glyph">${getIcon('CODE')}</span>
          <span class="formula-text">${step.formula}</span>
        </div>
      ` : ''}

      <div class="step-card-rationale">${step.rationale}</div>

      <div class="step-card-telemetry">
        <span>Defense: <b>${Math.round(step.telemetry?.defenseDPS || 0)} DPS</b></span>
        <span>Threat: <b>${Math.round(step.telemetry?.threatEHP || 0)} EHP</b></span>
        <span>Archetype Demand: <b style="color: var(--cyan);">${(step.telemetry?.recommendedArchetype || 'GATLING').toUpperCase()}</b></span>
      </div>
    `;

    // Interactive Locate Button click to spotlight grid coordinate
    const locateBtn = el.querySelector('.step-locate-btn');
    if (locateBtn && step.gridPos) {
      locateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.highlightGridTarget(step.gridPos);
      });
    }

    return el;
  }

  getCategoryBadge(category) {
    switch (category) {
      case 'CONSTRUCTION':
        return `<span class="step-badge badge-construct">${getIcon('BUILD')} CONSTRUCT</span>`;
      case 'ROI_UPGRADE':
        return `<span class="step-badge badge-upgrade">${getIcon('UPGRADE')} UPGRADE</span>`;
      case 'APEX_PROMOTION':
        return `<span class="step-badge badge-apex">${getIcon('STAR')} APEX</span>`;
      case 'COMMANDER_POWER':
        return `<span class="step-badge badge-power">${getIcon('SHOCK')} ABILITY</span>`;
      case 'WAVE_PACING':
        return `<span class="step-badge badge-pacing">${getIcon('PLAY')} WAVE</span>`;
      default:
        return `<span class="step-badge badge-status">${getIcon('SETTINGS')} STATUS</span>`;
    }
  }

  highlightGridTarget(gridPos) {
    this.highlightedGridPos = gridPos;
    audio.playUIClick();
    events.emit('ai:highlight_target', { gridPos });
  }
}

export const aiTimeline = new AITimelineManager();
