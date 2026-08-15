// QA 어댑터 공통 헬퍼. 각 어댑터가 같은 방식으로 브라우저를 열고 논리 좌표를 누른다.
import fs from 'node:fs';
import { chromium } from 'playwright';

export const BASE_URL = process.env.GAME_QA_URL || process.env.FIREBREAK_QA_URL || 'http://127.0.0.1:4173';
export const U = 3;                      // 논리 캔버스 / 디자인 단위 (1170 / 390)
export const CANVAS = { width: 390 * U, height: 844 * U };

export async function openGame({ width = 390, height = 844, dpr = 2 } = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const browserErrors = [];
  page.on('pageerror', (e) => browserErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') browserErrors.push(`console:error: ${m.text()}`); });

  const waitScene = (scene) => page.waitForFunction(
    (expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 15_000 });

  // clickLogical은 논리 캔버스 좌표(0..1170, 0..2532)를 받는다.
  const clickLogical = async (x, y) => {
    const box = await page.locator('canvas').boundingBox();
    await page.mouse.click(box.x + x * box.width / CANVAS.width, box.y + y * box.height / CANVAS.height);
  };
  const pressLogical = async (x, y, holdMs) => {
    const box = await page.locator('canvas').boundingBox();
    const px = box.x + x * box.width / CANVAS.width;
    const py = box.y + y * box.height / CANVAS.height;
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.waitForTimeout(holdMs);
    await page.mouse.up();
  };
  const debug = () => page.evaluate(() => globalThis.__KEEPER_DEBUG__?.get?.() || null);

  return { browser, context, page, browserErrors, waitScene, clickLogical, pressLogical, debug };
}

export const LAYOUT = {
  play: { x: CANVAS.width / 2, y: CANVAS.height * 0.665 },
  sound: { x: CANVAS.width / 2, y: CANVAS.height * 0.745 },
  pause: { x: CANVAS.width - 38 * U, y: 52 * U },
  help: { x: CANVAS.width - 38 * U, y: (52 + 66) * U },
  lamp: { x: CANVAS.width / 2, y: CANVAS.height - 150 * U },
  clear: { x: CANVAS.width / 2, y: CANVAS.height - 36 * U },
  resume: { x: CANVAS.width / 2, y: CANVAS.height * 0.5 },
  // 도움말 모드는 코드표가 위를 차지해 버튼이 아래로 내려간다(PauseScene의 isHelp 분기).
  resumeHelp: { x: CANVAS.width / 2, y: CANVAS.height * 0.78 },
  homeFromPause: { x: CANVAS.width / 2, y: CANVAS.height * 0.5 + 78 * U },
};

export function finish(reportPath, payload) {
  fs.mkdirSync('qa-captures', { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({ ok: payload.ok, report: reportPath }, null, 2));
  process.exit(payload.ok ? 0 : 1);
}
