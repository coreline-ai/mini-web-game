import { GC } from '../config/gameConfig.js';

// 연속 회피 콤보 + 등급 마일스톤 + 점수 배수.
export default class ComboManager {
  constructor() {
    this.combo = 0;
    this.best = 0;
  }

  reset() {
    this.combo = 0;
  }

  // 회피 시 +n. 새로 도달한 등급명을 반환(없으면 null).
  add(n = 1) {
    const prev = this.combo;
    this.combo += n;
    if (this.combo > this.best) this.best = this.combo;
    const m = GC.COMBO;
    for (const [name, th] of [['LEGEND', m.legend], ['MASTER', m.master], ['FANTASTIC', m.fantastic]]) {
      if (prev < th && this.combo >= th) return name;
    }
    return null;
  }

  // 점수 배수: 콤보 500에서 1.5배
  get multiplier() {
    return 1 + Math.min(this.combo, GC.COMBO.maxMultiplyAt) / 1000;
  }
}
