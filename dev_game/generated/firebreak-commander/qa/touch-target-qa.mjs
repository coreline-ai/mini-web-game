import { chromium } from 'playwright';

const baseUrl = process.env.FIREBREAK_QA_URL || process.env.GAME_QA_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:error: ${message.text()}`); });
const check = (condition, message) => { if (!condition) throw new Error(message); };
const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
const clickLogical = async (x, y) => {
  const canvas = await page.locator('canvas').boundingBox();
  await page.mouse.click(canvas.x + x * canvas.width / 390, canvas.y + y * canvas.height / 844);
};

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
await waitScene('Home');
await clickLogical(195, 660);
await waitScene('Game');
const result = await page.evaluate(() => {
  const state = globalThis.__FIREBREAK_DEBUG__.get();
  const snap = globalThis.__FIREBREAK_DEBUG__.snapCell;
  const grid = { originX: 15, originY: 116, cellSize: 36 };
  const center = { x: grid.originX + 18, y: grid.originY + 18 };
  return {
    state,
    samples: {
      center: snap(center.x, center.y),
      rightWithin44: snap(center.x + 21.5, center.y),
      bottomWithin44: snap(center.x, center.y + 21.5),
      leftEdgeWithin44: snap(center.x - 21.5, center.y),
      outsideLeft: snap(center.x - 23, center.y),
      outsideTop: snap(center.x, center.y - 23),
    },
  };
});
check(result.state.interaction.visualCellSize === 36, `visual cell size changed: ${result.state.interaction.visualCellSize}`);
check(result.state.interaction.touchTargetSize >= 44, `touch target below 44px: ${result.state.interaction.touchTargetSize}`);
check(JSON.stringify(result.samples.center) === JSON.stringify({ x: 0, y: 0 }), 'center did not resolve to cell 0,0');
check(JSON.stringify(result.samples.rightWithin44) === JSON.stringify({ x: 1, y: 0 }), 'right 44px snap miss');
check(JSON.stringify(result.samples.bottomWithin44) === JSON.stringify({ x: 0, y: 1 }), 'bottom 44px snap miss');
check(JSON.stringify(result.samples.leftEdgeWithin44) === JSON.stringify({ x: 0, y: 0 }), 'left 44px halo miss');
check(result.samples.outsideLeft === null && result.samples.outsideTop === null, 'outside halo incorrectly selected a cell');
check(errors.length === 0, errors.join('\n'));
await browser.close();
console.log(JSON.stringify({ ok: true, assertions: 8, result: { interaction: result.state.interaction, samples: result.samples }, errors }, null, 2));
