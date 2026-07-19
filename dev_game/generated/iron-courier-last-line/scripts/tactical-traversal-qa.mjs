#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'polish-08');
const phaseIndex = process.argv.indexOf('--phase');
const phase = phaseIndex >= 0 ? process.argv[phaseIndex + 1] : 'after';
const urlIndex = process.argv.indexOf('--url');
const baseUrl = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5195';

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
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.getGateState = () => ({ current: null, gateX: null, alive: 0, customGatePassed: true, locked: false });
    scene.enforceEncounterGate = () => {};
    scene.core.player.invulnerableUntil = 0;
  });
}

async function resetPlayer(page, x, y = null) {
  await page.evaluate(({ x, y }) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const player = scene.core.player;
    const targetY = y ?? (scene.terrainArt.snapshot().walkSurfaceY - (player.body.bottom - player.y));
    player.setPosition(x, targetY); player.body.reset(x, targetY); player.setVelocity(0, 0);
    player.health = player.maxHealth; player.invulnerableUntil = 0;
  }, { x, y });
  await page.waitForFunction(() => {
    const player = window.__GAME__.scene.getScene('Game').core.player;
    return player.body.blocked.down || player.body.touching.down;
  }, null, { timeout: 2500 });
  await page.waitForTimeout(80);
}

async function measureCrouchDodge(page) {
  await resetPlayer(page, 430);
  const setup = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const enemies = scene.core.encounters.current.spawned.filter((enemy) => enemy.active);
    const basic = enemies.find((enemy) => enemy.role === 'basic');
    enemies.filter((enemy) => enemy !== basic).forEach((enemy) => enemy.disableBody?.(true, true));
    basic.setPosition(720, 520); basic.body.reset(720, 520); basic.setVelocity(0, 0); basic.config.speed = 0;
    // Freeze autonomous scheduling; the QA invokes the authored attack method
    // exactly once for each posture so unrelated burst timing cannot pollute
    // the geometry result.
    basic.update = () => {};
    basic.pendingAttackAt = null;
    basic.nextAttackAt = Number.POSITIVE_INFINITY;
    window.__TACTICAL_QA__ = { impacts: [], fired: [], samples: [], expired: [] };
    scene.core.pool.on('fired', (projectile) => {
      if (projectile.faction !== 'enemy') return;
      window.__TACTICAL_QA__.fired.push({
        weaponId: projectile.weaponId, x: projectile.x, y: projectile.y,
        dodgeHint: projectile.getData('dodgeHint') ?? null,
        readability: projectile.getData('readability') ?? null,
      });
      projectile.once('expired', (event) => window.__TACTICAL_QA__.expired.push(event));
      for (const delay of [40, 120, 300, 600, 1000]) scene.time.delayedCall(delay, () => window.__TACTICAL_QA__.samples.push({ delay, active: projectile.active, x: projectile.x, y: projectile.y, weaponId: projectile.weaponId }));
    });
    scene.core.pool.on('impact', ({ projectile, target }) => {
      if (target === scene.core.player) window.__TACTICAL_QA__.impacts.push({ weaponId: projectile.weaponId, x: projectile.x, y: projectile.y });
    });
    return { enemyRole: basic.role };
  });
  await page.waitForFunction(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const basic = scene.core.encounters.current.spawned.find((enemy) => enemy.active && enemy.role === 'basic');
    return basic.body.blocked.down || basic.body.touching.down;
  }, null, { timeout: 2500 });
  await page.waitForTimeout(80);

  const standingBefore = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const player = scene.core.player;
    const basic = scene.core.encounters.current.spawned.find((enemy) => enemy.active && enemy.role === 'basic');
    const health = player.health;
    basic.attack(scene.time.now, player.x - basic.x, player.y - basic.y);
    return { health, x: player.x, bodyTop: player.body.top, bodyBottom: player.body.bottom };
  });
  await page.waitForFunction(() => window.__TACTICAL_QA__.impacts.length > 0, null, { timeout: 2500 }).catch(() => {});
  const standingAfter = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return { health: scene.core.player.health, x: scene.core.player.x, impacts: [...window.__TACTICAL_QA__.impacts], fired: [...window.__TACTICAL_QA__.fired], expired: [...window.__TACTICAL_QA__.expired] };
  });
  await page.screenshot({ path: path.join(OUT, `${phase}-standing-hit.png`) });

  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.pool.clear();
    scene.core.player.health = scene.core.player.maxHealth;
    scene.core.player.invulnerableUntil = 0;
    window.__TACTICAL_QA__.impacts.length = 0;
    window.__TACTICAL_QA__.fired.length = 0;
    window.__TACTICAL_QA__.samples.length = 0;
    window.__TACTICAL_QA__.expired.length = 0;
  });
  await page.keyboard.down('KeyS');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state === 'crouch');
  const crouchBefore = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const player = scene.core.player;
    const basic = scene.core.encounters.current.spawned.find((enemy) => enemy.active && enemy.role === 'basic');
    const health = player.health;
    basic.attack(scene.time.now, player.x - basic.x, player.y - basic.y);
    return { health, x: player.x, bodyTop: player.body.top, bodyBottom: player.body.bottom, bodyHeight: player.body.height };
  });
  await page.waitForFunction(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    return scene.core.pool.group.getChildren().some((projectile) => projectile.active && projectile.faction === 'enemy' && projectile.x <= scene.core.player.x + 72);
  }, null, { timeout: 2200 }).catch(() => {});
  await page.screenshot({ path: path.join(OUT, `${phase}-crouch-dodge.png`) });
  const crouchAfter = await page.evaluate(async () => {
    const scene = window.__GAME__.scene.getScene('Game');
    const player = scene.core.player;
    let crossed = false;
    const started = performance.now();
    while (performance.now() - started < 1800) {
      const projectile = scene.core.pool.group.getChildren().find((item) => item.active && item.faction === 'enemy');
      if (projectile?.x < player.body.left - 30) { crossed = true; break; }
      if (window.__TACTICAL_QA__.impacts.length) break;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return {
      health: player.health, x: player.x, state: player.state, crossed,
      impacts: [...window.__TACTICAL_QA__.impacts], fired: [...window.__TACTICAL_QA__.fired], samples: [...window.__TACTICAL_QA__.samples], expired: [...window.__TACTICAL_QA__.expired],
      bodyTop: player.body.top, bodyBottom: player.body.bottom, bodyHeight: player.body.height,
    };
  });
  await page.keyboard.up('KeyS');
  return {
    setup, standingBefore, standingAfter, crouchBefore, crouchAfter,
    standingDamage: standingBefore.health - standingAfter.health,
    crouchDamage: crouchBefore.health - crouchAfter.health,
  };
}

async function routeContract(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const player = scene.core.player;
    const gravityY = scene.physics.world.gravity.y;
    const jumpSpeed = player.config.jumpSpeed;
    const maxRisePx = jumpSpeed * jumpSpeed / (2 * gravityY);
    const groundY = scene.terrainArt.snapshot().walkSurfaceY;
    const platforms = scene.terrainArt.snapshot().platforms;
    const grouped = Object.groupBy ? Object.groupBy(platforms.filter((item) => item.routeId), (item) => item.routeId) : platforms.filter((item) => item.routeId).reduce((result, item) => { (result[item.routeId] ??= []).push(item); return result; }, {});
    const routes = Object.entries(grouped).map(([routeId, items]) => {
      const ordered = [...items].sort((a, b) => a.step - b.step);
      const transitions = ordered.slice(1).map((item, index) => {
        const previous = ordered[index];
        const horizontalGap = Math.max(0, item.left - previous.right, previous.left - item.right);
        return { from: previous.id, to: item.id, risePx: previous.surfaceY - item.surfaceY, absoluteStepPx: Math.abs(previous.surfaceY - item.surfaceY), horizontalGap };
      });
      return {
        routeId, platforms: ordered, transitions,
        entryRisePx: groundY - ordered[0].surfaceY,
        entryReachable: groundY - ordered[0].surfaceY <= maxRisePx - 8,
        validTransitions: transitions.every((transition) => transition.absoluteStepPx <= 96 && transition.horizontalGap <= 48),
      };
    });
    const pickups = scene.weaponPickups.getChildren().map((item) => ({ weaponId: item.getData('pickup')?.weaponId, platformId: item.getData('pickup')?.platformId ?? null, x: item.x, y: item.y }));
    const rescues = scene.core.rescues.group.getChildren().map((item) => ({ type: item.rescueType, platformId: item.getData('platformId') ?? null, x: item.x, y: item.y }));
    return { gravityY, jumpSpeed, maxRisePx, groundY, platforms, routes, pickups, rescues };
  });
}

async function climbRoute(page, route) {
  const ascent = route.platforms.filter((item) => item.ascent !== false && item.step <= 3);
  if (ascent.length < 3) return { routeId: route.routeId, attempted: false, landed: [], success: false };
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    scene.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
  });
  await resetPlayer(page, ascent[0].left - 72);
  const landed = [];
  for (let index = 0; index < ascent.length; index += 1) {
    const platform = ascent[index];
    if (index > 0) {
      const previous = ascent[index - 1];
      await page.keyboard.down('KeyD');
      await page.waitForFunction((targetX) => window.__GAME__.scene.getScene('Game').core.player.x >= targetX, previous.right - 72, { timeout: 1800 }).catch(() => {});
      await page.keyboard.up('KeyD');
    }
    await page.keyboard.down('KeyD');
    await page.keyboard.down('Space');
    await page.waitForTimeout(70);
    await page.keyboard.up('Space');
    const jumped = await page.waitForFunction(() => {
      const player = window.__GAME__.scene.getScene('Game').core.player;
      return player.body.velocity.y < -40 || !(player.body.blocked.down || player.body.touching.down);
    }, null, { timeout: 500 }).then(() => true).catch(() => false);
    if (!jumped) {
      await page.keyboard.down('Space'); await page.waitForTimeout(70); await page.keyboard.up('Space');
    }
    const didLand = await page.waitForFunction((target) => {
      const player = window.__GAME__.scene.getScene('Game').core.player;
      const inBounds = player.body.center.x >= target.left + 8 && player.body.center.x <= target.right - 8;
      return inBounds && Math.abs(player.body.bottom - target.surfaceY) <= 3 && (player.body.blocked.down || player.body.touching.down);
    }, platform, { timeout: 2600 }).then(() => true).catch(() => false);
    await page.keyboard.up('KeyD');
    landed.push({ platformId: platform.id, jumped, didLand, sample: await page.evaluate(() => {
      const player = window.__GAME__.scene.getScene('Game').core.player;
      return { x: player.x, y: player.y, bodyBottom: player.body.bottom, grounded: player.body.blocked.down || player.body.touching.down };
    }) });
    if (!didLand) break;
    // Let Arcade publish the new blocked.down contact and Player refresh its
    // coyote timestamp before requesting the next stair jump.
    await page.waitForTimeout(260);
  }
  await page.screenshot({ path: path.join(OUT, `${phase}-${route.routeId}-climb.png`) });
  return { routeId: route.routeId, attempted: true, landed, success: landed.length === ascent.length && landed.every((item) => item.didLand) };
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
  const crouch = await measureCrouchDodge(page);
  const contract = await routeContract(page);
  const climbs = [];
  for (const route of contract.routes) climbs.push(await climbRoute(page, route));

  const failures = [];
  if (crouch.standingDamage <= 0) failures.push('standing player was not hit by the authored straight rifle shot');
  if (crouch.crouchDamage !== 0 || crouch.crouchAfter.impacts.length) failures.push(`crouch did not dodge straight shot: damage=${crouch.crouchDamage}`);
  if (!crouch.crouchAfter.crossed) failures.push('straight projectile did not visibly cross behind the crouched player');
  if (phase !== 'before' && crouch.crouchAfter.fired[0]?.dodgeHint !== 'crouch') failures.push('straight shot is missing dodgeHint=crouch metadata');
  if (contract.routes.length < 3) failures.push(`expected 3 tactical traversal routes, found ${contract.routes.length}`);
  contract.routes.forEach((route) => {
    if (!route.entryReachable) failures.push(`${route.routeId}: first platform exceeds jump apex margin`);
    if (!route.validTransitions) failures.push(`${route.routeId}: step/gap contract invalid`);
  });
  if (phase !== 'before' && climbs.some((route) => !route.success)) failures.push(`actual keyboard climb failed: ${JSON.stringify(climbs)}`);
  if (phase !== 'before' && !contract.pickups.some((item) => item.platformId)) failures.push('no elevated weapon reward is attached to a route');
  if (phase !== 'before' && !contract.rescues.some((item) => item.type === 'artillery' && item.platformId)) failures.push('artillery rescue is not attached to the collapse high route');
  failures.push(...browserErrors);

  const report = { generatedAt: new Date().toISOString(), phase, baseUrl, policy: 'actual keyboard crouch/jump; deterministic actor positioning only; geometry-based dodge; route contract from runtime snapshot', crouch, contract, climbs, browserErrors, failures, ok: failures.length === 0 };
  const reportPath = path.join(OUT, `${phase}-tactical-traversal.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ok: report.ok, failures, crouch: { standingDamage: crouch.standingDamage, crouchDamage: crouch.crouchDamage, crossed: crouch.crouchAfter.crossed, bodyHeight: crouch.crouchAfter.bodyHeight }, routeCount: contract.routes.length, maxRisePx: contract.maxRisePx, routes: contract.routes.map((route) => ({ id: route.routeId, entryRisePx: route.entryRisePx, entryReachable: route.entryReachable, validTransitions: route.validTransitions })), climbs: climbs.map((route) => ({ id: route.routeId, success: route.success })) }, null, 2));
  await context.close(); await browser.close();
  if (phase !== 'before' && failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
