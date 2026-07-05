import { SPEC } from '../data/spec.js';
import { SORTING, SCORE } from '../config/sortingConfig.js';

export default class ScoreManager {
  constructor() {
    this.score = 0;
    this.elapsedMs = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.sorted = 0;
    this.wrong = 0;
    this.missed = 0;
    this.lives = SORTING.lives || 3;
  }

  update(delta) {
    this.elapsedMs += delta;
    this.score += (SPEC.scoring.survivalPointsPerSecond || 4) * (delta / 1000);
  }

  correct() {
    this.sorted += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    let value = SCORE.correct || 100;
    if (this.combo > 0 && this.combo % (SCORE.comboStep || 8) === 0) value += 80;
    if (this.combo > 0 && this.combo % (SCORE.perfectStreak || 10) === 0) value += 150;
    this.score += value;
    return value;
  }

  fail(kind = 'wrong') {
    if (kind === 'miss') this.missed += 1;
    else this.wrong += 1;
    this.combo = 0;
    this.lives = Math.max(0, this.lives - 1);
  }

  getScore() { return Math.floor(this.score); }
}
