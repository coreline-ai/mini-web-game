#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-07', 'after');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';
const viewports = [
  { name: '844x390', width: 844, height: 390 },
  { name: '1280x720', width: 1280, height: 720 },
];

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function enterGame(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.waitForTimeout(250);
}

async function installObservers(page) {
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const evidence = window.__PROJECTILE_VISIBILITY_QA__ = {
      fired: [], telegraphs: [], impacts: [], deaths: [], frames: [], id: 0,
    };
    const listenEnemy = (enemy) => {
      if (!enemy || enemy.getData('__visibilityQaObserved')) return;
      enemy.setData('__visibilityQaObserved', true);
      enemy.on('attackTelegraph', ({ role, duration }) => {
        const record = { ownerId: `${role}@${Math.round(enemy.spawnX ?? enemy.x)}`, role, duration, at: scene.elapsedMs, x: enemy.x, y: enemy.y };
        enemy.setData('__visibilityQaLastTelegraph', record);
        evidence.telegraphs.push(record);
      });
      enemy.on('died', () => evidence.deaths.push({ role: enemy.role, at: scene.elapsedMs }));
    };
    scene.core.encounters.current?.spawned?.forEach(listenEnemy);
    scene.core.on('encounterStarted', ({ current }) => current.spawned.forEach(listenEnemy));
    scene.core.pool.on('fired', (p) => {
      const id = ++evidence.id;
      p.setData('__visibilityQaId', id);
      const source = p.texture?.source?.[0] ?? {};
      const frame = p.frame ?? {};
      const ownerTelegraph = p.owner?.getData?.('__visibilityQaLastTelegraph') ?? null;
      evidence.fired.push({
        id, faction: p.faction, weaponId: p.weaponId, at: scene.elapsedMs,
        source: { texture: p.texture?.key, width: source.width ?? null, height: source.height ?? null, frameWidth: frame.realWidth ?? null, frameHeight: frame.realHeight ?? null },
        display: { width: p.displayWidth, height: p.displayHeight, depth: p.depth, angle: p.angle, tint: p.tintTopLeft },
        motion: { vx: p.body?.velocity?.x ?? null, vy: p.body?.velocity?.y ?? null, speed: p.body?.velocity ? Math.hypot(p.body.velocity.x, p.body.velocity.y) : null },
        owner: p.owner ? { role: p.owner.role ?? 'player', x: p.owner.x, y: p.owner.y } : null,
        telegraph: ownerTelegraph,
      });
    });
    scene.core.pool.on('impact', ({ projectile, target }) => {
      const id = projectile.getData('__visibilityQaId');
      const fired = evidence.fired.find((entry) => entry.id === id);
      evidence.impacts.push({
        id, faction: projectile.faction, weaponId: projectile.weaponId, at: scene.elapsedMs,
        target: target.constructor?.name ?? 'unknown',
        flightMs: fired ? scene.elapsedMs - fired.at : null,
        telegraphToImpactMs: fired?.telegraph ? scene.elapsedMs - fired.telegraph.at : null,
        x: projectile.x, y: projectile.y,
      });
    });
  });
}

async function moveToEnemyRange(page) {
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.x >= 380, null, { timeout: 5000 });
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(100);
}

async function freezeAndSnapshot(page, label, faction) {
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').scene.pause());
  await page.waitForTimeout(50);
  const state = await page.evaluate(({ label, faction }) => {
    const game = window.__GAME__;
    const scene = game.scene.getScene('Game');
    const camera = scene.cameras.main;
    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / camera.width;
    const scaleY = rect.height / camera.height;
    const alphaBoundsFor = (projectile) => {
      const frame = projectile.frame;
      const source = frame?.source?.image;
      if (!frame || !source) return null;
      const sample = document.createElement('canvas');
      sample.width = frame.cutWidth; sample.height = frame.cutHeight;
      const context = sample.getContext('2d', { willReadFrequently: true });
      context.drawImage(source, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let left = sample.width; let top = sample.height; let right = -1; let bottom = -1;
      for (let y = 0; y < sample.height; y += 1) {
        for (let x = 0; x < sample.width; x += 1) {
          if (pixels[(y * sample.width + x) * 4 + 3] < 128) continue;
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
      return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1, frameWidth: sample.width, frameHeight: sample.height };
    };
    const projectiles = scene.core.pool.group.getChildren().filter((p) => p.active && (!faction || p.faction === faction)).map((p) => {
      const b = p.getBounds();
      const alphaBounds = alphaBoundsFor(p);
      const screen = {
        x: rect.left + (b.x - camera.scrollX) * scaleX,
        y: rect.top + (b.y - camera.scrollY) * scaleY,
        width: b.width * scaleX,
        height: b.height * scaleY,
        centerX: rect.left + (p.x - camera.scrollX) * scaleX,
        centerY: rect.top + (p.y - camera.scrollY) * scaleY,
      };
      const visibleScreen = alphaBounds ? {
        width: alphaBounds.width / alphaBounds.frameWidth * p.displayWidth * scaleX,
        height: alphaBounds.height / alphaBounds.frameHeight * p.displayHeight * scaleY,
      } : null;
      return {
        id: p.getData('__visibilityQaId'), faction: p.faction, weaponId: p.weaponId,
        x: p.x, y: p.y, displayWidth: p.displayWidth, displayHeight: p.displayHeight,
        angle: p.angle, depth: p.depth, tint: p.tintTopLeft,
        velocity: { x: p.body?.velocity?.x ?? null, y: p.body?.velocity?.y ?? null },
        screen, alphaBounds, visibleScreen,
      };
    });
    const controls = scene.controls;
    const controlItems = controls ? {
      base: controls.base.visible,
      knob: controls.knob.visible,
      shoot: controls.shoot.bg.visible,
      jump: controls.jump.bg.visible,
      grenade: controls.grenade.bg.visible,
      pause: controls.pause.bg.visible,
    } : null;
    const frame = {
      label,
      elapsedMs: scene.elapsedMs,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      canvas: { css: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, backing: { width: canvas.width, height: canvas.height } },
      camera: { x: camera.scrollX, y: camera.scrollY, width: camera.width, height: camera.height, scaleX, scaleY },
      player: { x: scene.core.player.x, y: scene.core.player.y, health: scene.core.player.health, active: scene.core.player.active },
      sceneState: { active: scene.scene.isActive(), paused: scene.scene.isPaused(), ended: scene.ended },
      controls: controlItems,
      visibleControlCount: controlItems ? Object.values(controlItems).filter(Boolean).length : 0,
      projectiles,
    };
    window.__PROJECTILE_VISIBILITY_QA__.frames.push(frame);
    return frame;
  }, { label, faction });
  return state;
}

async function runViewport(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await enterGame(page);
  await installObservers(page);
  await moveToEnemyRange(page);

  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.pool.group.getChildren().some((p) => p.active && p.faction === 'enemy'), null, { timeout: 10000 });
  await page.waitForTimeout(300);
  const enemyFrame = await freezeAndSnapshot(page, 'enemy-projectile', 'enemy');
  const enemyShot = path.join(OUT, `${vp.name}-enemy-projectiles.png`);
  await page.screenshot({ path: enemyShot });
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').scene.resume());
  await page.waitForTimeout(80);

  await page.keyboard.down('KeyJ');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.pool.group.getChildren().some((p) => p.active && p.faction === 'player'), null, { timeout: 3000 });
  await page.waitForTimeout(55);
  await page.keyboard.up('KeyJ');
  const playerFrame = await freezeAndSnapshot(page, 'player-projectile', 'player');
  const playerShot = path.join(OUT, `${vp.name}-player-projectiles.png`);
  await page.screenshot({ path: playerShot });
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').scene.resume());
  await page.waitForTimeout(1700);

  const runtime = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return {
      evidence: window.__PROJECTILE_VISIBILITY_QA__,
      controlsAfterCapture: scene.controls ? {
        base: scene.controls.base.visible, knob: scene.controls.knob.visible,
        shoot: scene.controls.shoot.bg.visible, jump: scene.controls.jump.bg.visible,
        grenade: scene.controls.grenade.bg.visible, pause: scene.controls.pause.bg.visible,
      } : null,
      state: { playerHealth: scene.core.player.health, ended: scene.ended, active: scene.scene.isActive(), paused: scene.scene.isPaused() },
    };
  });
  await context.close();
  return {
    viewport: vp, browserErrors,
    screenshots: { enemy: path.relative(ROOT, enemyShot), player: path.relative(ROOT, playerShot) },
    frames: { enemy: enemyFrame, player: playerFrame }, runtime,
  };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const results = [];
  for (const vp of viewports) results.push(await runViewport(browser, vp));
  await browser.close();
  const failures = [];
  for (const result of results) {
    failures.push(...result.browserErrors.map((error) => `${result.viewport.name}: ${error}`));
    if (result.frames.enemy.visibleControlCount !== 6 || result.frames.player.visibleControlCount !== 6) failures.push(`${result.viewport.name}: all six controls are not visible`);
    const enemy = result.frames.enemy.projectiles[0];
    const player = result.frames.player.projectiles[0];
    if (!enemy?.visibleScreen || Math.min(enemy.visibleScreen.width, enemy.visibleScreen.height) < 5) failures.push(`${result.viewport.name}: enemy projectile A128 thickness below 5 CSS px`);
    if (!player?.visibleScreen || Math.min(player.visibleScreen.width, player.visibleScreen.height) < 3.5) failures.push(`${result.viewport.name}: player projectile A128 thickness below 3.5 CSS px`);
    const enemyShot = result.runtime.evidence.fired.find((entry) => entry.faction === 'enemy');
    if (!enemyShot?.telegraph || enemyShot.telegraph.duration < 420) failures.push(`${result.viewport.name}: enemy shot has no >=420ms pre-fire telegraph`);
    if ((enemyShot?.motion?.speed ?? Infinity) > 360) failures.push(`${result.viewport.name}: enemy projectile speed exceeds 360`);
  }
  const report = { generatedAt: new Date().toISOString(), baseUrl, policy: 'real mouse/keyboard input; A128 rendered thickness; passive runtime observers; scene pause used only to freeze captured evidence frame', results, failures, ok: failures.length === 0 };
  const out = path.join(OUT, 'runtime-projectile-visibility.json');
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ out: path.relative(ROOT, out), ok: report.ok, failures, results: results.map((r) => ({ viewport: r.viewport.name, enemyA128: r.frames.enemy.projectiles[0]?.visibleScreen ?? null, playerA128: r.frames.player.projectiles[0]?.visibleScreen ?? null, fired: r.runtime.evidence.fired.length, telegraphs: r.runtime.evidence.telegraphs.length, impacts: r.runtime.evidence.impacts.length, errors: r.browserErrors })) }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
