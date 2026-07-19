#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-12', 'death-continue');
const KEY = 'iron_courier_last_line_save_v1';
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';
const checkpoint = {
  version: 1,
  stageId: 'burning-harbor',
  encounterIndex: 3,
  encounterId: 'warehouse',
  segmentName: '다층 창고',
  resumeKind: 'checkpoint',
  checkpointX: 5940,
  checkpointY: 520,
  score: 4321,
  elapsedMs: 87000,
  playerHealth: 64,
  weapons: { currentWeapon: 'shotgun', ammo: { rifle: null, shotgun: 12, rocket: 0 }, grenades: 3 },
  rescues: { total: 2, byType: { technician: 1, medic: 1, artillery: 0 } },
  transport: { x: 8260, health: 460 },
  escort: { active: true, completed: false, progress: 0 },
  collectedPickups: ['2580:shotgun'],
};

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

function assert(condition, message, failures) { if (!condition) failures.push(message); }

async function waitScene(page, key) {
  await page.waitForFunction((sceneKey) => window.__GAME_LAYOUT_BOUNDS__?.scene === sceneKey, key, { timeout: 30000 });
  await page.waitForTimeout(160);
}

async function clickLayout(page, id) {
  const point = await page.evaluate((targetId) => {
    const item = window.__GAME_LAYOUT_BOUNDS__?.items?.find((entry) => entry.id === targetId);
    return item ? { x: item.x + item.width / 2, y: item.y + item.height / 2 } : null;
  }, id);
  if (!point) throw new Error(`Layout item not found: ${id}`);
  await page.mouse.click(point.x, point.y);
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
    await page.goto(`${baseUrl}/?deathContinueQa=${Date.now()}`, { waitUntil: 'networkidle' });
    await waitScene(page, 'Home');

    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify({ best: 0, clears: 0, muted: true, continueRun: value }));
      window.__GAME__.scene.stop('Home');
      window.__GAME__.scene.start('Game', { mode: 'continue' });
    }, { key: KEY, value: checkpoint });
    await waitScene(page, 'Game');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game')?.core?.encounters?.currentIndex === 3);

    evidence.beforeDeath = await page.evaluate(() => {
      const scene = window.__GAME__.scene.getScene('Game');
      const actors = scene.core.encounters.current.spawned;
      const wounded = actors[0];
      const defeated = actors[1];
      wounded.takeDamage(Math.max(1, Math.floor(wounded.maxHealth * 0.4)), scene.core.player);
      defeated.takeDamage(defeated.maxHealth * 10, null);
      scene.core.player.body.reset(6812, scene.core.player.y);
      scene.core.player.setVelocity(0, 0);
      const before = {
        x: scene.core.player.x,
        y: scene.core.player.y,
        woundedHealth: wounded.health,
        defeatedHealth: defeated.health,
        alive: scene.core.encounters.current.alive,
        weapon: scene.core.weapons.currentWeapon,
        ammo: scene.core.weapons.ammo.shotgun,
      };
      scene.core.player.takeDamage(scene.core.player.maxHealth + 100, wounded);
      return before;
    });

    await waitScene(page, 'GameOver');
    evidence.failurePopup = await page.evaluate((key) => {
      const scene = window.__GAME__.scene.getScene('GameOver');
      const save = JSON.parse(localStorage.getItem(key) || '{}').continueRun;
      const layout = window.__GAME_LAYOUT_BOUNDS__;
      return {
        title: scene.stamp?.text,
        reason: scene.reasonText?.text,
        primaryLabel: scene.retry?.text?.text,
        actionType: scene.retry?.bg?.getData('actionType'),
        resumeKind: save?.resumeKind,
        checkpointX: save?.checkpointX,
        checkpointY: save?.checkpointY,
        savedHealth: save?.playerHealth,
        actors: save?.encounterActors,
        overlaps: layout?.overlaps ?? [],
        clipped: layout?.clipped ?? [],
        containmentFailures: layout?.containmentFailures ?? [],
      };
    }, KEY);
    await page.screenshot({ path: path.join(OUT, '01-mission-failed-continue-1280x720.png') });

    assert(evidence.failurePopup.title === 'MISSION FAILED', 'Death did not open the MISSION FAILED popup.', failures);
    assert(evidence.failurePopup.primaryLabel === '이어서 하기' && evidence.failurePopup.actionType === 'continue', 'Failure primary action is not Continue.', failures);
    assert(evidence.failurePopup.resumeKind === 'death', 'Death was not persisted as a death-position continuation.', failures);
    assert(Math.abs(evidence.failurePopup.checkpointX - evidence.beforeDeath.x) < 2 && Math.abs(evidence.failurePopup.checkpointY - evidence.beforeDeath.y) < 2, 'Saved continuation position differs from the death position.', failures);
    assert(evidence.failurePopup.savedHealth === 100, 'Death continuation did not prepare full player health.', failures);
    assert(evidence.failurePopup.actors?.[0]?.health === evidence.beforeDeath.woundedHealth && evidence.failurePopup.actors?.[1]?.health === 0, 'Encounter actor state was not saved at death.', failures);
    assert(!evidence.failurePopup.overlaps.length && !evidence.failurePopup.clipped.length && !evidence.failurePopup.containmentFailures.length, 'Failure popup has layout defects.', failures);

    await clickLayout(page, 'retry-action');
    await waitScene(page, 'Game');
    evidence.resumed = await page.evaluate((key) => {
      const scene = window.__GAME__.scene.getScene('Game');
      const actors = scene.core.encounters.current.spawned;
      const save = JSON.parse(localStorage.getItem(key) || '{}').continueRun;
      return {
        encounterIndex: scene.core.encounters.currentIndex,
        encounterId: scene.core.encounters.current.definition.id,
        x: scene.core.player.x,
        y: scene.core.player.y,
        health: scene.core.player.health,
        maxHealth: scene.core.player.maxHealth,
        invulnerabilityRemaining: scene.core.player.invulnerableUntil - scene.time.now,
        weapon: scene.core.weapons.currentWeapon,
        ammo: scene.core.weapons.ammo.shotgun,
        woundedHealth: actors[0]?.health,
        defeatedActive: actors[1]?.active,
        defeatedVisible: actors[1]?.visible,
        alive: scene.core.encounters.current.alive,
        resumeKindStillSaved: save?.resumeKind,
      };
    }, KEY);
    await page.screenshot({ path: path.join(OUT, '02-resumed-at-death-position-1280x720.png') });

    assert(evidence.resumed.encounterIndex === 3 && evidence.resumed.encounterId === 'warehouse', 'Continue did not reopen the same encounter.', failures);
    assert(Math.abs(evidence.resumed.x - evidence.beforeDeath.x) < 18 && Math.abs(evidence.resumed.y - evidence.beforeDeath.y) < 18, 'Continue did not restore the death position.', failures);
    assert(evidence.resumed.health === evidence.resumed.maxHealth && evidence.resumed.invulnerabilityRemaining > 1200, 'Continue did not restore full health and temporary invulnerability.', failures);
    assert(evidence.resumed.weapon === evidence.beforeDeath.weapon && evidence.resumed.ammo === evidence.beforeDeath.ammo, 'Continue did not preserve weapon state.', failures);
    assert(evidence.resumed.woundedHealth === evidence.beforeDeath.woundedHealth && !evidence.resumed.defeatedActive && !evidence.resumed.defeatedVisible, 'Continue reset current enemy progress.', failures);
    assert(evidence.resumed.resumeKindStillSaved === 'death', 'Encounter start overwrote the saved death position.', failures);
    assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join(' | ')}`, failures);
    evidence.browserErrors = browserErrors;
    await context.close();
  } finally {
    await browser.close();
  }

  const report = { generatedAt: new Date().toISOString(), baseUrl, evidence, failures, ok: failures.length === 0 };
  const reportPath = path.join(OUT, 'death-continue-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, failures, report: path.relative(ROOT, reportPath), screenshots: 2 }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
