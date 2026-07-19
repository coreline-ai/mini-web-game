import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PHASE = process.argv[2] ?? 'before';
const OUT = path.join(ROOT, 'qa-captures', 'player-motion-continuity', PHASE);
const GAME_URL = 'http://127.0.0.1:5195';

async function playwright() {
  try { return await import('playwright'); } catch {}
  return import(pathToFileURL(path.join(process.env.HOME, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
}

async function enter(page) {
  await page.goto(GAME_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const pt = await page.evaluate(() => {
    const b = window.__GAME_LAYOUT_BOUNDS__.items.find((v) => v.id === 'home-play');
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get, null, { timeout: 15000 });
  await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game');
    s.enforceEncounterGate = () => {};
    s.getGateState = () => ({ current: null, gateX: null, alive: 0, customGatePassed: true, locked: false });
    s.core.encounters.update = () => {};
    s.tryAutoMelee = () => false;
    s.core.encounters.enemyGroup.getChildren().forEach((a) => { if (a.role) { a.setActive(false).setVisible(false); if (a.body) a.body.enable = false; } });
    s.cameras.main.stopFollow();
  });
}

async function reset(page, weapon = 'rifle') {
  await page.evaluate((weaponId) => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player;
    const surface = s.terrainArt.snapshot().walkSurfaceY; const off = p.body.bottom - p.y;
    p.body.reset(620, surface - off); p.setVelocity(0, 0); p.facing = 1; p.aim.set(1, 0);
    p.health = p.maxHealth; p.invulnerableUntil = 0; p.inputLocked = false; p.setActive(true).setVisible(true);
    s.hurtPoseUntil = 0; s.recoilUntil = 0; s.grenadePoseUntil = 0; s.meleePoseUntil = 0;
    s.core.weapons.ammo[weaponId] = 99; s.core.weapons.selectWeapon(weaponId);
    s.cameras.main.centerOn(620, 465);
  }, weapon);
  await page.waitForTimeout(180);
}

async function sample(page, scenario, index, startedAt) {
  const data = await page.evaluate(() => {
    const s = window.__GAME__.scene.getScene('Game'); const p = s.core.player; const c = s.cameras.main;
    return {
      now: s.time.now, state: p.state, animation: p.anims.currentAnim?.key, texture: p.texture?.key,
      frame: Number(p.frame?.name), x: p.x, y: p.y, screenX: p.x - c.scrollX, screenY: p.y - c.scrollY,
      body: { height: p.body.height, sourceHeight: p.body.sourceHeight, bottom: p.body.bottom, offsetY: p.body.offset.y },
      transform: { angle: p.angle, scaleX: p.scaleX, scaleY: p.scaleY, alpha: p.alpha, flipX: p.flipX },
      weapon: s.core.weapons.currentWeapon, hurtPoseUntil: s.hurtPoseUntil,
      composite: p.getData('singleSpriteWeaponComposite'),
      continuity: p.getData('motionContinuity'),
    };
  });
  data.relativeMs = performance.now() - startedAt;
  const clip = { x: Math.max(0, Math.round(data.screenX - 120)), y: Math.max(0, Math.round(data.screenY - 120)), width: 240, height: 220 };
  const file = `${scenario}-${String(index).padStart(2, '0')}-${String(Math.round(data.relativeMs)).padStart(3, '0')}ms.png`;
  await page.screenshot({ path: path.join(OUT, file), clip });
  return { scenario, file, clip, ...data };
}

async function captureWindow(page, scenario, action, duration = 420, interval = 32) {
  const records = []; const startedAt = performance.now(); await action();
  let index = 0;
  while (performance.now() - startedAt <= duration) {
    records.push(await sample(page, scenario, index++, startedAt));
    const target = startedAt + index * interval;
    await page.waitForTimeout(Math.max(0, target - performance.now()));
  }
  return records;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await playwright(); const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror:${e.message}`)); page.on('console', (m) => m.type() === 'error' && errors.push(`console:${m.text()}`));
  await enter(page); const records = [];

  await reset(page, 'rifle');
  records.push(...await captureWindow(page, 'rifle-crouch-enter', async () => page.keyboard.down('KeyS')));
  records.push(...await captureWindow(page, 'rifle-crouch-exit', async () => page.keyboard.up('KeyS')));

  await reset(page, 'rifle');
  records.push(...await captureWindow(page, 'rifle-idle-hit', async () => page.evaluate(() => { const s = window.__GAME__.scene.getScene('Game'), p = s.core.player; p.takeDamage(1, { x: p.x + 100, y: p.y }); })));

  await reset(page, 'rifle'); await page.keyboard.down('KeyS'); await page.waitForTimeout(260);
  records.push(...await captureWindow(page, 'rifle-crouch-hit', async () => page.evaluate(() => { const s = window.__GAME__.scene.getScene('Game'), p = s.core.player; p.takeDamage(1, { x: p.x + 100, y: p.y }); })));
  await page.keyboard.up('KeyS');

  await reset(page, 'shotgun'); await page.keyboard.down('KeyD'); await page.waitForTimeout(260);
  records.push(...await captureWindow(page, 'shotgun-run-hit', async () => page.evaluate(() => { const s = window.__GAME__.scene.getScene('Game'), p = s.core.player; p.takeDamage(1, { x: p.x + 100, y: p.y }); })));
  await page.keyboard.up('KeyD');

  await reset(page, 'rocket'); await page.keyboard.down('KeyS'); await page.waitForTimeout(260);
  records.push(...await captureWindow(page, 'rocket-crouch-hit', async () => page.evaluate(() => { const s = window.__GAME__.scene.getScene('Game'), p = s.core.player; p.takeDamage(1, { x: p.x + 100, y: p.y }); })));
  await page.keyboard.up('KeyS');

  await browser.close();
  const failures = []; const check = (ok, message) => { if (!ok) failures.push(message); };
  const rows = (scenario) => records.filter((record) => record.scenario === scenario);
  const enterRows = rows('rifle-crouch-enter');
  const exitRows = rows('rifle-crouch-exit');
  const idleHit = rows('rifle-idle-hit');
  const crouchHit = rows('rifle-crouch-hit');
  const shotgunHit = rows('shotgun-run-hit');
  const rocketHit = rows('rocket-crouch-hit');
  check(enterRows.some((r) => r.animation === 'player:crouch-enter'), 'crouch-enter transition was not rendered');
  check(enterRows.at(-1)?.state === 'crouch' && enterRows.at(-1)?.animation === 'player:crouch', 'crouch-enter did not settle to crouch');
  check(exitRows.some((r) => r.animation === 'player:crouch-exit'), 'crouch-exit transition was not rendered');
  check(exitRows.at(-1)?.state === 'idle' && exitRows.at(-1)?.animation === 'player:idle', 'crouch-exit did not settle to idle');
  check([...enterRows, ...exitRows].every((r) => Math.abs(r.body.bottom - 588) <= 0.5), 'posture transition moved physics feet');
  check(idleHit.filter((r) => r.relativeMs <= 200).every((r) => r.state === 'idle'), 'idle hit leaked into run state');
  check(idleHit.every((r) => !(r.texture === 'player-movement-actions' && r.frame === 7)), 'horizontal ground-hurt frame rendered');
  check(crouchHit.filter((r) => r.relativeMs <= 170).every((r) => r.state === 'crouch' && Math.abs(r.body.height - 72) <= 0.5), 'crouch hit lost crouch body/state');
  check(crouchHit.every((r) => !(r.texture === 'player-movement-actions' && r.frame === 7)), 'crouch hit rendered horizontal frame');
  check(shotgunHit.filter((r) => r.relativeMs <= 200).every((r) => r.texture.startsWith('player-shotgun-') && r.composite?.active), 'shotgun hit changed to rifle/base sprite');
  check(rocketHit.filter((r) => r.relativeMs <= 170).every((r) => r.texture.startsWith('player-rocket-') && r.composite?.active && r.state === 'crouch'), 'rocket crouch hit changed weapon/posture');
  check(records.every((r) => Math.abs(r.transform.angle) <= 4.1), 'hit reaction angle exceeded stable limit');
  check(errors.length === 0, `browser errors: ${errors.join('; ')}`);
  const report = { generatedAt: new Date().toISOString(), phase: PHASE, ok: failures.length === 0, failures, errors, records };
  await fs.writeFile(path.join(OUT, 'runtime-evidence.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ phase: PHASE, ok: report.ok, failures, errors, records: records.length, out: path.relative(ROOT, OUT) }, null, 2));
  if (!report.ok) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exit(1); });
