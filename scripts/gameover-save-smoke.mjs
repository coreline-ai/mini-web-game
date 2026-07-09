#!/usr/bin/env node
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.GAMEOVER_SAVE_SMOKE_PORT || 5190);
const url = `http://127.0.0.1:${port}/`;
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

function waitForServer(targetUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(targetUrl, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error(`Timed out waiting for ${targetUrl}`));
        else setTimeout(tick, 150);
      });
      req.setTimeout(1000, () => {
        req.destroy();
      });
    };
    tick();
  });
}

async function bootGame(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__GAME && window.__SAVE);
  await page.waitForFunction(() => window.__GAME.scene?.isActive?.('Home'), null, { timeout: 10000 });
}

async function startGameWithScore(page, score) {
  await page.evaluate(() => {
    const game = window.__GAME;
    game.scene.stop('GameOver');
    game.scene.stop('Pause');
    game.scene.start('Game');
  });
  await page.waitForFunction(() => window.__GAME.scene.isActive('Game') && window.__GAME.scene.keys.Game?.score);
  await page.evaluate((nextScore) => {
    const scene = window.__GAME.scene.keys.Game;
    scene.score.reset();
    scene.score.addBonus(nextScore);
  }, score);
}

async function main() {
  const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let browser;
  try {
    let serverLog = '';
    server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
    server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });
    server.on('exit', (code) => {
      if (code && !browser) serverLog += `\nVite exited early with ${code}`;
    });

    await waitForServer(url);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    const browserErrors = [];
    page.on('pageerror', (err) => browserErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') browserErrors.push(msg.text());
    });

    await bootGame(page);
    await page.evaluate(() => window.__SAVE.reset());

    await startGameWithScore(page, 12345);
    await page.evaluate(() => window.__GAME.scene.keys.Game.triggerGameOver());
    await page.waitForFunction(() => window.__GAME.scene.isActive('GameOver'));
    const afterGameOver = await page.evaluate(() => ({
      best: window.__SAVE.best,
      runs: [...window.__SAVE.data.runs],
    }));
    if (afterGameOver.best !== 12345) throw new Error(`best was not preserved on GameOver: ${afterGameOver.best}`);
    if (afterGameOver.runs.length !== 0) throw new Error(`ranking recorded before final exit: ${afterGameOver.runs.length}`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__SAVE);
    const afterReload = await page.evaluate(() => ({
      best: window.__SAVE.best,
      runs: [...window.__SAVE.data.runs],
    }));
    if (afterReload.best !== 12345) throw new Error(`best was not preserved after reload: ${afterReload.best}`);
    if (afterReload.runs.length !== 0) throw new Error(`ranking should still be empty after reload: ${afterReload.runs.length}`);

    await bootGame(page);
    await startGameWithScore(page, 15000);
    await page.evaluate(() => {
      const scene = window.__GAME.scene.keys.Game;
      scene.triggerGameOver();
      scene.recordScore();
      scene.recordScore();
    });
    const afterRecord = await page.evaluate(() => ({
      best: window.__SAVE.best,
      runs: [...window.__SAVE.data.runs],
    }));
    if (afterRecord.best !== 15000) throw new Error(`best did not update after final score: ${afterRecord.best}`);
    if (afterRecord.runs.length !== 1 || afterRecord.runs[0] !== 15000) {
      throw new Error(`ranking should record final run exactly once: ${JSON.stringify(afterRecord.runs)}`);
    }
    if (browserErrors.length) throw new Error(`Browser errors:\n${browserErrors.join('\n')}`);

    console.log('GameOver save smoke OK');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await delay(100);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
