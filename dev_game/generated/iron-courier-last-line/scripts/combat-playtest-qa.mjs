#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'combat-playtest');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function readCombatState(page) {
  return page.evaluate(() => {
    const game = window.__GAME__;
    const result = game?.scene?.getScene('GameOver');
    if (result?.scene?.isActive()) return { scene: 'Result', result: { ...result.result } };
    const scene = game?.scene?.getScene('Game');
    if (!scene?.scene?.isActive()) return { scene: window.__GAME_LAYOUT_BOUNDS__?.scene ?? 'unknown' };
    const current = scene.core.encounters.current;
    const actors = (current?.spawned ?? []).filter(actor => actor.active && actor.health > 0).map(actor => ({
      id: actor.getData?.('combatQaId') ?? null,
      role: actor.role ?? actor.constructor?.name,
      x: actor.x, y: actor.y, health: actor.health, maxHealth: actor.maxHealth,
      state: actor.state, visualState: actor.visualState, isBoss: Boolean(current?.definition?.boss),
    }));
    const projectiles = scene.core.pool.group.getChildren().filter(projectile => projectile.active && projectile.faction === 'enemy').map(projectile => ({
      weaponId: projectile.weaponId, x: projectile.x, y: projectile.y,
      vx: projectile.body?.velocity?.x ?? 0, vy: projectile.body?.velocity?.y ?? 0,
      dodgeHint: projectile.dodgeHint, blastRadius: projectile.blastRadius,
    }));
    return {
      scene: 'Game', elapsedMs: scene.elapsedMs,
      player: { x: scene.core.player.x, y: scene.core.player.y, health: scene.core.player.health, state: scene.core.player.state },
      encounter: { index: scene.core.encounters.currentIndex, id: current?.definition?.id ?? null, boss: current?.definition?.boss ?? null, alive: current?.alive ?? 0, actors },
      escort: scene.core.escort?.snapshot?.() ?? null,
      transport: scene.core.transport ? { x: scene.core.transport.x, y: scene.core.transport.y, vx: scene.core.transport.body?.velocity?.x ?? 0, bodyBottom: scene.core.transport.body?.bottom ?? null } : null,
      physicsPaused: scene.physics.world.isPaused, hitStopUntil: scene.hitStopUntil, sceneNow: scene.time.now,
      projectiles,
      evidenceCounts: Object.fromEntries(Object.entries(window.__COMBAT_PLAYTEST__ ?? {}).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])),
    };
  });
}

async function installObservers(page) {
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    const evidence = window.__COMBAT_PLAYTEST__ = {
      encounters: [], telegraphs: [], enemyShots: [], projectileFlights: [], impacts: [], damage: [], actorDamage: [], deaths: [], bossPhases: [], rescues: [], samples: [], dodgeActions: [], playerShots: [], errors: [],
    };
    const actorIds = new WeakMap(); let nextActorId = 1; let nextProjectileId = 1; let lastSampleAt = -Infinity;
    const telegraphByActor = new WeakMap();
    const actorId = actor => {
      if (!actorIds.has(actor)) actorIds.set(actor, `${actor.role ?? actor.constructor?.name ?? 'actor'}-${nextActorId++}`);
      const id = actorIds.get(actor); actor.setData?.('combatQaId', id); return id;
    };
    const bindActor = actor => {
      if (!actor || actor.getData?.('combatQaBound')) return;
      actor.setData?.('combatQaBound', true); const id = actorId(actor);
      const telegraph = (kind, duration) => {
        const record = { at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, actorId: id, role: actor.role ?? actor.constructor?.name, kind, duration, actor: { x: actor.x, y: actor.y }, player: { x: scene.core.player.x, y: scene.core.player.y }, distance: Math.hypot(actor.x - scene.core.player.x, actor.y - scene.core.player.y) };
        telegraphByActor.set(actor, record); evidence.telegraphs.push(record);
      };
      actor.on?.('attackTelegraph', ({ kind = actor.role ?? 'attack', duration = 0 } = {}) => telegraph(kind, duration));
      actor.on?.('telegraph', ({ kind = 'boss-attack', duration = 0 } = {}) => telegraph(kind, duration));
      actor.on?.('phaseChanged', ({ phase }) => evidence.bossPhases.push({ at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, actorId: id, phase, health: actor.health }));
      actor.on?.('damaged', ({ amount, health, source } = {}) => evidence.actorDamage.push({ at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, actorId: id, role: actor.role, amount, health, sourceWeapon: source?.weaponId ?? null }));
      actor.on?.('healthChanged', ({ health, maxHealth, phase } = {}) => evidence.actorDamage.push({ at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, actorId: id, role: actor.constructor?.name, amount: null, health, maxHealth, phase, sourceWeapon: null }));
      actor.once?.(actor.constructor?.name === 'IronMoleBoss' ? 'defeated' : 'died', () => evidence.deaths.push({ at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, actorId: id, role: actor.role ?? actor.constructor?.name }));
    };
    const bindEncounter = ({ index, definition, current }) => {
      const record = { index, id: definition.id, boss: definition.boss ?? null, startedAt: scene.time.now, playerHealth: scene.core.player.health, actorIds: [] };
      current.spawned.forEach(actor => { bindActor(actor); record.actorIds.push(actorId(actor)); });
      evidence.encounters.push(record);
    };
    scene.core.on('encounterStarted', bindEncounter);
    const current = scene.core.encounters.current;
    if (current && !current.pending) bindEncounter({ index: scene.core.encounters.currentIndex, definition: current.definition, current });

    scene.core.weapons.on('enemyFired', ({ owner, projectile, direction, muzzle }) => {
      bindActor(owner); const telegraph = telegraphByActor.get(owner); const id = actorId(owner);
      evidence.enemyShots.push({
        at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, actorId: id, role: owner.role ?? owner.constructor?.name,
        weaponId: projectile.weaponId, direction: { x: direction.x, y: direction.y }, muzzle: { ...muzzle }, player: { x: scene.core.player.x, y: scene.core.player.y },
        telegraphLeadMs: telegraph ? scene.time.now - telegraph.at : null, telegraphDuration: telegraph?.duration ?? null,
      });
    });
    scene.core.weapons.on('fired', ({ weaponId, aim }) => evidence.playerShots.push({ at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, weaponId, aim: { ...aim } }));
    scene.core.pool.on('fired', projectile => {
      const record = { id: nextProjectileId++, firedAt: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, faction: projectile.faction, weaponId: projectile.weaponId, ownerId: projectile.owner ? actorId(projectile.owner) : null, launch: { x: projectile.x, y: projectile.y }, damage: projectile.damage, blastRadius: projectile.blastRadius, dodgeHint: projectile.dodgeHint, expire: null };
      evidence.projectileFlights.push(record);
      projectile.once('expired', ({ reason, x, y }) => { record.expire = { at: scene.time.now, reason, x, y, lifetimeMs: scene.time.now - record.firedAt, distance: Math.hypot(x - record.launch.x, y - record.launch.y) }; });
    });
    scene.core.pool.on('impact', ({ projectile, target }) => evidence.impacts.push({ at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, faction: projectile.faction, weaponId: projectile.weaponId, target: target === scene.core.player ? 'player' : actorId(target), x: projectile.x, y: projectile.y }));
    scene.core.player.on('damaged', ({ amount, health, source } = {}) => evidence.damage.push({
      at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, amount, health,
      sourceType: source?.constructor?.name ?? null, sourceRole: source?.owner?.role ?? source?.role ?? null, weaponId: source?.weaponId ?? null,
      player: { x: scene.core.player.x, y: scene.core.player.y, state: scene.core.player.state }, source: source?.x != null ? { x: source.x, y: source.y } : null,
    }));
    scene.core.on('rescued', ({ type }) => evidence.rescues.push({ at: scene.time.now, encounter: scene.core.encounters.current?.definition?.id, type, health: scene.core.player.health }));
    scene.events.on('postupdate', () => {
      if (scene.time.now - lastSampleAt < 250) return; lastSampleAt = scene.time.now;
      const currentEncounter = scene.core.encounters.current;
      evidence.samples.push({
        at: scene.time.now, encounter: currentEncounter?.definition?.id ?? null,
        player: { x: scene.core.player.x, y: scene.core.player.y, health: scene.core.player.health, state: scene.core.player.state },
        actors: (currentEncounter?.spawned ?? []).filter(actor => actor.active && actor.health > 0).map(actor => ({ id: actorId(actor), role: actor.role ?? actor.constructor?.name, x: actor.x, y: actor.y, health: actor.health, state: actor.state, visualState: actor.visualState, vx: actor.body?.velocity?.x ?? 0, vy: actor.body?.velocity?.y ?? 0 })),
        enemyProjectileCount: scene.core.pool.group.getChildren().filter(projectile => projectile.active && projectile.faction === 'enemy').length,
      });
    });
  });
}

function analyze(evidence, finalState, browserErrors, transitions) {
  const findings = [];
  const add = (severity, id, message, data = null) => findings.push({ severity, id, message, data });
  for (const shot of evidence.enemyShots) {
    if (shot.telegraphLeadMs == null) add('P1', 'combat-shot-without-telegraph', `${shot.encounter}/${shot.role}/${shot.weaponId} 발사에 선행 경고 기록이 없습니다.`, shot);
    else if (shot.telegraphDuration >= 300 && shot.telegraphLeadMs < shot.telegraphDuration - 90) add('P1', 'combat-shot-before-telegraph-end', `${shot.encounter}/${shot.weaponId}가 경고 완료 전에 발사되었습니다.`, shot);
  }
  const shortTerrain = evidence.projectileFlights.filter(record => record.faction === 'enemy' && record.expire?.reason === 'terrain' && record.expire.distance < 70);
  if (shortTerrain.length >= 3) add('P1', 'enemy-projectile-short-terrain-expiry', `적 탄환 ${shortTerrain.length}발이 70px 미만 이동 후 지형에 소멸했습니다.`, shortTerrain.slice(0, 8));
  const largeDamage = evidence.damage.filter(record => record.amount >= 20);
  if (largeDamage.length) add('P0', 'combat-large-damage-spike', `20 이상 단일 피해가 ${largeDamage.length}회 발생했습니다.`, largeDamage);
  const contactDamage = evidence.damage.filter(record => !record.weaponId && /Enemy|Boss/.test(record.sourceType ?? ''));
  if (contactDamage.some(record => record.amount >= 20)) add('P0', 'combat-contact-damage-spike', '대형 접촉 피해가 실제 이동 전투에서 발생했습니다.', contactDamage);
  const shieldShots = evidence.enemyShots.filter(record => record.role === 'shield');
  if (shieldShots.length) add('P0', 'shield-projectile-regression', `방패병이 ${shieldShots.length}발의 투사체를 발사했습니다.`, shieldShots);
  const playerFlights = evidence.projectileFlights.filter(record => record.faction === 'player');
  const playerImpacts = evidence.impacts.filter(record => record.faction === 'player');
  const hitRate = playerFlights.length ? playerImpacts.length / playerFlights.length : 0;
  if (playerFlights.length > 30 && hitRate < 0.12) add('P1', 'player-fire-low-hit-rate', `실제 이동 사격 명중률이 ${(hitRate * 100).toFixed(1)}%로 낮습니다.`, { fired: playerFlights.length, impacts: playerImpacts.length });
  for (let i = 0; i < transitions.length; i += 1) {
    const item = transitions[i]; const end = transitions[i + 1]?.atMs ?? finalState?.result?.elapsed * 1000;
    if (!Number.isFinite(end)) continue;
    const duration = end - item.atMs; const limit = item.boss ? 90000 : 60000;
    if (duration > limit) add('P1', 'encounter-duration-outlier', `${item.id} 전투가 ${(duration / 1000).toFixed(1)}초 지속됐습니다.`, { duration, limit });
  }
  const visualStuck = [];
  for (const encounter of new Set(evidence.samples.map(sample => sample.encounter))) {
    const samples = evidence.samples.filter(sample => sample.encounter === encounter);
    const byActor = new Map();
    samples.forEach(sample => sample.actors.forEach(actor => { if (!byActor.has(actor.id)) byActor.set(actor.id, []); byActor.get(actor.id).push({ at: sample.at, ...actor }); }));
    for (const [actorId, actorSamples] of byActor) {
      let start = 0;
      for (let i = 1; i <= actorSamples.length; i += 1) {
        if (i < actorSamples.length && actorSamples[i].visualState === actorSamples[start].visualState) continue;
        const duration = actorSamples[i - 1].at - actorSamples[start].at;
        const state = actorSamples[start].visualState;
        if (duration > 2500 && /fire|bash|throw|hurt|hit|stagger|hook|burst/.test(state ?? '')) visualStuck.push({ encounter, actorId, state, duration });
        start = i;
      }
    }
  }
  if (visualStuck.length) add('P1', 'combat-one-shot-pose-stuck', `공격/피격 단발 자세가 2.5초 넘게 고착된 사례가 ${visualStuck.length}건입니다.`, visualStuck);
  if (!finalState?.result?.cleared) add('P0', 'combat-run-not-cleared', `실제 전투 플레이가 클리어되지 않았습니다: ${finalState?.result?.reason ?? 'timeout'}`, finalState);
  browserErrors.forEach(error => add('P0', 'browser-error', error));
  return {
    findings,
    metrics: {
      enemyShots: evidence.enemyShots.length, playerShots: evidence.playerShots.length,
      enemyFlights: evidence.projectileFlights.filter(record => record.faction === 'enemy').length,
      playerFlights: playerFlights.length, playerImpacts: playerImpacts.length, playerHitRate: hitRate,
      playerDamageEvents: evidence.damage.length, playerDamageTotal: evidence.damage.reduce((sum, record) => sum + (record.amount ?? 0), 0),
      telegraphs: evidence.telegraphs.length, deaths: evidence.deaths.length, rescues: evidence.rescues.length,
    },
  };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage(); const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(`console:${message.text()}`); });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => { const item = window.__GAME_LAYOUT_BOUNDS__.items.find(entry => entry.id === 'home-play'); return { x: item.x + item.width / 2, y: item.y + item.height / 2 }; });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await installObservers(page);

  let heldDirection = 0; let crouching = false; let aimingUp = false; let lastJumpAt = 0; let lastGrenadeAt = 0; let previousEncounter = null; let pendingMidCaptureAt = null; let finalState = null;
  const transitions = []; const screenshots = []; const startedAt = Date.now();
  const setDirection = async direction => {
    if (direction === heldDirection) return;
    if (heldDirection < 0) await page.keyboard.up('KeyA');
    if (heldDirection > 0) await page.keyboard.up('KeyD');
    heldDirection = direction;
    if (direction < 0) await page.keyboard.down('KeyA');
    if (direction > 0) await page.keyboard.down('KeyD');
  };
  const setCrouch = async active => {
    if (active === crouching) return; crouching = active;
    if (active) {
      await page.keyboard.down('KeyS');
      await page.evaluate(() => { const scene = window.__GAME__.scene.getScene('Game'); window.__COMBAT_PLAYTEST__.dodgeActions.push({ at: scene.elapsedMs, encounter: scene.core.encounters.current?.definition?.id, type: 'crouch', player: { x: scene.core.player.x, y: scene.core.player.y } }); });
    } else await page.keyboard.up('KeyS');
  };
  const setAimUp = async active => {
    if (active === aimingUp) return; aimingUp = active;
    if (active) await page.keyboard.down('KeyW');
    else await page.keyboard.up('KeyW');
  };
  const capture = async name => {
    const destination = path.join(OUT, `${String(screenshots.length).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: destination }); screenshots.push(path.relative(ROOT, destination));
  };
  await page.keyboard.down('KeyJ');
  while (Date.now() - startedAt < 330000) {
    const state = await readCombatState(page);
    if (state.scene === 'Result') { finalState = state; break; }
    if (state.scene !== 'Game') throw new Error(`unexpected scene ${state.scene}`);
    if (state.encounter.id !== previousEncounter) {
      previousEncounter = state.encounter.id;
      transitions.push({ atMs: state.elapsedMs, id: state.encounter.id, boss: state.encounter.boss ?? null, playerHealth: state.player.health });
      await capture(`${String(state.encounter.index).padStart(2, '0')}-${state.encounter.id}-start`);
      pendingMidCaptureAt = Date.now() + 1400;
    }
    if (pendingMidCaptureAt && Date.now() >= pendingMidCaptureAt) { await capture(`${String(state.encounter.index).padStart(2, '0')}-${state.encounter.id}-combat`); pendingMidCaptureAt = null; }

    const incomingStraight = state.projectiles.find(projectile => projectile.dodgeHint === 'crouch' && Math.sign(projectile.vx || 1) === Math.sign(state.player.x - projectile.x || 1) && Math.abs(projectile.x - state.player.x) < 185 && Math.abs(projectile.y - (state.player.y - 28)) < 48);
    await setCrouch(Boolean(incomingStraight));
    const targetScore = actor => Math.hypot(actor.x - state.player.x, actor.y - state.player.y) - (actor.role === 'drone' ? 260 : actor.role === 'grenadier' ? 80 : 0);
    const target = [...state.encounter.actors].sort((a, b) => targetScore(a) - targetScore(b))[0];
    // Prioritize lethal flying flankers. Eight-direction aiming uses W only
    // when vertical separation dominates; shallower targets are intercepted by
    // a jump plus horizontal fire instead of an over-steep 45-degree stream.
    const targetDx = target ? target.x - state.player.x : 0;
    const targetDy = target ? target.y - state.player.y : 0;
    await setAimUp(!incomingStraight && Boolean(target && !target.isBoss && targetDy < -72 && Math.abs(targetDy) > Math.abs(targetDx) * 0.72));
    const strafeThreat = state.projectiles.find(projectile => projectile.dodgeHint === 'strafe' && Math.abs(projectile.x - state.player.x) < 540);
    let direction = 1;
    if (incomingStraight) direction = 0;
    else if (target) {
      const dx = target.x - state.player.x;
      if (target.isBoss && strafeThreat) direction = strafeThreat.x > state.player.x ? -1 : 1;
      else if (target.isBoss && Math.abs(dx) < 620) direction = -Math.sign(dx || 1);
      else if (target.isBoss && Math.abs(dx) <= 860) direction = 0;
      else if (target.isBoss) direction = Math.sign(dx);
      else if (target.y > state.player.y + 72) direction = Math.sign(dx || 1);
      else if (Math.abs(dx) < 205) direction = -Math.sign(dx || 1);
      else if (Math.abs(dx) > 430) direction = Math.sign(dx);
      else direction = Math.floor(state.elapsedMs / 420) % 2 === 0 ? -Math.sign(dx || 1) : Math.sign(dx || 1);
    }
    await setDirection(direction);
    const now = Date.now();
    const grenadeThreat = state.projectiles.some(projectile => projectile.blastRadius > 0 && Math.abs(projectile.x - state.player.x) < 280);
    const incomingJumpThreat = state.projectiles.some(projectile => {
      if (projectile.dodgeHint === 'crouch' || projectile.dodgeHint === 'strafe') return false;
      const dx = state.player.x - projectile.x;
      const approaching = Math.sign(projectile.vx || dx || 1) === Math.sign(dx || 1);
      return approaching && Math.abs(dx) < 250 && Math.abs(projectile.y - state.player.y) < 150;
    });
    // Keep boss DPS grounded; blind 880ms hopping launched most rifle rounds
    // over the machine body and prolonged phase-3 attrition until death. Boss
    // jumps now respond to measured projectile/blast threats only.
    const traversalJump = !state.encounter.boss && Boolean(target && target.y < state.player.y - 55) && now - lastJumpAt >= 880;
    const jumpReady = !['jump', 'fall'].includes(state.player.state) && now - lastJumpAt >= 720;
    if (!incomingStraight && jumpReady && (grenadeThreat || incomingJumpThreat || traversalJump)) { await page.keyboard.press('Space'); lastJumpAt = now; }
    if ((state.encounter.alive >= 4 || state.encounter.boss) && now - lastGrenadeAt >= 3200) { await page.keyboard.press('KeyK'); lastGrenadeAt = now; }
    await page.waitForTimeout(110);
  }
  await setDirection(0); await setCrouch(false); await setAimUp(false); await page.keyboard.up('KeyJ');
  if (finalState) await capture('result');
  const evidence = await page.evaluate(() => window.__COMBAT_PLAYTEST__);
  const analysis = analyze(evidence, finalState, browserErrors, transitions);
  const report = { generatedAt: new Date().toISOString(), baseUrl, viewport: '1280x720', controlPolicy: 'real keyboard events only; passive runtime instrumentation; no debug teleport/advance/state mutation', durationWallMs: Date.now() - startedAt, transitions, finalState, browserErrors, screenshots, evidence, ...analysis, ok: Boolean(finalState?.result?.cleared) && !analysis.findings.some(item => item.severity === 'P0') };
  await fs.writeFile(path.join(OUT, 'combat-playtest-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, result: finalState?.result ?? null, metrics: report.metrics, findings: report.findings, report: path.relative(ROOT, path.join(OUT, 'combat-playtest-report.json')), screenshots }, null, 2));
  await context.close(); await browser.close();
  if (!report.ok) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack || error); process.exit(1); });
