// QA 어댑터 공통 헬퍼.
import fs from 'node:fs';
import { chromium } from 'playwright';

export const BASE_URL = process.env.GAME_QA_URL || process.env.FIREBREAK_QA_URL || 'http://127.0.0.1:4173';
export const U = 3;                       // 논리 캔버스 / 디자인 단위 (1170 / 390)
export const CANVAS = { width: 390 * U, height: 844 * U };

export async function openGame({ width = 390, height = 844, dpr = 2 } = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await context.newPage();

  // 헤드리스 swiftshader가 브라우저를 연달아 띄우면 GL 컨텍스트 초기화가 간헐적으로 실패해
  // 드라이버 메시지를 던진다. 게임 오류가 아니므로 따로 모으되, 조용히 버리지는 않는다.
  const browserErrors = [];
  const rendererWarnings = [];
  const NOISE = /Framebuffer status|GL Driver Message|WebGL-0x|swiftshader/i;
  const record = (line) => { (NOISE.test(line) ? rendererWarnings : browserErrors).push(line); };
  page.on('pageerror', (e) => record(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') record(`console:error: ${m.text()}`); });

  const waitScene = (scene) => page.waitForFunction(
    (expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 15_000 });

  // clickLogical / dragLogical은 **논리 캔버스 좌표**(0..1170, 0..2532)를 받는다.
  const toScreen = async (x, y) => {
    const box = await page.locator('canvas').boundingBox();
    return { x: box.x + x * box.width / CANVAS.width, y: box.y + y * box.height / CANVAS.height };
  };
  const clickLogical = async (x, y) => { const p = await toScreen(x, y); await page.mouse.click(p.x, p.y); };
  // steps가 많을수록 느린 드래그(이동), 적을수록 빠른 플릭(다이브)이 된다.
  const dragLogical = async (x0, y0, x1, y1, steps = 12) => {
    const a = await toScreen(x0, y0); const b = await toScreen(x1, y1);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps });
    await page.mouse.up();
  };
  const debug = () => page.evaluate(() => globalThis.__KEEPER_DEBUG__?.get?.() || null);

  return { browser, context, page, browserErrors, rendererWarnings, waitScene, clickLogical, dragLogical, debug };
}

export const LAYOUT = {
  play: { x: CANVAS.width / 2, y: CANVAS.height * 0.645 },
  sound: { x: CANVAS.width / 2, y: CANVAS.height * 0.725 },
  pause: { x: CANVAS.width - 38 * U, y: 140 * U },
  help: { x: CANVAS.width - 38 * U, y: 206 * U },
  resume: { x: CANVAS.width / 2, y: CANVAS.height * 0.5 },
  resumeHelp: { x: CANVAS.width / 2, y: CANVAS.height * 0.78 },
  homeFromPause: { x: CANVAS.width / 2, y: CANVAS.height * 0.5 + 78 * U },
  playfield: { y: CANVAS.height * 0.80 },
};

export function finish(reportPath, payload) {
  fs.mkdirSync('qa-captures', { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({ ok: payload.ok, report: reportPath }, null, 2));
  process.exit(payload.ok ? 0 : 1);
}
