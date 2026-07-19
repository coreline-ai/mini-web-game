#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'player-fire-polish');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';
const viewports = [{ name: '844x390', width: 844, height: 390 }, { name: '1280x720', width: 1280, height: 720 }];

async function playwright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}
async function enter(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const point = await page.evaluate(() => { const i = window.__GAME_LAYOUT_BOUNDS__.items.find(v => v.id === 'home-play'); return { x: i.x + i.width / 2, y: i.y + i.height / 2 }; });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game' && window.__IRON_COURIER_DEBUG__?.get, null, { timeout: 15000 });
  await page.waitForTimeout(250);
}
async function install(page) {
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    // Keep combat damage from replacing the animation under test; all control
    // and firing actions below remain real keyboard events.
    scene.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
    const evidence = window.__PLAYER_FIRE_POLISH_QA__ = { active: null, samples: [], shots: [], trails: [], assets: null };
    scene.events.on('postupdate', () => {
      if (!evidence.active) return;
      const p = scene.core.player;
      evidence.samples.push({ label: evidence.active, at: scene.elapsedMs, state: p.state, texture: p.texture?.key, frame: Number(p.frame?.name), animation: p.anims.currentAnim?.key, aim: { x: p.aim.x, y: p.aim.y }, recoilState: scene.recoilVisualState, feetY: p.y });
    });
    scene.core.weapons.on('fired', ({ owner, weaponId, aim, muzzle, spawn, projectiles }) => {
      const flash = [...scene.transientVfx].filter(v => v?.getData?.('playerMuzzleVfx')).at(-1);
      evidence.shots.push({ label: evidence.active, at: scene.elapsedMs, weaponId, state: owner.state, aim, muzzle, spawn, owner: { x: owner.x, y: owner.y }, texture: owner.texture?.key, animation: owner.anims.currentAnim?.key, flash: flash ? { x: flash.x, y: flash.y, angle: flash.angle, flipX: flash.flipX, originX: flash.originX, count: [...scene.transientVfx].filter(v => v?.getData?.('playerMuzzleVfx')).length } : null, projectileCount: projectiles?.length ?? 0 });
    });
    scene.core.pool.on('fired', p => {
      if (p.faction !== 'player') return;
      const record = { label: evidence.active, at: scene.elapsedMs, initialTrail: p.trail.visible, weaponId: p.weaponId, launch: { x: p.x, y: p.y }, laterTrail: null };
      evidence.trails.push(record);
      scene.time.delayedCall(80, () => { record.laterTrail = Boolean(p.active && p.trail.visible); });
    });
    const alphaContract = (key, cols, rows) => {
      const source = scene.textures.get(key).source[0].image;
      const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(source, 0, 0);
      const data = ctx.getImageData(0, 0, source.width, source.height).data; const fw = source.width / cols; const fh = source.height / rows; const frames = [];
      for (let i = 0; i < cols * rows; i += 1) {
        const ox = (i % cols) * fw; const oy = Math.floor(i / cols) * fh; let l = fw, t = fh, r = -1, b = -1;
        for (let y = 0; y < fh; y += 1) for (let x = 0; x < fw; x += 1) if (data[((oy + y) * source.width + ox + x) * 4 + 3] >= 24) { l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); }
        frames.push(r < l ? null : { left: l, top: t, right: r + 1, bottom: b + 1, width: r - l + 1, height: b - t + 1 });
      }
      return { width: source.width, height: source.height, frames };
    };
    evidence.assets = { shoot: alphaContract('player-shoot-polished', 4, 3), movement: alphaContract('player-movement-actions', 4, 2) };
  });
}
async function scenario(page, name, keys, hold = 560) {
  await page.evaluate(label => { window.__PLAYER_FIRE_POLISH_QA__.active = label; }, name);
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(hold);
  const shot = path.join(OUT, `${await page.evaluate(() => `${innerWidth}x${innerHeight}`)}-${name}.png`);
  await page.screenshot({ path: shot });
  // End evidence collection before releasing a multi-key chord. Otherwise a
  // render frame between key-up events is mislabeled as held run-fire.
  await page.evaluate(() => { window.__PLAYER_FIRE_POLISH_QA__.active = null; });
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  await page.waitForTimeout(310);
  return path.relative(ROOT, shot);
}
async function run(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console:${m.text()}`); });
  await enter(page); await install(page);
  const screenshots = [];
  screenshots.push(await scenario(page, 'forward', ['KeyJ'], 680));
  screenshots.push(await scenario(page, 'up', ['KeyW', 'KeyJ'], 460));
  screenshots.push(await scenario(page, 'run-diagonal', ['KeyD', 'KeyW', 'KeyJ'], 460));
  screenshots.push(await scenario(page, 'crouch-forward', ['KeyS', 'KeyJ'], 460));
  screenshots.push(await scenario(page, 'run-left', ['KeyA', 'KeyJ'], 420));
  const evidence = await page.evaluate(() => window.__PLAYER_FIRE_POLISH_QA__);
  await context.close(); return { viewport: vp, errors, screenshots, evidence };
}
function validate(results) {
  const failures = [];
  const check = (ok, msg) => { if (!ok) failures.push(msg); };
  for (const result of results) {
    const tag = result.viewport.name; const e = result.evidence;
    check(result.errors.length === 0, `${tag}: browser errors ${result.errors.join(', ')}`);
    check(e.assets.shoot.width === 1536 && e.assets.shoot.height === 1152, `${tag}: polished sheet dimensions`);
    const shootFeet = e.assets.shoot.frames.map(f => f.bottom);
    check(Math.max(...shootFeet) - Math.min(...shootFeet) <= 4, `${tag}: firing feet delta ${Math.max(...shootFeet) - Math.min(...shootFeet)}px`);
    check([0, 1, 4].every(i => e.assets.movement.frames[i].bottom === 364), `${tag}: grounded movement baseline is not 364`);
    const shots = label => e.shots.filter(s => s.label === label);
    const samples = label => e.samples.filter(s => s.label === label);
    const forwardShots = shots('forward'); check(forwardShots.length >= 4, `${tag}: forward automatic shots <4`);
    const start = forwardShots[0]?.at ?? Infinity;
    const forwardLive = samples('forward').filter(s => s.at >= start + 16);
    check(forwardLive.length > 0 && forwardLive.every(s => s.texture === 'player-shoot-polished'), `${tag}: idle/foreign face entered held fire`);
    check(forwardShots.every(s => s.flash && s.flash.count === 1 && Math.abs(s.flash.originX - 0.039) < 0.002), `${tag}: muzzle flash overlap/origin`);
    check(forwardShots.every(s => Math.hypot(s.spawn.x - s.muzzle.x, s.spawn.y - s.muzzle.y) >= 20), `${tag}: projectile starts inside barrel/flash`);
    const upShots = shots('up'); check(upShots.length > 0 && upShots.every(s => s.aim.y < -0.98), `${tag}: stationary UP is not vertical`);
    check(samples('up').some(s => s.animation === 'player:shoot-up' && s.texture === 'player-shoot-polished'), `${tag}: shoot-up animation unreachable`);
    const diagonal = shots('run-diagonal'); check(diagonal.length > 0 && diagonal.every(s => s.aim.y < -0.68 && s.aim.y > -0.73), `${tag}: moving diagonal aim`);
    check(samples('run-diagonal').filter(s => s.state === 'run' && s.at >= (diagonal[0]?.at ?? 0) + 16).every(s => s.texture === 'player-run-fire-actions'), `${tag}: running fire does not preserve dedicated run-fire pose`);
    const crouch = shots('crouch-forward'); check(crouch.length > 0 && crouch.every(s => Math.abs(s.aim.y) < 0.001), `${tag}: crouch still fires down`);
    check(samples('crouch-forward').some(s => s.state === 'crouch' && s.texture === 'player-movement-actions'), `${tag}: crouch visual/body mismatch`);
    const left = shots('run-left'); check(left.length > 0 && left.every(s => s.aim.x < -0.98), `${tag}: left shot aim missing`);
    check(left.every(s => s.flash && Math.abs(Math.abs(s.flash.angle) - 180) < 1 && s.flash.flipX === false), `${tag}: left flash double reversal`);
    check(e.trails.filter(t => t.label).every(t => t.initialTrail === false), `${tag}: projectile trail appears inside player`);
    check(!e.samples.some(s => /^player-extension-/.test(s.texture || '')), `${tag}: legacy identity sheet rendered`);
  }
  return failures;
}
async function main() {
  await fs.mkdir(OUT, { recursive: true }); const { chromium } = await playwright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--no-sandbox'] }); const results = [];
  for (const vp of viewports) results.push(await run(browser, vp));
  await browser.close(); const failures = validate(results); const report = { generatedAt: new Date().toISOString(), baseUrl, ok: failures.length === 0, failures, results };
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, failures, report: path.relative(ROOT, path.join(OUT, 'report.json')), screenshots: results.flatMap(r => r.screenshots) }, null, 2));
  if (failures.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
