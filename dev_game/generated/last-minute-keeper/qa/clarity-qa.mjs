// 첫 플레이 이해도 — 처음 보는 사람이 목표·승패·첫 행동을 알 수 있는가.
import { openGame, LAYOUT, BASE_URL, finish } from './_helpers.mjs';

const { browser, page, browserErrors, rendererWarnings, waitScene, clickId, clickLogical } = await openGame();
const assertions = {};
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitScene('Home');

  // 배치가 아니라 **공표된 문구**를 본다. 씬 구성이 바뀌어도 요소가 있으면 통과해야 한다.
  const copy = await page.evaluate(() => {
    const s = globalThis.__GAME__.scene.getScene('Home');
    return s.firstPlayCopy || '';
  });
  assertions.goalVisibleBeforePlay = /목표/.test(copy) && /승리/.test(copy) && /패배/.test(copy);
  assertions.firstActionStated = /첫 행동/.test(copy);
  assertions.progressMetricStated = /진행 지표/.test(copy);
  assertions.diveExplainedBeforePlay = /다이빙/.test(copy);

  await clickId('play');
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__KEEPER_DEBUG__);
  await clickId('help');
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
  await clickId('help');
  await waitScene('Pause');
  assertions.persistentHelpReopensCoach = true;
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/clarity-results.json', { ok, assertions, browserErrors, rendererWarnings });
