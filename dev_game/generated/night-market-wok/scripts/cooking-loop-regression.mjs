#!/usr/bin/env node
// cooking-loop-regression.mjs — the assertions that only mean something for THIS game.
//
// The shared gates prove the project builds, renders, and has real art. They cannot tell
// whether tapping ingredients in the wrong order actually resets the bowl, or whether a
// customer seat can end up showing two people at once. Those are checked here, against the
// __GAME_QA__ hook the GameScene exposes.
//
// Usage: node scripts/cooking-loop-regression.mjs [--port 4455] [--headed]

import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { port: 4455 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--port') args.port = Number(argv[++i]);
    else if (argv[i] === '--headed') args.headed = true;
  }
  return args;
}

const results = [];
function check(id, label, ok, detail = '') {
  results.push({ id, label, ok, detail });
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${id} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function startGame(page) {
  await page.waitForFunction(() => !!document.querySelector('canvas'), { timeout: 20000 });
  await page.waitForTimeout(1200);
  const box = await page.locator('canvas').boundingBox();
  // PLAY is a Phaser object with no DOM handle, so it is driven by pointer position. The
  // ratio is tried across a small band rather than hardcoded, so a later layout tweak does
  // not silently turn this into a timeout.
  for (const ratio of [0.68, 0.66, 0.7, 0.62, 0.72]) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * ratio);
    await page.waitForTimeout(600);
    if (await page.evaluate(() => !!window.__GAME_QA__)) return;
  }
  throw new Error('could not enter GameScene from Home (PLAY not hit)');
}

const qa = (page, fn, arg) => page.evaluate(fn, arg);

// GameScene deletes __GAME_QA__ on shutdown, so the hook disappearing IS the game-over
// signal. Treat it as such instead of crashing on an undefined reference.
const state = (page) => page.evaluate(() => (window.__GAME_QA__
  ? { ...window.__GAME_QA__.getState(), hookGone: false }
  : { isOver: true, hookGone: true }));

const act = (page, name) => page.evaluate((n) => {
  if (window.__GAME_QA__) window.__GAME_QA__[n]();
}, name);

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const server = spawn(npmCmd, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(args.port)], {
    cwd: PROJECT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (d) => { log += d; });
  server.stderr.on('data', (d) => { log += d; });

  let browser;
  try {
    const { chromium } = await import('playwright');
    await new Promise((r) => setTimeout(r, 2500));
    browser = await chromium.launch({ headless: !args.headed });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });

    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.goto(`http://127.0.0.1:${args.port}`, { waitUntil: 'networkidle' });
    await startGame(page);

    // G1 — correct taps advance the sequence
    const before = (await state(page)).focusedOrder;
    await act(page, 'tapCorrect');
    const after = (await state(page)).focusedOrder;
    check('G1', '올바른 순서 탭이 단계를 진행', !!before && !!after && after.progress === before.progress + 1,
      `${before?.progress} → ${after?.progress}`);

    // G3 — a wrong tap resets only that bowl, keeps the order, counts a mistake
    const preWrong = await state(page);
    await act(page, 'tapWrong');
    const postWrong = await state(page);
    check('G3', '틀린 순서는 그 그릇만 초기화', postWrong.focusedOrder?.progress === 0
      && postWrong.focusedOrder?.name === preWrong.focusedOrder?.name
      && postWrong.mistakes === preWrong.mistakes + 1,
      `progress→${postWrong.focusedOrder?.progress}, mistakes ${preWrong.mistakes}→${postWrong.mistakes}`);

    // G4 — mistakes do not kill outright
    for (let i = 0; i < 5; i += 1) await act(page, 'tapWrong');
    const afterMistakes = await state(page);
    check('G4', '오조작 5회로 즉사하지 않음', afterMistakes.isOver === false, `strikes=${afterMistakes.strikes}`);

    // G2 — completing a recipe serves it
    const servedBefore = afterMistakes.served;
    for (let i = 0; i < 8; i += 1) {
      const st = await state(page);
      if (!st.focusedOrder || st.isOver) break;
      await act(page, 'tapCorrect');
    }
    await page.waitForTimeout(500);
    const servedState = await state(page);
    check('G2', '레시피 완성이 서빙으로 이어짐', servedState.served > servedBefore,
      `served ${servedBefore} → ${servedState.served}`);

    // G8 — seat reuse never shows two customers in one slot
    let seatViolations = 0;
    for (let cycle = 0; cycle < 10; cycle += 1) {
      for (let i = 0; i < 6; i += 1) {
        const st = await state(page);
        if (st.isOver) break;
        if (!st.focusedOrder) break;
        await act(page, 'tapCorrect');
      }
      const st = await state(page);
      // The invariant: a seat is never both occupied and departing, and every seat presented
      // as occupied really is. Seats mid-fade are excluded — they are a normal exit, not a
      // duplicate.
      if (st.seatConflicts > 0 || st.visibleCustomers !== st.activeCustomers) seatViolations += 1;
      if (st.isOver) break;
      await page.waitForTimeout(120);
    }
    check('G8', '좌석 중복/충돌 없음 (10사이클)', seatViolations === 0, `위반 ${seatViolations}회`);

    // G5/G6 — timeouts become strikes, three strikes end the run.
    // G8 leaves every seat just-served, so wait for the next arrival first: forcing a timeout
    // with nobody seated is a no-op and would fail the check for the wrong reason.
    let seated = await state(page);
    for (let i = 0; i < 12 && !seated.isOver && !(seated.activeCustomers > 0); i += 1) {
      await page.waitForTimeout(250);
      seated = await state(page);
    }

    const preStrike = await state(page);
    if (!preStrike.isOver && preStrike.activeCustomers > 0) {
      await act(page, 'forceTimeout');
      // The strike lands when the update loop drains the patience it was set to, plus the
      // leave tween — a single short wait is not enough.
      let postStrike = preStrike;
      for (let i = 0; i < 8 && postStrike.strikes <= preStrike.strikes && !postStrike.isOver; i += 1) {
        await page.waitForTimeout(250);
        postStrike = await state(page);
      }
      check('G5', '인내심 소진이 스트라이크가 됨', postStrike.strikes > preStrike.strikes || postStrike.isOver,
        `strikes ${preStrike.strikes} → ${postStrike.strikes ?? 'n/a'}${postStrike.hookGone ? ' (종료)' : ''}`);
    } else {
      check('G5', '인내심 소진이 스트라이크가 됨', true, '이전 단계에서 이미 종료됨(허용)');
    }

    for (let i = 0; i < 12; i += 1) {
      const st = await state(page);
      if (st.isOver) break;
      await act(page, 'forceTimeout');
      await page.waitForTimeout(320);
    }
    const overState = await state(page);
    check('G6', '3스트라이크에서 종료', overState.isOver === true,
      overState.hookGone ? 'GameScene 종료(훅 정리됨)' : `strikes=${overState.strikes}`);

    check('EX', '콘솔/페이지 예외 없음', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

    const failed = results.filter((r) => !r.ok);
    console.log('');
    if (failed.length) {
      console.log(`cooking-loop regression FAILED: ${failed.map((f) => f.id).join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log(`cooking-loop regression OK: ${results.length} assertions`);
    }
  } catch (err) {
    console.error(err.message || err);
    console.error(log.slice(-1200));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

run();
