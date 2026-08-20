import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
const realSoak = process.env.FIREBREAK_REAL_SOAK === '1';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:error: ${message.text()}`); });

const waitScene = (scene, timeout = 10_000) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout });
const clickLogical = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844);
};
const getState = () => page.evaluate(() => globalThis.__FIREBREAK_DEBUG__?.get());
const check = (condition, message) => { if (!condition) throw new Error(message); };

async function startGame() {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  await clickLogical(195, 660);
  await waitScene('Game');
}

await fs.mkdir('qa-captures', { recursive: true });
await startGame();

const pauseSamples = [];
for (let i = 0; i < 10; i += 1) {
  await clickLogical(356, 56);
  await waitScene('Pause');
  const before = await getState();
  await page.waitForTimeout(80);
  const after = await getState();
  check(before.simTick === after.simTick, `pause cycle ${i + 1} advanced tick`);
  pauseSamples.push({ cycle: i + 1, tick: before.simTick, sceneStackSize: before.sceneStackSize, bgm: before.activeBgmInstances });
  await clickLogical(195, 405);
  await waitScene('Game');
}

// A visibilitychange must route to the same pause lifecycle.
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await waitScene('Pause');
const visibilityPaused = await getState();
const visibilityAudio = await page.evaluate(() => globalThis.__GAME_QA__?.audioState?.());
check(visibilityAudio?.instances <= 1 && visibilityAudio?.isPaused === true, `hidden audio state invalid: ${JSON.stringify(visibilityAudio)}`);
await page.waitForTimeout(120);
const visibilityStillPaused = await getState();
check(visibilityStillPaused.simTick === visibilityPaused.simTick, 'hidden visibility pause advanced simulation');
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
await clickLogical(195, 405);
await waitScene('Game');
await page.waitForTimeout(120);
const visibilityResumed = await getState();
check(visibilityResumed.simTick - visibilityPaused.simTick <= 1, `visibility resume giant delta: ${visibilityResumed.simTick - visibilityPaused.simTick} ticks`);

const retrySamples = [];
const retryBaseline = await getState();
for (let i = 0; i < 5; i += 1) {
  await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceLose());
  await waitScene('GameOver');
  await clickLogical(195, 670);
  await waitScene('Game');
  const state = await getState();
  check(state.sceneStackSize === 1, `retry ${i + 1} scene stack=${state.sceneStackSize}`);
  check(state.activeBgmInstances === 1, `retry ${i + 1} BGM instances=${state.activeBgmInstances}`);
  retrySamples.push({ cycle: i + 1, tick: state.simTick, sceneStackSize: state.sceneStackSize, bgm: state.activeBgmInstances, resourceCounts: state.resourceCounts });
}
for (const key of ['tweens', 'timers', 'listeners']) {
  const values = retrySamples.map((sample) => sample.resourceCounts?.[key] || 0);
  const monotonicIncrease = values.length > 1 && values.every((value, index) => index === 0 || value > values[index - 1]);
  check(!monotonicIncrease, `${key} increased monotonically across retries: ${values.join(',')}`);
  check(Math.max(...values) <= (retryBaseline.resourceCounts?.[key] || 0) + 2, `${key} exceeded retry baseline tolerance: ${values.join(',')}`);
}

// Establish the verified expert containment geometry using the same debug
// command contract exposed for deterministic browser QA.
const setup = await page.evaluate(() => {
  const api = globalThis.__FIREBREAK_DEBUG__;
  const lines = [
    [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
    [{ x: 8, y: 3 }, { x: 9, y: 3 }],
    [{ x: 8, y: 6 }, { x: 9, y: 6 }],
    Array.from({ length: 10 }, (_, x) => ({ x, y: 8 })),
  ];
  const results = lines.map((line) => { api.previewFirebreak(line); return api.commitFirebreak(); });
  const water = api.dropWater(0, 0);
  return { results, water, state: api.get() };
});
check(setup.results.every((result) => result.ok), 'expert firebreak setup failed');
check(setup.water.ok, 'expert opening water drop failed');

let soakMode = 'logical-180-second';
let soakWallMs = 0;
let maxActiveFireSprites = 0;
let maxSceneStack = 0;
let preTerminal = null;
const soakStart = Date.now();

if (realSoak) {
  soakMode = 'real-wall-180-second';
  let enginesDeployed = false;
  while (true) {
    const state = await getState();
    if (!state) break;
    maxActiveFireSprites = Math.max(maxActiveFireSprites, state.activeFireSprites || 0);
    maxSceneStack = Math.max(maxSceneStack, state.sceneStackSize || 0);
    preTerminal = state;
    if (!enginesDeployed && state.simTick >= 318) {
      const deployed = await page.evaluate(() => [
        globalThis.__FIREBREAK_DEBUG__.deployTruck(2, 11),
        globalThis.__FIREBREAK_DEBUG__.deployTruck(7, 11),
      ]);
      check(deployed.every((result) => result.ok), 'late engine deployment failed');
      enginesDeployed = true;
    }
    if (state.terminalState || state.simTick >= 360) break;
    await page.waitForTimeout(500);
  }
  await waitScene('GameOver', 10_000);
} else {
  preTerminal = await page.evaluate(() => {
    const api = globalThis.__FIREBREAK_DEBUG__;
    const now = api.get().simTick;
    api.advanceTicks(Math.max(0, 319 - now));
    const engines = [api.deployTruck(2, 11), api.deployTruck(7, 11)];
    api.advanceTicks(Math.max(0, 360 - api.get().simTick));
    return { state: api.get(), engines };
  });
  check(preTerminal.engines.every((result) => result.ok), 'logical soak engine deployment failed');
  preTerminal = preTerminal.state;
  maxActiveFireSprites = preTerminal.activeFireSprites || 0;
  maxSceneStack = preTerminal.sceneStackSize || 0;
}
soakWallMs = Date.now() - soakStart;

check(preTerminal.simTick >= 360, `soak ended at tick ${preTerminal.simTick}`);
check(preTerminal.terminalState?.outcome === 'win', `soak terminal=${preTerminal.terminalState?.outcome}`);
check(maxActiveFireSprites <= 150, `active fire sprites exceeded cap: ${maxActiveFireSprites}`);
check(maxSceneStack <= 1, `scene stack exceeded cap: ${maxSceneStack}`);
check(errors.length === 0, errors.join('\n'));

await page.screenshot({ path: 'qa-captures/lifecycle-soak-final.png' });
const report = {
  ok: true,
  viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
  pauseResumeCycles: pauseSamples,
  visibilityPaused,
  visibilityAudio,
  visibilityResumed,
  retryCycles: retrySamples,
  retryBaseline: retryBaseline.resourceCounts,
  soak: { mode: soakMode, wallMs: soakWallMs, simulatedSeconds: preTerminal.simTick * 0.5, maxActiveFireSprites, maxSceneStack, terminal: preTerminal.terminalState },
  errors,
};
await fs.writeFile('qa-captures/lifecycle-soak-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ ok: true, pauseResume: 10, retries: 5, soak: report.soak, errors, result: 'qa-captures/lifecycle-soak-results.json' }, null, 2));
