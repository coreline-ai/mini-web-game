export async function prepareState(page, state, { baseUrl, waitScene, clickLogical }) {
  switch (state.id) {
    case 'loading':
      await page.goto(`${baseUrl}?qaHoldLoading=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'domcontentloaded' });
      return;
    case 'home':
      await page.evaluate(() => globalThis.__RELEASE_LOADING__());
      return;
    case 'rules':
      await clickLogical(195, 744);
      return;
    case 'first-run-coach':
      await clickLogical(195, 795);
      await waitScene('Home');
      await clickLogical(195, 660);
      await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === true);
      return;
    case 'game-initial':
      await clickLogical(195, 602);
      await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === false);
      return;
    case 'firebreak-selected':
      await clickLogical(68, 778);
      return;
    case 'wind-shift':
      await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.advanceTicks(121));
      return;
    case 'ember-night':
      await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.advanceTicks(120));
      return;
    case 'help-reopened':
      await clickLogical(356, 94);
      await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === true);
      return;
    case 'pause':
      await clickLogical(195, 602);
      await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === false);
      await clickLogical(356, 50);
      return;
    case 'result-win':
      await clickLogical(195, 405);
      await waitScene('Game');
      await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceWin());
      return;
    case 'result-loss':
      await clickLogical(195, 670);
      await waitScene('Game');
      await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.forceLose());
      return;
    default:
      throw new Error(`Unknown capture state: ${state.id}`);
  }
}
