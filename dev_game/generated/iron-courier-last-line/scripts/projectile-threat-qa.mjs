#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-06', 'stage1-agent');
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  return import(pathToFileURL(path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
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
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const evidence = window.__PROJECTILE_THREAT_QA__ = { fired: [], samples: [], impacts: [], damage: [] };
    scene.core.pool.on('fired', (projectile) => {
      if (projectile.faction !== 'enemy') return;
      const record = {
        weaponId: projectile.weaponId, firedAt: scene.elapsedMs, x: projectile.x, y: projectile.y,
        vx: projectile.body?.velocity?.x ?? null, vy: projectile.body?.velocity?.y ?? null,
        body: projectile.body ? { x: projectile.body.x, y: projectile.body.y, width: projectile.body.width, height: projectile.body.height, bottom: projectile.body.bottom } : null,
        display: { width: projectile.displayWidth, height: projectile.displayHeight, depth: projectile.depth },
      };
      evidence.fired.push(record);
      scene.time.delayedCall(120, () => evidence.samples.push({ weaponId: record.weaponId, ageMs: 120, active: projectile.active, x: projectile.x, y: projectile.y }));
      scene.time.delayedCall(600, () => evidence.samples.push({ weaponId: record.weaponId, ageMs: 600, active: projectile.active, x: projectile.x, y: projectile.y }));
    });
    scene.core.pool.on('impact', ({ projectile, target }) => evidence.impacts.push({ at: scene.elapsedMs, weaponId: projectile.weaponId, target: target === scene.core.player ? 'Player' : target.constructor?.name, x: projectile.x, y: projectile.y }));
    scene.core.player.on('damaged', ({ amount, health, source }) => evidence.damage.push({ at: scene.elapsedMs, amount, health, source: source?.constructor?.name, weaponId: source?.weaponId ?? null }));
  });

  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.x >= 380, null, { timeout: 5000 });
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(9000);
  const state = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return {
      player: { x: scene.core.player.x, y: scene.core.player.y, health: scene.core.player.health },
      enemies: scene.core.encounters.current.spawned.filter((actor) => actor.active).map((actor) => ({ x: actor.x, y: actor.y, state: actor.state, health: actor.health, nextAttackAt: actor.nextAttackAt, now: scene.time.now })),
      activeProjectiles: scene.core.pool.group.getChildren().filter((projectile) => projectile.active).map((projectile) => ({ faction: projectile.faction, weaponId: projectile.weaponId, x: projectile.x, y: projectile.y, body: { x: projectile.body.x, y: projectile.body.y, width: projectile.body.width, height: projectile.body.height } })),
      evidence: window.__PROJECTILE_THREAT_QA__, layout: window.__GAME_LAYOUT_BOUNDS__, elapsedMs: scene.elapsedMs,
    };
  });
  const screenshot = path.join(OUT, 'after-projectile-threat-probe.png');
  await page.screenshot({ path: screenshot });
  await context.close(); await browser.close();
  const projectileDamage = state.evidence.damage.filter((entry) => entry.weaponId);
  const failures = [];
  if (state.evidence.fired.length < 2) failures.push(`enemy fired only ${state.evidence.fired.length} projectile(s)`);
  if (state.evidence.impacts.filter((entry) => entry.target === 'Player').length < 2) failures.push('fewer than 2 enemy projectile impacts reached Player');
  if (projectileDamage.length < 2) failures.push(`only ${projectileDamage.length} projectile damage event(s)`);
  failures.push(...browserErrors);
  const report = { generatedAt: new Date().toISOString(), baseUrl, policy: 'real keyboard input; passive runtime observers; no debug/state mutation', state, browserErrors, failures, ok: failures.length === 0, screenshot: path.relative(ROOT, screenshot) };
  const reportPath = path.join(OUT, 'after-projectile-threat-probe.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), fired: state.evidence.fired.length, impacts: state.evidence.impacts.length, damage: state.evidence.damage, failures, ok: report.ok }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
