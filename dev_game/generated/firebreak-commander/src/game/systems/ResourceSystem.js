import { FIREBREAK_CONFIG } from '../config/firebreakConfig.js';

export default class ResourceSystem {
  constructor(config = FIREBREAK_CONFIG.resources) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.water = this.config.water;
    this.fuel = this.config.fuel;
  }

  canAfford(cost = {}) {
    return this.water >= (cost.water || 0) && this.fuel >= (cost.fuel || 0);
  }

  consume(cost = {}) {
    if (!this.canAfford(cost)) return false;
    this.water -= cost.water || 0;
    this.fuel -= cost.fuel || 0;
    return true;
  }

  snapshot() {
    return { water: this.water, fuel: this.fuel };
  }
}
