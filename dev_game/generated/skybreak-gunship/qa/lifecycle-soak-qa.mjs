import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { browserLaunchArgs } from './_browser-args.mjs';

const baseUrl = process.env.GAME_QA_URL || 'http://127.0.0.1:5187';
const qaUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}skipTutorial=1`;
const browser = await chromium.launch({ headless: true, args: browserLaunchArgs() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const browserErrors = [];
let currentRun = -1;
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.stack || error.message}`));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
const waitScene = async (scene) => {
  try {
    await page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      layoutScene: globalThis.__GAME_LAYOUT_BOUNDS__?.scene,
      activeScenes: globalThis.__GAME__?.scene?.getScenes(true).map((entry) => entry.scene.key),
    }));
    throw new Error(`Run ${currentRun}: timed out waiting for ${scene}: ${JSON.stringify(diagnostics)}; browserErrors=${JSON.stringify(browserErrors)}; ${error.message}`);
  }
};
const clickLogical = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844);
};

await page.goto(qaUrl, { waitUntil: 'domcontentloaded' });
await waitScene('Home');
const samples = [];
for (let run = 0; run < Number(process.env.LIFECYCLE_RUNS || 6); run += 1) {
  currentRun = run;
  await clickLogical(195, 625); await waitScene('Briefing');
  await clickLogical(195, 766);
  await waitScene('Game'); await page.waitForTimeout(80);
  const sample = await page.evaluate((runIndex) => {
    const scene = globalThis.__GAME__.scene.getScene('Game');
    let simulatedTime = scene.time.now;
    if (runIndex === 0) for (let i = 0; i < 1000; i += 1) scene.drawTracer(195, 360);
    for (let step = 0; step < 400; step += 1) {
      simulatedTime += 50;
      scene.time.update(simulatedTime, 50);
      scene.tweens.update(simulatedTime, 50);
      scene.update(simulatedTime, 50);
      if (step % 5 === 0) scene.targets.filter((target) => target.active && target.side === 'hostile').forEach((target) => scene.removeTarget(target, false));
      scene.convoyHp = 1000;
    }
    scene.publishQa();
    return {
      run: runIndex,
      simulatedSeconds: 20,
      sceneStackSize: scene.scene.manager.getScenes(true).length,
      timerCount: (scene.time._active?.length || 0) + (scene.time._pendingInsertion?.length || 0),
      tweenCount: scene.tweens.getTweens().length,
      tracerPoolSize: scene.tracerPool.length,
      missilePoolSize: scene.weapon.missilePool.length,
      activeTracerCount: scene.tracerPool.filter((slot) => slot.active).length,
      activeMissileCount: scene.weapon.missilePool.filter((slot) => slot.active).length,
      activeBgmInstances: (globalThis.__GAME__.sound?.sounds || []).filter((sound) => sound.key === 'music_gameplay' && (sound.isPlaying || sound.isPaused)).length,
      rotorInstances: (globalThis.__GAME__.sound?.sounds || []).filter((sound) => sound.key === 'rotor_loop' && (sound.isPlaying || sound.isPaused)).length,
      targetCount: scene.targets.length,
    };
  }, run);
  samples.push(sample);
  await clickLogical(354, 79); await waitScene('Pause');
  await clickLogical(195, 504);
  await waitScene('Home'); await page.waitForTimeout(60);
}

const monotonicIncrease = (key) => samples.every((sample, index) => index === 0 || sample[key] > samples[index - 1][key]);
const assertions = {
  simulatedTwoMinutes: samples.reduce((sum, sample) => sum + sample.simulatedSeconds, 0) === 120,
  retryFiveTimes: samples.length === 6,
  tracerPoolBoundedAfter1000Shots: samples.every((sample) => sample.tracerPoolSize === 16),
  missilePoolBounded: samples.every((sample) => sample.missilePoolSize <= 4),
  noDuplicateBgm: samples.every((sample) => sample.activeBgmInstances <= 1),
  noDuplicateRotor: samples.every((sample) => sample.rotorInstances <= 1),
  timersNotMonotonic: !monotonicIncrease('timerCount'),
  tweensNotMonotonic: !monotonicIncrease('tweenCount'),
  singleScenePerRun: samples.every((sample) => sample.sceneStackSize === 1),
};
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
const report = { ok, assertions, browserErrors, simulatedSeconds: 120, retries: 5, samples };
await fs.mkdir('qa-captures', { recursive: true });
await fs.writeFile('qa-captures/lifecycle-soak-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;
