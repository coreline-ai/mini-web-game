#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'grenade-throw-distance');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME ?? '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function enterGame(page) {
  await page.goto(`${baseUrl}/?qa=grenade-throw-distance`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.waitForTimeout(350);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  await enterGame(page);

  const setup = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.player.invulnerableUntil = Infinity;
    scene.core.encounters.update = () => {};
    scene.enforceEncounterGate = () => {};
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    const player = scene.core.player;
    const groundY = scene.terrainArt.snapshot().walkSurfaceY;
    const offset = player.body.bottom - player.y;
    player.body.reset(1450, groundY - offset);
    player.setVelocity(0, 0);
    player.facing = 1;
    player.aim.set(1, 0);
    scene.core.weapons.grenades = 99;
    scene.core.weapons.nextGrenadeByOwner = new WeakMap();
    scene.cameras.main.stopFollow();
    scene.cameras.main.centerOn(1760, 360);
    window.__GRENADE_DISTANCE_QA__ = { launch: null, samples: [], blasts: [], expires: [] };
    scene.core.weapons.on('grenadeThrown', (event) => {
      window.__GRENADE_DISTANCE_QA__.launch = {
        at: scene.time.now,
        muzzle: event.muzzle,
        spawn: event.spawn,
        velocity: event.velocity,
        highArc: event.highArc,
      };
      event.projectile?.once('expired', (expired) => window.__GRENADE_DISTANCE_QA__.expires.push({ ...expired, at: scene.time.now }));
    });
    scene.core.pool.on('blast', (event) => {
      if (event.weaponId === 'grenade') window.__GRENADE_DISTANCE_QA__.blasts.push({ x: event.x, y: event.y, radius: event.radius, at: scene.time.now });
    });
    scene.events.on('postupdate', () => {
      const grenade = scene.core.pool.group.getChildren().find((item) => item.active && item.weaponId === 'grenade' && item.faction === 'player');
      if (!grenade) return;
      window.__GRENADE_DISTANCE_QA__.samples.push({
        at: scene.time.now,
        x: grenade.x,
        y: grenade.y,
        vx: grenade.body?.velocity?.x ?? 0,
        vy: grenade.body?.velocity?.y ?? 0,
        blockedDown: grenade.body?.blocked?.down ?? false,
        touchingDown: grenade.body?.touching?.down ?? false,
      });
    });
    return { playerX: player.x, playerY: player.y, groundY, grenadeConfig: { ...scene.core.weapons.weapons.grenade } };
  });

  await page.screenshot({ path: path.join(OUT, '01-before-throw-1280x720.png') });
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '02-forward-arc-1280x720.png') });
  await page.waitForTimeout(420);
  await page.screenshot({ path: path.join(OUT, '03-mid-arc-1280x720.png') });
  await page.waitForTimeout(420);
  await page.screenshot({ path: path.join(OUT, '04-bounce-roll-1280x720.png') });
  await page.waitForFunction(() => window.__GRENADE_DISTANCE_QA__.blasts.length > 0, null, { timeout: 1800 });
  await page.screenshot({ path: path.join(OUT, '05-fuse-explosion-1280x720.png') });

  const runtime = await page.evaluate(() => window.__GRENADE_DISTANCE_QA__);
  const launchX = runtime.launch?.spawn?.x ?? setup.playerX;
  const samples = runtime.samples;
  const apex = samples.reduce((best, sample) => !best || sample.y < best.y ? sample : best, null);
  let bounce = null;
  for (let i = 1; i < samples.length; i += 1) {
    if (samples[i - 1].vy > 80 && samples[i].vy < -20) { bounce = samples[i]; break; }
  }
  bounce ??= samples.find((sample) => sample.blockedDown || sample.touchingDown) ?? null;
  const blast = runtime.blasts[0] ?? null;
  const metrics = {
    launch: runtime.launch,
    launchSpeed: runtime.launch ? Math.hypot(runtime.launch.velocity.x, runtime.launch.velocity.y) : 0,
    apexRise: apex ? runtime.launch.spawn.y - apex.y : 0,
    apex,
    bounce,
    firstBounceDistance: bounce ? bounce.x - launchX : 0,
    blast,
    blastDistance: blast ? blast.x - launchX : 0,
    fuseDuration: blast && runtime.launch ? blast.at - runtime.launch.at : 0,
    expires: runtime.expires,
    sampleCount: samples.length,
  };
  const failures = [];
  if (!runtime.launch) failures.push('actual KeyK did not launch a grenade');
  if ((runtime.launch?.velocity?.x ?? 0) < 450) failures.push(`forward launch velocity too low: ${runtime.launch?.velocity?.x}`);
  if ((runtime.launch?.velocity?.y ?? 0) > -390) failures.push(`upward launch velocity too low: ${runtime.launch?.velocity?.y}`);
  if (metrics.apexRise < 60 || metrics.apexRise > 140) failures.push(`arc apex rise out of range: ${metrics.apexRise}`);
  if (metrics.firstBounceDistance < 300 || metrics.firstBounceDistance > 470) failures.push(`first landing distance out of visible range: ${metrics.firstBounceDistance}`);
  if (metrics.blastDistance < 360 || metrics.blastDistance > 560) failures.push(`fuse explosion distance out of visible range: ${metrics.blastDistance}`);
  if (metrics.fuseDuration < 1150 || metrics.fuseDuration > 1450) failures.push(`fuse duration out of range: ${metrics.fuseDuration}`);
  if (!runtime.expires.some((item) => item.reason === 'timeout')) failures.push(`grenade did not use timed fuse: ${JSON.stringify(runtime.expires)}`);
  if (errors.length) failures.push(...errors);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    ok: failures.length === 0,
    failures,
    errors,
    setup,
    metrics,
    screenshots: ['01-before-throw-1280x720.png', '02-forward-arc-1280x720.png', '03-mid-arc-1280x720.png', '04-bounce-roll-1280x720.png', '05-fuse-explosion-1280x720.png'],
  };
  await fs.writeFile(path.join(OUT, 'runtime-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, failures, metrics, screenshots: report.screenshots.map((name) => path.relative(ROOT, path.join(OUT, name))) }, null, 2));
  await context.close();
  await browser.close();
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
