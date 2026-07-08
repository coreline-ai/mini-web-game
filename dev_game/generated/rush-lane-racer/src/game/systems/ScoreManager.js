import { SPEC } from '../data/spec.js';

export default class ScoreManager {
  constructor() {
    this.score = 0;
    this.elapsedMs = 0;
    this.coins = 0;
    this.combo = 0;
    this.avoided = 0;
    this.nearMisses = 0;
    this.bestCombo = 0;
  }

  update(delta) {
    this.elapsedMs += delta;
    this.score += (SPEC.scoring.survivalPointsPerSecond || 10) * (delta / 1000);
  }

  addAvoidance(points = 5) {
    this.avoided += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += points;
  }

  addNearMiss() {
    this.nearMisses += 1;
    this.combo += 2;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += 30;
  }

  addCollectible(value = 50, kind = 'coin') {
    if (kind === 'coin') this.coins += 1;
    this.score += value;
  }

  addBonus(value = 0) {
    this.score += value;
  }

  breakCombo() {
    this.combo = 0;
  }

  getScore() { return Math.floor(this.score); }
}
