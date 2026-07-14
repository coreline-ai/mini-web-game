import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { FIREBREAK_CONFIG } from '../src/game/config/firebreakConfig.js';
import { PINE_RIDGE_STAGE } from '../src/game/config/stagePineRidge.js';
import CommandSystem from '../src/game/systems/CommandSystem.js';
import FireSimulationSystem from '../src/game/systems/FireSimulationSystem.js';
import ResourceSystem from '../src/game/systems/ResourceSystem.js';
import ScoreSystem from '../src/game/systems/ScoreSystem.js';
import StageDirector from '../src/game/systems/StageDirector.js';
import WindSystem from '../src/game/systems/WindSystem.js';

function createHarness(seed = PINE_RIDGE_STAGE.seed) {
  const simulation = new FireSimulationSystem(PINE_RIDGE_STAGE, FIREBREAK_CONFIG);
  simulation.reset(seed);
  const resources = new ResourceSystem(FIREBREAK_CONFIG.resources);
  const commands = new CommandSystem(simulation, resources, FIREBREAK_CONFIG);
  const wind = new WindSystem(FIREBREAK_CONFIG.windSchedule);
  const score = new ScoreSystem(FIREBREAK_CONFIG.scoring);
  const director = new StageDirector(simulation, wind, commands, resources, score, FIREBREAK_CONFIG);
  return { simulation, resources, commands, wind, score, director };
}

function commitLine(h, cells) {
  h.commands.select('firebreak');
  h.commands.preview = cells.map((cell) => ({ ...cell }));
  const result = h.commands.commitFirebreak();
  assert.equal(result.ok, true, `firebreak failed: ${result.reason}`);
  return result;
}

function buildRefugeRing(h) {
  commitLine(h, [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }]);
  commitLine(h, [{ x: 8, y: 3 }, { x: 9, y: 3 }]);
  commitLine(h, [{ x: 8, y: 6 }, { x: 9, y: 6 }]);
}

function buildMidline(h) {
  commitLine(h, Array.from({ length: 10 }, (_, x) => ({ x, y: 8 })));
}

function dropWater(h, cell) {
  const result = h.commands.dropWater(cell);
  if (result.ok) h.score.registerCooling(result);
  return result;
}

function dropHottest(h) {
  const target = h.simulation.cells
    .filter((cell) => cell.fireState === 'burning')
    .sort((a, b) => b.heat - a.heat || a.y - b.y || a.x - b.x)[0];
  return target ? dropWater(h, target) : { ok: false, reason: 'NO_FIRE' };
}

function runScenario({ name, seed = PINE_RIDGE_STAGE.seed, setup = () => {}, act = () => {} }) {
  const h = createHarness(seed);
  setup(h);
  const stageEvents = [];
  let firstObjectiveDamageTick = null;
  for (let inputTick = 0; inputTick < 500 && !h.director.terminal; inputTick += 1) {
    act(h, inputTick);
    const result = h.director.step();
    if (result.events?.objectiveDamage?.length && firstObjectiveDamageTick === null) firstObjectiveDamageTick = h.simulation.tick;
    for (const event of result.stageEvents || []) stageEvents.push({ tick: h.simulation.tick, type: event.type, id: event.id || '' });
  }
  return {
    name,
    seed,
    tick: h.simulation.tick,
    seconds: h.simulation.tick * FIREBREAK_CONFIG.simulation.tickMs / 1000,
    firstObjectiveDamageTick,
    firstObjectiveDamageSeconds: firstObjectiveDamageTick === null ? null : firstObjectiveDamageTick * FIREBREAK_CONFIG.simulation.tickMs / 1000,
    terminal: h.director.terminal,
    resources: h.resources.snapshot(),
    actions: { ...h.commands.actionCounts },
    gridHash: h.simulation.getGridHash(),
    stageEvents,
  };
}

const noAction = runScenario({ name: 'failure-no-action' });
assert.equal(noAction.terminal.outcome, 'loss');
assert.ok(noAction.firstObjectiveDamageSeconds >= 45 && noAction.firstObjectiveDamageSeconds <= 75);

const waterOnly = runScenario({
  name: 'failure-water-only',
  act: (h) => {
    if (h.commands.helicopterCooldown === 0 && h.resources.canAfford({ water: FIREBREAK_CONFIG.resources.helicopterWater, fuel: FIREBREAK_CONFIG.resources.helicopterFuel })) dropHottest(h);
  },
});
assert.equal(waterOnly.terminal.outcome, 'loss');
assert.equal(waterOnly.resources.water, 0);
assert.equal(waterOnly.actions.firebreak, 0);

const firebreakOnly = runScenario({ name: 'failure-firebreak-only', setup: buildRefugeRing });
assert.equal(firebreakOnly.terminal.outcome, 'loss');
assert.equal(firebreakOnly.actions.helicopter, 0);
assert.equal(firebreakOnly.actions.engine, 0);

function expertSetup(h) {
  buildRefugeRing(h);
  buildMidline(h);
}

const beginner = runScenario({
  name: 'win-one-star-core-objectives',
  setup: buildMidline,
  act: (h, tick) => {
    if (tick === 0) assert.equal(dropHottest(h).ok, true);
    if (tick === 319) {
      assert.equal(h.commands.deployEngine({ x: 2, y: 11 }).ok, true);
      assert.equal(h.commands.deployEngine({ x: 7, y: 11 }).ok, true);
    }
  },
});
assert.equal(beginner.terminal.outcome, 'win');
assert.equal(beginner.terminal.stars, 1);
assert.equal(beginner.terminal.objectives.refuge, 0);

const expertA = runScenario({
  name: 'win-dual-engine',
  setup: expertSetup,
  act: (h, tick) => {
    if (tick === 0) assert.equal(dropHottest(h).ok, true);
    if (tick === 319) {
      assert.equal(h.commands.deployEngine({ x: 2, y: 11 }).ok, true);
      assert.equal(h.commands.deployEngine({ x: 7, y: 11 }).ok, true);
    }
  },
});
assert.equal(expertA.terminal.outcome, 'win');
assert.equal(expertA.terminal.stars, 3);
assert.equal(expertA.tick, PINE_RIDGE_STAGE.minContainmentTick);

const expertB = runScenario({
  name: 'win-air-engine-split',
  setup: expertSetup,
  act: (h, tick) => {
    if (tick === 121) assert.equal(dropWater(h, { x: 1, y: 6 }).ok, true);
    if (tick === 319) assert.equal(h.commands.deployEngine({ x: 2, y: 11 }).ok, true);
    if (tick === 321) assert.equal(dropWater(h, { x: 8, y: 12 }).ok, true);
  },
});
assert.equal(expertB.terminal.outcome, 'win');
assert.equal(expertB.terminal.stars, 3);

const seededWins = [PINE_RIDGE_STAGE.seed, 1, 42].map((seed) => runScenario({
  name: `seeded-win-${seed}`,
  seed,
  setup: expertSetup,
  act: (h, tick) => {
    if (tick === 0) dropHottest(h);
    if (tick === 319) {
      h.commands.deployEngine({ x: 2, y: 11 });
      h.commands.deployEngine({ x: 7, y: 11 });
    }
  },
}));
assert.ok(seededWins.every((result) => result.terminal.outcome === 'win' && result.terminal.stars === 3));
assert.ok(seededWins.every((result) => result.stageEvents.some((event) => event.type === 'EMBER_EVENT')));

// Terminal state is immutable: subsequent steps cannot advance the grid.
const terminalHarness = createHarness();
terminalHarness.director.terminal = terminalHarness.director.buildTerminal('loss', 'TEST_LOCK');
const lockedTick = terminalHarness.simulation.tick;
const lockedHash = terminalHarness.simulation.getGridHash();
terminalHarness.director.step();
assert.equal(terminalHarness.simulation.tick, lockedTick);
assert.equal(terminalHarness.simulation.getGridHash(), lockedHash);

const report = {
  ok: true,
  acceptance: {
    noActionWarningWindow: true,
    waterOnlyExhaustsAndLoses: true,
    firebreakOnlyLoses: true,
    beginnerOneStarPath: true,
    twoThreeStarCombinedPaths: true,
    threeSeedWins: true,
    terminalLocked: true,
  },
  scenarios: [noAction, waterOnly, firebreakOnly, beginner, expertA, expertB, ...seededWins],
};
await fs.mkdir('qa-captures', { recursive: true });
await fs.writeFile('qa-captures/balance-results.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, scenarios: report.scenarios.length, acceptance: report.acceptance, result: 'qa-captures/balance-results.json' }, null, 2));
