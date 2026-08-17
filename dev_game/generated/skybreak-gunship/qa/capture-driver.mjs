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
    case 'briefing':
      await page.evaluate(() => globalThis.__GAME__.scene.start('Briefing'));
      return;
    case 'approach':
      await clickLogical(195, 766);
      return;
    case 'gun-hit':
      await page.evaluate(() => {
        const scene = globalThis.__GAME__.scene.getScene('Game');
        scene.spawnTarget({ at: 0, type: 'rifleman', x: 92, y: 284 });
        scene.aim.x = 92; scene.aim.y = 284; scene.aim.view.setPosition(92, 284);
        scene.weapon.fireGun();
      });
      return;
    case 'missile-lock':
      await page.evaluate(() => {
        const scene = globalThis.__GAME__.scene.getScene('Game');
        const target = scene.targets.find((entry) => entry.active && entry.type === 'drone') || (() => {
          scene.spawnTarget({ at: 0, type: 'drone', x: 286, y: 238 });
          return scene.targets.at(-1);
        })();
        scene.aim.x = target.sprite.x; scene.aim.y = target.sprite.y;
        scene.aim.view.setPosition(scene.aim.x, scene.aim.y);
        scene.weapon.missileHeld = true; scene.weapon.lockTarget = target;
        scene.weapon.lockProgress = 650; scene.weapon.updateLock(0);
      });
      return;
    case 'escort':
      await page.evaluate(() => {
        const scene = globalThis.__GAME__.scene.getScene('Game');
        scene.weapon.endMissile(); globalThis.__SKYBREAK_DEBUG__.clearTargets(); scene.setMissionPhase(1);
        scene.spawnTarget({ at: 30, type: 'rocketman', x: 84, y: 300 });
        scene.spawnTarget({ at: 30, type: 'civilian', x: 300, y: 350 });
      });
      await page.waitForTimeout(950);
      return;
    case 'apc-part-break':
      await page.evaluate(() => {
        const scene = globalThis.__GAME__.scene.getScene('Game');
        globalThis.__SKYBREAK_DEBUG__.clearTargets(); scene.setMissionPhase(2);
        scene.spawnTarget({ at: 42, type: 'apc', x: 205, y: 278 });
        const target = scene.targets.at(-1); target.parts.turret = 0;
        scene.spawnTarget({ at: 42, type: 'civilian', x: 310, y: 360 });
        scene.aim.x = 205; scene.aim.y = 246; scene.aim.view.setPosition(205, 246);
      });
      return;
    case 'boss':
      await page.evaluate(() => {
        const scene = globalThis.__GAME__.scene.getScene('Game');
        scene.targets.filter((entry) => entry.active).forEach((entry) => scene.removeTarget(entry, false));
        scene.setMissionPhase(3); scene.spawnTarget({ at: 65, type: 'boss', x: 195, y: 242 });
      });
      await page.waitForTimeout(950);
      return;
    case 'pause':
      await clickLogical(354, 79);
      return;
    case 'result':
      await page.evaluate(() => {
        const game = globalThis.__GAME__;
        game.scene.stop('Pause'); game.scene.stop('Game');
        game.scene.start('Result', { score: 7420, reason: 'EXTRACTION SECURED', accuracy: 82, convoyHp: 730, strikes: 0 });
      });
      return;
    case 'gameover':
      await page.evaluate(() => {
        const game = globalThis.__GAME__;
        game.scene.stop('Result');
        game.scene.start('GameOver', { score: 2180, reason: 'CONVOY DESTROYED', accuracy: 61, convoyHp: 0, strikes: 1 });
      });
      return;
    default:
      throw new Error(`Unknown capture state: ${state.id}`);
  }
}
