import { SPEC } from '../data/spec.js';

export default class BoostSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeUntil = 0;
    this.wasActive = false;
  }

  activate(time) {
    this.activeUntil = Math.max(this.activeUntil, time + SPEC.racing.boost.durationMs);
    this.wasActive = true;
  }

  isActive(time) {
    return time < this.activeUntil;
  }

  multiplier(time) {
    return this.isActive(time) ? SPEC.racing.boost.speedMultiplier : 1;
  }

  remainingMs(time) {
    return Math.max(0, this.activeUntil - time);
  }
}
