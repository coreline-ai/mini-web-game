#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'player-hit-crouch-matrix');
const BASE_URL = 'http://127.0.0.1:5195';
const WEAPONS = ['rifle', 'shotgun', 'rocket'];

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  return import(pathToFileURL(path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
}

async function enterGame(page) {
  await page.goto(`${BASE_URL}/?qaHitCrouch=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get, null, { timeout: 15000 });
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.enforceEncounterGate = () => {};
    s.getGateState = () => ({ current: null, gateX: null, alive: 0, customGatePassed: true, locked: false });
    s.core.encounters.update = () => {};
    s.tryAutoMelee = () => false;
    s.core.encounters.enemyGroup.getChildren().forEach((a) => {
      if (a.role) { a.setActive(false).setVisible(false); if (a.body) a.body.enable = false; }
    });
    s.cameras.main.stopFollow();
  });
}

async function resetPlayer(page, weapon = 'rifle') {
  await page.keyboard.up('KeyA').catch(() => {});
  await page.keyboard.up('KeyD').catch(() => {});
  await page.keyboard.up('KeyJ').catch(() => {});
  await page.keyboard.up('KeyS').catch(() => {});
  await page.evaluate((weaponId) => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player;
    p.health = p.maxHealth; p.invulnerableUntil = 0; p.inputLocked = false;
    p.hurtStateLock = null; p.hurtStateLockUntil = 0;
    p.setActive(true).setVisible(true).clearTint();
    p.setMotionState('idle', s.time.now); p.updateBodyPosture();
    const surface = s.terrainArt.snapshot().walkSurfaceY;
    const bodyOffset = p.body.bottom - p.y;
    p.body.reset(620, surface - bodyOffset); p.setVelocity(0, 0);
    p.facing = 1; p.aim.set(1, 0);
    s.hurtPoseUntil = 0; s.hurtStartedAt = 0; s.recoilUntil = 0;
    s.grenadePoseUntil = 0; s.meleePoseUntil = 0;
    s.core.weapons.ammo[weaponId] = 999;
    s.core.weapons.selectWeapon(weaponId);
    s.cameras.main.centerOn(620, 465);
  }, weapon);
  await page.waitForFunction(() => {
    const p = window.__GAME__.scene.getScene('Game').core.player;
    return (p.body.blocked.down || p.body.touching.down) && p.state === 'idle';
  }, null, { timeout: 3000 });
  await page.waitForTimeout(80);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player;
    return {
      now: s.time.now, health: p.health, state: p.state, visualState: s.lastPlayerState,
      grounded: p.body.blocked.down || p.body.touching.down,
      body: { height: p.body.height, bottom: p.body.bottom },
      velocity: { x: p.body.velocity.x, y: p.body.velocity.y },
      animation: p.anims.currentAnim?.key ?? null, texture: p.texture?.key ?? null,
      weapon: s.core.weapons.currentWeapon, hurtActive: s.time.now < s.hurtPoseUntil,
      hurtPoseUntil: s.hurtPoseUntil, hurtStateLock: p.hurtStateLock,
      hurtStateLockUntil: p.hurtStateLockUntil,
      composite: p.getData('singleSpriteWeaponComposite'),
      lastActions: s.lastActions ? { ...s.lastActions } : null,
    };
  });
}

async function inflict(page, sourceSide = 1, amount = 1) {
  return page.evaluate(({ sourceSide, amount }) => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player;
    return { accepted: p.takeDamage(amount, { x: p.x + sourceSide * 100, y: p.y }), at: s.time.now };
  }, { sourceSide, amount });
}

function validateCrouch(result, failures) {
  const { id, weapon, before, crouched, latencyMs } = result;
  if (!crouched.hurtActive) failures.push(`${id}: crouch happened after hit reaction expired`);
  if (crouched.state !== 'crouch') failures.push(`${id}: state=${crouched.state}`);
  if (Math.abs(crouched.body.height - 72) > 0.5) failures.push(`${id}: bodyHeight=${crouched.body.height}`);
  if (Math.abs(crouched.body.bottom - before.body.bottom) > 0.75) failures.push(`${id}: foot baseline moved ${before.body.bottom}->${crouched.body.bottom}`);
  if (Math.abs(crouched.velocity.x) > 1) failures.push(`${id}: crouch slid at vx=${crouched.velocity.x}`);
  if (latencyMs > 80) failures.push(`${id}: crouch latency ${latencyMs}ms`);
  if (crouched.hurtStateLock != null || crouched.hurtStateLockUntil > crouched.now) failures.push(`${id}: stale hurt posture lock remained`);
  if (weapon === 'rifle' && !['player:crouch-enter', 'player:crouch'].includes(crouched.animation)) failures.push(`${id}: rifle animation=${crouched.animation}`);
  if (weapon !== 'rifle' && (!crouched.texture.startsWith(`player-${weapon}-`) || !crouched.composite?.active)) failures.push(`${id}: ${weapon} presentation was not preserved`);
}

async function hitThenKeyboardCrouch(page, { weapon, initial, sourceSide, shootHeld = false }) {
  await resetPlayer(page, weapon);
  if (initial === 'run') {
    await page.keyboard.down('KeyD');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state === 'run', null, { timeout: 1500 });
  } else if (initial === 'crouch') {
    await page.keyboard.down('KeyS');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state === 'crouch', null, { timeout: 1500 });
  }
  if (shootHeld) { await page.keyboard.down('KeyJ'); await page.waitForTimeout(35); }
  const before = await snapshot(page);
  const hit = await inflict(page, sourceSide);
  if (initial !== 'crouch') {
    await page.keyboard.down('KeyS');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').keys.down.isDown, null, { timeout: 500 });
  }
  // Measure from Phaser's registered input state, not automation transport.
  const inputAt = initial === 'crouch' ? hit.at : await page.evaluate(() => window.__GAME__.scene.getScene('Game').time.now);
  await page.waitForFunction(() => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player;
    return p.state === 'crouch' && Math.abs(p.body.height - 72) <= 0.5;
  }, null, { timeout: 750 });
  const crouched = await snapshot(page);
  const id = `${weapon}-${initial}${shootHeld ? '-shoot' : ''}-hit-${sourceSide < 0 ? 'left' : 'right'}-crouch`;
  await page.screenshot({ path: path.join(OUT, `${id}.png`) });
  await page.keyboard.up('KeyA'); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ'); await page.keyboard.up('KeyS');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state !== 'crouch', null, { timeout: 750 });
  const released = await snapshot(page);
  return { id, input: 'keyboard', weapon, initial, sourceSide, shootHeld, hit, inputAt, before, crouched, released, latencyMs: crouched.now - inputAt };
}

async function airborneCase(page, weapon) {
  await resetPlayer(page, weapon);
  await page.keyboard.down('Space'); await page.waitForTimeout(35); await page.keyboard.up('Space');
  await page.waitForFunction(() => ['jump', 'fall'].includes(window.__GAME__.scene.getScene('Game').core.player.state), null, { timeout: 1500 });
  const hit = await inflict(page, 1);
  await page.keyboard.down('KeyS');
  const samples = await page.evaluate(async () => {
    const s = window.__GAME__.scene.getScene('Game'); const rows = [];
    while (!(s.core.player.body.blocked.down || s.core.player.body.touching.down)) {
      const p = s.core.player;
      rows.push({ now: s.time.now, state: p.state, visualState: s.lastPlayerState, bodyHeight: p.body.height, grounded: false });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return rows;
  });
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state === 'crouch', null, { timeout: 1000 });
  const landedCrouch = await snapshot(page);
  await page.keyboard.up('KeyS');
  return { id: `${weapon}-air-hit-down-held`, weapon, hit, samples, landedCrouch };
}

function touchPoint(x, y, id = 91) { return { x, y, id, radiusX: 8, radiusY: 8, force: 1 }; }

async function touchCases(chromium, browserErrors) {
  const context = await chromium.launchPersistentContext('', {
    headless: true, viewport: { width: 844, height: 390 }, hasTouch: true,
    args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  const pages = context.pages(); const page = pages[0] ?? await context.newPage();
  page.on('pageerror', (e) => browserErrors.push(`touch pageerror:${e.message}`));
  page.on('console', (m) => m.type() === 'error' && browserErrors.push(`touch console:${m.text()}`));
  const results = [];
  try {
    await enterGame(page);
    const geometry = await page.evaluate(() => {
      const s = window.__GAME__.scene.getScene('Game'); const canvas = window.__GAME_LAYOUT_BOUNDS__.canvas;
      const j = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'joystick');
      return { center: { x: j.x + j.width / 2, y: j.y + j.height / 2 }, sx: canvas.width / s.cameras.main.width, sy: canvas.height / s.cameras.main.height };
    });
    const cdp = await context.newCDPSession(page);
    for (const weapon of WEAPONS) {
      await resetPlayer(page, weapon);
      const start = touchPoint(geometry.center.x, geometry.center.y);
      const down = touchPoint(geometry.center.x + 8 * geometry.sx, geometry.center.y + 62 * geometry.sy);
      // Combat touch posture: the thumb is already resting on the neutral
      // joystick when the hit lands, then pulls down as the response.
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').controls.joyPointer != null, null, { timeout: 500 });
      const before = await snapshot(page); const hit = await inflict(page, 1);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [down] });
      await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').controls.crouchDown, null, { timeout: 500 });
      const inputAt = await page.evaluate(() => window.__GAME__.scene.getScene('Game').time.now);
      await page.waitForFunction(() => {
        const s = window.__GAME__.scene.getScene('Game');
        return s.controls.crouchDown && s.core.player.state === 'crouch' && Math.abs(s.core.player.body.height - 72) <= 0.5;
      }, null, { timeout: 750 });
      const crouched = await snapshot(page);
      const id = `${weapon}-idle-hit-right-touch-crouch`;
      await page.screenshot({ path: path.join(OUT, `${id}.png`) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state !== 'crouch', null, { timeout: 750 });
      const released = await snapshot(page);
      results.push({ id, input: 'touch', weapon, initial: 'idle', sourceSide: 1, hit, inputAt, before, crouched, released, latencyMs: crouched.now - inputAt });
    }
  } finally { await context.close(); }
  return results;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const browserErrors = [];
  page.on('pageerror', (e) => browserErrors.push(`pageerror:${e.message}`));
  page.on('console', (m) => m.type() === 'error' && browserErrors.push(`console:${m.text()}`));
  const results = []; const airborne = []; const failures = [];
  try {
    await enterGame(page);
    for (const weapon of WEAPONS) {
      for (const initial of ['idle', 'run']) {
        for (const sourceSide of [-1, 1]) results.push(await hitThenKeyboardCrouch(page, { weapon, initial, sourceSide }));
      }
      for (const sourceSide of [-1, 1]) results.push(await hitThenKeyboardCrouch(page, { weapon, initial: 'crouch', sourceSide }));
      results.push(await hitThenKeyboardCrouch(page, { weapon, initial: 'idle', sourceSide: 1, shootHeld: true }));
      airborne.push(await airborneCase(page, weapon));
    }

    // Invulnerable repeat damage must not re-lock posture input.
    await resetPlayer(page, 'rifle'); const first = await inflict(page, 1); const second = await inflict(page, -1);
    await page.keyboard.down('KeyS');
    await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state === 'crouch', null, { timeout: 750 });
    const repeatCrouch = await snapshot(page); await page.keyboard.up('KeyS');
    if (!first.accepted || second.accepted || repeatCrouch.state !== 'crouch') failures.push('invulnerable repeat-hit case blocked crouch or accepted duplicate damage');

    // Death remains authoritative; defensive input must not revive/change pose.
    await resetPlayer(page, 'rifle'); const fatal = await inflict(page, 1, 9999);
    await page.keyboard.down('KeyS'); await page.waitForTimeout(80); const deadDown = await snapshot(page); await page.keyboard.up('KeyS');
    if (!fatal.accepted || deadDown.state !== 'dead') failures.push(`fatal-hit case changed to ${deadDown.state}`);
  } finally { await browser.close(); }

  const touchResults = await touchCases(chromium, browserErrors);
  for (const result of [...results, ...touchResults]) {
    validateCrouch(result, failures);
    if (result.released.state === 'crouch') failures.push(`${result.id}: release remained crouched`);
  }
  for (const entry of airborne) {
    const invalid = entry.samples.filter((r) => r.state === 'crouch' || r.visualState === 'crouch');
    if (invalid.length) failures.push(`${entry.id}: crouched while airborne`);
    if (entry.landedCrouch.state !== 'crouch' || Math.abs(entry.landedCrouch.body.height - 72) > 0.5) failures.push(`${entry.id}: held DOWN did not crouch on landing`);
  }
  failures.push(...browserErrors);
  const summary = {
    keyboardHitCrouchCases: results.length,
    touchHitCrouchCases: touchResults.length,
    airborneHitCases: airborne.length,
    repeatHitCases: 1,
    fatalHitCases: 1,
    totalCases: results.length + touchResults.length + airborne.length + 2,
    maxCrouchLatencyMs: Math.max(...[...results, ...touchResults].map((r) => r.latencyMs)),
    weapons: WEAPONS,
    initialStates: ['idle', 'run', 'crouch', 'airborne', 'dead'],
    sourceDirections: ['left', 'right'],
    inputModes: ['keyboard', 'touch'],
  };
  const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, ok: failures.length === 0, summary, failures, browserErrors, results, touchResults, airborne };
  const reportPath = path.join(OUT, 'runtime-evidence.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, summary, failures, report: path.relative(ROOT, reportPath) }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
