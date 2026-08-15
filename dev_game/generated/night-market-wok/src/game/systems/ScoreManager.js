import { SPEC } from '../data/spec.js';

export default class ScoreManager {
  constructor() { this.score = 0; this.elapsedMs = 0; this.coins = 0; }
  update(delta) {
    this.elapsedMs += delta;
    this.score += (SPEC.scoring.survivalPointsPerSecond || 10) * (delta / 1000);
  }
  addCollectible() {
    this.coins += 1;
    this.score += SPEC.scoring.collectiblePoints || SPEC.collectibles?.scoreValue || 50;
  }
  getScore() { return Math.floor(this.score); }
}
