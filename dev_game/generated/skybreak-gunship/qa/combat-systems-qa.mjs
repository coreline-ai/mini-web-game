import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { browserLaunchArgs } from './_browser-args.mjs';

const baseUrl = process.env.GAME_QA_URL || 'http://127.0.0.1:5187';
const qaUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}skipTutorial=1`;
const browser = await chromium.launch({ headless: true, args: browserLaunchArgs() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const point = async (x, y) => { const c = await page.locator('canvas').boundingBox(); return { x: c.x + x * c.width / 390, y: c.y + y * c.height / 844 }; };
const click = async (x, y) => { const p = await point(x, y); await page.mouse.click(p.x, p.y); };
const hold = async (x, y, ms) => { const p = await point(x, y); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); };
const check = (value, message) => { if (!value) throw new Error(message); };

await fs.mkdir('qa-captures', { recursive: true });
await page.goto(qaUrl, { waitUntil: 'domcontentloaded' });
await waitScene('Home'); await click(195, 625); await waitScene('Briefing'); await click(195, 766); await waitScene('Game');
await page.waitForTimeout(180);

const soldier = await page.evaluate(() => {
  const debug = globalThis.__SKYBREAK_DEBUG__; debug.clearTargets();
  const id = debug.spawn('rocketman', 82, 270); const target = debug.target(id);
  const states = [target.controller.state];
  debug.advanceController(id, 900); states.push(target.controller.state);
  const shot = debug.advanceController(id, 1250); states.push(target.controller.state);
  debug.advanceController(id, 90); states.push(target.controller.state);
  const hittableInCover = globalThis.__GAME__.scene.getScene('Game').getTargetAt(target.sprite.x, target.sprite.y, true) !== null;
  return { states, shot, hittableInCover };
});
check(JSON.stringify(soldier.states) === JSON.stringify(['expose', 'aim', 'fire', 'cover']), `soldier FSM mismatch: ${soldier.states}`);
check(soldier.shot?.rocket === true, 'rocketman FIRE transition did not emit a rocket attack');
check(soldier.hittableInCover === false, 'covered soldier remained hittable');

await page.evaluate(() => globalThis.__SKYBREAK_DEBUG__.clearTargets());
const rifleId = await page.evaluate(() => globalThis.__SKYBREAK_DEBUG__.spawn('rifleman', 96, 278));
await click(96, 320); await hold(104, 782, 430); await page.waitForTimeout(180);
const gunResult = await page.evaluate((id) => {
  const target = globalThis.__SKYBREAK_DEBUG__.target(id);
  return { active: target.active, heat: globalThis.__SKYBREAK_QA__.heat, combo: globalThis.__SKYBREAK_QA__.combo };
}, rifleId);
check(gunResult.active === false && gunResult.combo >= 2, `actual GUN input did not destroy the rifleman: ${JSON.stringify(gunResult)}`);

const overheat = await page.evaluate(() => {
  const debug = globalThis.__SKYBREAK_DEBUG__; debug.setHeat(96, false); debug.setAim(195, 400);
  const scene = globalThis.__GAME__.scene.getScene('Game'); scene.weapon.setGunHeld(true); scene.weapon.update(100); scene.weapon.setGunHeld(false);
  const locked = { heat: scene.weapon.heat, overheated: scene.weapon.overheated };
  debug.setHeat(40, true); debug.advanceWeapon(0);
  return { locked, recovered: !scene.weapon.overheated };
});
check(overheat.locked.heat === 100 && overheat.locked.overheated, 'heat 100 did not lock the gun');
check(overheat.recovered, 'heat 40 did not recover the gun');

await page.evaluate(() => globalThis.__SKYBREAK_DEBUG__.clearTargets());
const droneId = await page.evaluate(() => globalThis.__SKYBREAK_DEBUG__.spawn('drone', 286, 236));
await click(286, 278); await hold(286, 782, 500);
const ammoAfterCancel = await page.evaluate(() => globalThis.__SKYBREAK_QA__.ammo);
check(ammoAfterCancel === 4, '649ms-class incomplete lock consumed ammo');
await hold(286, 782, 760); await page.waitForTimeout(900);
const missileResult = await page.evaluate((id) => ({ ammo: globalThis.__SKYBREAK_QA__.ammo, active: globalThis.__SKYBREAK_DEBUG__.target(id).active }), droneId);
check(missileResult.ammo === 3 && missileResult.active === false, 'completed lock did not launch one homing missile');

const civilianId = await page.evaluate(() => globalThis.__SKYBREAK_DEBUG__.spawn('civilian', 292, 318));
await click(292, 360); await hold(286, 782, 760);
const civilianLockAmmo = await page.evaluate(() => globalThis.__SKYBREAK_QA__.ammo);
check(civilianLockAmmo === 3, 'missile locked a civilian');
await hold(104, 782, 150); await page.waitForTimeout(100);
const friendlyFire = await page.evaluate((id) => ({ strikes: globalThis.__SKYBREAK_QA__.civilianStrikes, active: globalThis.__SKYBREAK_DEBUG__.target(id).active }), civilianId);
check(friendlyFire.strikes === 1 && friendlyFire.active === false, 'civilian hit penalty did not apply exactly once');

const partState = await page.evaluate(() => {
  const debug = globalThis.__SKYBREAK_DEBUG__; debug.clearTargets(); const id = debug.spawn('apc', 195, 285); debug.setAim(195, 250);
  const target = debug.target(id); globalThis.__GAME__.scene.getScene('Game').damageTarget(target, 180, 'missile');
  return { turret: target.parts.turret, attackDisabled: target.attackDisabled, wheels: target.parts.wheels, engine: target.parts.engine };
});
check(partState.turret <= 0 && partState.attackDisabled, 'APC turret destruction did not stop attacks');

const bossPhases = await page.evaluate(() => {
  const debug = globalThis.__SKYBREAK_DEBUG__; debug.forceBossPhase(1); const p1 = debug.get().bossPhase;
  debug.forceBossPhase(2); const p2 = debug.get().bossPhase;
  debug.forceBossPhase(3); const p3 = debug.get().bossPhase;
  return [p1, p2, p3];
});
check(JSON.stringify(bossPhases) === JSON.stringify([1, 2, 3]), `boss phase sequence mismatch: ${bossPhases}`);
const bossPodEffect = await page.evaluate(() => {
  const debug = globalThis.__SKYBREAK_DEBUG__; const scene = globalThis.__GAME__.scene.getScene('Game');
  const boss = scene.targets.find((target) => target.active && target.type === 'boss');
  boss.parts.pod = 0; boss.controller.attackClock = 0;
  const attack = boss.controller.update(16, scene.time.now);
  return { missile: Boolean(attack?.missile), damage: attack?.damage || 0 };
});
check(bossPodEffect.missile === false && bossPodEffect.damage > 0, 'destroyed boss pod still emitted missile payload');
const weaponExclusion = await page.evaluate(() => {
  const weapon = globalThis.__GAME__.scene.getScene('Game').weapon;
  weapon.cooldown = 0; weapon.ammo = Math.max(1, weapon.ammo);
  weapon.setGunHeld(true); weapon.beginMissile(); const missileBlockedByGun = !weapon.missileHeld;
  weapon.setGunHeld(false); weapon.beginMissile(); weapon.setGunHeld(true); const gunBlockedByMissile = !weapon.gunHeld;
  weapon.endMissile();
  return { missileBlockedByGun, gunBlockedByMissile };
});
check(weaponExclusion.missileBlockedByGun && weaponExclusion.gunBlockedByMissile, 'GUN/MISSILE mutual exclusion policy failed');
await page.screenshot({ path: 'qa-captures/combat-boss-phase3.png' });

await page.evaluate(() => globalThis.__SKYBREAK_DEBUG__.forceWin());
await waitScene('Result');
await page.evaluate(() => globalThis.__GAME__.scene.start('Game'));
await waitScene('Game'); await page.evaluate(() => globalThis.__SKYBREAK_DEBUG__.forceLose('CONVOY DESTROYED'));
await waitScene('GameOver');

const assertions = {
  soldierFourStateFsm: true,
  coverDisablesHits: true,
  actualGunKill: true,
  overheatBoundaries: true,
  lockCancelNoAmmo: true,
  homingMissileConsumesOne: true,
  civilianExcludedFromLock: true,
  civilianPenaltyOnce: true,
  apcPartEffect: true,
  bossThreePhases: true,
  bossPodDisablesMissiles: true,
  weaponMutualExclusion: true,
  winAndLossReached: true,
};
const report = { ok: browserErrors.length === 0, assertions, browserErrors, soldier, gunResult, overheat, missileResult, partState, bossPhases, bossPodEffect, weaponExclusion };
await fs.writeFile('qa-captures/combat-systems-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
