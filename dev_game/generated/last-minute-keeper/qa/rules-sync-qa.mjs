// Rules Contract — 런타임이 공표한 __GAME_RULES__가 spec과 일치하는가.
import fs from 'node:fs';
import { openGame, BASE_URL, finish } from './_helpers.mjs';

const spec = JSON.parse(fs.readFileSync('src/game/data/game-spec.json', 'utf8'));
const { browser, page, browserErrors, rendererWarnings, waitScene, clickId, clickLogical } = await openGame();
const assertions = {};
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitScene('Home');
  await clickId('play');
  await waitScene('Game');
  await page.waitForFunction(() => !!globalThis.__GAME_RULES__);
  const rules = await page.evaluate(() => globalThis.__GAME_RULES__);

  assertions.goalMatchesSpec = rules.goal === spec.rules.goal;
  assertions.progressMetricMatchesSpec = rules.progressMetric === spec.rules.progressMetric;
  assertions.failConditionsMatchSpec = JSON.stringify(rules.failConditions) === JSON.stringify(spec.rules.failConditions);
  assertions.commandsMatchSpec = JSON.stringify(rules.commands) === JSON.stringify(spec.rules.commands);
  assertions.objectivesMatchSpec = JSON.stringify(rules.requiredObjectives) === JSON.stringify(spec.rules.requiredObjectives);
  assertions.concedeAllowancePublished = typeof rules.concedeAllowance === 'number' && rules.concedeAllowance > 0;
  assertions.stagesPublished = Array.isArray(rules.stages) && rules.stages.length === 5;
} catch (error) {
  browserErrors.push(`adapter: ${error.message}`);
}
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
await browser.close();
finish('qa-captures/rules-sync-results.json', { ok, assertions, browserErrors, rendererWarnings });
