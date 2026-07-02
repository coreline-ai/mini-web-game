import { GC } from '../config/gameConfig.js';

// 경과 시간 기반 스테이지 전환. 현재 스테이지의 스폰 풀/배경을 제공하고
// 가중치 랜덤으로 똥 종류를 뽑는다.
export default class StageManager {
  constructor() {
    this.index = 0;
  }

  reset() {
    this.index = 0;
  }

  // elapsedMs 기준으로 스테이지 갱신. { stage, number, changed } 반환.
  update(elapsedMs) {
    const t = elapsedMs / 1000;
    let idx = 0;
    for (let i = 0; i < GC.STAGES.length; i++) {
      if (t >= GC.STAGES[i].t) idx = i;
    }
    const changed = idx !== this.index;
    this.index = idx;
    return { stage: GC.STAGES[idx], number: idx + 1, changed };
  }

  get stage() {
    return GC.STAGES[this.index];
  }

  // 현재 스테이지 풀에서 가중치 랜덤으로 똥 종류 설정을 뽑는다.
  pickType() {
    const pool = this.stage.pool;
    let total = 0;
    for (const key of pool) total += GC.POOP_TYPES[key].weight;
    let roll = Math.random() * total;
    for (const key of pool) {
      const t = GC.POOP_TYPES[key];
      roll -= t.weight;
      if (roll <= 0) return t;
    }
    return GC.POOP_TYPES[pool[pool.length - 1]];
  }
}
