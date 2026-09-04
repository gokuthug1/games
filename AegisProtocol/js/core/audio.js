/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Web Audio API Sound Synthesizer & Dynamic Cyberpunk Music Engine
 */

import { storage } from './storage.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.initialized = false;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.currentStep = 0;
    
    // Ambient Music Synth Parameters (Cyberpunk minor scale arpeggiator)
    this.bpm = 118;
    this.scale = [110, 130.81, 146.83, 164.81, 196.00, 220, 261.63, 293.66]; // A Minor Pentatonic / Hexatonic
    this.bassNotes = [55, 65.41, 73.42, 82.41]; // Low A, C, D, E
    
    this.loadSettings();
  }

  loadSettings() {
    const settings = storage.getSettings();
    this.masterVol = settings.masterVolume ?? 0.8;
    this.sfxVol = settings.sfxVolume ?? 0.8;
    this.musicVol = settings.musicVolume ?? 0.5;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      this.ctx = new AudioCtx();
      
      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      
      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
      
      // Music Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
      
      this.initialized = true;
    } catch (e) {
      console.warn('[Audio] Web Audio API init failed:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateVolumes() {
    this.loadSettings();
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterVol, now);
    this.sfxGain.gain.setValueAtTime(this.sfxVol, now);
    this.musicGain.gain.setValueAtTime(this.musicVol, now);
  }

  // --- SOUND EFFECTS SYNTHESIZERS ---

  playShoot(type = 'kinetic') {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    switch (type.toUpperCase()) {
      case 'KINETIC':
      case 'GATLING': {
        // Quick punchy noise burst + pitch sweep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case 'ENERGY':
      case 'LASER': {
        // Sci-fi high pew-pew sweep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'CRYO': {
        // Shimmering crystalline whoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'SHOCK':
      case 'TESLA': {
        // Electric zap buzz
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(640, now + 0.03);
        osc.frequency.setValueAtTime(160, now + 0.06);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'MISSILE': {
        // Rocket launch whoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'RAILGUN': {
        // Massive hypersonic thud + beam sizzle
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1800, now);
        osc1.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(2400, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
        break;
      }

      default:
        this.playShoot('GATLING');
    }
  }

  playExplosion(intensity = 1) {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    // Low rumble oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35 * intensity);
    
    const maxGain = Math.min(0.5, 0.25 * intensity);
    gain.gain.setValueAtTime(maxGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 * intensity);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.35 * intensity);
  }

  playUIClick() {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.04);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playPlacement() {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playUpgrade() {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    // Two-tone rising chime
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      
      gain.gain.setValueAtTime(0.15, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.06 + 0.1);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(now + i * 0.06);
      osc.stop(now + (i + 1) * 0.06 + 0.1);
    });
  }

  playAlarm() {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.15);
    osc.frequency.linearRampToValueAtTime(440, now + 0.3);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playVictory() {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    const chord = [440, 554.37, 659.25, 880]; // A Major triumph
    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gain.gain.setValueAtTime(0.2, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(now + i * 0.08);
      osc.stop(now + 1.2);
    });
  }

  playDefeat() {
    if (!this.initialized || this.sfxVol <= 0) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    const tones = [220, 207.65, 196, 174.61]; // Descending minor
    tones.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      
      gain.gain.setValueAtTime(0.2, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  }

  // --- DYNAMIC CYBERPUNK MUSIC GENERATOR ---

  startMusic() {
    if (this.isPlayingMusic) return;
    this.ensureContext();
    this.isPlayingMusic = true;
    this.currentStep = 0;
    
    const stepDuration = (60 / this.bpm) / 4; // 16th note step
    
    const tick = () => {
      if (!this.isPlayingMusic || !this.ctx) return;
      
      const now = this.ctx.currentTime;
      
      // Bass line on 1/4 notes
      if (this.currentStep % 4 === 0) {
        const bassIdx = Math.floor(this.currentStep / 16) % this.bassNotes.length;
        const bassFreq = this.bassNotes[bassIdx];
        
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        const bFilter = this.ctx.createBiquadFilter();
        
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(280, now);
        
        bGain.gain.setValueAtTime(0.2, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 3.5);
        
        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(this.musicGain);
        
        bOsc.start(now);
        bOsc.stop(now + stepDuration * 3.5);
      }
      
      // Arpeggio notes
      if (this.currentStep % 2 === 0 && Math.random() > 0.2) {
        const scaleIdx = (this.currentStep * 3) % this.scale.length;
        const noteFreq = this.scale[scaleIdx];
        
        const aOsc = this.ctx.createOscillator();
        const aGain = this.ctx.createGain();
        
        aOsc.type = 'sine';
        aOsc.frequency.setValueAtTime(noteFreq * 2, now);
        
        aGain.gain.setValueAtTime(0.08, now);
        aGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.8);
        
        aOsc.connect(aGain);
        aGain.connect(this.musicGain);
        
        aOsc.start(now);
        aOsc.stop(now + stepDuration * 1.8);
      }

      this.currentStep = (this.currentStep + 1) % 64;
      this.musicTimer = setTimeout(tick, stepDuration * 1000);
    };

    tick();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new SoundEngine();
