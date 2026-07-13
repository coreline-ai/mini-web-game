#!/usr/bin/env node

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = Number(process.env.PHYSICS_QA_PORT || 4492);
const url = `http://127.0.0.1:${port}/`;

function waitForHttp(child, timeoutMs = 30_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (child.exitCode !== null) return reject(new Error(`dev server exited with ${child.exitCode}`));
      if (Date.now() - startedAt > timeoutMs) return reject(new Error(`timed out waiting for ${url}`));
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 400) resolve();
        else setTimeout(attempt, 200);
      });
      request.setTimeout(1_000, () => request.destroy());
      request.on('error', () => setTimeout(attempt, 200));
    };
    attempt();
  });
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform !== 'win32' && child.pid) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  } else child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

const server = spawn(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: projectRoot,
  detached: process.platform !== 'win32',
  stdio: 'ignore',
});
let browser;

try {
  await waitForHttp(server);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console.error: ${message.text()}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() => Boolean(window.__GAME__));

  const result = await page.evaluate(async () => {
    const game = window.__GAME__;
    game.scene.start('Game');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const scene = game.scene.getScene('Game');
    if (!scene?.player?.body || !scene?.spawner?.collectibles) throw new Error('Game scene physics objects are unavailable');
    scene.spawner.reset();
    scene.spawner.acc = -1_000_000;
    const offsets = [-84, -42, 0, 42, 84];
    const samples = [];

    for (const dx of offsets) {
      const player = scene.player;
      const coin = scene.spawner.collectibles.get(player.x + dx, player.y, 'coin');
      if (!coin) throw new Error(`coin pool unavailable at dx=${dx}`);
      coin.enableBody(true, player.x + dx, player.y, true, true);
      coin.item = { id: 'coin', score: 50 };
      coin.baseSpeed = 0;
      coin.setDisplaySize(66, 66);
      coin.body.setAllowGravity(false);
      coin.body.setSize(66 / Math.abs(coin.scaleX || 1), 66 / Math.abs(coin.scaleY || 1), true);
      coin.body.updateFromGameObject?.();

      const playerBounds = player.getBounds();
      const coinBounds = coin.getBounds();
      const visualOverlap = !(
        playerBounds.right < coinBounds.left || playerBounds.left > coinBounds.right
        || playerBounds.bottom < coinBounds.top || playerBounds.top > coinBounds.bottom
      );
      const beforeCoins = scene.score.coins;
      const playerBody = { width: player.body.width, height: player.body.height };
      const coinBody = { width: coin.body.width, height: coin.body.height };
      const physicsOverlap = scene.physics.overlap(player, coin, scene.onCollect, undefined, scene);
      await new Promise((resolve) => setTimeout(resolve, 20));
      samples.push({
        dx,
        visualOverlap,
        physicsOverlap,
        collected: scene.score.coins === beforeCoins + 1 && !coin.active,
        playerBody,
        coinBody,
      });
    }
    return { samples, collectedCount: scene.score.coins, canvas: { width: game.canvas.width, height: game.canvas.height } };
  });

  const near = (actual, expected, tolerance = 1) => Math.abs(actual - expected) <= tolerance;
  const errors = [...browserErrors];
  if (result.canvas.width !== 1080 || result.canvas.height !== 1920) errors.push(`canvas=${result.canvas.width}x${result.canvas.height}`);
  if (result.collectedCount !== 5) errors.push(`collectedCount=${result.collectedCount}`);
  for (const sample of result.samples) {
    if (!sample.visualOverlap || !sample.physicsOverlap || !sample.collected) errors.push(`dx=${sample.dx} overlap/collection failed`);
    if (!near(sample.playerBody.width, 118) || !near(sample.playerBody.height, 118)) errors.push(`dx=${sample.dx} player body drift`);
    if (!near(sample.coinBody.width, 66) || !near(sample.coinBody.height, 66)) errors.push(`dx=${sample.dx} coin body drift`);
  }
  if (errors.length) throw new Error(`Physics bounds regression failed:\n- ${errors.join('\n- ')}`);
  console.log(`Physics bounds regression OK: offsets=${result.samples.map((sample) => sample.dx).join(',')} collected=${result.collectedCount} canvas=${result.canvas.width}x${result.canvas.height}`);
} finally {
  await browser?.close();
  await stop(server);
}
