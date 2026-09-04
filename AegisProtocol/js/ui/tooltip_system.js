/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Tactical Floating Tooltip Manager
 */

export class TooltipSystem {
  constructor() {
    this.tooltipEl = document.getElementById('global-tooltip');
    this.active = false;
  }

  show(htmlContent, x, y) {
    if (!this.tooltipEl) return;
    this.tooltipEl.innerHTML = htmlContent;
    this.tooltipEl.style.display = 'block';

    const padding = 15;
    let left = x + padding;
    let top = y + padding;

    // Boundary clamping
    const rect = this.tooltipEl.getBoundingClientRect();
    if (left + rect.width > window.innerWidth) {
      left = x - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight) {
      top = y - rect.height - padding;
    }

    this.tooltipEl.style.left = `${Math.max(10, left)}px`;
    this.tooltipEl.style.top = `${Math.max(10, top)}px`;
    this.active = true;
  }

  hide() {
    if (!this.tooltipEl) return;
    this.tooltipEl.style.display = 'none';
    this.active = false;
  }
}

export const tooltips = new TooltipSystem();
