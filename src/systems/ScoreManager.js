import { GC } from '../config/gameConfig.js';

// 점수 누적(생존 + 회피 + 니어미스 + 보너스). 최고점/랭킹 저장은 SaveData가 담당.
export default class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.survivalMs = 0;
    this.dodgeCount = 0;
    this.dodgeScore = 0;
    this.nearMissScore = 0;
    this.bonusScore = 0;
  }

  addSurvival(deltaMs) {
    this.survivalMs += deltaMs;
  }

  addDodge(points, mult = 1) {
    this.dodgeCount += 1;
    this.dodgeScore += Math.round(points * mult);
  }

  addNearMiss(mult = 1) {
    this.nearMissScore += Math.round(GC.SCORE.NEAR_MISS * mult);
  }

  addBonus(points) {
    this.bonusScore += points;
  }

  getScore() {
    const survival = (this.survivalMs / 1000) * GC.SCORE.SURVIVAL_PER_SEC;
    return Math.floor(survival + this.dodgeScore + this.nearMissScore + this.bonusScore);
  }
}
