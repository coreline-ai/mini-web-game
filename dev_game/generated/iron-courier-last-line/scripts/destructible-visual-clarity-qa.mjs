#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'destructible-visual-clarity');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';

async function playwright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME ?? '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function enter(page) {
  await page.goto(`${baseUrl}/?qa=destructible-visual-clarity`, { waitUntil: 'networkidle' });
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
  const { chromium } = await playwright();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  await enter(page);
  const evidence = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.player.invulnerableUntil = Infinity;
    scene.core.encounters.update = () => {};
    scene.enforceEncounterGate = () => {};
    scene.core.encounters.enemyGroup.getChildren().forEach((enemy) => enemy.disableBody?.(true, true));
    const destructibles = scene.core.destruction.props.getChildren().filter((item) => item.active);
    const targetPair = destructibles.filter((item) => item.x >= 1050 && item.x <= 1230 && !item.getData('environmentDestructibleId'));
    const primaryTargetIds = new Set(['warning-panel-drum', 'warning-panel-lockbox', 'cable-hook-cache']);
    const environmentTargets = destructibles.filter((item) => primaryTargetIds.has(item.getData('environmentDestructibleId')));
    const roleTargets = destructibles.filter((item) => String(item.getData('environmentDestructibleId') ?? '').startsWith('environment-role-'));
    const environment = scene.environmentProps.props;
    const overlaps = [];
    for (const prop of environment) {
      for (const target of destructibles) {
        const clearance = Math.abs(prop.x - target.x) - (prop.displayWidth + target.displayWidth) / 2;
        if (clearance < 18) overlaps.push({ prop: prop.texture.key, propX: prop.x, target: target.texture.key, targetX: target.x, clearance });
      }
    }
    const player = scene.core.player; const groundY = scene.terrainArt.snapshot().walkSurfaceY;
    const offset = player.body.bottom - player.y;
    player.body.reset(820, groundY - offset); player.setVelocity(0, 0); player.facing = 1; player.aim.set(1, 0);
    scene.core.weapons.selectWeapon('rifle'); scene.core.weapons.ammo.rifle = Infinity; scene.core.weapons.nextFireByOwner = new WeakMap();
    scene.cameras.main.stopFollow(); scene.cameras.main.centerOn(1120, 360);
    window.__DESTRUCTIBLE_CLARITY_QA__ = { detonations: [], fires: [], impacts: [], expires: [], flightSamples: [] };
    scene.core.destruction.on('detonated', ({ prop, x, y }) => window.__DESTRUCTIBLE_CLARITY_QA__.detonations.push({ id: prop.getData('environmentDestructibleId') ?? null, key: prop.texture.key, x, y, at: scene.time.now }));
    scene.core.weapons.on('fired', (event) => window.__DESTRUCTIBLE_CLARITY_QA__.fires.push({ weaponId: event.weaponId, muzzle: event.muzzle, spawn: event.spawn, aim: event.aim, at: scene.time.now }));
    scene.core.pool.on('impact', ({ projectile, target }) => window.__DESTRUCTIBLE_CLARITY_QA__.impacts.push({ weaponId: projectile.weaponId, targetId: target.getData?.('environmentDestructibleId') ?? null, targetKey: target.texture?.key, x: projectile.x, y: projectile.y, at: scene.time.now }));
    scene.core.pool.on('fired', (projectile) => {
      projectile.once('expired', (event) => window.__DESTRUCTIBLE_CLARITY_QA__.expires.push({ ...event, at: scene.time.now }));
    });
    scene.events.on('postupdate', () => {
      const projectile = scene.core.pool.group.getChildren().find((item) => item.active && item.faction === 'player');
      if (projectile) window.__DESTRUCTIBLE_CLARITY_QA__.flightSamples.push({ at: scene.time.now, x: projectile.x, y: projectile.y, vx: projectile.body?.velocity?.x, vy: projectile.body?.velocity?.y });
    });
    return {
      targetPair: targetPair.map((item) => ({ key: item.texture.key, x: item.x, marker: item.interactionMarker, markerMode: item.getData('interactionMarkerMode') })),
      environmentTargets: environmentTargets.map((item) => ({ id: item.getData('environmentDestructibleId'), kind: item.getData('environmentDestructibleKind'), key: item.texture.key, x: item.x, y: item.y, health: item.health, active: item.active, bodyEnabled: item.body?.enable ?? false, body: item.body ? { left: item.body.left, right: item.body.right, top: item.body.top, bottom: item.body.bottom, width: item.body.width, height: item.body.height } : null })),
      roleTargets: roleTargets.map((item) => ({ id: item.getData('environmentDestructibleId'), kind: item.getData('environmentDestructibleKind'), roleLabel: item.getData('environmentRoleLabel'), blocksMovement: item.getData('blocksMovement'), active: item.active, bodyEnabled: item.body?.enable ?? false })),
      allMarkerCount: destructibles.filter((item) => item.interactionMarker?.active).length,
      environmentSnapshot: scene.environmentProps.snapshot(),
      overlaps,
      nearbyEnvironment: environment.filter((item) => Math.abs(item.x - 1140) < 260).map((item) => ({ key: item.texture.key, x: item.x, depth: item.depth })),
    };
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '01-mounted-chain-targets-before-shot-1280x720.png') });
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(80); await page.keyboard.up('KeyJ');
  await page.waitForFunction(() => window.__DESTRUCTIBLE_CLARITY_QA__.detonations.some((item) => item.id === 'warning-panel-drum'), null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(130);
  await page.screenshot({ path: path.join(OUT, '02-chain-reaction-active-1280x720.png') });
  await page.waitForTimeout(520);
  const destructionResult = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const props = scene.core.destruction.props.getChildren();
    return {
      detonations: [...window.__DESTRUCTIBLE_CLARITY_QA__.detonations],
      fires: [...window.__DESTRUCTIBLE_CLARITY_QA__.fires],
      impacts: [...window.__DESTRUCTIBLE_CLARITY_QA__.impacts],
      expires: [...window.__DESTRUCTIBLE_CLARITY_QA__.expires],
      flightSamples: [...window.__DESTRUCTIBLE_CLARITY_QA__.flightSamples],
      activeProjectiles: scene.core.pool.group.getChildren().filter((item) => item.active).map((item) => ({ weaponId: item.weaponId, x: item.x, y: item.y, vx: item.body?.velocity?.x, vy: item.body?.velocity?.y })),
      environmentTargets: props.filter((item) => ['warning-panel-drum', 'warning-panel-lockbox', 'cable-hook-cache'].includes(item.getData('environmentDestructibleId'))).map((item) => ({ id: item.getData('environmentDestructibleId'), destroyed: item.destroyed, active: item.active, visible: item.visible, bodyEnabled: item.body?.enable ?? false })),
      floorPair: props.filter((item) => [1100, 1180].includes(item.x) && !item.getData('environmentDestructibleId')).map((item) => ({ key: item.texture.key, destroyed: item.destroyed, active: item.active })),
      score: scene.score,
    };
  });
  await page.screenshot({ path: path.join(OUT, '03-chain-targets-destroyed-1280x720.png') });

  const fenceSetup = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const fence = scene.core.destruction.props.getChildren().find((item) => item.active && item.getData('environmentDestructibleKind') === 'breakable-fence-cover');
    const player = scene.core.player; const groundY = scene.terrainArt.snapshot().walkSurfaceY;
    const offset = player.body.bottom - player.y;
    player.body.reset(fence.x - 330, groundY - offset); player.setVelocity(0, 0); player.facing = 1; player.aim.set(1, 0);
    scene.core.weapons.selectWeapon('rifle'); scene.core.weapons.ammo.rifle = Infinity; scene.core.weapons.nextFireByOwner = new WeakMap();
    scene.cameras.main.centerOn(fence.x - 40, 360);
    return { id: fence.getData('environmentDestructibleId'), x: fence.x, kind: fence.getData('environmentDestructibleKind'), blocksMovement: fence.getData('blocksMovement'), roleLabel: fence.getData('environmentRoleLabel') };
  });
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(OUT, '04-breakable-fence-before-shot-1280x720.png') });
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(70); await page.keyboard.up('KeyJ');
  await page.waitForFunction((id) => window.__DESTRUCTIBLE_CLARITY_QA__.detonations.some((item) => item.id === id), fenceSetup.id, { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(260);
  const fenceResult = await page.evaluate((id) => {
    const scene = window.__GAME__.scene.getScene('Game');
    const fence = scene.core.destruction.props.getChildren().find((item) => item.getData('environmentDestructibleId') === id);
    return { id, destroyed: fence.destroyed, active: fence.active, visible: fence.visible, bodyEnabled: fence.body?.enable ?? false };
  }, fenceSetup.id);
  await page.screenshot({ path: path.join(OUT, '05-breakable-fence-destroyed-1280x720.png') });

  const failures = [];
  if (evidence.targetPair.length !== 2) failures.push(`expected drum+lockbox pair, found ${evidence.targetPair.length}`);
  if (evidence.allMarkerCount !== 0) failures.push(`${evidence.allMarkerCount} legacy floating marker children remain`);
  if (evidence.targetPair.some((item) => item.markerMode !== 'none-authored-silhouette')) failures.push('floor destructible marker contract missing');
  if (evidence.environmentTargets.length !== 3) failures.push(`expected 3 promoted environment targets, found ${evidence.environmentTargets.length}`);
  if (evidence.environmentTargets.some((item) => !item.active || !item.bodyEnabled || item.health < 2)) failures.push(`environment targets are not live projectile targets: ${JSON.stringify(evidence.environmentTargets)}`);
  if (evidence.roleTargets.length !== evidence.environmentSnapshot.interactiveTargetCount) failures.push(`role target count mismatch: ${evidence.roleTargets.length}/${evidence.environmentSnapshot.interactiveTargetCount}`);
  if (!['breakable-fence-cover', 'volatile-warning-relay', 'mooring-cable-cache'].every((kind) => evidence.roleTargets.some((item) => item.kind === kind))) failures.push(`missing explicit environment roles: ${JSON.stringify(evidence.roleTargets)}`);
  if (evidence.roleTargets.some((item) => !item.active || !item.bodyEnabled || !item.roleLabel)) failures.push(`inactive or unlabeled role target: ${JSON.stringify(evidence.roleTargets)}`);
  if (evidence.roleTargets.filter((item) => item.kind === 'breakable-fence-cover').some((item) => item.blocksMovement)) failures.push('shootable fence incorrectly blocks stage traversal');
  if (evidence.environmentSnapshot.textureKeys.some((key) => ['prop-warning-plate', 'prop-chain-fence', 'prop-cable-hook'].includes(key))) failures.push(`ambiguous props remain in background dressing: ${JSON.stringify(evidence.environmentSnapshot.textureKeys)}`);
  if (evidence.environmentSnapshot.interactiveOverlapCount !== 0) failures.push(`environment snapshot overlap ${evidence.environmentSnapshot.interactiveOverlapCount}`);
  if (evidence.overlaps.length) failures.push(`noninteractive background overlap pairs ${JSON.stringify(evidence.overlaps)}`);
  if (!destructionResult.environmentTargets.every((item) => item.destroyed && !item.active)) failures.push(`environment chain targets did not destroy: ${JSON.stringify(destructionResult.environmentTargets)}`);
  if (!destructionResult.floorPair.every((item) => item.destroyed && !item.active)) failures.push(`lower drum/lockbox did not join chain: ${JSON.stringify(destructionResult.floorPair)}`);
  const detonationIds = new Set(destructionResult.detonations.map((item) => item.id).filter(Boolean));
  if (![...['warning-panel-drum', 'warning-panel-lockbox', 'cable-hook-cache']].every((id) => detonationIds.has(id))) failures.push(`missing environment detonations: ${JSON.stringify([...detonationIds])}`);
  if (fenceSetup.blocksMovement || fenceSetup.kind !== 'breakable-fence-cover') failures.push(`fence cover role invalid: ${JSON.stringify(fenceSetup)}`);
  if (!fenceResult.destroyed || fenceResult.active || fenceResult.bodyEnabled) failures.push(`actual rifle shot did not open fence route: ${JSON.stringify(fenceResult)}`);
  if (errors.length) failures.push(...errors);
  const report = { generatedAt: new Date().toISOString(), baseUrl, ok: failures.length === 0, failures, errors, evidence, destructionResult, fenceSetup, fenceResult, screenshots: ['01-mounted-chain-targets-before-shot-1280x720.png', '02-chain-reaction-active-1280x720.png', '03-chain-targets-destroyed-1280x720.png', '04-breakable-fence-before-shot-1280x720.png', '05-breakable-fence-destroyed-1280x720.png'] };
  await fs.writeFile(path.join(OUT, 'runtime-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, failures, targetPair: evidence.targetPair, environmentTargets: evidence.environmentTargets, environment: evidence.environmentSnapshot, overlaps: evidence.overlaps, destructionResult, screenshots: report.screenshots.map((name) => path.relative(ROOT, path.join(OUT, name))) }, null, 2));
  await context.close(); await browser.close();
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
