/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Toast Notifications & Tactical Alert Banners
 */

import { events, EVENTS } from '../core/events.js';
import { getIcon } from '../rendering/svg_icons.js';

export class NotificationSystem {
  constructor() {
    this.container = document.getElementById('toast-container');
    this.banner = document.getElementById('tactical-alert-banner');
    this.initListeners();
  }

  initListeners() {
    events.on(EVENTS.TOAST_NOTIFY, (data) => {
      this.showToast(data.title, data.message, data.type);
    });

    events.on(EVENTS.BOSS_SPAWNED, ({ bossName }) => {
      this.showTacticalBanner(`WARNING: HOSTILE TITAN DETECTED`, `${bossName} has breached the outer perimeter.`);
    });
  }

  showToast(title, message, type = 'info') {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let iconKey = 'SHIELD';
    if (type === 'achievement') iconKey = 'TROPHY';
    else if (type === 'success') iconKey = 'CHECK';
    else if (type === 'error') iconKey = 'CLOSE';

    toast.innerHTML = `
      <div class="toast-icon">${getIcon(iconKey)}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3500);
  }

  showTacticalBanner(title, subtitle) {
    if (!this.banner) return;

    this.banner.innerHTML = `
      <div class="banner-box">
        <div class="banner-title">${getIcon('SKULL')} ${title}</div>
        <div class="banner-sub">${subtitle}</div>
      </div>
    `;
    this.banner.classList.add('active');

    setTimeout(() => {
      this.banner.classList.remove('active');
    }, 4000);
  }
}

export const notifications = new NotificationSystem();
