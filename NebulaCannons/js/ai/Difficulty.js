/**
 * Difficulty — per-level AI parameters. Lower difficulties inject more
 * aiming error and take longer to "think"; higher ones are surgical.
 */

export const DIFFICULTIES = Object.freeze({
  EASY: Object.freeze({
    id: 'EASY',
    label: 'Recruit',
    desc: 'Shaky aim, slow reactions. Great for learning.',
    errorDeg: 13,
    powerJitter: 17,
    thinkTime: 1.8,
    moveChance: 0.35,
    aimRate: 1.0,
  }),
  NORMAL: Object.freeze({
    id: 'NORMAL',
    label: 'Veteran',
    desc: 'Solid fundamentals with occasional misses.',
    errorDeg: 6,
    powerJitter: 8,
    thinkTime: 1.25,
    moveChance: 0.5,
    aimRate: 1.0,
  }),
  HARD: Object.freeze({
    id: 'HARD',
    label: 'Elite',
    desc: 'Computes wind and terrain like a machine.',
    errorDeg: 2.6,
    powerJitter: 4,
    thinkTime: 0.95,
    moveChance: 0.6,
    aimRate: 1.25,
  }),
  EXPERT: Object.freeze({
    id: 'EXPERT',
    label: 'Apex',
    desc: 'Near-perfect ballistic prediction. Good luck.',
    errorDeg: 0.9,
    powerJitter: 1.6,
    thinkTime: 0.7,
    moveChance: 0.7,
    aimRate: 1.6,
  }),
});

export function getDifficulty(id) {
  return DIFFICULTIES[id] || DIFFICULTIES.NORMAL;
}
