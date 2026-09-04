/**
 * HUD — battlefield overlay. Observes game state via the EventBus and
 * renders it; it never mutates gameplay state. All icons are inline SVG.
 */

import { Svg } from './SvgAssets.js';
import { EVT } from '../core/EventBus.js';
import { CONFIG } from '../core/Config.js';
import { clamp } from '../utils/MathUtils.js';

export class HUD {
  /**
   * @param {HTMLElement} root
   * @param {object} game
   */
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.bus = game.bus;
    this.activeTankId = null;
    this._playerCards = new Map(); // tankId -> card element
    this._bannerTimer = null;
    this._windTimer = 0;
    this._isCoarse = typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches;

    this._buildDom();
    this._bindEvents();
  }

  _buildDom() {
    const el = (html) => {
      const t = document.createElement('div');
      t.innerHTML = html.trim();
      return t.firstElementChild;
    };

    this.root.innerHTML = '';

    // ---- top bar: player card left, wind center, enemy card right ----
    const top = el(`
      <div class="hud-top">
        <div class="hud-cards hud-cards-left" data-role="cards-left"></div>
        <div class="hud-center">
          <div class="hud-wind" title="Wind">
            <span class="hud-wind-arrows" data-role="wind-arrows"></span>
            <span class="hud-wind-value" data-role="wind-value">0</span>
          </div>
        </div>
        <div class="hud-cards hud-cards-right" data-role="cards-right"></div>
        <div class="hud-buttons">
          <button class="hud-btn fullscreen-btn" data-action="fullscreen" title="Fullscreen" aria-label="Toggle fullscreen">${Svg.target(20, 20)}</button>
          <button class="hud-btn" data-action="pause" title="Pause (Esc)">${Svg.pause(22, 22)}</button>
        </div>
      </div>
    `);
    this.root.appendChild(top);

    // ---- bottom bar ----
    const bottom = el(`
      <div class="hud-bottom">
        <div class="hud-readouts">
          <div class="hud-readout" title="Turret angle">
            ${Svg.crosshair(18, 18, 'hud-readout-icon')}
            <span data-role="angle">62°</span>
          </div>
          <div class="hud-readout" title="Firing power">
            ${Svg.bolt(18, 18, 'hud-readout-icon')}
            <span data-role="power">55%</span>
          </div>
          <div class="hud-readout hud-aimlock" data-role="aimlock" title="Aim locked — right-click to toggle" hidden>
            ${Svg.lock(16, 16, 'hud-readout-icon')}
            <span data-role="aimlock-text">LOCK</span>
          </div>
        </div>

        <div class="hud-power-slider">
          <span class="hud-slider-label">POWER</span>
          <input type="range" data-role="power-slider" min="10" max="100" step="1" value="55" aria-label="Firing power"/>
        </div>

        <div class="hud-weapons" data-role="weapons" title="Weapons (Q/E)"></div>

        <button class="hud-fire-btn" data-action="fire" aria-label="Fire">
          ${Svg.fire(30, 30)}
          <span>FIRE</span>
        </button>
      </div>
    `);
    this.root.appendChild(bottom);

    // ---- turn banner ----
    const banner = el(`
      <div class="hud-banner" data-role="banner">
        <div class="hud-banner-inner" data-role="banner-text"></div>
      </div>
    `);
    this.root.appendChild(banner);

    // ---- one-time portrait rotation hint (subtle, first match only) ----
    const rotateHint = el(`
      <div class="hud-rotate-hint" data-role="rotate-hint" aria-hidden="true">
        <span class="rotate-hint-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20.5 8.5A8.5 8.5 0 1 0 22 14"/>
            <path d="M20.5 2.5V8.5h-6"/>
          </svg>
        </span>
        <span class="rotate-hint-text">Field rotated — your tank waits at the edge</span>
      </div>
    `);
    this.root.appendChild(rotateHint);
    this._rotateHintEl = rotateHint;
    this._rotateHintTimer = null;

    // ---- weapon tooltip (single shared element, positioned on hover) ----
    const tooltip = el(`<div class="weapon-tooltip" data-role="weapon-tooltip" aria-hidden="true"></div>`);
    this.root.appendChild(tooltip);
    this._tooltipEl = tooltip;

    // ---- touch controls (shown on coarse pointers) ----
    const touch = el(`
      <div class="hud-touch" data-role="touch">
        <div class="touch-cluster touch-cluster-left">
          <div class="touch-joystick" data-role="joystick" aria-label="Move tank — drag left or right">
            <div class="touch-joystick-base">
              <span class="joy-arrow joy-arrow-left">${Svg.arrowLeft(16, 16)}</span>
              <span class="joy-arrow joy-arrow-right">${Svg.arrowRight(16, 16)}</span>
              <div class="touch-joystick-knob" data-role="joystick-knob"></div>
            </div>
          </div>
          <div class="touch-group touch-aim">
            <button class="touch-btn" data-touch="aimUp" aria-label="Aim up">${Svg.arrowUp(26, 26)}</button>
            <button class="touch-btn" data-touch="aimDown" aria-label="Aim down">${Svg.arrowDown(26, 26)}</button>
          </div>
        </div>
        <div class="touch-cluster touch-cluster-right">
          <div class="touch-group touch-power">
            <button class="touch-btn touch-small" data-touch="powerUp" aria-label="Power up">+</button>
            <button class="touch-btn touch-small" data-touch="powerDown" aria-label="Power down">−</button>
            <button class="touch-btn touch-small radial-trigger" data-action="radial" aria-label="Weapon wheel">${Svg.chevron(20, 20)}</button>
          </div>
        </div>
      </div>
    `);
    this.root.appendChild(touch);
    this._touchEl = touch;
    this._bindJoystick();
    this._aimlockEl = this.root.querySelector('[data-role="aimlock"]');

    // ---- corner mini-map toggle (mobile: see both tanks at a glance) ----
    const minimap = el(`
      <div class="hud-minimap" data-role="minimap">
        <button class="hud-btn hud-minimap-toggle" data-action="minimap" title="Toggle mini-map" aria-label="Toggle mini-map" aria-pressed="false">${Svg.minimap(20, 20)}</button>
        <canvas class="hud-minimap-canvas" data-role="minimap-canvas" width="352" height="198"></canvas>
      </div>
    `);
    this.root.appendChild(minimap);
    this._minimapEl = minimap;
    this._minimapBg = null;
    this._minimapKey = null;

    // ---- radial weapon picker (touch) ----
    const radial = el(`<div class="weapon-radial" data-role="radial" aria-hidden="true"></div>`);
    this.root.appendChild(radial);
    this._radialEl = radial;

    this._bindDomActions();
  }

  _bindDomActions() {
    const on = (sel, fn) => {
      const el = this.root.querySelector(sel);
      if (el) el.addEventListener('click', (e) => { e.preventDefault(); fn(e); });
    };
    on('[data-action="pause"]', () => this.game.togglePause());
    on('[data-action="fire"]', () => this.game.requestFire());
    on('[data-action="fullscreen"]', () => this._toggleFullscreen());
    on('[data-action="minimap"]', () => this._toggleMinimap());

    const slider = this.root.querySelector('[data-role="power-slider"]');
    if (slider) {
      slider.addEventListener('input', () => {
        const v = parseInt(slider.value, 10);
        this.game.input.setPowerFromSlider(v);
      });
    }

    // Touch buttons: press-and-hold semantics.
    const bindHold = (btn, downFn, upFn) => {
      const press = (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        downFn();
      };
      const release = () => upFn();
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    };
    this.root.querySelectorAll('[data-touch]').forEach((btn) => {
      const action = btn.dataset.touch;
      bindHold(
        btn,
        () => this.game.input.setTouch(action, true),
        () => this.game.input.setTouch(action, false)
      );
    });

    // Radial picker toggle (anchored to the tap point on touch).
    const radialBtn = this.root.querySelector('[data-action="radial"]');
    if (radialBtn) {
      radialBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this._toggleRadial(undefined, e.clientX, e.clientY);
      });
    }
    if (this._radialEl) {
      this._radialEl.addEventListener('click', (e) => {
        const item = e.target.closest('[data-weapon-index]');
        if (item) {
          this.game.input.setWeaponIndex(Number(item.dataset.weaponIndex));
          this._toggleRadial(false);
        } else {
          this._toggleRadial(false);
        }
      });
    }

    this._applyTouchLayout();
  }

  /**
   * Horizontal movement joystick: drag left/right to move the tank, with a
   * deadzone near center. Vertical deflection is ignored — the tank only
   * moves left and right.
   */
  _bindJoystick() {
    const joy = this.root.querySelector('[data-role="joystick"]');
    if (!joy) return;
    const knob = this.root.querySelector('[data-role="joystick-knob"]');
    const TRAVEL = 22; // px the knob slides (matches the deadzone scale)
    let active = false;
    let activePointer = null;

    const setV = (v) => {
      this.game.input.setJoystick(v);
      if (knob) knob.style.transform = `translateX(${(v * TRAVEL).toFixed(1)}px)`;
    };
    const update = (e) => {
      if (!active) return;
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      setV(clamp((e.clientX - cx) / TRAVEL, -1, 1));
    };
    const down = (e) => {
      e.preventDefault();
      active = true;
      activePointer = e.pointerId;
      joy.classList.add('active');
      try {
        joy.setPointerCapture?.(e.pointerId);
      } catch {
        /* synthetic/legacy pointers may not support capture */
      }
      update(e);
    };
    const up = (e) => {
      // Ignore stray up events from other pointers.
      if (e && e.pointerId !== undefined && e.pointerId !== activePointer) return;
      active = false;
      activePointer = null;
      joy.classList.remove('active');
      setV(0);
    };
    joy.addEventListener('pointerdown', down);
    joy.addEventListener('pointermove', update);
    joy.addEventListener('pointerup', up);
    joy.addEventListener('pointercancel', up);
    // Pointer capture keeps the drag alive when the thumb slides off the
    // joystick; without capture (synthetic pointers) leaving stops it.
    joy.addEventListener('pointerleave', () => {
      if (active && !joy.hasPointerCapture?.(activePointer)) up();
    });
  }

  /**
   * Apply the persisted mobile touch layout: when the player has customized
   * the thumb zones in Settings, position each cluster by percentage; the
   * responsive CSS defaults apply otherwise.
   */
  _applyTouchLayout() {
    if (!this._touchEl) return;
    const ml = this.game.settings.get('mobileLayout');
    const left = this._touchEl.querySelector('.touch-cluster-left');
    const right = this._touchEl.querySelector('.touch-cluster-right');
    if (!left || !right) return;
    if (ml && ml.custom) {
      left.style.left = `${ml.zones.left.x}%`;
      left.style.bottom = `${ml.zones.left.y}%`;
      left.style.right = 'auto';
      right.style.right = `${ml.zones.right.x}%`;
      right.style.bottom = `${ml.zones.right.y}%`;
      right.style.left = 'auto';
    } else {
      left.style.left = '';
      left.style.bottom = '';
      left.style.right = '';
      right.style.right = '';
      right.style.bottom = '';
      right.style.left = '';
    }
  }

  /** Re-apply touch layout after Settings changes. */
  applyTouchLayout() {
    this._applyTouchLayout();
  }

  /** Toggle the corner mini-map open/closed. */
  _toggleMinimap() {
    if (!this._minimapEl) return;
    const open = !this._minimapEl.classList.contains('open');
    this._minimapEl.classList.toggle('open', open);
    this._minimapEl.querySelector('[data-action="minimap"]')?.setAttribute('aria-pressed', String(open));
    if (!open) this._minimapBg = null; // drop the cached background
  }

  /**
   * Per-frame HUD refresh driven by the game loop: keeps the aim-lock badge
   * and the mini-map live without spamming the EventBus.
   */
  tick() {
    this._updateAimLockBadge();
    if (this._minimapEl && this._minimapEl.classList.contains('open')) {
      this._updateMinimap();
    }
  }

  _updateAimLockBadge() {
    if (!this._aimlockEl) return;
    const locked = !!(this.game.input && this.game.input.aimLocked);
    this._aimlockEl.classList.toggle('active', locked);
    this._aimlockEl.hidden = !locked;
  }

  /** Render the zoomed-out battlefield overview with both tanks. */
  _updateMinimap() {
    const game = this.game;
    if (!game.state.inMatch() || !game.terrain || !game.tanks.length) return;
    const canvas = this._minimapEl.querySelector('[data-role="minimap-canvas"]');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Terrain surface is cached; rebuild only when it changed or the map changed.
    if (game.terrain._dirty || this._minimapKey !== game.mapSeed) {
      this._minimapKey = game.mapSeed;
      this._minimapBg = this._minimapBg || document.createElement('canvas');
      this._minimapBg.width = W;
      this._minimapBg.height = H;
      game.terrain.renderThumb(this._minimapBg.getContext('2d'), W, H);
    }
    ctx.clearRect(0, 0, W, H);
    if (this._minimapBg) ctx.drawImage(this._minimapBg, 0, 0);

    const sx = (x) => (x / CONFIG.WORLD.WIDTH) * W;
    const sy = (y) => (y / CONFIG.WORLD.HEIGHT) * H;

    // Current camera viewport rectangle.
    const cam = game.camera;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      sx(cam.x),
      sy(cam.y),
      sx(cam.x + cam.visibleW) - sx(cam.x),
      sy(cam.y + cam.visibleH) - sy(cam.y)
    );

    // Tanks.
    for (const t of game.tanks) {
      if (!t.alive) continue;
      ctx.beginPath();
      ctx.arc(sx(t.x), sy(t.y), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Live projectiles.
    for (const p of game.projectiles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(sx(p.pos.x) - 1.5, sy(p.pos.y) - 1.5, 3, 3);
    }
  }

  /**
   * Show/hide the touch weapon wheel, rendering current weapons radially.
   * @param {boolean} [force]
   * @param {number} [x] anchor client x (center of the wheel)
   * @param {number} [y] anchor client y (center of the wheel)
   */
  _toggleRadial(force, x, y) {
    if (!this._radialEl) return;
    const show = force !== undefined ? force : this._radialEl.classList.contains('open') === false;
    if (show) {
      this._positionRadial(x, y);
      this._radialEl.innerHTML = '';
      const tank = this.game.turnManager?.activeTank?.();
      const weapons = tank ? this.game.weaponChangePayload(tank).weapons : [];
      const n = weapons.length;
      weapons.forEach((w, i) => {
        const btn = document.createElement('button');
        btn.className = 'weapon-radial-item';
        if (i === this.game.weaponChangePayload(tank).activeIndex) btn.classList.add('active');
        btn.dataset.weaponIndex = String(i);
        btn.style.setProperty('--i', String(i));
        btn.style.setProperty('--n', String(n));
        btn.innerHTML = `
          <span class="wri-icon">${Svg.weaponIcon(w.icon, 26, 26)}</span>
          <span class="wri-ammo">${w.ammo === Infinity ? '∞' : w.ammo}</span>
        `;
        this._radialEl.appendChild(btn);
      });
      this._radialEl.classList.add('open');
      this._radialEl.setAttribute('aria-hidden', 'false');
    } else {
      this._radialEl.classList.remove('open');
      this._radialEl.setAttribute('aria-hidden', 'true');
    }
  }

  /** Center the wheel at (x, y), clamped to the viewport, or at a default. */
  _positionRadial(x, y) {
    const size = 210; // matches .weapon-radial width/height
    const rootRect = this.root.getBoundingClientRect();
    let cx = x != null ? x : rootRect.right - size / 2 - 14;
    let cy = y != null ? y : rootRect.bottom - size / 2 - 14;
    cx = clamp(cx, rootRect.left + size / 2, rootRect.right - size / 2);
    cy = clamp(cy, rootRect.top + size / 2, rootRect.bottom - size / 2);
    // .weapon-radial uses translate(-50%,-50%), so left/top mark the center.
    this._radialEl.style.left = `${cx - rootRect.left}px`;
    this._radialEl.style.top = `${cy - rootRect.top}px`;
  }

  _bindEvents() {
    this.bus.on(EVT.MATCH_START, (data) => this.onMatchStart(data));
    this.bus.on(EVT.MATCH_END, () => this.onMatchEnd());
    this.bus.on(EVT.TURN_START, (data) => this.onTurnStart(data));
    this.bus.on(EVT.TANK_STATS, (data) => this.onTankStats(data));
    this.bus.on(EVT.WEAPON_CHANGE, (data) => this.onWeaponChange(data));
    this.bus.on(EVT.WIND_CHANGE, (data) => this.onWindChange(data));
    this.bus.on(EVT.PAUSE_CHANGE, (data) => this.onPause(data));
    this.bus.on(EVT.TANK_DESTROYED, (data) => this.onTankDestroyed(data));
    this.bus.on(EVT.STATE_CHANGE, (data) => this.onStateChange(data));
  }

  // ------------------------------------------------------------- updates

  onMatchStart({ players }) {
    const leftRoot = this.root.querySelector('[data-role="cards-left"]');
    const rightRoot = this.root.querySelector('[data-role="cards-right"]');
    leftRoot.innerHTML = '';
    rightRoot.innerHTML = '';
    this._playerCards.clear();

    // Player 0 on the left, player 1 on the right — never mushed together.
    players.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'hud-card';
      card.classList.add(i === 0 ? 'side-left' : 'side-right');
      card.dataset.tankId = p.tank.id;
      card.style.setProperty('--accent', p.tank.color);
      card.innerHTML = `
        <div class="hud-card-head">
          <span class="hud-card-name">${escapeHtml(p.name)}</span>
          <span class="hud-card-hp" data-role="health-text">100</span>
        </div>
        <div class="hud-bar health-bar">
          <div class="hud-bar-fill" data-role="health"></div>
        </div>
        <div class="hud-bar fuel-bar">
          <div class="hud-bar-fill" data-role="fuel"></div>
          <span class="hud-bar-fuel-label">FUEL</span>
          <span class="hud-bar-fuel-val" data-role="fuel-text">100</span>
        </div>
      `;
      (i === 0 ? leftRoot : rightRoot).appendChild(card);
      this._playerCards.set(p.tank.id, card);
    })
    this.onTankStats({ id: players[0].tank.id, health: 100, fuel: 100, power: 55, angle: 62 });
    this.onTankStats({ id: players[1].tank.id, health: 100, fuel: 100, power: 55, angle: 62 });
    this._maybeShowRotateHint();
  }

  onMatchEnd() {
    this.setBanner('', '');
    this._hideRotateHint();
  }

  /**
   * One-time teaching hint: on the first portrait match, tell the player the
   * battlefield is rotated so moving "left/right" travels along the tall axis.
   * Shown once per install (persisted flag), purely cosmetic.
   */
  _maybeShowRotateHint() {
    const el = this._rotateHintEl;
    if (!el) return;
    if (!this.game.camera || !this.game.camera.rotated) return;
    if (!this.game.settings.rotationHintPending()) return;
    this.game.settings.markRotationHintShown();
    // Restart the show animation, then fade out after a few seconds.
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    el.setAttribute('aria-hidden', 'false');
    clearTimeout(this._rotateHintTimer);
    this._rotateHintTimer = setTimeout(() => this._hideRotateHint(), 6500);
  }

  _hideRotateHint() {
    clearTimeout(this._rotateHintTimer);
    const el = this._rotateHintEl;
    if (!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
  }

  onTurnStart({ playerIndex, name, color, type, turn }) {
    const label = name === 'You' ? 'YOUR TURN' : `${escapeHtml(name)}'S TURN`;
    this.setBanner(label, color);

    // Highlight the active card.
    this._playerCards.forEach((card, id) => {
      card.classList.toggle('active', false);
    });
    const active = this.game.tanks[playerIndex];
    if (active) {
      const card = this._playerCards.get(active.id);
      if (card) card.classList.add('active');
    }

    // Touch controls are useless during an AI turn.
    if (this._touchEl) {
      this._touchEl.classList.toggle('disabled', type === 'ai');
    }
  }

  onTankStats({ id, health, fuel, power, angle }) {
    const card = this._playerCards.get(id);
    if (!card) return;
    const healthPct = clamp(health / 100, 0, 1) * 100;
    const fuelPct = clamp(fuel / 100, 0, 1) * 100;

    const hFill = card.querySelector('[data-role="health"]');
    const hText = card.querySelector('[data-role="health-text"]');
    hFill.style.width = `${healthPct}%`;
    hFill.classList.toggle('low', healthPct <= 30);
    hFill.classList.toggle('crit', healthPct <= 15);
    hText.textContent = Math.ceil(health);

    const fFill = card.querySelector('[data-role="fuel"]');
    const fText = card.querySelector('[data-role="fuel-text"]');
    fFill.style.width = `${fuelPct}%`;
    fText.textContent = Math.ceil(fuel);
    // Side-aware layout: the right card mirrors (fuel reads right-to-left).
    if (card.classList.contains('side-right')) {
      fFill.style.left = `${100 - fuelPct}%`;
      fFill.style.right = 'auto';
    }

    // Only reflect aim/power for the active human tank.
    if (this.game.input && this.game.turnManager && this.game.turnManager.activeTank()?.id === id) {
      const angleEl = this.root.querySelector('[data-role="angle"]');
      const powerEl = this.root.querySelector('[data-role="power"]');
      const slider = this.root.querySelector('[data-role="power-slider"]');
      if (angleEl) angleEl.textContent = `${Math.round(angle)}°`;
      if (powerEl) powerEl.textContent = `${Math.round(power)}%`;
      if (slider && document.activeElement !== slider) slider.value = String(Math.round(power));
    }
  }

  onWeaponChange({ weapons, activeIndex, canFire }) {
    const box = this.root.querySelector('[data-role="weapons"]');
    if (!box) return;
    box.innerHTML = '';
    // Persisted chip order (last-used mobile layout): reorder the display
    // when it matches this tank's weapon set exactly; mapping back to the
    // real index keeps selection correct.
    const ml = this.game.settings.get('mobileLayout');
    const savedOrder = ml && Array.isArray(ml.chipOrder) && ml.chipOrder.length
      ? ml.chipOrder.filter((id) => weapons.some((w) => w.id === id))
      : [];
    const display = savedOrder.length === weapons.length
      ? savedOrder.map((id) => weapons.find((w) => w.id === id))
      : weapons;
    display.forEach((w) => {
      const realIndex = weapons.indexOf(w);
      const chip = document.createElement('button');
      chip.className = 'hud-weapon-chip';
      if (realIndex === activeIndex) chip.classList.add('active');
      if (w.ammo === 0) chip.classList.add('empty');
      chip.dataset.index = String(realIndex);
      chip.innerHTML = `
        <span class="hud-weapon-icon">${Svg.weaponIcon(w.icon, 26, 26)}</span>
        <span class="hud-weapon-ammo">${w.ammo === Infinity ? '∞' : w.ammo}</span>
      `;
      chip.addEventListener('click', (e) => {
        if (this._isCoarse) {
          // Touch: open the wheel centered on the thumb tap.
          this._toggleRadial(true, e.clientX, e.clientY);
        } else {
          this.game.input.setWeaponIndex(realIndex);
        }
      });
      chip.addEventListener('mouseenter', () => this._showWeaponTooltip(chip, w));
      chip.addEventListener('mouseleave', () => this._hideWeaponTooltip());
      chip.addEventListener('pointerdown', () => this._hideWeaponTooltip());
      box.appendChild(chip);
    });
  }

  _showWeaponTooltip(chip, w) {
    if (!this._tooltipEl) return;
    const angleRange = w.minAngle !== undefined && w.maxAngle !== undefined
      ? `${w.minAngle}°–${w.maxAngle}°`
      : 'free';
    const powerRange = w.minPower !== undefined && w.maxPower !== undefined
      ? `${w.minPower}–${w.maxPower}`
      : '10–100';
    const m = this.game.settings.weaponMastery(w.id);
    const masteryRow = m.tier
      ? `<div class="wt-mastery ${m.tier}">
          <span class="wt-mastery-badge">●</span> ${m.label} mastery · +${Math.round((m.damageMult - 1) * 100)}% dmg
        </div>`
      : (m.next ? `<div class="wt-mastery">${m.kills}/${m.next} kills to ${m.nextLabel}</div>` : '');
    this._tooltipEl.innerHTML = `
      <div class="wt-head">
        ${Svg.weaponIcon(w.icon, 22, 22)}
        <span class="wt-name">${escapeHtml(w.name)}</span>
      </div>
      <div class="wt-desc">${escapeHtml(w.desc || '')}</div>
      <div class="wt-stats">
        <span>DMG <b>${w.damage ?? 0}</b></span>
        <span>BLST <b>${w.blastRadius ?? 0}</b></span>
        <span>AMMO <b>${w.ammo === Infinity ? '∞' : w.ammo}</b></span>
      </div>
      <div class="wt-range">
        <span>ARC <b>${angleRange}</b></span>
        <span>PWR <b>${powerRange}</b></span>
      </div>
      ${masteryRow}
    `;
    this._tooltipEl.classList.add('show');
    // Position above the chip, clamped to the viewport.
    const chipR = chip.getBoundingClientRect();
    const ttR = this._tooltipEl.getBoundingClientRect();
    let x = chipR.left + chipR.width / 2 - ttR.width / 2;
    const y = chipR.top - ttR.height - 10;
    x = Math.max(8, Math.min(x, window.innerWidth - ttR.width - 8));
    this._tooltipEl.style.left = `${x}px`;
    this._tooltipEl.style.top = `${y}px`;
  }

  _hideWeaponTooltip() {
    if (this._tooltipEl) this._tooltipEl.classList.remove('show');
  }

  /** Request/exit fullscreen (mobile browsers need the vendor paths). */
  _toggleFullscreen() {
    const el = document.documentElement;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (!isFs) {
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
    } catch (err) {
      console.warn('[HUD] fullscreen toggle failed', err);
    }
    // Let the resize handler recompute the canvas after the change settles.
    setTimeout(() => this.game.resize(), 120);
  }

  onWindChange({ wind }) {
    const arrowsEl = this.root.querySelector('[data-role="wind-arrows"]');
    const valueEl = this.root.querySelector('[data-role="wind-value"]');
    if (!arrowsEl || !valueEl) return;
    const dir = wind > 0 ? 1 : wind < 0 ? -1 : 0;
    const mag = Math.min(4, Math.ceil(Math.abs(wind) / 4));
    let arrows = '';
    for (let i = 0; i < mag; i++) arrows += Svg.windArrow(dir, 20, 20);
    arrowsEl.innerHTML = arrows;
    valueEl.textContent = Math.abs(wind);
    valueEl.style.color = wind === 0 ? 'var(--text-dim)' : '';
  }

  onPause({ paused }) {
    this.root.classList.toggle('hud-hidden', paused);
  }

  onTankDestroyed({ id }) {
    const card = this._playerCards.get(id);
    if (card) card.classList.add('destroyed');
    this.setBanner('TANK DESTROYED', '#ff5a5a');
  }

  onStateChange({ to }) {
    const canControl = ['PLAYER_TURN'].includes(to);
    this.root.classList.toggle('no-control', !canControl);
    if (this._touchEl) this._touchEl.classList.toggle('no-control', !canControl);
  }

  /** Big center banner that fades out. */
  setBanner(text, color) {
    const banner = this.root.querySelector('[data-role="banner"]');
    const textEl = this.root.querySelector('[data-role="banner-text"]');
    if (!banner || !textEl) return;
    if (!text) {
      banner.classList.remove('show');
      return;
    }
    textEl.innerHTML = text;
    textEl.style.color = color || 'var(--text)';
    banner.classList.remove('show');
    // restart animation
    void banner.offsetWidth;
    banner.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => banner.classList.remove('show'), 1700);
  }

  /** Toast for settings/feedback. */
  toast(text) {
    this.setBanner(escapeHtml(text), 'var(--accent)');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
