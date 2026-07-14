import { FIREBREAK_CONFIG } from '../config/firebreakConfig.js';
import { cellKey, inBounds, interpolateCells, uniqueCells } from '../utils/GridMath.js';

export default class CommandSystem {
  constructor(simulation, resources, config = FIREBREAK_CONFIG) {
    this.simulation = simulation;
    this.resources = resources;
    this.config = config;
    this.selected = 'idle';
    this.preview = [];
    this.engines = [];
    this.helicopterCooldown = 0;
    this.actionCounts = { firebreak: 0, helicopter: 0, engine: 0 };
  }

  reset() {
    this.selected = 'idle';
    this.preview = [];
    this.engines = [];
    this.helicopterCooldown = 0;
    this.actionCounts = { firebreak: 0, helicopter: 0, engine: 0 };
  }

  select(command) {
    this.selected = this.selected === command ? 'idle' : command;
    this.preview = [];
    return this.selected;
  }

  cancel() {
    this.selected = 'idle';
    this.preview = [];
  }

  beginFirebreak(cell) {
    this.preview = [cell];
    return this.validateFirebreak(this.preview);
  }

  extendFirebreak(cell) {
    const last = this.preview[this.preview.length - 1];
    if (!last) return this.beginFirebreak(cell);
    this.preview = uniqueCells([...this.preview, ...interpolateCells(last, cell)]);
    return this.validateFirebreak(this.preview);
  }

  validateFirebreak(path = this.preview) {
    const { columns, rows } = this.config.grid;
    const invalid = [];
    for (const cell of path) {
      if (!inBounds(cell.x, cell.y, columns, rows) || !this.simulation.canBuildFirebreak(cell.x, cell.y)) invalid.push(cellKey(cell.x, cell.y));
    }
    const fuelCost = path.length * this.config.resources.firebreakFuelPerCell;
    return {
      valid: path.length >= this.config.actions.minFirebreakCells && invalid.length === 0 && this.resources.canAfford({ fuel: fuelCost }),
      invalid,
      fuelCost,
      cells: path.map((cell) => ({ ...cell })),
    };
  }

  commitFirebreak() {
    const check = this.validateFirebreak();
    if (!check.valid) return { ok: false, reason: check.invalid.length ? 'INVALID_PATH' : 'NO_FUEL', ...check };
    if (!this.resources.consume({ fuel: check.fuelCost })) return { ok: false, reason: 'NO_FUEL', ...check };
    const placed = this.simulation.placeFirebreak(check.cells);
    this.actionCounts.firebreak += 1;
    this.cancel();
    return { ok: true, placed, fuelCost: check.fuelCost, cells: check.cells };
  }

  dropWater(cell) {
    if (this.helicopterCooldown > 0) return { ok: false, reason: 'COOLDOWN', cooldown: this.helicopterCooldown };
    const cost = { water: this.config.resources.helicopterWater, fuel: this.config.resources.helicopterFuel };
    if (!this.resources.consume(cost)) return { ok: false, reason: 'NO_RESOURCES' };
    const result = this.simulation.applyCooling(cell, this.config.actions.helicopterRadius, this.config.actions.helicopterCooling, 'helicopter');
    this.helicopterCooldown = this.config.resources.helicopterCooldownTicks;
    this.actionCounts.helicopter += 1;
    this.cancel();
    return { ok: true, ...result, cost };
  }

  deployEngine(cell) {
    const { maxEngines, engineFuel } = this.config.resources;
    if (this.engines.length >= maxEngines) return { ok: false, reason: 'ENGINE_LIMIT' };
    if (this.engines.some((engine) => engine.x === cell.x && engine.y === cell.y)) return { ok: false, reason: 'OCCUPIED' };
    if (this.simulation.getCell(cell.x, cell.y)?.terrain !== 'road') return { ok: false, reason: 'ROAD_ONLY' };
    if (!this.resources.consume({ fuel: engineFuel })) return { ok: false, reason: 'NO_FUEL' };
    this.engines.push({ x: cell.x, y: cell.y, active: true });
    this.actionCounts.engine += 1;
    this.cancel();
    return { ok: true, engine: { ...cell }, cost: { fuel: engineFuel } };
  }

  beforeTick() {
    const coolingResults = [];
    if (this.helicopterCooldown > 0) this.helicopterCooldown -= 1;
    for (const engine of this.engines) {
      if (!engine.active) continue;
      // Engines hold position without draining the reservoir. Water is spent
      // only while a burning/heating cell is inside the response radius.
      if (!this.simulation.hasActiveThreat(engine, this.config.actions.engineRadius)) continue;
      if (!this.resources.consume({ water: this.config.resources.engineWaterPerTick })) {
        engine.active = false;
        continue;
      }
      coolingResults.push(this.simulation.applyCooling(engine, this.config.actions.engineRadius, this.config.actions.engineCooling, 'engine'));
    }
    return coolingResults;
  }

  snapshot() {
    return {
      selected: this.selected,
      preview: this.preview.map((cell) => ({ ...cell })),
      helicopterCooldown: this.helicopterCooldown,
      engines: this.engines.map((engine) => ({ ...engine })),
      actionCounts: { ...this.actionCounts },
    };
  }
}
