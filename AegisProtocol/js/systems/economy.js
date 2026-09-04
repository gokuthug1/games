/**
 * AEGIS PROTOCOL: VECTOR DEFENSE
 * Mathematically Balanced Economy & Resource System
 */

import { state } from '../core/state.js';
import { MATH_MODELS } from '../core/constants.js';

export class EconomySystem {
  constructor() {
    this.baseInterestRate = 0.05;
    this.maxInterest = 150;
    this.energyCapacitorChargeRate = 3.2; // Energy/sec
  }

  update(dtSec) {
    if (!state.isPlaying || state.isPaused) return;

    // Passive Energy Grid Integral: dE/dt = rate
    if (state.energy < state.maxEnergy) {
      state.setEnergy(state.energy + this.energyCapacitorChargeRate * dtSec);
    }
  }

  /**
   * Calculates Exponential Kill Streak Multiplier:
   * M(k) = 1.0 + M_max * (1 - e^(-lambda * k))
   */
  calculateStreakMultiplier(streakCount) {
    const boost = MATH_MODELS.STREAK_MAX_BOOST * (1.0 - Math.exp(-MATH_MODELS.STREAK_LAMBDA * streakCount));
    return 1.0 + boost;
  }

  /**
   * Calculates Compound Wave Interest:
   * I(C) = min(I_max, floor(C * (r_base + delta_r)))
   */
  calculateWaveInterest(currentCredits) {
    const interest = Math.min(this.maxInterest, Math.floor(currentCredits * this.baseInterestRate));
    return interest;
  }

  applyWaveInterest() {
    const interest = this.calculateWaveInterest(state.credits);
    if (interest > 0) {
      state.addCredits(interest);
    }
    return interest;
  }
}

export const economy = new EconomySystem();
