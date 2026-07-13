#!/usr/bin/env node

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const devGameRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const games = [
  { id: 'bullseye-rush', port: 4310 },
  { id: 'jungle-arcshot', port: 4320 },
  { id: 'road-stream-racer', port: 4330 },
  { id: 'castle-archer', port: 4340 },
  { id: 'parcel-sort-rush', port: 4350 },
  { id: 'target-shooter-rush', port: 4360 },
  { id: 'market-panic', port: 4370 },
  { id: 'meteor-dash', port: 4380 },
  { id: 'rush-lane-racer', port: 4390 },
  { id: 'sky-archer', port: 4400 },
];

function printHelp() {
  console.log(`Usage: node generator/scripts/run-curated-games.mjs <command> [options]

Commands:
  list             Print the curated game and fixed-port map.
  build            Build every selected game (default concurrency: 4).
  dev              Start every selected game and keep the servers running.
  smoke            Start games one at a time and verify HTTP + visible canvas.

Options:
  --only <ids>     Comma-separated game ids.
  --host <host>    Server host (default: 127.0.0.1).
  --concurrency N  Build concurrency (default: 4).
  --timeout MS     Server readiness timeout (default: 30000).
  -h, --help       Show this help.
`);
}

function optionValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
}

function parseArgs(argv) {
  const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'list';
  const options = {
    command,
    host: '127.0.0.1',
    concurrency: 4,
    timeoutMs: 30_000,
    only: null,
  };
  const start = command === argv[0] ? 1 : 0;

  for (let index = start; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--only') {
      options.only = optionValue(argv, index, arg).split(',').filter(Boolean);
      index += 1;
    } else if (arg.startsWith('--only=')) {
      options.only = arg.slice('--only='.length).split(',').filter(Boolean);
    } else if (arg === '--host') {
      options.host = optionValue(argv, index, arg);
      index += 1;
    } else if (arg.startsWith('--host=')) {
      options.host = arg.slice('--host='.length);
    } else if (arg === '--concurrency') {
      options.concurrency = Number.parseInt(optionValue(argv, index, arg), 10);
      index += 1;
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = Number.parseInt(arg.slice('--concurrency='.length), 10);
    } else if (arg === '--timeout') {
      options.timeoutMs = Number.parseInt(optionValue(argv, index, arg), 10);
      index += 1;
    } else if (arg.startsWith('--timeout=')) {
      options.timeoutMs = Number.parseInt(arg.slice('--timeout='.length), 10);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!['list', 'build', 'dev', 'smoke'].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error('--concurrency must be a positive integer');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error('--timeout must be an integer of at least 1000ms');
  }
  return options;
}

function selectedGames(only) {
  if (!only) return games;
  const unknown = only.filter((id) => !games.some((game) => game.id === id));
  if (unknown.length > 0) throw new Error(`Unknown game id: ${unknown.join(', ')}`);
  return games.filter((game) => only.includes(game.id));
}

function gameRoot(game) {
  return path.join(devGameRoot, 'generated', game.id);
}

function validateProjects(targets) {
  for (const game of targets) {
    const root = gameRoot(game);
    if (!existsSync(path.join(root, 'package.json'))) {
      throw new Error(`${game.id}: package.json not found at ${root}`);
    }
    if (!existsSync(path.join(root, 'node_modules'))) {
      throw new Error(`${game.id}: dependencies missing; run npm --prefix generated/${game.id} install`);
    }
  }
}

function urlFor(game, host) {
  return `http://${host}:${game.port}/`;
}

function printGameTable(targets, host) {
  console.log('game'.padEnd(24), 'port'.padStart(6), 'url');
  console.log('-'.repeat(62));
  for (const game of targets) {
    console.log(game.id.padEnd(24), String(game.port).padStart(6), urlFor(game, host));
  }
}

function runProcess(game, args, { prefixOutput = true } = {}) {
  const child = spawn(npmCommand, args, {
    cwd: gameRoot(game),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (prefixOutput) {
    const write = (stream, chunk) => {
      const lines = String(chunk).split(/\r?\n/).filter(Boolean);
      for (const line of lines) stream.write(`[${game.id}] ${line}\n`);
    };
    child.stdout.on('data', (chunk) => write(process.stdout, chunk));
    child.stderr.on('data', (chunk) => write(process.stderr, chunk));
  }
  return child;
}

function waitForExit(child, game, action) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${game.id}: ${action} failed (code=${code}, signal=${signal ?? 'none'})`));
    });
  });
}

function waitForHttp(url, child, timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    const failOnExit = (code, signal) => {
      if (settled) return;
      settled = true;
      reject(new Error(`server exited before readiness (code=${code}, signal=${signal ?? 'none'})`));
    };
    child.once('exit', failOnExit);

    const attempt = () => {
      if (settled) return;
      if (Date.now() - startedAt >= timeoutMs) {
        settled = true;
        child.off('exit', failOnExit);
        reject(new Error(`timed out waiting for ${url}`));
        return;
      }
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 400) {
          settled = true;
          child.off('exit', failOnExit);
          resolve();
        } else {
          setTimeout(attempt, 200);
        }
      });
      request.setTimeout(1_000, () => request.destroy());
      request.on('error', () => setTimeout(attempt, 200));
    };
    attempt();
  });
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

async function startServer(game, options) {
  const child = runProcess(
    game,
    ['run', 'dev', '--', '--host', options.host, '--port', String(game.port), '--strictPort'],
    { prefixOutput: options.prefixOutput },
  );
  await waitForHttp(urlFor(game, options.host), child, options.timeoutMs);
  return child;
}

async function runBuild(targets, concurrency) {
  let cursor = 0;
  const failures = [];
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (cursor < targets.length) {
      const game = targets[cursor];
      cursor += 1;
      console.log(`[${game.id}] build starting`);
      try {
        const child = runProcess(game, ['run', 'build']);
        await waitForExit(child, game, 'build');
        console.log(`[${game.id}] build PASS`);
      } catch (error) {
        failures.push(error);
      }
    }
  });
  await Promise.all(workers);
  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length} game build(s) failed`);
  }
}

async function runDev(targets, options) {
  const children = [];
  let shuttingDown = false;
  const shutdown = async (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    await Promise.all(children.map(stopProcess));
    process.exit(exitCode);
  };

  process.once('SIGINT', () => void shutdown(0));
  process.once('SIGTERM', () => void shutdown(0));

  try {
    for (const game of targets) {
      const child = await startServer(game, { ...options, prefixOutput: false });
      children.push(child);
      child.once('exit', (code, signal) => {
        if (!shuttingDown) {
          console.error(`${game.id} stopped unexpectedly (code=${code}, signal=${signal ?? 'none'})`);
          void shutdown(1);
        }
      });
      console.log(`[${game.id}] ready ${urlFor(game, options.host)}`);
    }
    console.log('\nAll selected games are running. Press Ctrl+C to stop all servers.\n');
    printGameTable(targets, options.host);
    await new Promise(() => {});
  } catch (error) {
    await Promise.all(children.map(stopProcess));
    throw error;
  }
}

async function runSmoke(targets, options) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    for (const game of targets) {
      let child;
      try {
        child = await startServer(game, { ...options, prefixOutput: false });
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
        });
        await page.goto(urlFor(game, options.host), {
          waitUntil: 'domcontentloaded',
          timeout: options.timeoutMs,
        });
        await page.waitForSelector('canvas', { state: 'visible', timeout: options.timeoutMs });
        await page.waitForTimeout(750);
        const canvas = await page.locator('canvas').first().evaluate((element) => ({
          cssWidth: element.getBoundingClientRect().width,
          cssHeight: element.getBoundingClientRect().height,
          width: element.width,
          height: element.height,
        }));
        await page.close();
        if (errors.length > 0) throw new Error(errors.join(' | '));
        if (canvas.width <= 0 || canvas.height <= 0 || canvas.cssWidth <= 0 || canvas.cssHeight <= 0) {
          throw new Error(`invalid canvas dimensions: ${JSON.stringify(canvas)}`);
        }
        console.log(`[${game.id}] smoke PASS canvas=${canvas.width}x${canvas.height} css=${Math.round(canvas.cssWidth)}x${Math.round(canvas.cssHeight)}`);
      } catch (error) {
        failures.push(new Error(`${game.id}: ${error.message}`));
        console.error(`[${game.id}] smoke FAIL ${error.message}`);
      } finally {
        await stopProcess(child);
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length} game smoke check(s) failed`);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const targets = selectedGames(options.only);
  validateProjects(targets);

  if (options.command === 'list') {
    printGameTable(targets, options.host);
  } else if (options.command === 'build') {
    await runBuild(targets, options.concurrency);
  } else if (options.command === 'dev') {
    await runDev(targets, options);
  } else if (options.command === 'smoke') {
    await runSmoke(targets, options);
  }
} catch (error) {
  console.error(error instanceof AggregateError ? error.errors.map(String).join('\n') : error.message);
  process.exit(1);
}
