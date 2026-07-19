#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PHASE = process.argv[2] ?? 'after';
const OUT = path.join(ROOT, 'qa-captures', 'player-runfire-crouch', PHASE);
const BASE_URL = 'http://127.0.0.1:5195';
const WEAPONS = ['rifle', 'shotgun', 'rocket'];

async function playwright() {
  try { return await import('playwright'); } catch {}
  return import(pathToFileURL(path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
}

async function enter(page) {
  await page.goto(`${BASE_URL}/?qaRunFireCrouch=${PHASE}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const b = window.__GAME_LAYOUT_BOUNDS__.items.find((v) => v.id === 'home-play');
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get, null, { timeout: 15000 });
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.enforceEncounterGate = () => {};
    s.getGateState = () => ({ current: null, gateX: null, alive: 0, customGatePassed: true, locked: false });
    s.core.encounters.update = () => {};
    s.tryAutoMelee = () => false;
    s.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
    s.core.encounters.enemyGroup.getChildren().forEach((a) => { if (a.role) a.disableBody?.(true, true); });
    s.cameras.main.stopFollow(); s.cameras.main.centerOn(620, 465);
    window.__RUNFIRE_CROUCH_QA__ = { active: null, shots: [] };
    s.core.weapons.on('fired', ({ owner, weaponId, muzzle, spawn }) => {
      const q = window.__RUNFIRE_CROUCH_QA__;
      if (!q.active) return;
      q.shots.push({ label: q.active, at: s.time.now, state: owner.state, visualState: s.lastPlayerState, weaponId, muzzle, spawn, animation: owner.anims.currentAnim?.key, texture: owner.texture?.key });
    });
  });
}

async function reset(page, weapon) {
  for (const key of ['KeyA', 'KeyD', 'KeyJ', 'KeyS']) await page.keyboard.up(key).catch(() => {});
  await page.evaluate((weaponId) => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player;
    p.health = p.maxHealth; p.inputLocked = false; p.invulnerableUntil = Number.POSITIVE_INFINITY;
    p.hurtStateLock = null; p.hurtStateLockUntil = 0; p.setMotionState('idle', s.time.now); p.updateBodyPosture();
    const ground = s.terrainArt.snapshot().walkSurfaceY; const off = p.body.bottom - p.y;
    p.body.reset(620, ground - off); p.setVelocity(0, 0); p.facing = 1; p.aim.set(1, 0);
    s.hurtPoseUntil = 0; s.recoilUntil = 0; s.grenadePoseUntil = 0; s.meleePoseUntil = 0;
    s.core.weapons.ammo[weaponId] = 999; s.core.weapons.selectWeapon(weaponId);
    s.cameras.main.centerOn(620, 465);
  }, weapon);
  await page.waitForFunction(() => {
    const p = window.__GAME__.scene.getScene('Game').core.player;
    return (p.body.blocked.down || p.body.touching.down) && p.state === 'idle';
  }, null, { timeout: 3000 });
  await page.waitForTimeout(100);
}

async function sample(page, label, phase, index) {
  const row = await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player; const c = s.cameras.main;
    return {
      now: s.time.now, state: p.state, visualState: s.lastPlayerState,
      transition: p.postureTransition?.(s.time.now) ?? null,
      animation: p.anims.currentAnim?.key ?? null, texture: p.texture?.key ?? null, frame: Number(p.frame?.name),
      x: p.x, y: p.y, screenX: p.x - c.scrollX, screenY: p.y - c.scrollY,
      vx: p.body.velocity.x, bodyHeight: p.body.height, bodyBottom: p.body.bottom,
      weapon: s.core.weapons.currentWeapon, composite: p.getData('singleSpriteWeaponComposite'),
      recoilUntil: s.recoilUntil, aim: { x: p.aim.x, y: p.aim.y }, lastActions: s.lastActions ? { ...s.lastActions } : null,
    };
  });
  const file = `${label}-${phase}-${String(index).padStart(2, '0')}.png`;
  const clip = { x: Math.max(0, Math.round(row.screenX - 130)), y: Math.max(0, Math.round(row.screenY - 130)), width: 260, height: 235 };
  await page.screenshot({ path: path.join(OUT, file), clip });
  return { label, phase, file, ...row };
}

async function runScenario(page, weapon, direction) {
  await reset(page, weapon);
  const moveKey = direction > 0 ? 'KeyD' : 'KeyA'; const label = `${weapon}-${direction > 0 ? 'right' : 'left'}`;
  await page.evaluate((v) => { window.__RUNFIRE_CROUCH_QA__.active = v; }, label);
  await page.keyboard.down(moveKey); await page.keyboard.down('KeyJ');
  await page.waitForFunction(() => {
    const s = window.__GAME__.scene.getScene('Game'); return s.core.player.state === 'run' && s.lastPlayerState.startsWith('run-fire-');
  }, null, { timeout: 2000 });
  await page.waitForTimeout(180);
  const rows = [await sample(page, label, 'runfire', 0)];

  await page.keyboard.down('KeyS');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state === 'crouch', null, { timeout: 800 });
  rows.push(await sample(page, label, 'enter', 0));
  for (const [i, delay] of [45, 55, 80, 100].entries()) { await page.waitForTimeout(delay); rows.push(await sample(page, label, 'enter', i + 1)); }
  const crouchX = rows.at(-1).x;

  await page.keyboard.up('KeyS');
  await page.waitForFunction(() => window.__GAME__.scene.getScene('Game').core.player.state === 'run', null, { timeout: 800 });
  rows.push(await sample(page, label, 'exit', 0));
  for (const [i, delay] of [45, 55, 80, 100].entries()) { await page.waitForTimeout(delay); rows.push(await sample(page, label, 'exit', i + 1)); }

  await page.keyboard.up('KeyJ'); await page.keyboard.up(moveKey);
  await page.evaluate(() => { window.__RUNFIRE_CROUCH_QA__.active = null; });
  const shots = await page.evaluate((v) => window.__RUNFIRE_CROUCH_QA__.shots.filter((s) => s.label === v), label);
  return { label, weapon, direction, crouchX, rows, shots };
}

function validate(scenarios) {
  const failures = []; const check = (ok, message) => { if (!ok) failures.push(message); };
  for (const s of scenarios) {
    const enter = s.rows.filter((r) => r.phase === 'enter'); const exit = s.rows.filter((r) => r.phase === 'exit');
    const enterTransition = enter.filter((r) => r.transition?.state === 'crouch-enter');
    const exitTransition = exit.filter((r) => r.transition?.state === 'crouch-exit');
    check(enterTransition.length > 0, `${s.label}: crouch-enter transition not sampled`);
    check(exitTransition.length > 0, `${s.label}: crouch-exit transition not sampled`);
    const enterVisual = s.weapon === 'rifle' ? 'crouch-enter-fire' : 'crouch-enter';
    const exitVisual = s.weapon === 'rifle' ? 'crouch-exit-fire' : 'crouch-exit';
    const namespace = s.weapon === 'rifle' ? 'player' : `player-${s.weapon}`;
    check(enterTransition.every((r) => r.visualState === enterVisual && r.animation === `${namespace}:${enterVisual}`), `${s.label}: run-fire overrode crouch-enter animation`);
    check(exitTransition.every((r) => r.visualState === exitVisual && r.animation === `${namespace}:${exitVisual}`), `${s.label}: run-fire overrode crouch-exit animation`);
    const crouched = enter.filter((r) => !r.transition && r.state === 'crouch');
    const crouchAnimation = s.weapon === 'rifle' ? 'player:crouch-forward' : `player-${s.weapon}:crouch-forward`;
    check(crouched.length > 0 && crouched.every((r) => r.visualState === 'crouch-forward' && r.animation === crouchAnimation && r.bodyHeight <= 72.5 && Math.abs(r.vx) <= 1), `${s.label}: crouched firing did not settle cleanly`);
    check(enter.every((r) => Math.abs(r.bodyBottom - 588) <= 0.75), `${s.label}: crouch transition moved feet`);
    check(Math.max(...enter.map((r) => r.x)) - Math.min(...enter.map((r) => r.x)) <= 3, `${s.label}: crouch slid across ground`);
    check(exit.at(-1)?.state === 'run' && exit.at(-1)?.visualState.startsWith('run-fire-'), `${s.label}: crouch exit did not resume running fire`);
    if (s.weapon !== 'rifle') check(s.rows.every((r) => !r.texture || r.texture.startsWith(`player-${s.weapon}-`)), `${s.label}: weapon sprite changed during transition`);
    check(s.shots.some((r) => r.state === 'crouch'), `${s.label}: firing stopped while crouched`);
  }
  return failures;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await playwright(); const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror:${e.message}`)); page.on('console', (m) => m.type() === 'error' && errors.push(`console:${m.text()}`));
  await enter(page); const scenarios = [];
  for (const weapon of WEAPONS) for (const direction of [-1, 1]) scenarios.push(await runScenario(page, weapon, direction));
  await browser.close(); const failures = [...validate(scenarios), ...errors];
  const report = { generatedAt: new Date().toISOString(), phase: PHASE, ok: failures.length === 0, failures, errors, scenarios };
  await fs.writeFile(path.join(OUT, 'runtime-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ phase: PHASE, ok: report.ok, failures, errors, scenarios: scenarios.length, screenshots: scenarios.reduce((n, s) => n + s.rows.length, 0), report: path.relative(ROOT, path.join(OUT, 'runtime-evidence.json')) }, null, 2));
  if (PHASE !== 'before' && failures.length) process.exitCode = 1;
}
main().catch((e) => { console.error(e.stack || e); process.exit(1); });
