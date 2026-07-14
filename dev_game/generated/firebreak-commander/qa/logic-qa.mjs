import assert from 'node:assert/strict';
import { FIREBREAK_CONFIG } from '../src/game/config/firebreakConfig.js';
import { PINE_RIDGE_STAGE } from '../src/game/config/stagePineRidge.js';
import { interpolateCells } from '../src/game/utils/GridMath.js';
import CommandSystem from '../src/game/systems/CommandSystem.js';
import FireSimulationSystem from '../src/game/systems/FireSimulationSystem.js';
import ResourceSystem from '../src/game/systems/ResourceSystem.js';
import WindSystem from '../src/game/systems/WindSystem.js';

function createHarness(seed = PINE_RIDGE_STAGE.seed) {
  const simulation = new FireSimulationSystem(PINE_RIDGE_STAGE, FIREBREAK_CONFIG);
  simulation.reset(seed);
  const resources = new ResourceSystem(FIREBREAK_CONFIG.resources);
  const commands = new CommandSystem(simulation, resources, FIREBREAK_CONFIG);
  const wind = new WindSystem(FIREBREAK_CONFIG.windSchedule);
  return { simulation, resources, commands, wind };
}

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.stack || String(error) });
  }
}

test('same seed and ticks produce identical grid hash', () => {
  const a = createHarness(123456);
  const b = createHarness(123456);
  for (let i = 0; i < 300; i += 1) {
    a.simulation.step(a.wind.update(a.simulation.tick));
    b.simulation.step(b.wind.update(b.simulation.tick));
  }
  assert.equal(a.simulation.getGridHash(), b.simulation.getGridHash());
});

test('fixed-step results are identical across frame delta patterns', () => {
  const runFrames = (deltas) => {
    const h = createHarness(777);
    let accumulator = 0;
    for (const delta of deltas) {
      accumulator += delta;
      while (accumulator >= FIREBREAK_CONFIG.simulation.tickMs) {
        accumulator -= FIREBREAK_CONFIG.simulation.tickMs;
        h.simulation.step(h.wind.update(h.simulation.tick));
      }
    }
    return { tick: h.simulation.tick, hash: h.simulation.getGridHash() };
  };
  const sixtyishFps = runFrames(Array(625).fill(16));
  const tenFps = runFrames(Array(100).fill(100));
  assert.deepEqual(sixtyishFps, tenFps);
  assert.equal(sixtyishFps.tick, 20);
});

test('different seed does not alter deterministic rules before random event', () => {
  const a = createHarness(1);
  const b = createHarness(2);
  for (let i = 0; i < 20; i += 1) {
    a.simulation.step(a.wind.update(a.simulation.tick));
    b.simulation.step(b.wind.update(b.simulation.tick));
  }
  assert.equal(a.simulation.getGridHash(), b.simulation.getGridHash());
});

test('fast drag interpolation has no missing cells', () => {
  assert.deepEqual(interpolateCells({ x: 0, y: 0 }, { x: 5, y: 0 }), [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 0 })));
  const diagonal = interpolateCells({ x: 0, y: 0 }, { x: 5, y: 5 });
  assert.equal(diagonal.length, 6);
  for (let i = 1; i < diagonal.length; i += 1) {
    assert.ok(Math.abs(diagonal[i].x - diagonal[i - 1].x) <= 1);
    assert.ok(Math.abs(diagonal[i].y - diagonal[i - 1].y) <= 1);
  }
});

test('valid firebreak consumes fuel once and remains non-burning', () => {
  const h = createHarness();
  h.commands.select('firebreak');
  h.commands.beginFirebreak({ x: 0, y: 3 });
  h.commands.extendFirebreak({ x: 2, y: 3 });
  const before = h.resources.fuel;
  const result = h.commands.commitFirebreak();
  assert.equal(result.ok, true);
  assert.equal(h.resources.fuel, before - result.placed * FIREBREAK_CONFIG.resources.firebreakFuelPerCell);
  for (let i = 0; i < 20; i += 1) h.simulation.step(h.wind.update(h.simulation.tick));
  assert.equal(h.simulation.getCell(0, 3).fireState, 'safe');
  assert.equal(h.simulation.getCell(0, 3).heat, 0);
});

test('invalid firebreak is atomic and costs no fuel', () => {
  const h = createHarness();
  h.commands.select('firebreak');
  h.commands.beginFirebreak({ x: 4, y: 0 }); // rock
  h.commands.extendFirebreak({ x: 5, y: 0 });
  const before = h.resources.snapshot();
  const result = h.commands.commitFirebreak();
  assert.equal(result.ok, false);
  assert.deepEqual(h.resources.snapshot(), before);
  assert.equal(h.simulation.getStats().firebreakCells, 0);
});

test('helicopter consumes exactly one cost and cools fire', () => {
  const h = createHarness();
  const before = h.resources.snapshot();
  const result = h.commands.dropWater({ x: 0, y: 0 });
  assert.equal(result.ok, true);
  assert.equal(h.resources.water, before.water - FIREBREAK_CONFIG.resources.helicopterWater);
  assert.equal(h.resources.fuel, before.fuel - FIREBREAK_CONFIG.resources.helicopterFuel);
  assert.ok(result.extinguished.some((cell) => cell.x === 0 && cell.y === 0));
  const second = h.commands.dropWater({ x: 0, y: 0 });
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'COOLDOWN');
});

test('engine deploys only on roads and respects max count', () => {
  const h = createHarness();
  assert.equal(h.commands.deployEngine({ x: 0, y: 0 }).reason, 'ROAD_ONLY');
  assert.equal(h.commands.deployEngine({ x: 0, y: 11 }).ok, true);
  assert.equal(h.commands.deployEngine({ x: 4, y: 11 }).ok, true);
  assert.equal(h.commands.deployEngine({ x: 9, y: 11 }).reason, 'ENGINE_LIMIT');
});

test('objective damage is applied once per simulation tick', () => {
  const h = createHarness();
  h.simulation.igniteCell(0, 13, 0.95, 'test');
  const objective = h.simulation.objectives.find((item) => item.id === 'village');
  const before = objective.integrity;
  h.simulation.step(h.wind.update(h.simulation.tick));
  const firstDamage = before - objective.integrity;
  assert.ok(firstDamage > 0 && firstDamage < 5);
  const secondBefore = objective.integrity;
  h.simulation.step(h.wind.update(h.simulation.tick));
  const secondDamage = secondBefore - objective.integrity;
  assert.ok(secondDamage > 0 && secondDamage < 5);
});

test('rock and river cannot be ignited', () => {
  const h = createHarness();
  assert.equal(h.simulation.igniteCell(4, 0).ok, false);
  assert.equal(h.simulation.igniteCell(3, 3).ok, false);
});

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ ok: failed.length === 0, total: results.length, passed: results.length - failed.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
