import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });

const check = (condition, message) => { if (!condition) throw new Error(message); };
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const clickLogical = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844);
};

await fs.mkdir('qa-captures', { recursive: true });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');

const homeCopy = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Home');
  return { tagline: scene.tagline.text, play: scene.playBtn.txt.text, briefing: scene.briefBtn.txt.text, sound: scene.soundBtn.txt.text };
});
check(homeCopy.tagline.includes('마을과 변전소'), 'home goal copy missing');
check(homeCopy.play === '출동 시작', 'home CTA is unclear');
check(homeCopy.briefing === '게임 방법', 'help CTA is unclear');
await page.screenshot({ path: 'qa-captures/polish-01-after-home.png' });

await clickLogical(195, 660);
await waitScene('Game');
await page.waitForTimeout(150);
const coachStart = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
check(coachStart.coachVisible === true, 'first-run mission coach did not open');
check(coachStart.coach.goal.includes('마을 또는 변전소가 0이면'), 'coach does not state the loss condition');
check(coachStart.coach.title.includes('모든 불꽃 0'), 'coach does not state the win condition');
check(coachStart.remainingSeconds === 180, `HUD timer ${coachStart.remainingSeconds} conflicts with the stated 180-second mission`);
check(coachStart.coach.steps.includes('방화선') && coachStart.coach.steps.includes('헬기') && coachStart.coach.steps.includes('소방차'), 'coach does not explain all commands');
await page.screenshot({ path: 'qa-captures/polish-01-after-coach.png' });

await page.waitForTimeout(700);
const coachHeld = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
check(coachHeld.simTick === coachStart.simTick, 'simulation advanced while reading coach');
await clickLogical(195, 602);
await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === false);
await page.waitForFunction((tick) => globalThis.__FIREBREAK_DEBUG__?.get().simTick > tick, coachHeld.simTick, { timeout: 8_000 });
const liveState = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
check(liveState.simTick > coachHeld.simTick, 'simulation did not start after coach close');
check(liveState.missionText.includes('주황색 위험 칸'), 'first live instruction is not actionable');
await clickLogical(68, 778);
const selected = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
check(selected.commandHint.includes('드래그'), 'firebreak selection lacks direct manipulation hint');
await page.screenshot({ path: 'qa-captures/polish-01-after-gameplay.png' });

await clickLogical(356, 94);
await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === true);
await page.screenshot({ path: 'qa-captures/polish-01-after-help.png' });

const sample = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Game');
  const state = globalThis.__FIREBREAK_DEBUG__.get();
  const canvas = document.querySelector('canvas');
  const rect = canvas.getBoundingClientRect();
  return {
    state,
    duplicateVisibleEntities: Math.max(0, scene.renderer.objectiveImages.length - scene.simulation.objectives.length),
    lingeringTransientGraphics: scene.activeDozer ? 1 : 0,
    activeTextureKeys: {
      objectives: scene.renderer.objectiveImages.map((image) => image.texture.key),
      pause: scene.hud.pause.bg.texture.key,
      help: scene.hud.help.bg.texture.key,
    },
    highestStageReached: state.stagePhase,
    terminalStatesReached: [],
    renderOwner: 'phaser',
    devicePixelRatio,
    maxTargetDpr: 3,
    canvasCssSize: { width: rect.width, height: rect.height },
    canvasBackingStoreSize: { width: canvas.width, height: canvas.height },
    backingScale: canvas.width / rect.width,
    logicalCanvas: { width: 390, height: 844 },
  };
});
check(sample.duplicateVisibleEntities === 0, 'duplicate objective sprites detected');
check(sample.lingeringTransientGraphics === 0, 'transient graphics lingered');
check(sample.state.activeBgmInstances <= 1, 'duplicate BGM detected');
check(sample.backingScale + 0.01 >= Math.min(sample.devicePixelRatio, sample.maxTargetDpr), `canvas backing scale ${sample.backingScale} is below DPR ${sample.devicePixelRatio}`);
check(browserErrors.length === 0, browserErrors.join('\n'));

// Existing players may have completed the old tutorial before the clarity coach existed.
// Verify that this legacy save is migrated onto the new one-time explanation path.
await page.evaluate(() => {
  localStorage.setItem('firebreak-commander_settings', JSON.stringify({
    mute: true,
    reduceEffects: false,
    tutorialSeen: true,
    clarityCoachVersion: 0,
  }));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');
await clickLogical(195, 660);
await waitScene('Game');
await page.waitForFunction(() => globalThis.__FIREBREAK_DEBUG__?.get().coachVisible === true, null, { timeout: 10_000 });
const migratedState = await page.evaluate(() => globalThis.__FIREBREAK_DEBUG__.get());
check(migratedState.coachVisible === true, 'legacy tutorialSeen save skipped the new clarity coach');
check(browserErrors.length === 0, browserErrors.join('\n'));

const report = {
  ok: true,
  symptom: '뭘 하자는 게임인지 모르겠어???',
  defectClasses: ['C UI-gameplay ambiguity', 'E progression/terminal explicitness'],
  severity: 2,
  repro: '390x844, localStorage cleared, Home → 출동 시작',
  homeCopy,
  assertions: {
    goalVisibleBeforePlay: true,
    firstRunCoachVisible: true,
    coachStatesWinCondition: true,
    hudTimerMatchesMission: true,
    coachExplainsThreeCommands: true,
    simulationPausedWhileReading: true,
    contextualHintAfterSelection: true,
    persistentHelpReopensCoach: true,
    dprBackingStoreMeetsTarget: true,
    legacySaveShowsNewCoachOnce: true,
  },
  browserErrors,
  duplicateVisibleEntities: sample.duplicateVisibleEntities,
  lingeringTransientGraphics: sample.lingeringTransientGraphics,
  activeBgmInstances: sample.state.activeBgmInstances,
  sceneStackSize: sample.state.sceneStackSize,
  sample,
  after: {
    home: 'qa-captures/polish-01-after-home.png',
    coach: 'qa-captures/polish-01-after-coach.png',
    gameplay: 'qa-captures/polish-01-after-gameplay.png',
    help: 'qa-captures/polish-01-after-help.png',
  },
};
await fs.writeFile('qa-captures/polish-01-after-samples.json', `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile('qa-captures/clarity-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ ok: true, assertions: Object.keys(report.assertions).length, browserErrors, result: 'qa-captures/polish-01-after-samples.json' }, null, 2));
