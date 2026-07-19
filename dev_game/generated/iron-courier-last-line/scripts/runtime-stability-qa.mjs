#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outputDir = path.join(ROOT, 'assets/qa/stability');

function valueAfter(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const baseUrl = valueAfter('--url', 'http://127.0.0.1:5195');
const soakSeconds = Number(valueAfter('--soak-seconds', '600'));
const restartCount = Number(valueAfter('--restart-count', '10'));
const sampleEverySeconds = Number(valueAfter('--sample-every-seconds', '5'));
const reportName = valueAfter('--report-name', 'runtime-stability-qa.json');

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const candidates = [
    process.env.CODEX_WORKSPACE_NODE_MODULES && path.join(process.env.CODEX_WORKSPACE_NODE_MODULES, 'playwright/index.mjs'),
    path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return await import(pathToFileURL(candidate).href); } catch {}
  }
  throw new Error('Playwright was not found.');
}

async function runtimeSample(page) {
  return page.evaluate(() => {
    const game = window.__GAME__;
    const scene = game?.scene?.getScene?.('Game');
    if (!scene?.core) return { scene: window.__GAME_LAYOUT_BOUNDS__?.scene ?? null };
    const pool = scene.core.pool.group.getChildren();
    const listenerCount = (emitter) => emitter?.eventNames?.().reduce((sum, event) => sum + emitter.listenerCount(event), 0) ?? 0;
    return {
      scene: window.__GAME_LAYOUT_BOUNDS__?.scene ?? null,
      elapsedMs: scene.elapsedMs,
      score: scene.score,
      playerHealth: scene.core.player.health,
      encounterIndex: scene.core.encounters.currentIndex,
      poolLength: pool.length,
      activeProjectiles: pool.filter((projectile) => projectile.active).length,
      tweenCount: scene.tweens.getTweens().length,
      timerCount: (scene.time._active?.length ?? 0) + (scene.time._pendingInsertion?.length ?? 0),
      coreListeners: listenerCount(scene.core) + listenerCount(scene.core.pool) + listenerCount(scene.core.encounters) + listenerCount(scene.core.rescues),
      activeBgmInstances: scene.sound.sounds.filter((sound) => sound.isPlaying && String(sound.key).startsWith('music-')).length,
      fps: Number((game.loop.actualFps || 0).toFixed(2)),
      heap: globalThis.performance?.memory?.usedJSHeapSize ?? null,
    };
  });
}

async function startGame(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home');
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game' && window.__IRON_COURIER_DEBUG__?.get);
  return canvas;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  const canvas = await startGame(page);

  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.player.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    scene.enforceEncounterGate = () => {};
    // Isolate pool/VFX settling from legitimate enemy fire. Enemy animation and
    // combat behavior are covered by runtime-art-qa; this soak owns lifecycle
    // growth and must not sample newly-fired AI projectiles as leaked objects.
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    scene.core.encounters.current = null;
  });

  const samples = [];
  const sampleCount = Math.max(1, Math.ceil(soakSeconds / sampleEverySeconds));
  for (let index = 0; index <= sampleCount; index += 1) {
    await page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const player = scene.core.player;
      for (let shot = 0; shot < 12; shot += 1) {
        scene.core.pool.fire(player.x + 40, player.y - 20, { x: 1, y: (shot - 5.5) * 0.025 }, { owner: player, faction: 'player', weaponId: shot % 3 === 0 ? 'rocket' : 'rifle', speed: 520, lifespan: 520, damage: 0 });
      }
      scene.hitBurst(player.x + 120, player.y - 20, 0xffc857, 12);
    });
    samples.push({ index, wallSeconds: index * sampleEverySeconds, ...(await runtimeSample(page)) });
    if (index < sampleCount) await page.waitForTimeout(sampleEverySeconds * 1000);
  }
  await page.waitForTimeout(900);
  samples.push({ index: sampleCount + 1, wallSeconds: soakSeconds + 0.9, ...(await runtimeSample(page)) });

  const restarts = [];
  for (let index = 1; index <= restartCount; index += 1) {
    await page.evaluate(() => window.__GAME__.scene.getScene('Game').finish(true, 'stability restart'));
    await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'GameOver');
    await page.mouse.click(canvas.x + canvas.width * (495 / 1280), canvas.y + canvas.height * (505 / 720));
    await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game' && window.__IRON_COURIER_DEBUG__?.get);
    await page.waitForTimeout(260);
    const sample = await runtimeSample(page);
    restarts.push({ index, ...sample });
    await page.evaluate(() => { const scene = window.__GAME__.scene.getScene('Game'); scene.core.player.invulnerableUntil = Number.MAX_SAFE_INTEGER; });
  }

  const first = samples[0];
  const last = samples.at(-1);
  const failures = [];
  const maxPoolLength = Math.max(...samples.map((sample) => sample.poolLength ?? 0));
  const maxActiveProjectiles = Math.max(...samples.map((sample) => sample.activeProjectiles ?? 0));
  const maxBgm = Math.max(...samples.map((sample) => sample.activeBgmInstances ?? 0), ...restarts.map((sample) => sample.activeBgmInstances ?? 0));
  if (browserErrors.length) failures.push(`browser errors: ${browserErrors.join(' | ')}`);
  if (maxPoolLength > 140) failures.push(`projectile pool exceeded maxSize: ${maxPoolLength}`);
  if ((last.activeProjectiles ?? 0) > 4) failures.push(`active projectiles did not settle: ${last.activeProjectiles}`);
  if ((last.coreListeners ?? 0) > (first.coreListeners ?? 0) + 2) failures.push(`listener count grew: ${first.coreListeners} -> ${last.coreListeners}`);
  if ((last.timerCount ?? 0) > (first.timerCount ?? 0) + 4) failures.push(`timer count grew: ${first.timerCount} -> ${last.timerCount}`);
  if (first.heap && last.heap && last.heap - first.heap > 64 * 1024 * 1024) failures.push(`heap grew more than 64 MiB: ${first.heap} -> ${last.heap}`);
  if (maxBgm > 1) failures.push(`active BGM instances exceeded 1: ${maxBgm}`);
  for (const restart of restarts) {
    if (restart.scene !== 'Game' || restart.score !== 0 || restart.encounterIndex !== 0 || restart.elapsedMs > 1500 || restart.poolLength > 4) failures.push(`restart ${restart.index} did not return to baseline`);
  }

  const report = {
    generatedAt: new Date().toISOString(), baseUrl, soakSeconds, restartCount, sampleEverySeconds,
    ok: failures.length === 0, failures, browserErrors,
    summary: { maxPoolLength, maxActiveProjectiles, maxBgm, first, last },
    samples, restarts,
  };
  await fs.writeFile(path.join(outputDir, reportName), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDir, 'soak-10min.log'), samples.map((sample) => JSON.stringify(sample)).join('\n') + '\n');
  await fs.writeFile(path.join(outputDir, 'restart-10x.json'), `${JSON.stringify({ generatedAt: report.generatedAt, restartCount, restarts, failures: failures.filter((failure) => failure.startsWith('restart')) }, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify({ ok: report.ok, failures, soakSeconds, restartCount, maxPoolLength, maxActiveProjectiles, maxBgm, report: path.relative(ROOT, path.join(outputDir, reportName)) }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
