import { SPEC } from '../data/spec.js';

export const SORTING = SPEC.sorting;
export const BINS = SORTING.bins;
export const PARCEL_TYPES = SORTING.parcelTypes;
export const CONVEYOR = SORTING.conveyor;
export const SCORE = SORTING.scoring;
export const EVENTS = SORTING.events;

export function getBin(id) {
  return BINS.find((bin) => bin.id === id);
}

export function getParcelType(id) {
  return PARCEL_TYPES.find((type) => type.id === id);
}

export function weightedParcelType() {
  const total = PARCEL_TYPES.reduce((sum, type) => sum + Math.max(1, type.weight || 1), 0);
  let roll = Math.random() * total;
  for (const type of PARCEL_TYPES) {
    roll -= Math.max(1, type.weight || 1);
    if (roll <= 0) return type;
  }
  return PARCEL_TYPES[0];
}

export function stageFromElapsed(elapsedSec) {
  return Math.min(99, Math.floor(elapsedSec / (SPEC.difficulty.rampEverySeconds || 18)) + 1);
}

export function difficultyT(elapsedSec) {
  const maxLevel = SPEC.difficulty.maxLevel || 16;
  return Math.min(1, Math.max(0, Math.floor(elapsedSec / (SPEC.difficulty.rampEverySeconds || 18)) / maxLevel));
}
