#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const output = path.join(ROOT, 'assets/qa/asset-coverage/after-phase7');
const urlArg = process.argv.indexOf('--url');
const baseUrl = urlArg >= 0 ? process.argv[urlArg + 1] : 'http://127.0.0.1:5195';

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const configured = process.env.CODEX_WORKSPACE_NODE_MODULES;
    const candidates = [
      configured && path.join(configured, 'playwright/index.mjs'),
      path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'),
    ].filter(Boolean);
    for (const candidate of candidates) {
      try { return await import(pathToFileURL(candidate).href); } catch {}
    }
    throw new Error('Playwright was not found. Set CODEX_WORKSPACE_NODE_MODULES to the bundled node_modules directory.');
  }
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

async function capture(page, name) {
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file });
  return path.relative(ROOT, file);
}

async function sampleRuntime(page) {
  return page.evaluate(() => {
    const scene = window.__GAME__?.scene?.getScene?.('Game');
    const visible = scene?.children?.list?.filter((object) => object?.active !== false && object?.visible !== false) ?? [];
    const textured = visible.filter((object) => object.texture?.key).map((object) => ({
      type: object.type,
      texture: object.texture.key,
      animation: object.anims?.currentAnim?.key ?? null,
      x: Math.round(object.x ?? 0),
      y: Math.round(object.y ?? 0),
    }));
    const enemies = scene?.core?.encounters?.enemyGroup?.getChildren?.().filter((enemy) => enemy.active).map((enemy) => ({
      role: enemy.role ?? enemy.constructor?.name,
      texture: enemy.texture?.key,
      animation: enemy.anims?.currentAnim?.key ?? null,
      state: enemy.state,
      health: enemy.health,
    })) ?? [];
    const rescues = scene?.core?.rescues?.group?.getChildren?.().map((target) => ({
      type: target.rescueType,
      texture: target.texture?.key,
      animation: target.anims?.currentAnim?.key ?? null,
      active: target.active,
      visible: target.visible,
      rescued: target.rescued,
    })) ?? [];
    return {
      scene: window.__GAME_LAYOUT_BOUNDS__?.scene ?? null,
      debug: window.__IRON_COURIER_DEBUG__?.get?.() ?? null,
      player: scene?.core?.player ? {
        texture: scene.core.player.texture?.key,
        animation: scene.core.player.anims?.currentAnim?.key ?? null,
        state: scene.core.player.state,
        x: scene.core.player.x,
        y: scene.core.player.y,
      } : null,
      enemies,
      rescues,
      textured,
      placeholderTextures: textured.filter((item) => item.texture === '__WHITE'),
      visiblePrimitives: visible.filter((object) => ['Arc', 'Rectangle'].includes(object.type)).map((object) => ({ type: object.type, x: object.x, y: object.y })),
      activeAnimationKeys: [...new Set(textured.map((item) => item.animation).filter(Boolean))].sort(),
      activeTextureKeys: [...new Set(textured.map((item) => item.texture).filter(Boolean))].sort(),
    };
  });
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  const failures = [];
  const evidence = { generatedAt: new Date().toISOString(), baseUrl, captures: {}, states: {}, browserErrors, failures };

  await page.goto(`${baseUrl}/?qaHoldLoading=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(500);
  evidence.captures.loading = await capture(page, 'loading');

  await page.goto(`${baseUrl}/?qaTouch=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home');
  evidence.captures.home = await capture(page, 'home');
  const canvas = await page.locator('canvas').boundingBox();
  const homePlay = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(homePlay.x, homePlay.y);
  await page.waitForFunction(() => window.__IRON_COURIER_DEBUG__?.get && window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game');
  await page.waitForTimeout(500);
  evidence.states.gameStart = await sampleRuntime(page);
  evidence.captures.gameStart = await capture(page, 'game-start');

  assert(evidence.states.gameStart.placeholderTextures.length === 0, 'Initial runtime contains a __WHITE texture.', failures);
  assert(evidence.states.gameStart.enemies.length > 0, 'No active enemies were found at game start.', failures);
  assert(evidence.states.gameStart.enemies.every((enemy) => /(?:actions|extension)/.test(enemy.texture ?? '') && enemy.animation?.startsWith('enemy-')), 'An initial enemy is not using an animated action sheet.', failures);
  assert(evidence.states.gameStart.activeTextureKeys.includes('ui-hud-top-bar-hd'), 'HD top HUD frame image is not active.', failures);
  assert(evidence.states.gameStart.activeTextureKeys.includes('ui-action-fire'), 'Fire action image is not active.', failures);
  assert(evidence.states.gameStart.debug?.environmentProps?.count > 0, 'Deterministic environment props were not created.', failures);

  evidence.states.animationFrameCounts = await page.evaluate(() => {
    const game = window.__GAME__;
    const expected = {
      'player:idle': 6, 'player:run': 8, 'player:jump': 3, 'player:fall': 2, 'player:crouch': 2,
      'player:shoot-forward': 4, 'player:shoot-diagonal': 4, 'player:shoot-up': 4, 'player:grenade': 6,
      'player:melee': 6, 'player:hurt': 3, 'player:death': 10,
      'transport:idle': 4, 'transport:drive': 8, 'transport:hit': 2, 'transport:damaged': 8,
      'transport:critical': 10, 'transport:repair': 6, 'transport:destroyed': 12,
    };
    return Object.fromEntries(Object.entries(expected).map(([key, wanted]) => [key, { expected: wanted, actual: game.anims.get(key)?.frames?.length ?? 0 }]));
  });
  for (const [key, counts] of Object.entries(evidence.states.animationFrameCounts)) assert(counts.actual === counts.expected, `${key} has ${counts.actual}/${counts.expected} runtime frames.`, failures);

  evidence.states.transportVisuals = {};
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.cameras.main.stopFollow(); scene.cameras.main.scrollX = Math.max(0, scene.core.transport.x - 440);
    scene.core.transport.setVelocityX(0);
  });
  for (const [label, ratio] of [['100', 1], ['50', 0.5], ['24', 0.24], ['0', 0]]) {
    evidence.states.transportVisuals[label] = await page.evaluate(({ label, ratio }) => {
      const scene = window.__GAME__.scene.getScene('Game');
      const transport = scene.core.transport;
      transport.health = transport.maxHealth * ratio;
      transport.visualLockUntil = 0;
      if (ratio === 0) transport.playVisual('destroyed', true); else transport.updateVisualState();
      return { animation: transport.anims.currentAnim?.key ?? null, texture: transport.texture?.key ?? null };
    }, { label, ratio });
    await page.waitForTimeout(260);
    evidence.captures[`transport${label}`] = await capture(page, `transport-${label}`);
  }
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const transport = scene.core.transport;
    transport.health = transport.maxHealth; transport.visualLockUntil = 0; transport.updateVisualState();
    [...scene.transientVfx].filter((item) => ['fx-fire-burst', 'fx-smoke-puff'].includes(item.texture?.key)).forEach((item) => { scene.tweens.killTweensOf(item); scene.transientVfx.delete(item); item.destroy(); });
    scene.cameras.main.scrollX = 0;
    scene.cameras.main.startFollow(scene.core.player, true, 0.085, 0.12, -1280 * 0.16, 35);
  });
  assert(evidence.states.transportVisuals['100'].animation === 'transport:idle', 'Transport 100% visual state is not idle.', failures);
  assert(evidence.states.transportVisuals['50'].animation === 'transport:damaged', 'Transport 50% visual state is not damaged.', failures);
  assert(evidence.states.transportVisuals['24'].animation === 'transport:critical', 'Transport 24% visual state is not critical.', failures);
  assert(evidence.states.transportVisuals['0'].animation === 'transport:destroyed', 'Transport 0% visual state is not destroyed.', failures);

  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyJ');
  await page.waitForTimeout(55);
  evidence.states.playerCombat = await sampleRuntime(page);
  evidence.captures.playerCombat = await capture(page, 'player-combat');
  await page.keyboard.up('KeyJ');
  await page.keyboard.up('KeyD');
  assert(evidence.states.playerCombat.player?.animation?.startsWith('player:'), 'Player combat did not select a registered player animation.', failures);
  assert(evidence.states.playerCombat.activeTextureKeys.some((key) => key.startsWith('fx-muzzle-')), 'Player fire did not expose a muzzle VFX texture.', failures);

  const transitionSamples = {};
  for (const x of [5700, 6000, 10800, 11200]) {
    await page.evaluate((targetX) => {
      const scene = window.__GAME__.scene.getScene('Game');
      if (!scene.scene.isPaused()) scene.scene.pause();
      scene.cameras.main.stopFollow();
      scene.core.player.x = targetX;
      scene.cameras.main.scrollX = Math.max(0, targetX - 440);
      scene.updatePresentation(scene.time.now);
    }, x);
    await page.waitForTimeout(80);
    transitionSamples[x] = await sampleRuntime(page);
    evidence.captures[`backgroundX${x}`] = await capture(page, `background-x${x}`);
  }
  evidence.states.backgroundTransitions = transitionSamples;
  for (const [x, sample] of Object.entries(transitionSamples)) {
    const weights = sample.debug?.background?.blend ?? [];
    assert(weights.length === 3 && Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1) < 0.01, `Background blend weights are invalid at x=${x}.`, failures);
    assert(weights.filter((value) => value > 0.01).length >= 2, `Background transition is not blended at x=${x}.`, failures);
  }

  await page.evaluate(() => window.__GAME__.scene.resume('Game'));
  await page.waitForFunction(() => window.__GAME__.scene.isActive('Game') && !window.__GAME__.scene.isPaused('Game'));
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.enforceEncounterGate = () => {};
    scene.cameras.main.startFollow(scene.core.player, true, 0.085, 0.12, -1280 * 0.16, 35);
    const target = scene.core.rescues.group.getChildren().find((item) => item.rescueType === 'technician');
    scene.core.player.x = target.x - 30;
    scene.core.player.y = target.y;
    scene.cameras.main.scrollX = target.x - 440;
    scene.core.rescues.rescue(target);
  });
  await page.waitForFunction(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const target = scene.core.rescues.group.getChildren().find((item) => item.rescueType === 'technician');
    return target?.anims?.currentAnim?.key === 'rescue-technician:ability';
  }, null, { timeout: 8000 });
  evidence.states.rescueAbility = await sampleRuntime(page);
  evidence.captures.rescueAbility = await capture(page, 'rescue-ability');
  const technician = evidence.states.rescueAbility.rescues.find((target) => target.type === 'technician');
  assert(technician?.rescued && technician?.animation === 'rescue-technician:ability', 'Technician rescue ability animation was not observed.', failures);

  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const prop = scene.core.destruction.props.getChildren().find((item) => item.active);
    scene.core.player.x = prop.x - 130; scene.core.player.y = prop.y;
    scene.cameras.main.stopFollow(); scene.cameras.main.scrollX = Math.max(0, prop.x - 440);
    scene.updatePresentation(scene.time.now);
    prop.takeDamage(999, scene.core.player);
  });
  await page.waitForTimeout(40);
  evidence.states.destructibleExplosion = await sampleRuntime(page);
  evidence.captures.destructibleExplosion = await capture(page, 'destructible-explosion');
  assert(evidence.states.destructibleExplosion.activeTextureKeys.some((key) => key.startsWith('fx-explosion')), 'Destructible explosion did not expose an approved explosion texture.', failures);

  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((actor) => actor.disableBody?.(true, true));
    scene.core.encounters.current = null;
    scene.core.player.x = 9750; scene.core.player.y = 500;
    scene.cameras.main.scrollX = 9300;
    const boss = scene.core.spawnBoss('crane', 10300, 460, { texture: 'boss-crane-actions', width: 300, height: 240, tint: 0xffffff });
    scene.core.encounters.current = { definition: { id: 'qa-crane', boss: 'crane' }, alive: 1, startedAt: scene.time.now, spawned: [boss], pending: false };
    boss.nextAttackAt = scene.time.now;
  });
  // Wait for the committed attack state instead of sampling between the
  // 520ms warning and its 140ms safety margin on faster renderers.
  await page.waitForFunction(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const boss = scene.core.encounters.current?.spawned?.find((actor) => actor.texture?.key === 'boss-crane-actions');
    return ['boss-crane:burst', 'boss-crane:hook-launch'].includes(boss?.anims?.currentAnim?.key);
  }, null, { timeout: 1600 });
  evidence.states.craneBoss = await sampleRuntime(page);
  evidence.captures.craneBoss = await capture(page, 'crane-boss');
  const crane = evidence.states.craneBoss.enemies.find((enemy) => enemy.texture === 'boss-crane-actions');
  assert(['boss-crane:burst', 'boss-crane:hook-launch'].includes(crane?.animation), 'Crane attack animation was not synchronized to its attack.', failures);

  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    scene.core.encounters.enemyGroup.getChildren().forEach((actor) => actor.disableBody?.(true, true));
    scene.core.encounters.current = null;
    scene.core.player.x = 15100; scene.core.player.y = 500;
    scene.cameras.main.scrollX = 14660;
    const boss = scene.core.spawnBoss('ironMole', 15700, 470, { texture: 'boss-iron-mole-actions', width: 480, height: 260, tint: 0xffffff });
    scene.core.encounters.current = { definition: { id: 'qa-iron-mole', boss: 'ironMole' }, alive: 1, startedAt: scene.time.now, spawned: [boss], pending: false };
    // Direct QA spawning bypasses EncounterSystem's encounterStarted event,
    // so attach the same scene-level phase cleanup listeners as real play.
    scene.bindBoss(boss);
  });
  await page.waitForTimeout(90);
  evidence.states.ironMolePhase1 = await sampleRuntime(page);
  evidence.captures.ironMolePhase1 = await capture(page, 'iron-mole-phase-1');
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const boss = scene.core.encounters.current.spawned[0];
    scene.core.weapons.fireEnemyProjectile(boss, { x: -1, y: 0 }, { weaponId: 'mole-cannon', speed: 120, lifespan: 4000, damage: 0 });
    const priorPhaseWarning = scene.worldWarning(scene.core.player.x, 590, 'fx-warning-boss', 3000);
    priorPhaseWarning.setData('__qaPreviousPhaseWarning', true);
    boss.takeDamage(boss.maxHealth * 0.4, scene.core.player);
  });
  await page.waitForFunction(() => {
    const boss = window.__GAME__.scene.getScene('Game').core.encounters.current.spawned[0];
    return boss.phase === 2 && boss.state === 'combat' && boss.anims.currentAnim?.key === 'boss-iron-mole:phase-2';
  }, null, { timeout: 4000 });
  evidence.states.phase2Cleanup = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const boss = scene.core.encounters.current.spawned[0];
    return {
      activeBossProjectiles: scene.core.pool.group.getChildren().filter((projectile) => projectile.active && projectile.owner === boss).length,
      bossWarningMarkers: [...scene.transientVfx].filter((item) => item.active && item.getData?.('bossWarning')).length,
      previousPhaseWarningMarkers: [...scene.transientVfx].filter((item) => item.active && item.getData?.('__qaPreviousPhaseWarning')).length,
    };
  });
  evidence.states.ironMolePhase2 = await sampleRuntime(page);
  evidence.captures.ironMolePhase2 = await capture(page, 'iron-mole-phase-2');
  assert(evidence.states.phase2Cleanup.activeBossProjectiles === 0, 'Iron Mole phase transition retained a previous-phase projectile.', failures);
  // A phase-2 attack may already be showing its own valid pre-fire marker.
  // Only the marker authored before the transition must have been removed.
  assert(evidence.states.phase2Cleanup.previousPhaseWarningMarkers === 0, 'Iron Mole phase transition retained a previous-phase warning marker.', failures);
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const boss = scene.core.encounters.current.spawned[0];
    boss.takeDamage(boss.maxHealth * 0.35, scene.core.player);
  });
  await page.waitForFunction(() => {
    const boss = window.__GAME__.scene.getScene('Game').core.encounters.current.spawned[0];
    return boss.phase === 3 && boss.state === 'combat' && boss.anims.currentAnim?.key === 'boss-iron-mole:phase-3';
  }, null, { timeout: 4000 });
  evidence.states.ironMolePhase3 = await sampleRuntime(page);
  evidence.captures.ironMolePhase3 = await capture(page, 'iron-mole-phase-3');
  const mole1 = evidence.states.ironMolePhase1.enemies.find((enemy) => enemy.texture === 'boss-iron-mole-actions');
  const mole2 = evidence.states.ironMolePhase2.enemies.find((enemy) => enemy.texture === 'boss-iron-mole-actions');
  const mole3 = evidence.states.ironMolePhase3.enemies.find((enemy) => enemy.texture === 'boss-iron-mole-actions');
  assert(mole1?.animation === 'boss-iron-mole:phase-1', 'Iron Mole phase 1 animation was not observed.', failures);
  assert(mole2?.animation === 'boss-iron-mole:phase-2', 'Iron Mole phase 2 animation was not observed.', failures);
  assert(mole3?.animation === 'boss-iron-mole:phase-3', 'Iron Mole phase 3 animation was not observed.', failures);

  evidence.states.lifecycleMetrics = await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const gameplay = [scene.core.player, scene.core.transport, ...scene.core.encounters.enemyGroup.getChildren(), ...scene.core.rescues.group.getChildren(), ...scene.core.destruction.props.getChildren()].filter(Boolean);
    const duplicateVisibleEntities = gameplay.reduce((sum, entity) => sum + Math.max(0, scene.children.list.filter((child) => child === entity).length - 1), 0);
    const lingeringTransientGraphics = [...scene.transientVfx].filter((item) => !item.active || !scene.children.list.includes(item)).length;
    return { duplicateVisibleEntities, lingeringTransientGraphics, trackedTransientVfx: scene.transientVfx.size };
  });
  assert(evidence.states.lifecycleMetrics.duplicateVisibleEntities === 0, 'Duplicate visible gameplay entities were detected.', failures);
  assert(evidence.states.lifecycleMetrics.lingeringTransientGraphics === 0, 'Destroyed transient VFX remained tracked.', failures);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Pause');
  evidence.captures.pause = await capture(page, 'pause');
  await page.mouse.click(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * (350 / 720));
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game');

  await page.evaluate(() => window.__GAME__.scene.getScene('Game').finish(true, 'QA 항로 확보'));
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'GameOver');
  await page.waitForTimeout(250);
  evidence.captures.result = await capture(page, 'result');

  assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join(' | ')}`, failures);
  evidence.qualityMetrics = {
    placeholderTextures: evidence.states.gameStart.placeholderTextures.length,
    missingRequiredAnimations: Object.values(evidence.states.animationFrameCounts).filter(({ expected, actual }) => expected !== actual).length,
    backgroundSeams: Object.values(transitionSamples).filter((sample) => (sample.debug?.background?.blend ?? []).filter((value) => value > 0.01).length < 2).length,
    duplicateVisibleEntities: evidence.states.lifecycleMetrics.duplicateVisibleEntities,
    lingeringTransientGraphics: evidence.states.lifecycleMetrics.lingeringTransientGraphics,
    browserErrors: browserErrors.length,
  };
  evidence.ok = failures.length === 0;
  await fs.writeFile(path.join(output, 'runtime-art-qa.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify({ ok: evidence.ok, captures: Object.keys(evidence.captures).length, failures, browserErrors, report: path.relative(ROOT, path.join(output, 'runtime-art-qa.json')) }, null, 2));
  if (!evidence.ok) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
