import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { FIREBREAK_CONFIG } from '../src/game/config/firebreakConfig.js';
import { GAME_RULES } from '../src/game/config/gameRules.js';

const SPEC = JSON.parse(await fs.readFile(new URL('../src/game/data/game-spec.json', import.meta.url), 'utf8'));

const baseUrl = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
assert.equal(GAME_RULES.durationSeconds, FIREBREAK_CONFIG.simulation.stageDurationSeconds);
assert.equal(GAME_RULES.commands.firebreak.costs.fuelPerCell, FIREBREAK_CONFIG.resources.firebreakFuelPerCell);
assert.equal(GAME_RULES.commands.helicopter.costs.water, FIREBREAK_CONFIG.resources.helicopterWater);
assert.equal(GAME_RULES.commands.helicopter.costs.fuel, FIREBREAK_CONFIG.resources.helicopterFuel);
assert.equal(GAME_RULES.commands.engine.costs.fuel, FIREBREAK_CONFIG.resources.engineFuel);
assert.equal(GAME_RULES.commands.engine.maxUnits, FIREBREAK_CONFIG.resources.maxEngines);
assert.equal(GAME_RULES.durationSeconds, SPEC.rules.durationSeconds);
assert.equal(GAME_RULES.goal, SPEC.rules.goal);
assert.equal(GAME_RULES.progressMetric, SPEC.rules.progressMetric);
for (const command of SPEC.rules.commands) {
  const runtimeCommand = GAME_RULES.commands[command.id];
  assert.ok(runtimeCommand, `runtime command missing: ${command.id}`);
  assert.equal(runtimeCommand.label, command.label);
  for (const [key, value] of Object.entries(command.costs || {})) {
    const actual = key === 'maxUnits' ? runtimeCommand.maxUnits : runtimeCommand.costs[key];
    assert.equal(actual, value, `${command.id}.${key}`);
  }
}

const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const clickLogical = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844);
};

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');
const home = await page.evaluate(() => globalThis.__GAME__.scene.getScene('Home').tagline.text);
assert.match(home, new RegExp(`${GAME_RULES.durationSeconds}초`));
await clickLogical(195, 744);
await waitScene('Tutorial');
const tutorial = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Tutorial');
  return { goal: scene.goalText.text, actionTitles: scene.actionPanels.map((item) => item.titleText.text) };
});
assert.match(tutorial.goal, new RegExp(`${GAME_RULES.durationSeconds}초`));
assert.ok(tutorial.actionTitles.some((text) => text.includes(`연료 ${GAME_RULES.commands.firebreak.costs.fuelPerCell}/칸`)));
assert.ok(tutorial.actionTitles.some((text) => text.includes(`물 ${GAME_RULES.commands.helicopter.costs.water} / 연료 ${GAME_RULES.commands.helicopter.costs.fuel}`)));
assert.ok(tutorial.actionTitles.some((text) => text.includes(`연료 ${GAME_RULES.commands.engine.costs.fuel}`)));
await clickLogical(195, 715);
await waitScene('Game');
const runtime = await page.evaluate(() => ({ rules: globalThis.__GAME_RULES__, debug: globalThis.__FIREBREAK_DEBUG__.get() }));
assert.deepEqual(runtime.rules, JSON.parse(JSON.stringify(GAME_RULES)));
assert.equal(runtime.debug.remainingSeconds, GAME_RULES.durationSeconds);
assert.equal(errors.length, 0, errors.join('\n'));

const report = { ok: true, assertions: 26, rules: GAME_RULES, home, tutorial, browserErrors: errors };
await fs.writeFile('qa-captures/rules-sync-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ ok: true, assertions: report.assertions, result: 'qa-captures/rules-sync-results.json' }, null, 2));
