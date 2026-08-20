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
    (expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 15_000 })
    .catch(async () => {
      // 어느 전환에서 멈췄는지 메시지에 담는다. "Timeout exceeded"만으로는 추적이 안 된다.
      const actual = await page.evaluate(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene ?? '(none)').catch(() => '(unreadable)');
      throw new Error(`scene "${scene}" not reached in 15000ms — registry still reports "${actual}"`);
    });

  // clickLogical / dragLogical은 **논리 캔버스 좌표**(0..1170, 0..2532)를 받는다.
  const toScreen = async (x, y) => {
    const box = await page.locator('canvas').boundingBox();
    return { x: box.x + x * box.width / CANVAS.width, y: box.y + y * box.height / CANVAS.height };
  };
  // 등록된 UI는 좌표를 추측하지 말고 **레지스트리가 발행한 실제 위치**를 클릭한다.
  // 좌표를 상수로 들고 있으면 씬 배치를 바꾸는 순간 어댑터가 조용히 빗나간다 — 실제로
  // 홈을 팀 시트로 바꾸자 GameOver 재시도 클릭(play.y + 85*3 추정)이 허공을 눌렀다.
  // 적대적 입력 검사는 씬이 바뀐 **뒤에도 같은 화면 지점**을 눌러야 한다(원샷 전환 증명).
  // 그때는 매번 id를 조회할 수 없으므로 위치를 먼저 받아 두고 그 점을 연타한다.
  const locateId = async (id) => {
    const item = await page.evaluate((wanted) => {
      const found = (globalThis.__GAME_LAYOUT_BOUNDS__?.items || []).find((it) => it.id === wanted);
      return found ? { x: found.x + found.width / 2, y: found.y + found.height / 2 } : null;
    }, id);
    if (!item) throw new Error(`layout registry has no id "${id}" in scene ${await page.evaluate(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene)}`);
    return item;
  };
  const clickPoint = async (p) => { await page.mouse.click(p.x, p.y); };

  const clickId = async (id) => {
    const item = await page.evaluate((wanted) => {
      const found = (globalThis.__GAME_LAYOUT_BOUNDS__?.items || []).find((it) => it.id === wanted);
      // x,y는 getBounds() 기준 좌상단이다 — 중심을 눌러야 히트 영역에 들어간다.
      return found ? { x: found.x + found.width / 2, y: found.y + found.height / 2 } : null;
    }, id);
    if (!item) throw new Error(`layout registry has no id "${id}" in scene ${await page.evaluate(() => globalThis.__GAME_LAYOUT_BOUNDS__?.scene)}`);
    await page.mouse.click(item.x, item.y);
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

  return { browser, context, page, browserErrors, rendererWarnings, waitScene, clickId, locateId, clickPoint, clickLogical, dragLogical, debug };
}

export const LAYOUT = {
  // 좌표는 uiDirection.HOME_LAYOUT을 따른다 — 팀 시트 구성이라 행동 버튼이 가로로 놓인다.
  play: { x: CANVAS.width * 0.30, y: CANVAS.height * 0.845 },
  sound: { x: CANVAS.width * 0.74, y: CANVAS.height * 0.845 },
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
