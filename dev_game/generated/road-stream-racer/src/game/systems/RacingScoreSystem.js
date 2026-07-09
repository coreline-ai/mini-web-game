import { SPEC } from '../data/spec.js';

export default class RacingScoreSystem {
  constructor() {
    this.elapsedMs = 0;
    this.distance = 0;
    this.coins = 0;
    this.nearMisses = 0;
    this.bonus = 0;
  }

  update(delta, speed, boostActive) {
    this.elapsedMs += delta;
    this.distance += (speed * delta) / 1000;
    const scoreRate = SPEC.scoring.survivalPointsPerSecond * (boostActive ? SPEC.racing.boost.scoreMultiplier : 1);
    this.bonus += scoreRate * (delta / 1000);
  }

  addCoin() {
    this.coins += 1;
    this.bonus += SPEC.collectibles.scoreValue || SPEC.scoring.collectiblePoints || 50;
  }

  addNearMiss() {
    this.nearMisses += 1;
    this.bonus += 120;
  }

  getLevel() {
    const every = SPEC.difficulty.rampEverySeconds || 30;
    return Math.min(SPEC.difficulty.maxLevel || 12, 1 + Math.floor(this.elapsedMs / 1000 / every));
  }

  getScore() {
    return Math.floor(this.distance * 0.12 + this.bonus);
  }
}
