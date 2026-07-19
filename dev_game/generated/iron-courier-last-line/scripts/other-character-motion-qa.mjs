#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'other-character-motion');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';
const viewports = [{ name: '844x390', width: 844, height: 390 }, { name: '1280x720', width: 1280, height: 720 }];

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function enterGame(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find(({ id }) => id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game' && window.__IRON_COURIER_DEBUG__?.get, null, { timeout: 15000 });
  await page.waitForTimeout(250);
}

async function installHarness(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.cameras.main.stopFollow();
    scene.cameras.main.setScroll(4000, 0);
    scene.core.player.setPosition(4050, 520);
    scene.core.player.body?.reset(4050, 520);
    scene.core.player.invulnerableUntil = Number.POSITIVE_INFINITY;
    scene.core.player.setVisible(false);

    const encounters = scene.core.encounters;
    encounters.enemyGroup.getChildren().slice().forEach(actor => actor.destroy());
    encounters.bosses = [];
    encounters.current = null;
    encounters.complete = false;
    encounters.setEncounters([{ id: 'qa-other-characters', triggerX: 0, gateX: 4900, enemies: [
      { role: 'basic', count: 1, x: 4150, y: 520, options: { texture: 'enemy-rifle-actions', width: 104, height: 118, tint: 0xffffff, health: 999 } },
      { role: 'shield', count: 1, x: 4350, y: 520, options: { texture: 'enemy-shield-actions', width: 120, height: 126, tint: 0xffffff, health: 999 } },
      { role: 'grenadier', count: 1, x: 4560, y: 520, options: { texture: 'enemy-grenadier-actions', width: 109, height: 122, tint: 0xffffff, health: 999 } },
      { role: 'drone', count: 1, x: 4770, y: 430, options: { texture: 'enemy-drone-actions', width: 133, height: 72, tint: 0xffffff, health: 999 } },
    ] }]);
    encounters.begin(0, { force: true });
    const enemies = encounters.current.spawned;
    enemies.forEach(enemy => {
      enemy.target = { active: false };
      enemy.setVelocity(0, 0).setFlipX(true).setDepth(100);
      enemy.visualLockUntil = 0;
      if (enemy.config.flying) enemy.body.setAllowGravity(false);
    });

    const alphaContract = (key, cols, rows) => {
      const source = scene.textures.get(key).source[0].image;
      const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(source, 0, 0);
      const data = ctx.getImageData(0, 0, source.width, source.height).data;
      const fw = source.width / cols; const fh = source.height / rows; const frames = [];
      for (let i = 0; i < cols * rows; i += 1) {
        const ox = (i % cols) * fw; const oy = Math.floor(i / cols) * fh;
        let left = fw; let top = fh; let right = -1; let bottom = -1; let area = 0;
        for (let y = 0; y < fh; y += 1) for (let x = 0; x < fw; x += 1) {
          if (data[((oy + y) * source.width + ox + x) * 4 + 3] < 24) continue;
          area += 1; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        frames.push(right < left ? null : { left, top, right: right + 1, bottom: bottom + 1, width: right - left + 1, height: bottom - top + 1, centerX: (left + right + 1) / 2, centerY: (top + bottom + 1) / 2, area });
      }
      return { width: source.width, height: source.height, frames };
    };

    const enemySheets = {};
    for (const key of ['enemy-rifle-actions', 'rifle-extension-a', 'rifle-extension-b', 'enemy-shield-actions', 'shield-extension-a', 'shield-extension-b', 'enemy-grenadier-actions', 'grenadier-extension-a', 'enemy-drone-actions', 'drone-extension-a']) {
      enemySheets[key] = alphaContract(key, 4, key.includes('extension') ? 3 : 2);
    }
    const rescueSheets = Object.fromEntries(['technician', 'medic', 'artillery'].map(type => [type, alphaContract(`rescue-${type}`, 4, 2)]));
    const evidence = window.__OTHER_CHARACTER_QA__ = { scene, enemies, enemySheets, rescueSheets, enemyShots: [], samples: {} };
    scene.core.weapons.on('enemyFired', ({ owner, projectile, direction, muzzle }) => {
      const flash = [...scene.transientVfx].filter(item => item?.active && item.getData?.('enemyMuzzleVfx')?.weaponId === projectile.weaponId).at(-1);
      evidence.enemyShots.push({
        role: owner.role ?? owner.constructor.name,
        weaponId: projectile.weaponId,
        direction: { x: direction.x, y: direction.y }, muzzle,
        projectile: { x: projectile.x, y: projectile.y },
        flash: flash ? { x: flash.x, y: flash.y, angle: flash.angle, flipX: flash.flipX, originX: flash.originX, data: flash.getData('enemyMuzzleVfx') } : null,
      });
    });
    const repairAnim = scene.anims.get('transport:repair');
    return { enemyCount: enemies.length, flyingGravity: enemies.find(enemy => enemy.role === 'drone')?.body?.allowGravity, transportRepair: { frameRate: repairAnim?.frameRate, duration: repairAnim?.duration, msPerFrame: repairAnim?.msPerFrame, frames: repairAnim?.frames?.map(frame => ({ key: frame.textureKey, frame: frame.textureFrame })) } };
  });
}

async function screenshot(page, viewportName, name) {
  const destination = path.join(OUT, viewportName, `${name}.png`);
  await page.screenshot({ path: destination });
  return path.relative(ROOT, destination);
}

async function enemyPass(page, viewportName, shots) {
  const stateSets = {
    idle: { basic: 'idle', shield: 'idle', grenadier: 'idle', drone: 'hover' },
    locomotion: { basic: 'run', shield: 'march', grenadier: 'run', drone: 'bank-right' },
    telegraph: { basic: 'aim', shield: 'guard', grenadier: 'windup', drone: 'charge' },
  };
  for (const [label, states] of Object.entries(stateSets)) {
    await page.evaluate(states => {
      const { enemies } = window.__OTHER_CHARACTER_QA__;
      enemies.forEach(enemy => { enemy.visualLockUntil = 0; enemy.playState(states[enemy.role], true); });
    }, states);
    await page.waitForTimeout(label === 'locomotion' ? 360 : 180);
    shots.push(await screenshot(page, viewportName, `enemy-${label}`));
  }
  await page.evaluate(() => {
    const { scene, enemies } = window.__OTHER_CHARACTER_QA__;
    enemies.forEach(enemy => { enemy.visualLockUntil = 0; enemy.attack(scene.time.now, -150, enemy.role === 'drone' ? 80 : 0); });
  });
  await page.waitForTimeout(70);
  shots.push(await screenshot(page, viewportName, 'enemy-attack'));
  await page.waitForTimeout(500);
  shots.push(await screenshot(page, viewportName, 'enemy-recovery'));
  return page.evaluate(() => {
    const { enemies, enemyShots } = window.__OTHER_CHARACTER_QA__;
    return {
      gravity: Object.fromEntries(enemies.map(enemy => [enemy.role, enemy.body?.allowGravity])),
      states: Object.fromEntries(enemies.map(enemy => [enemy.role, { visualState: enemy.visualState, animation: enemy.anims.currentAnim?.key, texture: enemy.texture?.key, frame: enemy.frame?.name }])),
      shots: enemyShots,
    };
  });
}

async function rescuePass(page, viewportName, shots) {
  const setup = await page.evaluate(() => {
    const { scene, enemies } = window.__OTHER_CHARACTER_QA__;
    enemies.forEach(enemy => enemy.setVisible(false));
    const targets = scene.core.rescues.group.getChildren().filter(target => target.active);
    targets.forEach((target, index) => {
      target.setPosition(4200 + index * 240, 572).setVisible(true).setDepth(100);
      target.marker?.setPosition(target.x, target.y - 84).setVisible(true).setDepth(101);
      target.visualLockUntil = 0;
      const state = target.rescueType === 'technician' ? 'struggle' : target.rescueType === 'medic' ? 'signal' : 'radio';
      target.play(`rescue-${target.rescueType}:${state}`, false);
    });
    return targets.map(target => ({ type: target.rescueType, x: target.x, y: target.y, animation: target.anims.currentAnim?.key }));
  });
  await page.waitForTimeout(80);
  shots.push(await screenshot(page, viewportName, 'rescue-secondary'));
  const sequence = await page.evaluate(async () => {
    const { scene } = window.__OTHER_CHARACTER_QA__;
    const target = scene.core.rescues.group.getChildren().find(item => item.active && item.rescueType === 'technician');
    target.beginRescueSequence();
    return { type: target.rescueType };
  });
  await page.waitForTimeout(340);
  shots.push(await screenshot(page, viewportName, 'rescue-ability'));
  await page.waitForTimeout(500);
  const runtime = await page.evaluate(() => {
    const { scene } = window.__OTHER_CHARACTER_QA__;
    return scene.core.rescues.group.getChildren().map(target => ({ type: target.rescueType, active: target.active, visible: target.visible, animation: target.anims.currentAnim?.key, x: target.x, y: target.y }));
  });
  return { setup, sequence, runtime };
}

async function transportPass(page, viewportName, shots) {
  await page.evaluate(() => {
    const { scene } = window.__OTHER_CHARACTER_QA__;
    scene.core.rescues.group.getChildren().forEach(target => { target.setVisible(false); target.marker?.setVisible(false); });
    const transport = scene.core.transport;
    transport.setPosition(4400, 559).setVisible(true).setActive(true).setDepth(100);
    transport.health = transport.maxHealth;
    transport.visualLockUntil = 0;
    window.__OTHER_CHARACTER_QA__.repairSeen = [];
    transport.on('animationupdate', (_animation, frame) => window.__OTHER_CHARACTER_QA__.repairSeen.push({ key: frame.textureKey, frame: Number(frame.textureFrame) }));
    transport.repair(0);
  });
  const repairFrames = [];
  for (let t = 0; t <= 760; t += 70) {
    repairFrames.push(await page.evaluate(t => { const v = window.__OTHER_CHARACTER_QA__.scene.core.transport; return { t, key: v.texture?.key, frame: Number(v.frame?.name), state: v.visualState }; }, t));
    if (t === 280) shots.push(await screenshot(page, viewportName, 'transport-repair'));
    await page.waitForTimeout(70);
  }
  await page.evaluate(() => { const { scene } = window.__OTHER_CHARACTER_QA__; const v = scene.core.transport; v.health = 0; v.visualLockUntil = scene.time.now + 1580; v.playVisual('destroyed', true); });
  const destroyedFrames = [];
  for (let t = 0; t <= 1650; t += 90) {
    destroyedFrames.push(await page.evaluate(t => { const v = window.__OTHER_CHARACTER_QA__.scene.core.transport; return { t, key: v.texture?.key, frame: Number(v.frame?.name), playing: v.anims?.isPlaying ?? false }; }, t));
    if (t === 360 || t === 1080) shots.push(await screenshot(page, viewportName, `transport-destroyed-${t}`));
    await page.waitForTimeout(90);
  }
  return page.evaluate(({ repairFrames, destroyedFrames }) => {
    const v = window.__OTHER_CHARACTER_QA__.scene.core.transport;
    return { repairFrames, repairSeen: window.__OTHER_CHARACTER_QA__.repairSeen, destroyedFrames, body: { width: v.body.width, height: v.body.height, allowGravity: v.body.allowGravity }, display: { width: v.displayWidth, height: v.displayHeight } };
  }, { repairFrames, destroyedFrames });
}

async function bossPass(page, viewportName, shots) {
  const setup = await page.evaluate(() => {
    const { scene } = window.__OTHER_CHARACTER_QA__;
    scene.core.transport.setVisible(false).setActive(false);
    scene.core.player.setPosition(4050, 520).setVisible(false).setActive(true);
    scene.core.player.body?.reset(4050, 520);
    const crane = scene.core.spawnBoss('crane', 4350, 460, { texture: 'boss-crane-actions', width: 300, height: 240, health: 100, tint: 0xffffff });
    const mole = scene.core.spawnBoss('ironMole', 4720, 470, { texture: 'boss-iron-mole-actions', width: 480, height: 260, health: 120, tint: 0xffffff });
    crane.setDepth(100); mole.setDepth(100);
    crane.update(scene.time.now + 1); mole.update(scene.time.now + 1);
    scene.bindBoss(mole);
    window.__OTHER_CHARACTER_QA__.bosses = { crane, mole };
    return {
      crane: { flipX: crane.flipX, body: { width: crane.body.width, height: crane.body.height, allowGravity: crane.body.allowGravity }, burst: crane.muzzlePosition({ x: -1, y: 0 }, 'crane-burst'), hook: crane.muzzlePosition({ x: -1, y: 0 }, 'crane-hook') },
      mole: { flipX: mole.flipX, body: { width: mole.body.width, height: mole.body.height, allowGravity: mole.body.allowGravity }, cannon: mole.muzzlePosition({ x: -1, y: 0 }, 'mole-cannon'), missile: mole.muzzlePosition({ x: -1, y: 0 }, 'mole-missile') },
    };
  });
  await page.waitForTimeout(100);
  shots.push(await screenshot(page, viewportName, 'boss-idle'));
  await page.evaluate(() => {
    const { scene, bosses: { crane, mole } } = window.__OTHER_CHARACTER_QA__;
    scene.core.weapons.fireEnemyProjectile(crane, { x: -1, y: 0 }, { weaponId: 'crane-burst', speed: 350, damage: 1 });
    scene.core.weapons.fireEnemyProjectile(mole, { x: -1, y: 0 }, { weaponId: 'mole-cannon', speed: 400, damage: 1 });
  });
  await page.waitForTimeout(60);
  shots.push(await screenshot(page, viewportName, 'boss-fire-sockets'));
  const charge = await page.evaluate(async () => {
    const { bosses: { mole } } = window.__OTHER_CHARACTER_QA__;
    mole.phase = 2; mole.state = 'combat'; mole.health = 80; mole.executeDrillCharge(4300, 2, 520);
    return { startX: mole.x, state: mole.state };
  });
  await page.waitForTimeout(240);
  charge.mid = await page.evaluate(() => { const m = window.__OTHER_CHARACTER_QA__.bosses.mole; return { x: m.x, state: m.state, contactDamage: m.contactDamage }; });
  shots.push(await screenshot(page, viewportName, 'boss-drill-charge'));
  await page.waitForTimeout(500);
  charge.end = await page.evaluate(() => { const m = window.__OTHER_CHARACTER_QA__.bosses.mole; return { x: m.x, state: m.state, contactDamage: m.contactDamage }; });
  const hazard = await page.evaluate(() => {
    const { scene, bosses: { mole } } = window.__OTHER_CHARACTER_QA__;
    scene.core.player.invulnerableUntil = 0;
    scene.core.player.setPosition(mole.x, mole.y).setVisible(false);
    scene.core.player.body?.reset(mole.x, mole.y);
    const before = scene.core.player.health;
    mole.emit('hazardPulse', { boss: mole, radius: 240, damage: 1, delay: 120 });
    return { before };
  });
  await page.waitForTimeout(210);
  hazard.after = await page.evaluate(() => window.__OTHER_CHARACTER_QA__.scene.core.player.health);
  await page.evaluate(() => {
    const { bosses: { mole } } = window.__OTHER_CHARACTER_QA__;
    mole.state = 'combat'; mole.health = 40; mole.phase = 2; mole.takeDamage(999, { x: mole.x - 100 });
  });
  await page.waitForTimeout(720);
  const fatal = await page.evaluate(() => { const m = window.__OTHER_CHARACTER_QA__.bosses.mole; return { state: m.state, phase: m.phase, health: m.health, visualState: m.visualState, texture: m.texture?.key, frame: m.frame?.name, active: m.active, visible: m.visible }; });
  shots.push(await screenshot(page, viewportName, 'boss-fatal-no-revival'));
  return { setup, charge, hazard, fatal, fired: await page.evaluate(() => window.__OTHER_CHARACTER_QA__.enemyShots.filter(shot => /Crane|Mole/.test(shot.role))) };
}

function validate(results) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const groundSheets = ['enemy-rifle-actions', 'rifle-extension-a', 'rifle-extension-b', 'enemy-shield-actions', 'shield-extension-a', 'shield-extension-b', 'enemy-grenadier-actions', 'grenadier-extension-a'];
  for (const result of results) {
    const tag = result.viewport.name;
    check(result.errors.length === 0, `${tag}: browser errors: ${result.errors.join(', ')}`);
    check(result.harness.enemyCount === 4, `${tag}: controlled enemy count`);
    check(result.harness.flyingGravity === false && result.enemy.gravity.drone === false, `${tag}: drone gravity restored`);
    for (const key of groundSheets) {
      const frames = result.assets.enemySheets[key].frames.filter(Boolean);
      const bottoms = frames.map(frame => frame.bottom);
      check(Math.max(...bottoms) - Math.min(...bottoms) <= 2, `${tag}: ${key} baseline delta ${Math.max(...bottoms) - Math.min(...bottoms)}`);
    }
    const shieldAreas = result.assets.enemySheets['shield-extension-b'].frames.map(frame => frame?.area ?? 0).sort((a, b) => a - b);
    const median = shieldAreas[Math.floor(shieldAreas.length / 2)];
    check(shieldAreas[0] / median >= 0.35, `${tag}: shield extension still loses pose area (${shieldAreas[0]}/${median})`);
    for (const key of ['enemy-drone-actions', 'drone-extension-a']) {
      const centers = result.assets.enemySheets[key].frames.filter(Boolean).map(frame => frame.centerY);
      check(Math.max(...centers) - Math.min(...centers) <= 2, `${tag}: ${key} center drift`);
    }
    for (const [type, sheet] of Object.entries(result.assets.rescueSheets)) {
      const frames = sheet.frames.filter(Boolean);
      const bottoms = frames.map(frame => frame.bottom); const centers = frames.map(frame => frame.centerX);
      check(Math.max(...bottoms) - Math.min(...bottoms) <= 2, `${tag}: rescue ${type} baseline`);
      check(Math.max(...centers) - Math.min(...centers) <= 2, `${tag}: rescue ${type} root center`);
    }
    const roleShots = role => result.enemy.shots.filter(shot => shot.role === role);
    check(roleShots('basic').length === 1, `${tag}: rifle shot count`);
    check(roleShots('shield').length === 0, `${tag}: shield still fires projectile`);
    check(roleShots('grenadier').length === 1 && roleShots('grenadier')[0].flash === null, `${tag}: grenade uses rifle flash`);
    check(roleShots('drone').length === 1, `${tag}: drone shot count`);
    check([...roleShots('basic'), ...roleShots('drone')].every(shot => shot.flash && shot.flash.flipX === false && Math.abs(shot.flash.originX - 0.039) < 0.002), `${tag}: left muzzle double reversal/socket origin`);
    check(result.enemy.states.shield.visualState === 'guard', `${tag}: shield recovery unreachable`);
    check(result.enemy.states.grenadier.visualState === 'recover', `${tag}: grenadier recovery unreachable`);
    check(result.rescue.setup.every(target => /struggle|signal|radio/.test(target.animation || '')), `${tag}: rescue secondary states unreachable`);
    const repairPairs = new Set(result.transport.repairSeen.map(frame => `${frame.key}:${frame.frame}`));
    check(repairPairs.has('transport-extension-b:14'), `${tag}: repair final frame is cut`);
    check(result.transport.destroyedFrames[0]?.key === 'transport-extension-c', `${tag}: destroyed sequence does not start intact`);
    const destroyedLast = result.transport.destroyedFrames.at(-1);
    check(destroyedLast?.key === 'vehicle-actions' && destroyedLast.frame === 7, `${tag}: destroyed sequence does not end wrecked`);
    check(result.transport.body.width >= 310 && result.transport.body.width <= 350 && result.transport.body.height >= 80 && result.transport.body.height <= 100, `${tag}: transport body outside APC contract ${result.transport.body.width}x${result.transport.body.height}`);
    check(result.boss.setup.crane.body.width < 260 && result.boss.setup.crane.body.height < 180 && result.boss.setup.crane.body.allowGravity === false, `${tag}: crane body/gravity`);
    check(result.boss.setup.mole.body.width < 450 && result.boss.setup.mole.body.height < 150 && result.boss.setup.mole.body.allowGravity === false, `${tag}: mole body/gravity`);
    check(Math.abs(result.boss.setup.crane.burst.x - 4350) > 60 && Math.abs(result.boss.setup.mole.cannon.x - 4720) > 100, `${tag}: boss sockets still centered`);
    check(Math.abs(result.boss.charge.mid.x - result.boss.charge.startX) > 40 && result.boss.charge.end.state === 'combat', `${tag}: drill charge no-op/recovery`);
    check(result.boss.charge.mid.contactDamage === 2 && result.boss.charge.end.contactDamage === 3, `${tag}: drill charge contact damage is not scoped`);
    check(result.boss.hazard.after < result.boss.hazard.before, `${tag}: hazard pulse no-op`);
    check(result.boss.fatal.state === 'defeated' && result.boss.fatal.health === 0 && result.boss.fatal.visualState === 'destroyed', `${tag}: fatal phase callback revived mole`);
  }
  return failures;
}

async function runViewport(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  await enterGame(page);
  const harness = await installHarness(page);
  const assets = await page.evaluate(() => ({ enemySheets: window.__OTHER_CHARACTER_QA__.enemySheets, rescueSheets: window.__OTHER_CHARACTER_QA__.rescueSheets }));
  const screenshots = [];
  const enemy = await enemyPass(page, viewport.name, screenshots);
  const rescue = await rescuePass(page, viewport.name, screenshots);
  const transport = await transportPass(page, viewport.name, screenshots);
  const boss = await bossPass(page, viewport.name, screenshots);
  await context.close();
  return { viewport, errors, harness, assets, enemy, rescue, transport, boss, screenshots };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const results = [];
  for (const viewport of viewports) results.push(await runViewport(browser, viewport));
  await browser.close();
  const failures = validate(results);
  const report = { generatedAt: new Date().toISOString(), baseUrl, ok: failures.length === 0, failures, results };
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, failures, report: path.relative(ROOT, path.join(OUT, 'report.json')), screenshots: results.flatMap(result => result.screenshots) }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
