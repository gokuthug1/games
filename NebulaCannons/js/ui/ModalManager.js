/**
 * ModalManager — generic confirm/dialog overlay with a promise-based API.
 */

import { Svg } from './SvgAssets.js';

export class ModalManager {
  constructor(root) {
    this.root = root;
    this.root.innerHTML = `
      <div class="modal-backdrop" data-role="backdrop" hidden>
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h3 data-role="title"></h3>
            <button class="modal-close" data-role="close" aria-label="Close">${Svg.close(18, 18)}</button>
          </div>
          <div class="modal-body" data-role="body"></div>
          <div class="modal-actions" data-role="actions"></div>
        </div>
      </div>
    `;
    this.backdrop = this.root.querySelector('[data-role="backdrop"]');
    this.titleEl = this.root.querySelector('[data-role="title"]');
    this.bodyEl = this.root.querySelector('[data-role="body"]');
    this.actionsEl = this.root.querySelector('[data-role="actions"]');
    this.closeBtn = this.root.querySelector('[data-role="close"]');

    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
    this._resolve = null;
    this._onClose = null;
  }

  /**
   * @param {string} title
   * @param {string|Node} body HTML string or element
   * @param {Array<{label:string, value:string, kind?:string}>} buttons
   * @returns {Promise<string|null>} resolves with clicked button value or null
   */
  show(title, body, buttons = [{ label: 'OK', value: 'ok' }]) {
    return new Promise((resolve) => {
      this._resolve = resolve;
      this.titleEl.textContent = title;
      if (typeof body === 'string') this.bodyEl.innerHTML = body;
      else {
        this.bodyEl.innerHTML = '';
        this.bodyEl.appendChild(body);
      }
      this.actionsEl.innerHTML = '';
      for (const b of buttons) {
        const btn = document.createElement('button');
        btn.className = `btn ${b.kind === 'danger' ? 'btn-danger' : b.kind === 'primary' ? 'btn-primary' : ''}`;
        btn.textContent = b.label;
        btn.addEventListener('click', () => this.close(b.value));
        this.actionsEl.appendChild(btn);
      }
      this.backdrop.hidden = false;
      this.backdrop.classList.add('show');
      this.closeBtn.focus?.();
    });
  }

  close(value = null) {
    if (this.backdrop.hidden) return;
    this.backdrop.hidden = true;
    this.backdrop.classList.remove('show');
    if (this._resolve) {
      const r = this._resolve;
      this._resolve = null;
      r(value);
    }
  }

  isOpen() {
    return !this.backdrop.hidden;
  }
}
