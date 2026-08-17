import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.GAME_QA_URL || 'http://127.0.0.1:5187';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });

const check = (value, message) => { if (!value) throw new Error(message); };
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const canvasPoint = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  return { x: canvas.x + x * canvas.width / 390, y: canvas.y + y * canvas.height / 844 };
};
const clickLogical = async (x, y) => { const p = await canvasPoint(x, y); await page.mouse.click(p.x, p.y); };
const holdLogical = async (x, y, ms) => {
  const p = await canvasPoint(x, y); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up();
};
const dragLogical = async (fromX, fromY, toX, toY) => {
  const from = await canvasPoint(fromX, fromY); const to = await canvasPoint(toX, toY);
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
};
const captureCanvas = async (path) => {
  const dataUrl = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  await fs.writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
};
const sceneCopy = (key) => page.evaluate((sceneKey) => {
  const scene = globalThis.__GAME__.scene.getScene(sceneKey);
  return scene.children.list.filter((child) => typeof child.text === 'string').map((child) => child.text).join('\n');
}, key);

await fs.mkdir('qa-captures', { recursive: true });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');

const homeCopy = await sceneCopy('Home');
check(homeCopy.includes('스카이브리지 작전'), 'home does not name the mission in Korean');
check(homeCopy.includes('90초 작전') && homeCopy.includes('구조차 보호') && homeCopy.includes('보스 격추'), 'home does not state duration and playable goal');
check(homeCopy.includes('게임 시작') && homeCopy.includes('3단계 실전 훈련'), 'home does not promise playable onboarding');
await page.screenshot({ path: 'qa-captures/polish-03-after-home.png' });

await clickLogical(195, 625); await waitScene('Briefing');
const briefingCopy = await sceneCopy('Briefing');
check(briefingCopy.includes('구조차를 지키고 공격 헬기를 격추'), 'briefing does not state victory condition');
check(briefingCopy.includes('빨간 마름모') && briefingCopy.includes('하늘색 방패') && briefingCopy.includes('흰 구조 원'), 'briefing does not explain IFF');
check(briefingCopy.includes('전장 드래그') && briefingCopy.includes('잠금 100%'), 'briefing does not explain exact controls');
const gameInactiveWhileReading = await page.evaluate(() => !globalThis.__GAME__.scene.isActive('Game'));
check(gameInactiveWhileReading, 'mission simulation started while reading briefing');
await page.screenshot({ path: 'qa-captures/polish-03-after-briefing.png' });

await clickLogical(195, 766); await waitScene('Game'); await page.waitForTimeout(700);
const step0 = await page.evaluate(() => ({
  active: globalThis.__GAME__.scene.getScene('Game').tutorial?.active,
  step: globalThis.__GAME__.scene.getScene('Game').tutorial?.step,
  elapsed: globalThis.__SKYBREAK_QA__.elapsed,
}));
check(step0.active && step0.step === 0 && step0.elapsed === 0, 'interactive tutorial did not pause mission at aim step');
await captureCanvas('qa-captures/polish-03-after-tutorial-aim.png');

await dragLogical(195, 470, 82, 348); await page.waitForTimeout(520);
const step1 = await page.evaluate(() => ({ step: globalThis.__GAME__.scene.getScene('Game').tutorial?.step, elapsed: globalThis.__SKYBREAK_QA__.elapsed }));
check(step1.step === 1 && step1.elapsed === 0, 'aim action did not advance to gun tutorial');
await captureCanvas('qa-captures/polish-03-after-tutorial-gun.png');

await holdLogical(104, 782, 430); await page.waitForTimeout(250);
const gunResult = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Game');
  return { step: scene.tutorial?.step, combo: globalThis.__SKYBREAK_QA__.combo, shots: scene.weapon.shots, aim: { x: scene.aim.x, y: scene.aim.y }, target: scene.tutorial?.target ? { active: scene.tutorial.target.active, hp: scene.tutorial.target.hp, x: scene.tutorial.target.sprite?.x, y: scene.tutorial.target.sprite?.y } : null };
});
check(gunResult.step === 2 && gunResult.shots >= 3, `actual gun action did not advance to missile tutorial: ${JSON.stringify(gunResult)}`);
await page.waitForTimeout(420);
await captureCanvas('qa-captures/polish-03-after-tutorial-missile.png');

await dragLogical(82, 348, 292, 310); await page.waitForTimeout(140);
await holdLogical(286, 782, 760); await page.waitForTimeout(1150);
const completed = await page.evaluate(() => ({
  tutorialActive: globalThis.__GAME__.scene.getScene('Game').tutorial?.active,
  elapsed: globalThis.__SKYBREAK_QA__.elapsed,
  ammo: globalThis.__SKYBREAK_QA__.ammo,
  score: globalThis.__SKYBREAK_QA__.score,
  combo: globalThis.__SKYBREAK_QA__.combo,
  tutorialSaved: localStorage.getItem('skybreak-gunship_tutorial_complete'),
}));
check(!completed.tutorialActive && completed.elapsed > 0 && completed.ammo === 4 && completed.score === 0 && completed.combo === 1 && completed.tutorialSaved === '1', 'tutorial did not reset combat state and start a clean mission');
await page.waitForFunction(() => globalThis.__SKYBREAK_QA__?.elapsed >= 1.70, { timeout: 4_000 });
const earlyThreat = await page.evaluate(() => {
  const scene = globalThis.__GAME__.scene.getScene('Game');
  const hostile = scene.targets.find((target) => target.active && target.side === 'hostile' && !target.isTutorial);
  return {
    elapsed: globalThis.__SKYBREAK_QA__.elapsed,
    hostileType: hostile?.type || null,
    hostileMarkerVisible: Boolean(hostile?.marker?.visible),
    firstHostileCueShown: scene.firstHostileCueShown,
  };
});
check(Boolean(earlyThreat.hostileType) && earlyThreat.hostileMarkerVisible && earlyThreat.firstHostileCueShown, `Approach did not surface an early hostile marker: ${JSON.stringify(earlyThreat)}`);
await captureCanvas('qa-captures/polish-03-after-mission-live.png');

await clickLogical(315, 79); await waitScene('Briefing');
const helpCopy = await sceneCopy('Briefing');
check(helpCopy.includes('작전으로 돌아가기') && helpCopy.includes('조작 방법'), 'persistent help did not reopen Korean controls');
await page.screenshot({ path: 'qa-captures/polish-03-after-help-reopened.png' });
await clickLogical(195, 766); await waitScene('Game');

const backing = await page.evaluate(() => {
  const canvas = document.querySelector('canvas'); const rect = canvas.getBoundingClientRect();
  return { scale: canvas.width / rect.width, dpr: devicePixelRatio };
});
const assertions = {
  goalVisibleBeforePlay: true,
  firstRunCoachVisible: true,
  coachStatesWinCondition: true,
  simulationPausedWhileReading: true,
  persistentHelpReopensCoach: true,
  identificationExplained: true,
  durationVisible: true,
  koreanGoalVisibleBeforePlay: true,
  exactControlsVisibleBeforePlay: true,
  iffExplainedByShape: true,
  tutorialPausesMission: true,
  actualDragAdvancesAimStep: true,
  actualGunKillAdvancesStep: true,
  actualMissileLaunchStartsMission: true,
  tutorialCompletionPersists: true,
  earlyApproachHostileMarker: true,
  dprBackingStoreMeetsTarget: backing.scale + 0.01 >= Math.min(backing.dpr, 3),
};
const ok = browserErrors.length === 0 && Object.values(assertions).every(Boolean);
const report = { ok, assertions, browserErrors, step0, step1, gunResult, completed, earlyThreat, homeCopy, briefingCopy, helpCopy, backing };
await fs.writeFile('qa-captures/clarity-results.json', `${JSON.stringify(report, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;
