/**
 * AISystem — facade over the AI modules so the systems layer exposes one
 * entry point. The actual logic lives in js/ai/{AIController,AimingAI,Difficulty}.
 */

export { AIController } from '../ai/AIController.js';
export { AimingAI } from '../ai/AimingAI.js';
export { DIFFICULTIES } from '../ai/Difficulty.js';
