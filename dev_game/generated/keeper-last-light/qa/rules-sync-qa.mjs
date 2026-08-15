// Rules Contract — runtime config가 공표한 __GAME_RULES__가 spec/문서와 일치하는가.
// 단방향 계약(config → __GAME_RULES__ → UI/GDD)이 어긋나면 docs-runtime drift다.
import fs from 'node:fs';
import { openGame, BASE_URL, finish } from './_helpers.mjs';

const spec = JSON.parse(fs.readFileSync('src/game/data/game-spec.json', 'utf8'));
const { browser, page, browserErrors, waitScene, clickLogical } = await openGame();
const assertions = {};
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  const { LAYOUT } = await import('./_helpers.mjs');
  await clickLogical(LAYOUT.play.x, LAYOUT.play.y);
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__GAME_RULES__);
  const rules = await page.evaluate(() => globalThis.__GAME_RULES__);

  assertions.goalMatchesSpec = rules.goal === spec.rules.goal;
  assertions.progressMetricMatchesSpec = rules.progressMetric === spec.rules.progressMetric;
  assertions.failConditionsMatchSpec = JSON.stringify(rules.failConditions) === JSON.stringify(spec.rules.failConditions);
  assertions.commandsMatchSpec = JSON.stringify(rules.commands) === JSON.stringify(spec.rules.commands);
  assertions.objectivesMatchSpec = JSON.stringify(rules.requiredObjectives) === JSON.stringify(spec.rules.requiredObjectives);
  // 런타임이 실제로 쓰는 값도 함께 공표되는가 (UI가 숫자를 지어내지 않는다는 증거)
  assertions.wreckAllowancePublished = typeof rules.wreckAllowance === 'number' && rules.wreckAllowance > 0;
  assertions.stagesPublished = Array.isArray(rules.stages) && rules.stages.length > 0;
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/rules-sync-results.json', { ok, assertions, browserErrors });
