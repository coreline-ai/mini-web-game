#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const phaseIndex = process.argv.indexOf('--phase');
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : 'after';
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';
const OUT = path.join(ROOT, 'qa-captures', 'polish-04', 'traversability-agent');
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

async function enterGame(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get && window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
    scene.getGateState = () => ({ current: null, gateX: null, alive: 0, customGatePassed: true, locked: false });
    scene.enforceEncounterGate = () => {};
  });
  return canvas;
}

async function resetPlayer(page, x, y = 520) {
  await page.evaluate(({ x, y }) => {
    const player = window.__GAME__.scene.getScene('Game').core.player;
    player.setPosition(x, y);
    player.body.reset(x, y);
    player.setVelocity(0, 0);
  }, { x, y });
  await page.waitForTimeout(280);
}

async function actorSample(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const player = scene.core.player;
    return {
      x: player.x,
      y: player.y,
      vx: player.body.velocity.x,
      vy: player.body.velocity.y,
      body: { left: player.body.left, right: player.body.right, top: player.body.top, bottom: player.body.bottom },
      blocked: { ...player.body.blocked },
      touching: { ...player.body.touching },
      terrain: scene.terrainArt.snapshot(),
    };
  });
}

async function testPlatformTraversal(page, platform, direction) {
  const movingRight = direction === 1;
  await resetPlayer(page, movingRight ? platform.left - 150 : platform.right + 150);
  const before = await actorSample(page);
  const key = movingRight ? 'KeyD' : 'KeyA';
  await page.keyboard.down(key);
  await page.keyboard.press('Space');
  const sideBlockedSamples = [];
  for (let index = 0; index < 7; index += 1) {
    await page.waitForTimeout(220);
    const sample = await actorSample(page);
    sideBlockedSamples.push({
      x: sample.x,
      sideBlocked: movingRight
        ? sample.blocked.right || sample.touching.right
        : sample.blocked.left || sample.touching.left,
    });
  }
  await page.keyboard.up(key);
  const after = await actorSample(page);
  return {
    platform,
    direction: movingRight ? 'left-to-right' : 'right-to-left',
    before,
    after,
    deltaX: after.x - before.x,
    clearedEntryEdge: movingRight
      ? after.body.left > platform.left + 64
      : after.body.right < platform.right - 64,
    permanentSideBlock: sideBlockedSamples.slice(-4).every((sample) => sample.sideBlocked && Math.abs(sample.x - sideBlockedSamples.at(-1).x) < 1),
    sideBlockedSamples,
  };
}

async function testLanding(page, platform) {
  await resetPlayer(page, platform.centerX, platform.surfaceY - 180);
  await page.waitForTimeout(700);
  const sample = await actorSample(page);
  return {
    platform: platform.id,
    surfaceY: platform.surfaceY,
    sample,
    landedOnTop: Math.abs(sample.body.bottom - platform.surfaceY) <= 2.5 && (sample.blocked.down || sample.touching.down),
  };
}

async function testWarehouseShield(page) {
  const identity = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((actor) => actor.destroy());
    scene.core.encounters.begin(3);
    const spawned = scene.core.encounters.current.spawned;
    const shield = spawned.find((actor) => actor.role === 'shield');
    spawned.filter((actor) => actor !== shield).forEach((actor) => actor.disableBody?.(true, true));
    const player = scene.core.player;
    player.setPosition(7900, 520);
    player.body.reset(7900, 520);
    shield.setData('_qaWarehouseShield', true);
    return { encounter: scene.core.encounters.current.definition.id, startX: shield.x, targetX: player.x };
  });
  const samples = [];
  for (let index = 0; index < 12; index += 1) {
    await page.waitForTimeout(250);
    samples.push(await page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const shield = scene.core.encounters.enemyGroup.getChildren().find((actor) => actor.getData?.('_qaWarehouseShield'));
      return { x: shield.x, y: shield.y, vx: shield.body.velocity.x, blockedRight: shield.body.blocked.right, state: shield.state };
    }));
  }
  let maxCommandedStuckMs = 0;
  let currentStuckMs = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const requested = Math.abs(samples[index].vx) >= 10;
    const moved = Math.abs(samples[index].x - samples[index - 1].x) >= 1;
    currentStuckMs = requested && !moved ? currentStuckMs + 250 : 0;
    maxCommandedStuckMs = Math.max(maxCommandedStuckMs, currentStuckMs);
  }
  return {
    ...identity,
    samples,
    deltaX: samples.at(-1).x - identity.startX,
    maxCommandedStuckMs,
    approachesTarget: samples.at(-1).x > identity.startX + 24,
    stuck: maxCommandedStuckMs >= 1000,
  };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await enterGame(page);
  const platformDefs = await page.evaluate(() => window.__GAME__.scene.getScene('Game').terrainArt.snapshot().platforms);

  const traversals = [];
  for (const platform of platformDefs) {
    traversals.push(await testPlatformTraversal(page, platform, 1));
    traversals.push(await testPlatformTraversal(page, platform, -1));
  }
  const landingPlatform = platformDefs.find((platform) => platform.id === 'warehouse-entry') ?? platformDefs[0];
  const landing = await testLanding(page, landingPlatform);
  const warehouse = await testWarehouseShield(page);
  const screenshot = path.join(OUT, `${phase}-warehouse-shield.png`);
  await page.screenshot({ path: screenshot });
  await context.close();
  await browser.close();

  const failures = [];
  for (const traversal of traversals) {
    const label = `${traversal.platform.id}/${traversal.direction}`;
    if (!traversal.clearedEntryEdge) failures.push(`${label}: failed to pass elevated-platform entry edge (x=${traversal.after.x.toFixed(1)})`);
    if (traversal.permanentSideBlock) failures.push(`${label}: permanent side block at x=${traversal.after.x.toFixed(1)}`);
  }
  if (!landing.landedOnTop) failures.push(`${landing.platform}: one-way top landing failed (bottom=${landing.sample.body.bottom.toFixed(1)}, surface=${landing.surfaceY})`);
  if (!warehouse.approachesTarget || warehouse.stuck) failures.push(`warehouse shield stuck: delta=${warehouse.deltaX.toFixed(1)}, maxCommandedStuckMs=${warehouse.maxCommandedStuckMs}`);
  failures.push(...browserErrors);

  const report = {
    generatedAt: new Date().toISOString(), phase, baseUrl,
    contract: { platformCollision: 'ground-solid + elevated-top-only', allPlatformCount: platformDefs.length, maxCommandedStuckMs: 750 },
    traversals, landing, warehouse, browserErrors,
    screenshot: path.relative(ROOT, screenshot), failures, ok: failures.length === 0,
  };
  const reportPath = path.join(OUT, `${phase}-traversability-report.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, failures }, null, 2));
  if (phase !== 'before' && failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
