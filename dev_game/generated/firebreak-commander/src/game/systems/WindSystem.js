import { FIREBREAK_CONFIG, WIND_VECTORS } from '../config/firebreakConfig.js';
import { normalize } from '../utils/GridMath.js';

export default class WindSystem {
  constructor(schedule = FIREBREAK_CONFIG.windSchedule) {
    this.schedule = schedule;
    this.currentIndex = 0;
    this.reset();
  }

  reset() {
    this.currentIndex = 0;
    this.current = { ...this.schedule[0] };
  }

  update(tick) {
    let changed = false;
    while (this.currentIndex + 1 < this.schedule.length && tick >= this.schedule[this.currentIndex + 1].tick) {
      this.currentIndex += 1;
      this.current = { ...this.schedule[this.currentIndex] };
      changed = true;
    }
    const next = this.schedule[this.currentIndex + 1] || null;
    return { ...this.get(), changed, nextTick: next?.tick ?? null, nextDirection: next?.direction ?? null };
  }

  get() {
    const raw = WIND_VECTORS[this.current.direction] || WIND_VECTORS.E;
    return { ...this.current, vector: normalize(raw) };
  }
}
