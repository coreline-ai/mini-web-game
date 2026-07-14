import { FIREBREAK_CONFIG } from '../config/firebreakConfig.js';

export default class ScoreSystem {
  constructor(config = FIREBREAK_CONFIG.scoring) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.extinguished = new Set();
    this.blocked = 0;
  }

  registerCooling(result) {
    for (const cell of result.extinguished || []) {
      const key = `${cell.x},${cell.y}`;
      if (this.extinguished.has(key)) continue;
      this.extinguished.add(key);
      this.score += this.config.extinguishCell;
    }
  }

  registerTick(events) {
    if (events.blockedSpread > 0) {
      const newlyCounted = Math.min(3, events.blockedSpread);
      this.blocked += newlyCounted;
      this.score += newlyCounted * this.config.blockedSpread;
    }
    this.score -= (events.burned?.length || 0) * this.config.burnedCellPenalty;
    this.score = Math.max(0, this.score);
  }

  finalize(objectives, resources) {
    let total = this.score;
    for (const objective of objectives) if (objective.integrity > 0) total += this.config.objectiveSurvives;
    total += Math.floor((resources.water + resources.fuel) * this.config.resourcePoint);
    return Math.max(0, Math.floor(total));
  }

  getScore() { return Math.floor(this.score); }
}
