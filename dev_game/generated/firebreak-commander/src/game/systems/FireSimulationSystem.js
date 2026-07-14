import { FIREBREAK_CONFIG } from '../config/firebreakConfig.js';
import { PINE_RIDGE_STAGE, terrainAt } from '../config/stagePineRidge.js';
import SeededRandom from '../utils/SeededRandom.js';
import { NEIGHBOR_OFFSETS, distance, gridIndex, inBounds, normalize } from '../utils/GridMath.js';

const ROUND = (value, digits = 5) => Number(value.toFixed(digits));

export default class FireSimulationSystem {
  constructor(stage = PINE_RIDGE_STAGE, config = FIREBREAK_CONFIG) {
    this.stage = stage;
    this.config = config;
    this.reset(stage.seed);
  }

  reset(seed = this.stage.seed) {
    this.seed = seed >>> 0;
    this.rng = new SeededRandom(this.seed);
    this.tick = 0;
    this.cells = [];
    const { columns, rows } = this.config.grid;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const terrain = terrainAt(x, y);
        const tuning = this.config.terrain[terrain];
        this.cells.push({
          x, y, terrain,
          fuelLoad: tuning.fuelLoad,
          moisture: tuning.moisture,
          heat: 0,
          fireState: 'safe',
          firebreak: false,
          structureId: null,
        });
      }
    }
    this.neighborCache = this.cells.map((cell) => NEIGHBOR_OFFSETS
      .map((offset) => ({ offset, target: this.getCell(cell.x + offset.x, cell.y + offset.y) }))
      .filter((entry) => entry.target));
    this.objectives = this.stage.objectives.map((objective) => ({
      ...objective,
      cells: objective.cells.map((cell) => ({ ...cell })),
      integrity: this.config.objectives.maxIntegrity,
    }));
    for (const objective of this.objectives) {
      for (const coord of objective.cells) {
        const cell = this.getCell(coord.x, coord.y);
        if (cell) cell.structureId = objective.id;
      }
    }
    for (const cell of this.stage.ignitionCells) this.igniteCell(cell.x, cell.y, 0.9, 'initial');
  }

  getCell(x, y) {
    const { columns, rows } = this.config.grid;
    if (!inBounds(x, y, columns, rows)) return null;
    return this.cells[gridIndex(x, y, columns)];
  }

  igniteCell(x, y, heat = 0.86, source = 'debug') {
    const cell = this.getCell(x, y);
    const tuning = cell && this.config.terrain[cell.terrain];
    if (!cell || !tuning.flammable || cell.firebreak || cell.fireState === 'burned') return { ok: false, reason: 'NOT_FLAMMABLE' };
    cell.heat = Math.max(cell.heat, heat);
    cell.fireState = 'burning';
    return { ok: true, x, y, source };
  }

  canBuildFirebreak(x, y) {
    const cell = this.getCell(x, y);
    if (!cell) return false;
    return !cell.structureId && !cell.firebreak && !['burning', 'burned'].includes(cell.fireState) && !['road', 'rock', 'river'].includes(cell.terrain);
  }

  placeFirebreak(cells) {
    let placed = 0;
    for (const coord of cells) {
      if (!this.canBuildFirebreak(coord.x, coord.y)) continue;
      const cell = this.getCell(coord.x, coord.y);
      cell.firebreak = true;
      cell.fuelLoad = 0;
      cell.heat = 0;
      cell.fireState = 'safe';
      placed += 1;
    }
    return placed;
  }

  applyCooling(center, radius, amount, source = 'water') {
    const extinguished = [];
    let affected = 0;
    for (const cell of this.cells) {
      if (distance(center, cell) > radius) continue;
      affected += 1;
      const wasBurning = cell.fireState === 'burning';
      cell.heat = Math.max(0, cell.heat - amount);
      cell.moisture = Math.min(1, cell.moisture + amount * 0.38);
      if (wasBurning && cell.heat < 0.3) {
        cell.fireState = 'extinguished';
        extinguished.push({ x: cell.x, y: cell.y });
      }
    }
    return { affected, extinguished, source };
  }

  hasActiveThreat(center, radius) {
    return this.cells.some((cell) => distance(center, cell) <= radius && ['burning', 'heating'].includes(cell.fireState));
  }

  step(wind) {
    const events = { ignited: [], burned: [], objectiveDamage: [], blockedSpread: 0 };
    const additions = new Float64Array(this.cells.length);
    const { columns } = this.config.grid;
    const activeBurning = this.cells.filter((cell) => cell.fireState === 'burning');

    // Empty intervals still advance deterministic stage time, but avoid the
    // full 150-cell heat pass until a spot-fire event or transient state exists.
    if (!activeBurning.length && !this.cells.some((cell) => ['heating', 'extinguished'].includes(cell.fireState))) {
      this.tick += 1;
      return events;
    }

    for (const source of activeBurning) {
      const sourceIndex = gridIndex(source.x, source.y, columns);
      for (const { offset, target } of this.neighborCache[sourceIndex]) {
        const tx = target.x;
        const ty = target.y;
        if (target.firebreak) { events.blockedSpread += 1; continue; }
        const terrain = this.config.terrain[target.terrain];
        if (!terrain.flammable || target.fireState === 'burned') continue;
        const direction = normalize(offset);
        const dot = direction.x * wind.vector.x + direction.y * wind.vector.y;
        const windFactor = Math.max(0.28, 1 + Math.max(0, dot) * 0.36 * wind.speed - Math.max(0, -dot) * 0.18 * wind.speed);
        const diagonal = offset.x !== 0 && offset.y !== 0 ? 0.72 : 1;
        const transfer = this.config.simulation.baseHeatTransfer * source.heat * terrain.spread * windFactor * diagonal * (1 - target.moisture * 0.42);
        additions[gridIndex(tx, ty, columns)] += transfer;
      }
    }

    for (let i = 0; i < this.cells.length; i += 1) {
      const cell = this.cells[i];
      const terrain = this.config.terrain[cell.terrain];
      if (cell.firebreak) {
        cell.heat = 0;
        cell.fireState = 'safe';
        continue;
      }
      if (cell.fireState === 'burning') {
        cell.heat = Math.min(1, cell.heat + this.config.simulation.burningHeatGain);
        cell.fuelLoad = Math.max(0, cell.fuelLoad - terrain.burnRate * (0.72 + cell.heat * 0.4));
        if (cell.fuelLoad <= 0.01) {
          cell.fireState = 'burned';
          cell.heat = Math.min(cell.heat, 0.28);
          events.burned.push({ x: cell.x, y: cell.y });
        }
        continue;
      }
      cell.heat = Math.max(0, cell.heat - this.config.simulation.ambientCooling * (1 + cell.moisture));
      cell.heat = Math.min(1, cell.heat + additions[i]);
      if (terrain.flammable && cell.fuelLoad > 0.01 && cell.heat >= terrain.ignitionHeat) {
        cell.fireState = 'burning';
        events.ignited.push({ x: cell.x, y: cell.y });
      } else if (cell.fireState === 'safe' && cell.heat >= terrain.ignitionHeat * 0.55) {
        cell.fireState = 'heating';
      } else if (cell.fireState === 'heating' && cell.heat < terrain.ignitionHeat * 0.35) {
        cell.fireState = 'safe';
      } else if (cell.fireState === 'extinguished' && cell.heat < 0.08) {
        cell.fireState = 'safe';
      }
    }

    for (const objective of this.objectives) {
      const burning = objective.cells.map((coord) => this.getCell(coord.x, coord.y)).filter((cell) => cell?.fireState === 'burning');
      if (!burning.length || objective.integrity <= 0) continue;
      const intensity = burning.reduce((sum, cell) => sum + cell.heat, 0) / burning.length;
      const damage = this.config.objectives.damagePerBurningCellTick * burning.length * intensity;
      objective.integrity = Math.max(0, objective.integrity - damage);
      events.objectiveDamage.push({ id: objective.id, damage: ROUND(damage), integrity: ROUND(objective.integrity) });
    }

    this.tick += 1;
    return events;
  }

  triggerEmber(wind, jumpCells = 2) {
    const candidates = this.cells.filter((cell) => cell.fireState === 'burning').sort((a, b) => b.heat - a.heat || a.y - b.y || a.x - b.x);
    for (const source of candidates) {
      const tx = Math.round(source.x + wind.vector.x * jumpCells);
      const ty = Math.round(source.y + wind.vector.y * jumpCells);
      const result = this.igniteCell(tx, ty, 0.82, 'ember');
      if (result.ok) return { ok: true, source: { x: source.x, y: source.y }, target: { x: tx, y: ty } };
    }
    return { ok: false, reason: 'NO_VALID_TARGET' };
  }

  predictRisk(wind, ticks = 3) {
    const scores = new Map();
    for (const source of this.cells.filter((cell) => cell.fireState === 'burning')) {
      for (const offset of NEIGHBOR_OFFSETS) {
        const target = this.getCell(source.x + offset.x, source.y + offset.y);
        if (!target || target.firebreak || !this.config.terrain[target.terrain].flammable || target.fireState === 'burned') continue;
        const direction = normalize(offset);
        const dot = direction.x * wind.vector.x + direction.y * wind.vector.y;
        const score = (1 + Math.max(0, dot) * wind.speed) * ticks + source.heat;
        const key = `${target.x},${target.y}`;
        scores.set(key, Math.max(scores.get(key) || 0, score));
      }
    }
    return [...scores.entries()].map(([key, risk]) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y, risk: ROUND(risk, 3) };
    }).sort((a, b) => b.risk - a.risk || a.y - b.y || a.x - b.x);
  }

  getStats() {
    const count = (state) => this.cells.filter((cell) => cell.fireState === state).length;
    return {
      tick: this.tick,
      activeFireCells: count('burning'),
      heatedCells: count('heating'),
      burnedCells: count('burned'),
      extinguishedCells: count('extinguished'),
      firebreakCells: this.cells.filter((cell) => cell.firebreak).length,
      objectiveIntegrity: Object.fromEntries(this.objectives.map((objective) => [objective.id, ROUND(objective.integrity)])),
    };
  }

  getGridHash() {
    let hash = 2166136261;
    const feed = (value) => {
      hash ^= value >>> 0;
      hash = Math.imul(hash, 16777619) >>> 0;
    };
    for (const cell of this.cells) {
      feed(Math.round(cell.heat * 10000));
      feed(Math.round(cell.fuelLoad * 10000));
      feed(cell.firebreak ? 1 : 0);
      feed({ safe: 1, heating: 2, burning: 3, extinguished: 4, burned: 5 }[cell.fireState] || 0);
    }
    for (const objective of this.objectives) feed(Math.round(objective.integrity * 100));
    feed(this.tick);
    return hash.toString(16).padStart(8, '0');
  }

  snapshot() {
    return {
      seed: this.seed,
      tick: this.tick,
      cells: this.cells.map((cell) => ({ ...cell, heat: ROUND(cell.heat), fuelLoad: ROUND(cell.fuelLoad), moisture: ROUND(cell.moisture) })),
      objectives: this.objectives.map((objective) => ({ ...objective, cells: objective.cells.map((cell) => ({ ...cell })), integrity: ROUND(objective.integrity) })),
      gridHash: this.getGridHash(),
    };
  }
}
