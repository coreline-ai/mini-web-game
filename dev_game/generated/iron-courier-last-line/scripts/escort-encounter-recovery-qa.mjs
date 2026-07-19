#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/qa/encounter-escort');
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';

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

async function startGame(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home');
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game' && window.__IRON_COURIER_DEBUG__?.get);
}

async function escortChecks(page) {
  const beforeAhead = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enforceEncounterGate = () => {};
    scene.core.player.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const escort = scene.core.escort;
    escort.threatProvider = () => false;
    const transport = scene.core.transport;
    transport.body.reset(escort.startX, transport.y);
    scene.core.player.body.reset(escort.startX + 1290, scene.core.player.y);
    escort.update();
    return escort.snapshot();
  });
  await page.waitForTimeout(1800);
  const afterAhead = await page.evaluate(() => window.__GAME__.scene.getScene('Game').core.escort.snapshot());

  const lagPaused = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const escort = scene.core.escort;
    scene.core.player.body.reset(scene.core.transport.x - escort.maxLag - 80, scene.core.player.y);
    escort.threatProvider = () => false;
    escort.update();
    return escort.snapshot();
  });

  const threatPaused = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const escort = scene.core.escort;
    scene.core.player.body.reset(scene.core.transport.x + 80, scene.core.player.y);
    escort.threatProvider = () => true;
    escort.update();
    return escort.snapshot();
  });

  return { beforeAhead, afterAhead, lagPaused, threatPaused };
}

async function encounterChecks(page) {
  await startGame(page);
  const stuckSetup = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enforceEncounterGate = () => {};
    scene.core.player.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const encounters = scene.core.encounters;
    encounters.stuckTimeoutMs = 450;
    encounters.offscreenRearGraceMs = 10000;
    encounters.recoveryCooldownMs = 250;
    encounters.recoveryHistory.length = 0;
    encounters.recoveryCount = 0;
    encounters.current.spawned.forEach((candidate) => encounters.actorMonitors.set(candidate, encounters.createActorMonitor(candidate)));
    const actor = encounters.current.spawned.find((candidate) => candidate.role);
    actor.setData('__qaRecoveryTag', 'stuck');
    scene.core.player.body.reset(1400, scene.core.player.y);
    actor.body.reset(500, actor.y);
    actor.body.moves = false;
    return { alive: encounters.current.alive, health: actor.health, x: actor.x, snapshot: encounters.snapshot() };
  });
  await page.waitForTimeout(850);
  const stuckRecovered = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const actor = scene.core.encounters.current?.spawned.find((candidate) => candidate.getData?.('__qaRecoveryTag') === 'stuck');
    if (!actor) return { missingActor: true, activeScene: window.__GAME_LAYOUT_BOUNDS__?.scene, snapshot: scene.core.encounters.snapshot() };
    if (actor.body) actor.body.moves = true;
    return { alive: scene.core.encounters.current.alive, health: actor.health, x: actor.x, snapshot: scene.core.encounters.snapshot() };
  });

  const rearSetup = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const encounters = scene.core.encounters;
    encounters.stuckTimeoutMs = 10000;
    encounters.offscreenRearGraceMs = 400;
    encounters.offscreenRearDistance = 1000;
    encounters.gateProximity = 160;
    const actor = encounters.current.spawned.find((candidate) => candidate.role && candidate.getData?.('__qaRecoveryTag') !== 'stuck');
    actor.setData('__qaRecoveryTag', 'rear');
    scene.core.player.body.reset(encounters.current.definition.gateX, scene.core.player.y);
    scene.cameras.main.stopFollow();
    scene.cameras.main.scrollX = 1100;
    actor.body.reset(200, actor.y);
    actor.body.moves = true;
    const monitor = encounters.actorMonitors.get(actor);
    Object.assign(monitor, { anchorX: actor.x, anchorY: actor.y, anchorAt: scene.time.now, offscreenRearSince: null, offscreenRearForMs: 0 });
    return { alive: encounters.current.alive, health: actor.health, x: actor.x, snapshot: encounters.snapshot() };
  });
  await page.waitForTimeout(750);
  const rearRecovered = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const actor = scene.core.encounters.current?.spawned.find((candidate) => candidate.getData?.('__qaRecoveryTag') === 'rear');
    if (!actor) return { missingActor: true, activeScene: window.__GAME_LAYOUT_BOUNDS__?.scene, snapshot: scene.core.encounters.snapshot() };
    return { alive: scene.core.encounters.current.alive, health: actor.health, x: actor.x, snapshot: scene.core.encounters.snapshot() };
  });

  const bossGuard = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const encounters = scene.core.encounters;
    const boss = encounters.spawnBoss('crane', 1200, 460, {}, false);
    const before = { x: boss.x, health: boss.health };
    const attempted = encounters.recoverActor(boss, {}, 'qa-boss-guard', scene.time.now);
    const after = { x: boss.x, health: boss.health };
    boss.destroy();
    encounters.bosses = encounters.bosses.filter((candidate) => candidate !== boss);
    return { attempted, before, after };
  });

  return { stuckSetup, stuckRecovered, rearSetup, rearRecovered, bossGuard };
}

async function warehouseCheck(page) {
  await startGame(page);
  const before = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.player.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const encounters = scene.core.encounters;
    for (let guard = 0; encounters.currentIndex < 3 && guard < 8; guard += 1) {
      if (encounters.current?.pending) encounters.activateCurrent(true);
      encounters.current.spawned.forEach((actor) => actor.active && actor.takeDamage?.(99999, scene.core.player));
      encounters.update(scene.time.now + 10000, 16);
    }
    if (encounters.currentIndex !== 3) throw new Error(`Unable to reach warehouse encounter; index=${encounters.currentIndex}`);
    if (encounters.current?.pending) encounters.activateCurrent(true);
    const shield = encounters.current.spawned.find((actor) => actor.role === 'shield');
    encounters.current.spawned.forEach((actor) => { if (actor !== shield) actor.active && actor.takeDamage?.(99999, scene.core.player); });
    shield.setData('__qaRecoveryTag', 'warehouse-shield');
    shield.body.reset(6243, shield.y);
    scene.core.player.body.reset(encounters.current.definition.gateX, scene.core.player.y);
    scene.cameras.main.stopFollow();
    scene.cameras.main.scrollX = 7500;
    encounters.actorMonitors.set(shield, encounters.createActorMonitor(shield));
    return {
      id: encounters.current.definition.id,
      alive: encounters.current.alive,
      health: shield.health,
      x: shield.x,
      snapshot: encounters.snapshot(),
    };
  });
  await page.waitForTimeout(2400);
  const after = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const encounters = scene.core.encounters;
    const shield = encounters.current?.spawned.find((actor) => actor.getData?.('__qaRecoveryTag') === 'warehouse-shield');
    if (!shield) return { missingActor: true, currentId: encounters.current?.definition?.id ?? null, snapshot: encounters.snapshot() };
    return {
      id: encounters.current.definition.id,
      alive: encounters.current.alive,
      health: shield.health,
      x: shield.x,
      snapshot: encounters.snapshot(),
    };
  });
  return { before, after };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });

  await startGame(page);
  const escort = await escortChecks(page);
  const encounter = await encounterChecks(page);
  const warehouse = await warehouseCheck(page);

  const failures = [];
  const aheadTravel = escort.afterAhead.transportX - escort.beforeAhead.transportX;
  if (aheadTravel < 70) failures.push(`ATLAS did not catch up to leading player: travel=${aheadTravel.toFixed(2)}px`);
  if (escort.afterAhead.movementState !== 'catching-up' || escort.afterAhead.pauseReason !== null || escort.afterAhead.commandedVelocityX <= 0) failures.push('leading-player state did not remain catching-up');
  if (escort.lagPaused.pauseReason !== 'player-behind' || escort.lagPaused.movementState !== 'paused-player-lag' || escort.lagPaused.commandedVelocityX !== 0) failures.push('rear player lag did not pause ATLAS with explicit reason');
  if (escort.threatPaused.pauseReason !== 'threatened' || escort.threatPaused.movementState !== 'paused-threat' || escort.threatPaused.commandedVelocityX !== 0) failures.push('nearby threat did not pause ATLAS with explicit reason');

  const stuckEvents = encounter.stuckRecovered.snapshot.recoveryHistory.filter((entry) => entry.reason === 'commanded-stuck');
  if (!stuckEvents.length || encounter.stuckRecovered.x <= encounter.stuckSetup.x + 200) failures.push('commanded-but-stuck enemy was not recovered toward combat');
  if (encounter.stuckRecovered.alive !== encounter.stuckSetup.alive || encounter.stuckRecovered.health !== encounter.stuckSetup.health) failures.push('stuck recovery changed encounter alive count or enemy health');
  const rearEvents = encounter.rearRecovered.snapshot.recoveryHistory.filter((entry) => entry.reason === 'offscreen-rear');
  if (!rearEvents.length || encounter.rearRecovered.x <= encounter.rearSetup.x + 500) failures.push('offscreen rear gate blocker was not recovered toward combat');
  if (encounter.rearRecovered.alive !== encounter.rearSetup.alive || encounter.rearRecovered.health !== encounter.rearSetup.health) failures.push('rear recovery changed encounter alive count or enemy health');
  if (encounter.bossGuard.attempted || encounter.bossGuard.before.x !== encounter.bossGuard.after.x || encounter.bossGuard.before.health !== encounter.bossGuard.after.health) failures.push('boss was modified by ordinary-enemy recovery guard');
  if (warehouse.before.id !== 'warehouse' || warehouse.after.id !== 'warehouse') failures.push(`warehouse targeted setup failed: ${warehouse.before.id}/${warehouse.after.id}`);
  if (warehouse.after.x <= warehouse.before.x + 100) failures.push(`warehouse shield remained behind gate: ${warehouse.before.x} -> ${warehouse.after.x}`);
  if (warehouse.after.alive !== warehouse.before.alive || warehouse.after.health !== warehouse.before.health) failures.push('warehouse recovery changed alive count or shield health');
  if (browserErrors.length) failures.push(...browserErrors);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    ok: failures.length === 0,
    failures,
    browserErrors,
    summary: { aheadTravel, recoveryCount: encounter.rearRecovered.snapshot.recoveryCount, warehouseShieldTravel: warehouse.after.x - warehouse.before.x },
    escort,
    encounter,
    warehouse,
  };
  const reportPath = path.join(OUT, 'encounter-escort-recovery.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify({ ok: report.ok, failures, summary: report.summary, report: path.relative(ROOT, reportPath) }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
