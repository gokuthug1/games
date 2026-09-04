/**
 * SoundManager — procedural audio via the Web Audio API. Zero external
 * assets: every effect and the ambient loop is synthesized, so the game is
 * fully offline-capable. The AudioContext is created lazily on the first
 * user gesture (browser autoplay policy).
 *
 * Volume routing: master -> (sfx, music) gain nodes.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.music = null;
    this.enabled = true;
    this.volumes = { master: 0.8, sfx: 1.0, music: 0.5 };
    this.musicOn = false;
    this._noiseBuf = null;
    this._musicTimer = null;
    this._nextNote = 0;
    this._bar = 0;
    // Real audio assets (decoded lazily on first init).
    this.assets = null;
    this.buffers = {}; // name -> AudioBuffer
    this._musicSrc = null;
  }

  /** Attach the AssetManager so real WAV files can replace the synth. */
  attachAssets(assets) {
    this.assets = assets;
  }

  /**
   * Decode the loaded WAV files into AudioBuffers on this context.
   * Must be called after init(). Decoding is async; until a buffer is
   * ready for a given name, play() falls back to the procedural synth.
   */
  async loadBuffers() {
    if (!this.ctx || !this.assets) return;
    // Idempotent: decodeAudioData detaches the ArrayBuffer, so a second call
    // must not re-decode buffers that already exist.
    if (this._buffersLoading) return this._buffersLoading;
    const names = ['fire', 'explosion', 'bounce', 'split', 'thud', 'damage',
      'click', 'hover', 'victory', 'defeat', 'error', 'move', 'music'];
    this._buffersLoading = (async () => {
      for (const name of names) {
        if (this.buffers[name]) continue;
        const raw = this.assets.audio(name);
        if (!raw || raw.byteLength === 0) continue;
        try {
          this.buffers[name] = await this._decode(raw);
        } catch (err) {
          console.warn(`[SoundManager] could not decode ${name}.wav`, err);
        }
      }
      this._buffersLoading = null;
      // The music buffer may have finished decoding *after* the procedural
      // loop started on the first gesture — hand over to the real track.
      if (this.musicOn && this.buffers.music && !this._musicSrc) {
        this.stopMusic();
        this.startMusic();
      }
    })();
    return this._buffersLoading;
  }

  _decode(arrayBuffer) {
    return new Promise((resolve, reject) => {
      // Modern promise form.
      if (typeof this.ctx.decodeAudioData === 'function') {
        try {
          const p = this.ctx.decodeAudioData(arrayBuffer);
          if (p && typeof p.then === 'function') {
            p.then(resolve, reject);
            return;
          }
        } catch (err) {
          reject(err);
          return;
        }
      }
      // Legacy callback form.
      this.ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  /** Create the AudioContext (must be called from a user gesture). */
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this.enabled = false;
        return;
      }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = this.volumes.sfx;
      this.sfx.connect(this.master);
      this.music = this.ctx.createGain();
      this.music.gain.value = this.volumes.music;
      this.music.connect(this.master);

      // Shared white-noise buffer.
      const len = this.ctx.sampleRate * 2;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (err) {
      console.warn('[SoundManager] audio unavailable', err);
      this.enabled = false;
    }
  }

  setVolume(channel, v) {
    this.volumes[channel] = v;
    if (channel === 'master' && this.master) this.master.gain.value = v;
    if (channel === 'sfx' && this.sfx) this.sfx.gain.value = v;
    if (channel === 'music' && this.music) this.music.gain.value = v;
  }

  setVolumes(settings) {
    this.setVolume('master', settings.masterVolume);
    this.setVolume('sfx', settings.sfxVolume);
    this.setVolume('music', settings.musicVolume);
  }

  /** Global mute toggle. */
  setEnabled(e) {
    this.enabled = e;
  }

  /** Play a named sound effect (real buffer when available, else synth). */
  play(name, opts = {}) {
    if (!this.enabled || !this.ctx || !this.sfx) return;
    try {
      if (this.buffers[name]) {
        this._playBuffer(name, opts);
        return;
      }
      switch (name) {
        case 'fire': this._sfxFire(opts); break;
        case 'explosion': this._sfxExplosion(opts); break;
        case 'bounce': this._sfxBounce(opts); break;
        case 'split': this._sfxSplit(opts); break;
        case 'thud': this._sfxThud(opts); break;
        case 'damage': this._sfxDamage(opts); break;
        case 'click': this._sfxClick(opts); break;
        case 'hover': this._sfxHover(opts); break;
        case 'victory': this._sfxJingle(true); break;
        case 'defeat': this._sfxJingle(false); break;
        case 'error': this._sfxError(opts); break;
        case 'move': this._sfxMove(opts); break;
        case 'zap': this._sfxZap(opts); break;
        case 'sticky': this._sfxSticky(opts); break;
        case 'flash': this._sfxFlash(opts); break;
        case 'whoosh': this._sfxWhoosh(opts); break;
        case 'plasma': this._sfxPlasma(opts); break;
        case 'boomerang': this._sfxBoomerang(opts); break;
        case 'pop': this._sfxPop(opts); break;
        case 'bomb': this._sfxBomb(opts); break;
        case 'laser': this._sfxLaser(opts); break;
        case 'missile': this._sfxMissile(opts); break;
        case 'drone': this._sfxDrone(opts); break;
        case 'mine': this._sfxMine(opts); break;
        case 'turret': this._sfxTurret(opts); break;
        case 'gravity': this._sfxGravity(opts); break;
        case 'cryo': this._sfxCryo(opts); break;
        case 'leech': this._sfxLeech(opts); break;
        case 'shield': this._sfxShield(opts); break;
        case 'dirt': this._sfxDirt(opts); break;
        case 'smoke': this._sfxSmoke(opts); break;
        default: break;
      }
    } catch (err) {
      console.warn('[SoundManager] play error', name, err);
    }
  }

  /** Play a decoded buffer through the sfx bus. */
  _playBuffer(name, opts = {}) {
    const buffer = this.buffers[name];
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    let gain = 1;
    if (opts.size !== undefined) {
      gain *= Math.min(2.2, Math.max(0.6, opts.size / 50));
    }
    // Slight random pitch for percussive repeats so they never sound robotic.
    if (name === 'bounce' || name === 'click' || name === 'thud' || name === 'split') {
      src.playbackRate.value = 0.94 + Math.random() * 0.12;
    }

    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.sfx);
    src.start();
  }

  // ------------------------------------------------------------------ SFX

  _noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    return src;
  }

  _sfxFire() {
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(filter).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.22);

    // Thump
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.7, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(og).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  _sfxExplosion({ size = 50 } = {}) {
    const t = this.ctx.currentTime;
    const scale = Math.min(2.2, Math.max(0.6, size / 50));
    const dur = 0.5 * scale;

    const src = this._noiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 * scale, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1.1 * scale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.05);

    // Sub drop.
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + dur);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.9 * scale, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(og).connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur);
  }

  _sfxBounce() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  _sfxSplit() {
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700 + i * 260, t + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(200, t + i * 0.03 + 0.09);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, t + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.03 + 0.1);
      osc.connect(g).connect(this.sfx);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.12);
    }
  }

  _sfxThud() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  _sfxDamage() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(filter).connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  _sfxClick() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 660;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  _sfxHover() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  _sfxError() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.setValueAtTime(180, t + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  _sfxMove() {
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(filter).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.14);
  }

  _sfxJingle(victory) {
    const t = this.ctx.currentTime;
    const notes = victory
      ? [523, 659, 784, 1047]
      : [392, 330, 262, 196];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      const start = t + i * 0.16;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(g).connect(this.sfx);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  // --------------------------------------------------------------- music

  /**
   * Start a minimal procedural ambient loop (bass + arp) scheduled with a
   * lookahead timer. No assets, no external resources.
   */
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    // Real asset loop when available.
    if (this.buffers.music) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers.music;
      src.loop = true;
      src.connect(this.music);
      src.start();
      this._musicSrc = src;
      return;
    }
    this._nextNote = this.ctx.currentTime + 0.1;
    this._bar = 0;
    this._musicTimer = setInterval(() => this._scheduleMusic(), 120);
    this._scheduleMusic();
  }

  stopMusic() {
    this.musicOn = false;
    if (this._musicSrc) {
      try {
        this._musicSrc.stop();
      } catch (err) {
        /* already stopped */
      }
      this._musicSrc = null;
    }
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  // -------------------------------------------------- weapon voices

  /** Tesla — electric crackle: saw sweep down + noise snap. */
  _sfxZap({ size = 150 } = {}) {
    const t = this.ctx.currentTime;
    const scale = Math.min(2, Math.max(0.7, size / 150));
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400 - i * 200, t + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(180, t + i * 0.03 + 0.14);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32 * scale, t + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.03 + 0.16);
      osc.connect(g).connect(this.sfx);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.18);
    }
    const src = this._noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2 * scale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(hp).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.14);
  }

  /** Sticky — gooey blob: descending wobble + wet tick on detach. */
  _sfxSticky({ size = 40 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.28);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.34);
    // LFO wobble.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 18;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 60;
    lfo.connect(lfoG).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + 0.3);
  }

  /** Flash — blinding pop: bright noise burst with sharp decay. */
  _sfxFlash({ size = 110 } = {}) {
    const t = this.ctx.currentTime;
    const scale = Math.min(1.8, Math.max(0.7, size / 110));
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3000, t);
    bp.frequency.exponentialRampToValueAtTime(600, t + 0.2);
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.75 * scale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.24);
  }

  /** Napalm — fire whoosh: low rumble + crackling noise. */
  _sfxWhoosh({ size = 46 } = {}) {
    const t = this.ctx.currentTime;
    const scale = Math.min(2, Math.max(0.7, size / 46));
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + 0.3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5 * scale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(lp).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.55);
    // Low rumble.
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.4 * scale, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(og).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  /** Plasma — heavy resonant thump: sine drop + crack. */
  _sfxPlasma({ size = 55 } = {}) {
    const t = this.ctx.currentTime;
    const scale = Math.min(2, Math.max(0.7, size / 55));
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.32);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.8 * scale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.38);
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.3 * scale, t + 0.02);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(lp).connect(ng).connect(this.sfx);
    src.start(t + 0.02);
    src.stop(t + 0.17);
  }

  /** Boomerang — spinning whoosh: rising/falling filtered noise. */
  _sfxBoomerang({ size = 38 } = {}) {
    const t = this.ctx.currentTime;
    const scale = Math.min(2, Math.max(0.6, size / 38));
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(1600, t + 0.14);
    bp.frequency.exponentialRampToValueAtTime(300, t + 0.34);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3 * scale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.4);
  }

  /** Pop — splitter/cluster: quick rising blip. */
  _sfxPop({ size = 40 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /** Bomb — nuke: massive sub drop + noise. */
  _sfxBomb({ size = 120 } = {}) {
    const t = this.ctx.currentTime;
    const scale = Math.min(2.4, Math.max(0.8, size / 120));
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 0.6);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1.1 * scale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.7);
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.6 * scale, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(lp).connect(ng).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.55);
  }

  /** Laser — railgun/sniper/orbital: bright zing. */
  _sfxLaser({ size = 55 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.16);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Missile — homing/barrage/airstrike: whoosh + rumble. */
  _sfxMissile({ size = 46 } = {}) {
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.3);
  }

  /** Drone — summon: rising synth sweep. */
  _sfxDrone({ size = 40 } = {}) {
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220 + i * 60, t);
      osc.frequency.exponentialRampToValueAtTime(880 + i * 120, t + 0.35);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g).connect(this.sfx);
      osc.start(t);
      osc.stop(t + 0.42);
    }
  }

  /** Mine — deploy: metallic clank. */
  _sfxMine({ size = 30 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /** Turret — deploy: mechanical servo. */
  _sfxTurret({ size = 30 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.22);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /** Gravity — warp: descending wobble. */
  _sfxGravity({ size = 46 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 22;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 90;
    lfo.connect(lfoG).connect(osc.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.44);
    lfo.stop(t + 0.44);
  }

  /** Cryo — frost: shimmering high chime. */
  _sfxCryo({ size = 46 } = {}) {
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200 + i * 260, t + i * 0.05);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.25);
      osc.connect(g).connect(this.sfx);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.3);
    }
  }

  /** Leech — siphon: sucking inhale. */
  _sfxLeech({ size = 52 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  /** Shield — deploy: shimmering dome. */
  _sfxShield({ size = 40 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  /** Dirt — dirtmaker: soft thump + gravel. */
  _sfxDirt({ size = 40 } = {}) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.16);
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.2, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(lp).connect(ng).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.12);
  }

  /** Smoke — puff: soft hiss. */
  _sfxSmoke({ size = 40 } = {}) {
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    src.connect(lp).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.35);
  }

  _scheduleMusic() {
    const barLen = 2.4; // seconds per bar
    while (this._nextNote < this.ctx.currentTime + 0.6) {
      const step = this._bar % 8;
      const bassNotes = [110, 110, 130.8, 98, 110, 110, 146.8, 98];
      const bassF = bassNotes[step];
      this._note(bassF, 'sawtooth', 0.05, this._nextNote, barLen * 0.9, 0.06);
      if (step % 2 === 0) {
        const arpNotes = [220, 261.6, 329.6, 392, 440, 392, 329.6, 261.6];
        this._note(arpNotes[(this._bar >> 1) % 8], 'triangle', 0.028, this._nextNote + barLen * 0.5, barLen * 0.45, 0.03);
      }
      this._nextNote += barLen / 8;
      this._bar++;
    }
  }

  _note(freq, type, vol, start, dur, glideTo) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo && glideTo !== freq) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, start + dur);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(g).connect(this.music);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }
}
