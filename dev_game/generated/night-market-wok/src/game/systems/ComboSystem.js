// ComboSystem.js — consecutive clean serves raise the multiplier; one mistake drops it.
//
// The multiplier only ever scales reward. It never feeds back into difficulty, so a player on
// a hot streak does not quietly make the game easier for themselves.

import { RULES } from '../config/recipeConfig.js';

export default class ComboSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.stack = 0;
    this.best = 0;
  }

  get multiplier() {
    return Math.min(RULES.maxComboMultiplier, 1 + Math.floor(this.stack / 2));
  }

  onServe() {
    this.stack += 1;
    if (this.stack > this.best) this.best = this.stack;
    return this.multiplier;
  }

  onMistake() {
    const had = this.stack;
    this.stack = 0;
    return had;
  }

  serveScore() {
    return RULES.scorePerServe * this.multiplier + Math.max(0, this.stack - 1) * RULES.comboBonusPerStack;
  }
}
