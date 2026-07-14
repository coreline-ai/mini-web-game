import { FIREBREAK_CONFIG } from '../config/firebreakConfig.js';

export default class StageDirector {
  constructor(simulation, windSystem, commandSystem, resources, score, config = FIREBREAK_CONFIG) {
    this.simulation = simulation;
    this.windSystem = windSystem;
    this.commandSystem = commandSystem;
    this.resources = resources;
    this.score = score;
    this.config = config;
    this.reset();
  }

  reset() {
    this.terminal = null;
    this.emberWarned = false;
    this.emberTriggered = false;
    this.spotWarnings = new Set();
    this.spotTriggered = new Set();
    this.lastWind = this.windSystem.get();
  }

  step() {
    if (this.terminal) return { terminal: this.terminal, events: {} };
    const tick = this.simulation.tick;
    const wind = this.windSystem.update(tick);
    const stageEvents = [];
    if (wind.changed) stageEvents.push({ type: 'WIND_SHIFT', wind });
    for (const spot of this.simulation.stage.spotFires || []) {
      if (!this.spotWarnings.has(spot.id) && tick >= spot.warningTick) {
        this.spotWarnings.add(spot.id);
        stageEvents.push({ type: 'SPOT_FIRE_WARNING', id: spot.id, label: spot.label, triggerTick: spot.triggerTick, cells: spot.cells });
      }
      if (!this.spotTriggered.has(spot.id) && tick >= spot.triggerTick) {
        this.spotTriggered.add(spot.id);
        const ignitions = spot.cells.map((cell) => this.simulation.igniteCell(cell.x, cell.y, 0.9, spot.id));
        stageEvents.push({ type: 'SPOT_FIRE_EVENT', id: spot.id, label: spot.label, ignitions });
      }
    }
    if (!this.emberWarned && tick >= this.config.emberEvent.warningTick) {
      this.emberWarned = true;
      stageEvents.push({ type: 'EMBER_WARNING', triggerTick: this.config.emberEvent.triggerTick });
    }
    if (!this.emberTriggered && tick >= this.config.emberEvent.triggerTick) {
      this.emberTriggered = true;
      const ember = this.simulation.triggerEmber(wind, this.config.emberEvent.jumpCells);
      stageEvents.push({ type: 'EMBER_EVENT', ember });
    }
    const engineCooling = this.commandSystem.beforeTick();
    for (const cooling of engineCooling) this.score.registerCooling(cooling);
    const events = this.simulation.step(wind);
    this.score.registerTick(events);
    const stats = this.simulation.getStats();
    const requiredLost = this.simulation.objectives.some((objective) => objective.required && objective.integrity <= 0);
    const durationTicks = Math.floor(this.config.simulation.stageDurationSeconds * 1000 / this.config.simulation.tickMs);
    if (requiredLost) this.terminal = this.buildTerminal('loss', 'OBJECTIVE_LOST');
    else if (stats.activeFireCells === 0 && this.simulation.tick >= (this.simulation.stage.minContainmentTick || 20)) this.terminal = this.buildTerminal('win', 'CONTAINED');
    else if (this.simulation.tick >= durationTicks) this.terminal = this.buildTerminal('loss', 'TIME_EXPIRED');
    this.lastWind = wind;
    return { wind, stageEvents, events, stats, terminal: this.terminal };
  }

  buildTerminal(outcome, reason) {
    const resources = this.resources.snapshot();
    const objectives = this.simulation.objectives;
    const stats = this.simulation.getStats();
    const score = this.score.finalize(objectives, resources);
    const allObjectives = objectives.every((objective) => objective.integrity > 0);
    const actionCounts = this.commandSystem.snapshot().actionCounts;
    const combinedResponse = ['firebreak', 'helicopter', 'engine'].every((action) => actionCounts[action] > 0);
    let stars = outcome === 'win' ? 1 : 0;
    if (outcome === 'win' && allObjectives) stars = 2;
    if (outcome === 'win' && allObjectives && combinedResponse && resources.water >= 25 && stats.burnedCells <= 60) stars = 3;
    return { outcome, reason, score, stars, resources, actionCounts, objectives: Object.fromEntries(objectives.map((o) => [o.id, Math.round(o.integrity)])), stats };
  }

  getRemainingSeconds() {
    const elapsed = this.simulation.tick * this.config.simulation.tickMs / 1000;
    return Math.max(0, Math.ceil(this.config.simulation.stageDurationSeconds - elapsed));
  }
}
