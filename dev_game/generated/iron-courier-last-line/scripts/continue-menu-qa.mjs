#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-11', 'continue-menu');
const KEY = 'iron_courier_last_line_save_v1';
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';
const checkpoint = {
  version: 1,
  stageId: 'burning-harbor',
  encounterIndex: 3,
  encounterId: 'warehouse',
  segmentName: '다층 창고',
  checkpointX: 5940,
  score: 4321,
  elapsedMs: 87000,
  playerHealth: 64,
  weapons: { currentWeapon: 'shotgun', ammo: { rifle: null, shotgun: 12, rocket: 0, grenade: 5 }, grenades: 3 },
  rescues: { total: 2, byType: { technician: 1, medic: 1, artillery: 0 } },
  transport: { x: 8260, health: 460 },
  escort: { active: true, completed: false, progress: 0 },
  collectedPickups: ['2580:shotgun'],
  savedAt: '2026-07-17T00:00:00.000Z',
};

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

function assert(condition, message, failures) { if (!condition) failures.push(message); }

async function waitScene(page, scene) {
  await page.waitForFunction((key) => window.__GAME_LAYOUT_BOUNDS__?.scene === key, scene, { timeout: 30000 });
  await page.waitForTimeout(180);
}

async function clickLayout(page, id) {
  const point = await page.evaluate((targetId) => {
    const item = window.__GAME_LAYOUT_BOUNDS__?.items?.find((entry) => entry.id === targetId);
    return item ? { x: item.x + item.width / 2, y: item.y + item.height / 2 } : null;
  }, id);
  if (!point) throw new Error(`Layout item not found: ${id}`);
  await page.mouse.click(point.x, point.y);
}

async function seedCheckpoint(page) {
  await page.evaluate(({ key, value }) => {
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(key, JSON.stringify({ best: 9876, clears: 0, muted: false, ...current, continueRun: value }));
    window.__GAME__.scene.stop('Home');
    window.__GAME__.scene.start('Home');
  }, { key: KEY, value: checkpoint });
  await waitScene(page, 'Home');
}

async function homeState(page) {
  return page.evaluate(() => {
    const home = window.__GAME__.scene.getScene('Home');
    const layout = window.__GAME_LAYOUT_BOUNDS__;
    const item = layout.items.find((entry) => entry.id === 'home-continue');
    return {
      scene: layout.scene,
      continueVisible: item?.visible,
      continueInteractive: item?.interactive,
      actionState: home.continueButton?.bg?.getData('actionState'),
      checkpoint: home.continueButton?.bg?.getData('checkpoint') ?? null,
      label: home.continueButton?.text?.text,
      bestText: home.best?.text,
      clipped: layout.clipped,
      overlaps: layout.overlaps,
      containmentFailures: layout.containmentFailures ?? [],
    };
  });
}

async function gameState(page) {
  return page.evaluate((key) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const current = scene.core.encounters.current;
    const rescues = scene.core.rescues.group.getChildren();
    const pickup = scene.weaponPickups.getChildren().find((box) => box.getData('pickupKey') === '2580:shotgun');
    const saved = JSON.parse(localStorage.getItem(key) || '{}').continueRun;
    return {
      encounterIndex: scene.core.encounters.currentIndex,
      encounterId: current?.definition?.id,
      alive: current?.alive,
      x: scene.core.player.x,
      health: scene.core.player.health,
      score: scene.score,
      elapsedMs: scene.elapsedMs,
      weapons: scene.core.weapons.snapshot(),
      rescues: scene.core.rescues.snapshot(),
      hiddenRescues: rescues.filter((target) => !target.active && target.rescued).map((target) => target.rescueType).sort(),
      shotgunPickupActive: pickup?.active,
      transportHealth: scene.core.transport.health,
      savedEncounterIndex: saved?.encounterIndex ?? null,
    };
  }, KEY);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const failures = [];
  const evidence = {};
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await context.addInitScript(() => localStorage.clear());
    const page = await context.newPage();
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
    await page.goto(`${baseUrl}/?continueQa=${Date.now()}`, { waitUntil: 'networkidle' });
    await waitScene(page, 'Home');

    evidence.emptyHome = await homeState(page);
    await page.screenshot({ path: path.join(OUT, '01-empty-disabled-1280x720.png') });
    assert(evidence.emptyHome.continueVisible, 'Continue menu is not visible without a checkpoint.', failures);
    assert(!evidence.emptyHome.continueInteractive && evidence.emptyHome.actionState === 'disabled', 'Continue menu is not disabled without a checkpoint.', failures);

    await clickLayout(page, 'home-play');
    await waitScene(page, 'Game');
    await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}').continueRun?.encounterIndex === 0, KEY);
    evidence.newRunCheckpoint = await gameState(page);
    assert(evidence.newRunCheckpoint.encounterIndex === 0 && evidence.newRunCheckpoint.savedEncounterIndex === 0, 'New run did not create the shore-entry checkpoint.', failures);

    await page.keyboard.press('Escape');
    await waitScene(page, 'Pause');
    await clickLayout(page, 'pause-retreat');
    await waitScene(page, 'Home');
    evidence.retreatHome = await homeState(page);
    assert(evidence.retreatHome.continueInteractive && evidence.retreatHome.actionState === 'enabled', 'Retreat did not enable Continue.', failures);

    await seedCheckpoint(page);
    evidence.savedHome = await homeState(page);
    await page.screenshot({ path: path.join(OUT, '02-saved-enabled-1280x720.png') });
    assert(evidence.savedHome.continueInteractive && evidence.savedHome.checkpoint === 'warehouse', 'Saved checkpoint did not enable the warehouse Continue action.', failures);
    assert(evidence.savedHome.bestText.includes('체크포인트 다층 창고'), 'Checkpoint name is not shown on Home.', failures);

    await page.setViewportSize({ width: 568, height: 320 });
    await page.waitForTimeout(220);
    evidence.savedHomeCompact = await homeState(page);
    await page.screenshot({ path: path.join(OUT, '03-saved-enabled-568x320.png') });
    assert(!evidence.savedHomeCompact.clipped.length && !evidence.savedHomeCompact.overlaps.length && !evidence.savedHomeCompact.containmentFailures.length, 'Compact Continue layout has clipping/overlap/containment errors.', failures);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(220);
    await clickLayout(page, 'home-continue');
    await waitScene(page, 'Game');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game')?.core?.encounters?.currentIndex === 3);
    await page.waitForTimeout(250);
    evidence.resumedGame = await gameState(page);
    await page.screenshot({ path: path.join(OUT, '04-resumed-warehouse-1280x720.png') });
    assert(evidence.resumedGame.encounterId === 'warehouse' && Math.abs(evidence.resumedGame.x - 5940) < 12, 'Continue did not restore the warehouse checkpoint position.', failures);
    assert(evidence.resumedGame.health === 64 && evidence.resumedGame.score === 4321 && evidence.resumedGame.elapsedMs >= 87000, 'Continue did not restore player/run values.', failures);
    assert(evidence.resumedGame.weapons.currentWeapon === 'shotgun' && evidence.resumedGame.weapons.ammo.shotgun === 12 && evidence.resumedGame.weapons.grenades === 3, 'Continue did not restore weapon state.', failures);
    assert(evidence.resumedGame.rescues.total === 2 && evidence.resumedGame.hiddenRescues.join(',') === 'medic,technician', 'Continue did not restore rescued NPC state.', failures);
    assert(evidence.resumedGame.shotgunPickupActive === false && evidence.resumedGame.transportHealth === 460, 'Continue did not restore pickup/transport state.', failures);

    await page.evaluate(() => window.__GAME__.scene.getScene('Game').finish(true, '이어하기 QA 완료'));
    await waitScene(page, 'GameOver');
    assert(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').continueRun == null, KEY), 'Mission clear did not clear Continue checkpoint.', failures);
    await clickLayout(page, 'home-action');
    await waitScene(page, 'Home');
    evidence.clearedHome = await homeState(page);
    await page.screenshot({ path: path.join(OUT, '05-clear-disabled-1280x720.png') });
    assert(!evidence.clearedHome.continueInteractive && evidence.clearedHome.actionState === 'disabled', 'Continue remained enabled after mission clear.', failures);
    assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join(' | ')}`, failures);
    evidence.browserErrors = browserErrors;
    await context.close();
  } finally {
    await browser.close();
  }
  const report = { generatedAt: new Date().toISOString(), baseUrl, evidence, failures, ok: failures.length === 0 };
  const reportPath = path.join(OUT, 'continue-menu-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, failures, report: path.relative(ROOT, reportPath), screenshots: 5 }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
