#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'qa-captures', 'actor-floor-plane', 'after');
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5195';

async function importPlaywright() {
  try { return await import('playwright'); } catch {}
  const runtime = path.join(process.env.HOME ?? '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
  return import(pathToFileURL(runtime).href);
}

async function enterGame(page) {
  await page.goto(`${baseUrl}/?qa=actor-floor-plane`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home', null, { timeout: 30000 });
  const play = await page.evaluate(() => {
    const item = window.__GAME_LAYOUT_BOUNDS__.items.find((entry) => entry.id === 'home-play');
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  });
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(() => window.__GAME_LAYOUT_BOUNDS__?.scene === 'Game', null, { timeout: 15000 });
  await page.waitForTimeout(450);
}

async function installHelpers(page) {
  await page.evaluate(() => {
    const scene = window.__GAME__.scene.getScene('Game');
    window.__FLOOR_QA__ = { scene, actors: {}, bosses: {} };
    window.__FLOOR_QA__.alphaBottom = (object) => {
      const frame = object.frame;
      const image = object.texture.source[frame.sourceIndex].image;
      const canvas = document.createElement('canvas');
      canvas.width = frame.cutWidth; canvas.height = frame.cutHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let bottom = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3] >= 24) bottom = Math.max(bottom, y);
        }
      }
      const scaleY = Math.abs(object.scaleY);
      const visualTop = object.y - object.displayOriginY * scaleY;
      return { sourceBottom: bottom + 1, worldBottom: visualTop + (bottom + 1) * scaleY };
    };
    window.__FLOOR_QA__.sampleImageAlpha = (object, worldX, worldY, explicitCrop = null) => {
      const frame = object.frame;
      const image = object.texture.source[frame.sourceIndex].image;
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const crop = explicitCrop ?? { x: 0, y: 0, width: frame.cutWidth, height: frame.cutHeight };
      const visibleWidth = crop.width * Math.abs(object.scaleX);
      const visibleHeight = crop.height * Math.abs(object.scaleY);
      const left = object.x - visibleWidth * object.originX;
      const top = object.y - visibleHeight * object.originY;
      const localX = (worldX - left) / Math.max(0.0001, visibleWidth);
      const localY = (worldY - top) / Math.max(0.0001, visibleHeight);
      const sourceX = Math.round(frame.cutX + crop.x + localX * Math.max(0, crop.width - 1));
      const sourceY = Math.round(frame.cutY + crop.y + localY * Math.max(0, crop.height - 1));
      if (sourceX < 0 || sourceY < 0 || sourceX >= image.width || sourceY >= image.height) return 0;
      return context.getImageData(sourceX, sourceY, 1, 1).data[3];
    };
    window.__FLOOR_QA__.resetToSurface = (object, x, surfaceY) => {
      const bodyOffset = object.body.bottom - object.y;
      object.body.reset(x, surfaceY - bodyOffset);
      object.setVelocity?.(0, 0);
      return object;
    };
    window.__FLOOR_QA__.measure = (name, object, surfaceY, kind = 'grounded') => {
      const alpha = window.__FLOOR_QA__.alphaBottom(object);
      return {
        name, kind, role: object.role ?? object.constructor?.name,
        x: object.x, y: object.y, texture: object.texture?.key,
        bodyBottom: object.body?.bottom ?? null,
        bodyGap: object.body ? surfaceY - object.body.bottom : null,
        alphaBottom: alpha.worldBottom,
        visualGap: surfaceY - alpha.worldBottom,
        surfaceY,
        depth: object.depth,
        shadow: object.contactShadow ? {
          visible: object.contactShadow.visible,
          y: object.contactShadow.y,
          alpha: object.contactShadow.alpha,
          sample: object.contactShadow.getData('groundSample'),
        } : null,
      };
    };
  });
}

async function setupGroundFormation(page) {
  return page.evaluate(() => {
    const qa = window.__FLOOR_QA__;
    const scene = qa.scene;
    const encounters = scene.core.encounters;
    scene.core.player.invulnerableUntil = Infinity;
    scene.tryAutoMelee = () => false;
    scene.enforceEncounterGate = () => false;
    encounters.enemyGroup.getChildren().forEach((actor) => actor.destroy());
    encounters.bosses = [];
    encounters.current = null; encounters.currentIndex = -1; encounters.complete = false;
    encounters.setEncounters([{
      id: 'actor-floor-plane-qa',
      enemies: [
        { role: 'basic', count: 1, x: 448, y: 420 },
        { role: 'shield', count: 1, x: 576, y: 420 },
        { role: 'grenadier', count: 1, x: 704, y: 420 },
        { role: 'drone', count: 1, x: 832, y: 430 },
      ],
    }]);
    encounters.begin(0, { force: true });
    const spawned = encounters.current.spawned;
    encounters.update = (time, delta) => spawned.forEach((actor) => actor.update?.(time, delta));
    spawned.forEach((actor) => { actor.target = null; actor.nextAttackAt = Infinity; });
    const groundY = scene.terrainArt.snapshot().walkSurfaceY;
    qa.resetToSurface(scene.core.player, 320, groundY);
    const byRole = Object.fromEntries(spawned.map((actor) => [actor.role, actor]));
    for (const role of ['basic', 'shield', 'grenadier']) qa.resetToSurface(byRole[role], byRole[role].x, groundY);
    byRole.drone.body.reset(832, 430); byRole.drone.setVelocity(0, 0);
    qa.actors = { player: scene.core.player, ...byRole };
    scene.cameras.main.stopFollow(); scene.cameras.main.centerOn(576, 360);
    return { roles: Object.keys(byRole), groundY };
  });
}

async function measureGround(page) {
  return page.evaluate(() => {
    const qa = window.__FLOOR_QA__;
    const scene = qa.scene;
    const terrain = scene.terrainArt.snapshot();
    const capSamples = ['player', 'basic', 'shield', 'grenadier'].map((name) => {
      const actor = qa.actors[name];
      const cap = scene.terrainArt.groundDeckPieces.find((piece) => Math.abs(piece.x - actor.x) <= 66);
      const crop = cap ? { x: 0, y: 8, width: cap.frame.cutWidth, height: 42 } : null;
      return {
        name, capFound: Boolean(cap), terrainKind: cap?.getData('terrainKind') ?? null,
        textureBacked: cap?.getData('textureBacked') ?? false,
        isCropped: cap?.isCropped ?? false,
        alphaAtSurface: cap ? qa.sampleImageAlpha(cap, actor.x, terrain.walkSurfaceY, crop) : 0,
        deckBackY: cap?.getData('deckBackY') ?? null,
        deckFrontY: cap?.getData('deckFrontY') ?? null,
        deckCenterY: cap?.getData('deckCenterY') ?? null,
      };
    });
    return {
      terrain,
      actors: ['player', 'basic', 'shield', 'grenadier'].map((name) => qa.measure(name, qa.actors[name], terrain.walkSurfaceY)),
      intentionalFlying: qa.measure('drone', qa.actors.drone, terrain.walkSurfaceY, 'intentional-flight'),
      capSamples,
    };
  });
}

async function setupMachine(page, type) {
  return page.evaluate((machineType) => {
    const qa = window.__FLOOR_QA__; const scene = qa.scene; const groundY = scene.terrainArt.snapshot().walkSurfaceY;
    Object.values(qa.actors).forEach((actor) => { if (actor !== scene.core.player) actor.setVisible(false); });
    Object.values(qa.bosses).forEach((actor) => {
      actor.setActive(false).setVisible(false);
      if (actor.body) actor.body.enable = false;
      actor.contactShadow?.setVisible(false);
    });
    scene.core.transport.setVisible(machineType === 'transport');
    if (scene.core.transport.body) scene.core.transport.body.enable = machineType === 'transport';
    let actor;
    if (machineType === 'transport') {
      actor = scene.core.transport;
      actor.setActive(true).setVisible(true); if (actor.body) actor.body.enable = true;
      qa.resetToSurface(actor, 720, groundY);
    } else if (machineType === 'crane') {
      actor = scene.core.spawnBoss('crane', 760, 476, { texture: 'boss-crane-actions', width: 300, height: 240, health: 2400, tint: 0xffffff, target: scene.core.player, weaponSystem: scene.core.weapons });
      actor.nextAttackAt = Infinity; actor.target = null;
      qa.resetToSurface(actor, 760, groundY);
      qa.bosses.crane = actor;
    } else {
      actor = scene.core.spawnBoss('ironMole', 760, 452, { texture: 'boss-iron-mole-actions', width: 480, height: 260, health: 2400, tint: 0xffffff, target: scene.core.player, weaponSystem: scene.core.weapons });
      actor.nextAttackAt = Infinity; actor.target = null;
      qa.resetToSurface(actor, 760, groundY);
      qa.bosses.ironMole = actor;
    }
    qa.resetToSurface(scene.core.player, 390, groundY);
    scene.cameras.main.stopFollow(); scene.cameras.main.centerOn(640, 360);
    qa.machine = { name: machineType, actor };
    return machineType;
  }, type);
}

async function measureMachine(page) {
  return page.evaluate(() => {
    const qa = window.__FLOOR_QA__; const terrain = qa.scene.terrainArt.snapshot();
    return qa.measure(qa.machine.name, qa.machine.actor, terrain.walkSurfaceY);
  });
}

async function setupPlatforms(page) {
  return page.evaluate(() => {
    const qa = window.__FLOOR_QA__; const scene = qa.scene;
    Object.values(qa.bosses).forEach((actor) => {
      actor.setActive(false).setVisible(false);
      if (actor.body) actor.body.enable = false;
      actor.contactShadow?.setVisible(false);
    });
    scene.core.transport.setVisible(false); if (scene.core.transport.body) scene.core.transport.body.enable = false;
    const support = scene.terrainArt.platformDefinitions.find((item) => item.id === 'container-entry');
    const catwalk = scene.terrainArt.platformDefinitions.find((item) => item.id === 'container-mid');
    const basic = qa.actors.basic; const shield = qa.actors.shield;
    basic.setActive(true).setVisible(true); if (basic.body) basic.body.enable = true;
    shield.setActive(true).setVisible(true); if (shield.body) shield.body.enable = true;
    qa.resetToSurface(scene.core.player, support.centerX - 55, support.surfaceY);
    qa.resetToSurface(basic, support.centerX + 55, support.surfaceY);
    qa.resetToSurface(shield, catwalk.centerX, catwalk.surfaceY);
    scene.cameras.main.stopFollow(); scene.cameras.main.centerOn(2450, 360);
    qa.platformActors = { player: scene.core.player, basic, shield };
    return { support, catwalk };
  });
}

async function measurePlatforms(page) {
  return page.evaluate(() => {
    const qa = window.__FLOOR_QA__; const scene = qa.scene;
    const support = scene.terrainArt.platformDefinitions.find((item) => item.id === 'container-entry');
    const catwalk = scene.terrainArt.platformDefinitions.find((item) => item.id === 'container-mid');
    const sample = (definition, x) => {
      const piece = scene.terrainArt.platformPieces.find((item) => item.getData('platformId') === definition.id && Math.abs(item.x - x) <= item.displayWidth / 2 + 1);
      return {
        id: definition.id, texture: definition.texture, pieceFound: Boolean(piece),
        alphaAtSurface: piece ? qa.sampleImageAlpha(piece, x, definition.surfaceY) : 0,
        surfaceY: definition.surfaceY, deckBackY: definition.visualDeckBackY,
        deckCenterY: definition.visualDeckCenterY, deckFrontY: definition.visualDeckFrontY,
        actorPlanePlacement: definition.actorPlanePlacement,
      };
    };
    return {
      actors: [
        qa.measure('player-support', qa.platformActors.player, support.surfaceY, 'elevated'),
        qa.measure('basic-support', qa.platformActors.basic, support.surfaceY, 'elevated'),
        qa.measure('shield-catwalk', qa.platformActors.shield, catwalk.surfaceY, 'elevated'),
      ],
      platforms: [sample(support, qa.platformActors.player.x), sample(catwalk, qa.platformActors.shield.x)],
    };
  });
}

async function run() {
  await fs.mkdir(OUT, { recursive: true });
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.stack ?? error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
  await enterGame(page); await installHelpers(page); await setupGroundFormation(page); await page.waitForTimeout(650);
  const ground = await measureGround(page);
  await page.screenshot({ path: path.join(OUT, '01-ground-player-all-enemy-roles-1280x720.png') });

  const machines = {};
  for (const type of ['transport', 'crane', 'ironMole']) {
    await setupMachine(page, type); await page.waitForTimeout(300);
    machines[type] = await measureMachine(page);
    await page.screenshot({ path: path.join(OUT, `02-${type}-ground-plane-1280x720.png`) });
  }

  await setupPlatforms(page); await page.waitForTimeout(350);
  const elevated = await measurePlatforms(page);
  await page.screenshot({ path: path.join(OUT, '03-elevated-support-catwalk-plane-1280x720.png') });

  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  check(ground.terrain.actorPlanePlacement === 'deck-center', `ground placement ${ground.terrain.actorPlanePlacement}`);
  check(Math.abs(ground.terrain.groundDeckCenterY - ground.terrain.walkSurfaceY) <= 0.5, `ground centre ${ground.terrain.groundDeckCenterY}/${ground.terrain.walkSurfaceY}`);
  check(ground.terrain.groundDeckBackY < ground.terrain.walkSurfaceY && ground.terrain.groundDeckFrontY > ground.terrain.walkSurfaceY, 'walk surface is outside ground deck image');
  check(ground.terrain.groundDeckPieceCount === ground.terrain.groundPieceCount, `deck/fascia coverage ${ground.terrain.groundDeckPieceCount}/${ground.terrain.groundPieceCount}`);
  for (const actor of ground.actors) {
    check(Math.abs(actor.bodyGap) <= 1.5, `${actor.name} body gap ${actor.bodyGap}`);
    check(Math.abs(actor.visualGap) <= 2.5, `${actor.name} visual gap ${actor.visualGap}`);
  }
  for (const cap of ground.capSamples) {
    check(cap.capFound && cap.textureBacked && cap.isCropped, `${cap.name} missing cropped HD deck`);
    check(cap.deckBackY < ground.terrain.walkSurfaceY && cap.deckFrontY > ground.terrain.walkSurfaceY, `${cap.name} floor image does not surround feet`);
    check(Math.abs(cap.deckCenterY - ground.terrain.walkSurfaceY) <= 0.5, `${cap.name} deck centre ${cap.deckCenterY}`);
    check(cap.alphaAtSurface >= 24, `${cap.name} transparent floor at feet alpha=${cap.alphaAtSurface}`);
  }
  check(ground.intentionalFlying.kind === 'intentional-flight' && ground.intentionalFlying.role === 'drone', 'drone flight exception missing');
  for (const machine of Object.values(machines)) {
    check(Math.abs(machine.bodyGap) <= 1.5, `${machine.name} body gap ${machine.bodyGap}`);
    check(Math.abs(machine.visualGap) <= 2.5, `${machine.name} visual gap ${machine.visualGap}`);
  }
  for (const actor of elevated.actors) {
    check(Math.abs(actor.bodyGap) <= 8, `${actor.name} body gap ${actor.bodyGap}`);
    check(Math.abs(actor.visualGap) <= 2.5, `${actor.name} visual gap ${actor.visualGap}`);
  }
  for (const platform of elevated.platforms) {
    check(platform.actorPlanePlacement === 'deck-center', `${platform.id} placement ${platform.actorPlanePlacement}`);
    check(platform.deckBackY < platform.surfaceY && platform.deckFrontY > platform.surfaceY, `${platform.id} slab does not surround feet`);
    check(Math.abs(platform.deckCenterY - platform.surfaceY) <= 0.5, `${platform.id} centre ${platform.deckCenterY}/${platform.surfaceY}`);
    check(platform.alphaAtSurface >= 24, `${platform.id} transparent slab at feet alpha=${platform.alphaAtSurface}`);
  }
  failures.push(...browserErrors);

  const report = {
    generatedAt: new Date().toISOString(), baseUrl, browser: 'Chromium WebGL 1280x720',
    policy: 'actual Phaser actors + alpha-foot baseline + texture pixel alpha at the collision surface',
    excludedFromGrounding: [{ role: 'drone', reason: 'authored flying enemy' }],
    ground, machines, elevated, browserErrors, failures, ok: failures.length === 0,
    screenshots: [
      '01-ground-player-all-enemy-roles-1280x720.png',
      '02-transport-ground-plane-1280x720.png',
      '02-crane-ground-plane-1280x720.png',
      '02-ironMole-ground-plane-1280x720.png',
      '03-elevated-support-catwalk-plane-1280x720.png',
    ],
  };
  await fs.writeFile(path.join(OUT, 'runtime-evidence.json'), `${JSON.stringify(report, null, 2)}\n`);
  const markdown = `# Actor / Floor Plane QA\n\n- 결과: **${report.ok ? 'PASS' : 'FAIL'}**\n- 물리 바닥: y=${ground.terrain.walkSurfaceY}\n- HD 바닥 이미지: y=${ground.terrain.groundDeckBackY}..${ground.terrain.groundDeckFrontY}\n- 배치 규칙: 발 기준선 = 바닥 이미지 중앙\n- 검사 대상: Player, Basic, Shield, Grenadier, ATLAS, Crane, IronMole, elevated support/catwalk\n- 의도적 예외: Drone (비행 적)\n\n${failures.length ? failures.map((item) => `- FAIL: ${item}`).join('\n') : '- 모든 지상 캐릭터의 물리 바닥·불투명 발끝·HD 바닥 이미지 중앙 배치가 통과했습니다.'}\n`;
  await fs.writeFile(path.join(OUT, 'REPORT.md'), markdown);
  console.log(JSON.stringify({ ok: report.ok, failures, ground: { deck: [ground.terrain.groundDeckBackY, ground.terrain.groundDeckFrontY], surface: ground.terrain.walkSurfaceY, actors: ground.actors.map((item) => ({ name: item.name, bodyGap: item.bodyGap, visualGap: item.visualGap })) }, machines: Object.fromEntries(Object.entries(machines).map(([key, item]) => [key, { bodyGap: item.bodyGap, visualGap: item.visualGap }])), elevated: elevated.actors.map((item) => ({ name: item.name, bodyGap: item.bodyGap, visualGap: item.visualGap })), report: path.relative(ROOT, path.join(OUT, 'REPORT.md')) }, null, 2));
  await context.close(); await browser.close();
  if (failures.length) process.exitCode = 1;
}

run().catch((error) => { console.error(error.stack || error); process.exit(1); });
