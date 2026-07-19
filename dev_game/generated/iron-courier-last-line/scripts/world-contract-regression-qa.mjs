#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-07', 'after');
const urlArg = process.argv.indexOf('--url');
const baseUrl = urlArg >= 0 ? process.argv[urlArg + 1] : 'http://127.0.0.1:5195';

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
  await page.waitForTimeout(350);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await enterGame(page);

  const plane = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const props = scene.environmentProps.props.map((item) => ({ key: item.texture.key, x: item.x, depth: item.depth, alpha: item.alpha }));
    const enemies = scene.core.encounters.current.spawned.map((item) => ({ role: item.role, x: item.x, depth: item.depth }));
    const destructibles = scene.core.destruction.props.getChildren().map((item) => ({ key: item.texture.key, x: item.x, depth: item.depth }));
    return {
      playerDepth: scene.core.player.depth,
      enemies,
      props,
      destructibles,
      environmentSnapshot: scene.environmentProps.snapshot(),
      forbiddenSolidDecoration: props.filter((item) => ['prop-shipping-crate', 'prop-barricade', 'prop-debris', 'prop-pipe-cluster'].includes(item.key)),
    };
  });

  // Show the former x=1140 barricade lane after it has been re-authored as
  // background-only dressing. Teleport is used only to frame deterministic QA.
  await page.evaluate(() => window.__IRON_COURIER_DEBUG__.teleport(1040));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'world-plane-no-pass-through-barricade-844x390.png') });

  await page.evaluate(() => window.__IRON_COURIER_DEBUG__.teleport(430));
  await page.waitForTimeout(350);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(180);
  const groundCrouch = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const player = scene.core.player;
    const frame = player.frame;
    const groundY = scene.terrainArt.snapshot().walkSurfaceY;
    const source = frame?.source?.image;
    let alphaBottom = null;
    if (source && frame) {
      const canvas = document.createElement('canvas');
      canvas.width = frame.cutWidth; canvas.height = frame.cutHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3] >= 128) alphaBottom = y + 1;
        }
      }
    }
    const visualTop = player.y - player.displayHeight * player.originY;
    const footWorldY = alphaBottom == null ? null : visualTop + alphaBottom / frame.cutHeight * player.displayHeight;
    return {
      state: player.state,
      visualState: scene.lastPlayerState,
      grounded: player.body.blocked.down || player.body.touching.down,
      texture: player.texture.key,
      frameName: frame?.name,
      alphaBottom,
      footWorldY,
      groundY,
      footGap: footWorldY == null ? null : groundY - footWorldY,
      bodyWidth: player.body.width,
      bodyHeight: player.body.height,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'grounded-crouch-baseline-844x390.png') });
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(100);

  await page.keyboard.down('Space');
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(45);
  await page.keyboard.up('Space');
  const airborneSamples = await page.evaluate(async () => {
    const scene = window.__GAME__.scene.getScene('Game');
    const samples = [];
    const started = performance.now();
    while (performance.now() - started < 650) {
      const player = scene.core.player;
      samples.push({
        at: performance.now() - started,
        state: player.state,
        visualState: scene.lastPlayerState,
        grounded: player.body.blocked.down || player.body.touching.down,
        y: player.y,
        vy: player.body.velocity.y,
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return samples;
  });
  await page.screenshot({ path: path.join(OUT, 'airborne-down-input-no-crouch-844x390.png') });
  await page.keyboard.up('KeyS');
  await page.waitForFunction(() => {
    const player = window.__GAME__.scene.getScene('Game').core.player;
    return player.body.blocked.down || player.body.touching.down;
  }, null, { timeout: 5000 });
  await page.waitForTimeout(180);

  const projectileTravelContext = await page.evaluate(async () => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    // Isolate authored projectile lifetime from the new intentional shootable
    // fence/sign/cable targets. Their collisions are verified separately.
    scene.core.destruction.props.getChildren().forEach((prop) => { if (prop.body) prop.body.enable = false; });
    return { playerX: scene.core.player.x, cameraWidth: scene.cameras.main.width };
  });
  const projectileFlights = {};
  for (const weaponId of ['rifle', 'shotgun', 'rocket']) {
    await page.evaluate((id) => {
      const weapons = window.__GAME__.scene.getScene('Game').core.weapons;
      weapons.selectWeapon(id, 999);
      weapons.ammo[id] = 999;
      weapons.nextFireByOwner = new WeakMap();
    }, weaponId);
    await page.keyboard.down('KeyJ');
    await page.waitForFunction((id) => window.__GAME__.scene.getScene('Game').core.pool.group.getChildren().some((item) => item.active && item.faction === 'player' && item.weaponId === id), weaponId);
    await page.keyboard.up('KeyJ');
    projectileFlights[weaponId] = await page.evaluate(async (id) => {
      const scene = window.__GAME__.scene.getScene('Game');
      const candidates = scene.core.pool.group.getChildren().filter((item) => item.active && item.faction === 'player' && item.weaponId === id);
      const projectile = candidates.sort((a, b) => Math.abs(a.body.velocity.y) - Math.abs(b.body.velocity.y))[0];
      const start = { x: projectile.x, y: projectile.y, at: scene.time.now, expiresAt: projectile.expiresAt, speed: Math.hypot(projectile.body.velocity.x, projectile.body.velocity.y) };
      let maxX = projectile.x;
      let frames = 0;
      while (projectile.active && frames < 300) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        maxX = Math.max(maxX, projectile.x);
        frames += 1;
      }
      return {
        ...start,
        maxX,
        distance: maxX - start.x,
        observedFlightMs: scene.time.now - start.at,
        authoredLifeMs: start.expiresAt - start.at,
        frames,
        endedActive: projectile.active,
      };
    }, weaponId);
  }

  const failures = [];
  if (plane.forbiddenSolidDecoration.length) failures.push(`solid pass-through decorations remain: ${JSON.stringify(plane.forbiddenSolidDecoration)}`);
  if (plane.enemies.some((enemy) => enemy.depth !== plane.playerDepth)) failures.push(`combat plane depth mismatch: player=${plane.playerDepth}, enemies=${JSON.stringify(plane.enemies)}`);
  if (!plane.props.every((prop) => prop.depth < plane.playerDepth)) failures.push('background dressing is not behind the combat plane');
  if (groundCrouch.state !== 'crouch' || !groundCrouch.grounded) failures.push(`ground crouch state invalid: ${JSON.stringify(groundCrouch)}`);
  if (groundCrouch.footGap == null || Math.abs(groundCrouch.footGap) > 3) failures.push(`crouch foot baseline gap ${groundCrouch.footGap}`);
  if (groundCrouch.bodyHeight > 80) failures.push(`crouch hitbox did not lower: ${groundCrouch.bodyWidth}x${groundCrouch.bodyHeight}`);
  const airborneCrouch = airborneSamples.filter((sample) => !sample.grounded && (sample.state === 'crouch' || sample.visualState === 'crouch'));
  if (airborneCrouch.length) failures.push(`airborne crouch samples: ${JSON.stringify(airborneCrouch.slice(0, 5))}`);
  for (const [weaponId, flight] of Object.entries(projectileFlights)) {
    if (flight.distance < projectileTravelContext.cameraWidth + 60) failures.push(`${weaponId} vanished before crossing camera width: distance=${flight.distance}, camera=${projectileTravelContext.cameraWidth}`);
  }
  failures.push(...browserErrors);

  const report = {
    generatedAt: new Date().toISOString(), baseUrl,
    policy: 'real keyboard crouch/jump/fire; deterministic camera framing and enemy disable only after plane capture',
    plane, groundCrouch, airborneSamples, airborneCrouch, projectileTravelContext, projectileFlights, browserErrors, failures, ok: failures.length === 0,
  };
  const reportPath = path.join(OUT, 'world-contract-regression.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, failures, plane: { playerDepth: plane.playerDepth, enemyDepths: plane.enemies.map((enemy) => enemy.depth), forbidden: plane.forbiddenSolidDecoration }, groundCrouch, airborneCrouchCount: airborneCrouch.length, projectileCameraWidth: projectileTravelContext.cameraWidth, projectileFlights: Object.fromEntries(Object.entries(projectileFlights).map(([id, flight]) => [id, { distance: flight.distance, lifeMs: flight.authoredLifeMs }])) }, null, 2));
  await context.close();
  await browser.close();
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
