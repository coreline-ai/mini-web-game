// 첫 플레이 이해도 — 처음 보는 사람이 목표·승패·첫 행동을 알 수 있는가.
import { openGame, LAYOUT, BASE_URL, finish } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickLogical } = await openGame();
const assertions = {};
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitScene('Home');

  const home = await page.evaluate(() => {
    const s = globalThis.__GAME__.scene.getScene('Home');
    return { goal: s.goal?.text || '', tip: s.tip?.text || '' };
  });
  assertions.goalVisibleBeforePlay = /목표/.test(home.goal) && /승리/.test(home.goal) && /패배/.test(home.goal);
  assertions.firstActionStated = /첫 행동/.test(home.goal);
  assertions.progressMetricStated = /진행 지표/.test(home.goal);
  assertions.diveExplainedBeforePlay = /다이빙/.test(home.tip);

  await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
  await clickLogical(LAYOUT.help.x, LAYOUT.help.y);
  await waitScene('Pause');
  const help = await page.evaluate(() => {
    const s = globalThis.__GAME__.scene.getScene('Pause');
    return { title: s.title?.text || '', body: s.body?.text || '', hint: s.hint?.text || '' };
  });
  assertions.firstRunCoachVisible = /HOW TO KEEP/.test(help.title) && help.body.length > 0;
  assertions.coachStatesWinCondition = /실점/.test(help.hint) && /다이빙/.test(help.body);

  const paused = await page.evaluate(() => globalThis.__GAME__.scene.getScene('Game').scene.isPaused());
  assertions.simulationPausedWhileReading = paused === true;

  await clickLogical(LAYOUT.resumeHelp.x, LAYOUT.resumeHelp.y);
  await waitScene('Game');
  await clickLogical(LAYOUT.help.x, LAYOUT.help.y);
  await waitScene('Pause');
  assertions.persistentHelpReopensCoach = true;
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/clarity-results.json', { ok, assertions, browserErrors, rendererWarnings });
