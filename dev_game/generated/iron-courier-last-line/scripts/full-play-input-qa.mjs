#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';
const runIndex = process.argv.indexOf('--run-id');
const runId = runIndex >= 0 ? process.argv[runIndex + 1] : 'run1';
const recordVideo = !process.argv.includes('--no-video');
const OUT = path.join(ROOT, 'qa-captures', 'polish-04', 'fullplay-after');

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const candidates = [
    process.env.CODEX_WORKSPACE_NODE_MODULES && path.join(process.env.CODEX_WORKSPACE_NODE_MODULES, 'playwright/index.mjs'),
    path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return await import(pathToFileURL(candidate).href); } catch {}
  }
  throw new Error('Playwright not found.');
}

async function readState(page) {
  return page.evaluate(() => {
    const game = window.__GAME__;
    const result = game?.scene?.getScene('GameOver');
    if (result?.scene?.isActive()) return { scene: 'Result', result: { ...result.result }, layout: window.__GAME_LAYOUT_BOUNDS__ };
    const scene = game?.scene?.getScene('Game');
    if (!scene?.scene?.isActive()) return { scene: window.__GAME_LAYOUT_BOUNDS__?.scene ?? 'unknown' };
    const current = scene.core.encounters.current;
    const actors = (current?.spawned ?? []).filter((actor) => actor.active && actor.health > 0).map((actor) => ({
      role: actor.role ?? actor.constructor?.name,
      x: actor.x,
      y: actor.y,
      health: actor.health,
      maxHealth: actor.maxHealth,
      isBoss: Boolean(current?.definition?.boss),
    }));
    return {
      scene: 'Game',
      elapsedMs: scene.elapsedMs,
      player: { x: scene.core.player.x, y: scene.core.player.y, health: scene.core.player.health, state: scene.core.player.state },
      encounter: { index: scene.core.encounters.currentIndex, id: current?.definition?.id ?? null, boss: current?.definition?.boss ?? null, alive: current?.alive ?? 0, gateX: current?.definition?.gateX ?? null, actors },
      escort: scene.core.escort?.snapshot?.() ?? null,
      score: scene.score,
      lastActions: scene.lastActions,
      layout: window.__GAME_LAYOUT_BOUNDS__,
    };
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browserErrors = [];
  const { width, height } = { width: 1280, height: 720 };
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    ...(recordVideo ? { recordVideo: { dir: OUT, size: { width, height } } } : {}),
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });

  let heldDirection = 0;
  const setDirection = async (direction) => {
    if (direction === heldDirection) return;
    if (heldDirection < 0) await page.keyboard.up('KeyA');
    if (heldDirection > 0) await page.keyboard.up('KeyD');
    heldDirection = direction;
    if (heldDirection < 0) await page.keyboard.down('KeyA');
    if (heldDirection > 0) await page.keyboard.down('KeyD');
  };

  const samples = [];
  const encounterTransitions = [];
  let previousEncounter = null;
  let lastJumpAt = 0;
  let lastGrenadeAt = 0;
  let lastSampleAt = 0;
  let lastProgressLogAt = 0;
  let finalState = null;
  const startedAt = Date.now();
  await page.keyboard.down('KeyJ');

  while (Date.now() - startedAt < 240000) {
    const state = await readState(page);
    if (state.scene === 'Result') { finalState = state; break; }
    if (state.scene !== 'Game') throw new Error(`Unexpected active scene: ${state.scene}`);

    if (state.encounter.id !== previousEncounter) {
      previousEncounter = state.encounter.id;
      encounterTransitions.push({ atMs: state.elapsedMs, id: state.encounter.id, x: state.player.x });
      console.log(`[fullplay] encounter=${state.encounter.id} x=${state.player.x.toFixed(1)} hp=${state.player.health}`);
      await page.screenshot({ path: path.join(OUT, `${runId}-${String(state.encounter.index).padStart(2, '0')}-${state.encounter.id}.png`) });
    }

    const target = [...state.encounter.actors].sort((a, b) => Math.abs(a.x - state.player.x) - Math.abs(b.x - state.player.x))[0];
    let direction = 1;
    if (target) {
      const dx = target.x - state.player.x;
      // Production ordinary enemies have 42-115 HP, so maxHealth is not a
      // boss discriminator. Using it made the QA driver stand still inside
      // every rifleman's attack range and falsely reported the build as
      // unplayable after the production balance table was wired at runtime.
      const boss = target.isBoss === true;
      if (boss && Math.abs(dx) < 360) direction = -Math.sign(dx || 1);
      else if (boss && Math.abs(dx) <= 480) direction = 0;
      // Keep ordinary combat mobile without running directly through every
      // contact collider. Alternate approach/retreat inside rifle auto-aim
      // range; this exercises actual run-and-gun evasion instead of either
      // camping motionless or face-tanking at melee distance.
      else if (Math.abs(dx) < 220) direction = -Math.sign(dx || 1);
      else if (Math.abs(dx) > 430) direction = Math.sign(dx);
      else direction = Math.floor(state.elapsedMs / 360) % 2 === 0 ? -Math.sign(dx || 1) : Math.sign(dx || 1);
    }
    await setDirection(direction);

    const now = Date.now();
    if (now - lastJumpAt >= 820) {
      await page.keyboard.press('Space');
      lastJumpAt = now;
    }
    const denseWave = state.encounter.alive >= 4;
    const bossWave = Boolean(state.encounter.boss);
    if ((denseWave || bossWave) && now - lastGrenadeAt >= 3200) {
      await page.keyboard.press('KeyK');
      lastGrenadeAt = now;
    }
    if (now - lastSampleAt >= 1000) {
      samples.push(state);
      lastSampleAt = now;
    }
    if (now - lastProgressLogAt >= 5000) {
      console.log(`[fullplay] t=${(state.elapsedMs / 1000).toFixed(1)}s x=${state.player.x.toFixed(1)} encounter=${state.encounter.id} alive=${state.encounter.alive} hp=${state.player.health}`);
      lastProgressLogAt = now;
    }
    await page.waitForTimeout(120);
  }

  await setDirection(0);
  await page.keyboard.up('KeyJ');
  if (finalState) await page.screenshot({ path: path.join(OUT, `${runId}-result.png`) });
  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  await browser.close();

  const failures = [];
  if (!finalState) failures.push('Result scene was not reached within 240 seconds');
  if (finalState && !finalState.result?.cleared) failures.push(`Run ended without clear: ${finalState.result?.reason ?? 'unknown'}`);
  failures.push(...browserErrors);
  const report = {
    generatedAt: new Date().toISOString(),
    runId,
    baseUrl,
    viewport: `${width}x${height}`,
    controlPolicy: 'real keyboard events only; no debug teleport/advance or runtime state mutation',
    debugStateMutationUsed: false,
    durationWallMs: Date.now() - startedAt,
    encounterTransitions,
    finalState,
    sampleCount: samples.length,
    samples,
    video: videoPath ? path.relative(ROOT, videoPath) : null,
    browserErrors,
    failures,
    ok: failures.length === 0,
  };
  const reportPath = path.join(OUT, `fullplay-input-report-${runId}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, durationWallMs: report.durationWallMs, transitions: encounterTransitions, result: finalState?.result ?? null, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
