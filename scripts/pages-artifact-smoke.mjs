import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const artifactRoot = resolve(process.env.PAGES_ARTIFACT_ROOT || join(projectRoot, 'pages-dist'));
const pagePrefix = '/mini-web-game';
const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1080, height: 1920 },
];

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

function safeFilePath(urlPath) {
  if (!urlPath.startsWith(pagePrefix)) return null;
  const relative = decodeURIComponent(urlPath.slice(pagePrefix.length)).replace(/^\/+/, '');
  const candidate = resolve(artifactRoot, relative);
  if (candidate !== artifactRoot && !candidate.startsWith(`${artifactRoot}${sep}`)) return null;
  return candidate;
}

function serveArtifact(request, response) {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
  let filePath = safeFilePath(requestUrl.pathname);
  if (!filePath) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  if (filePath.endsWith(sep) || (existsSync(filePath) && statSync(filePath).isDirectory())) {
    filePath = join(filePath, 'index.html');
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}

async function waitForGame(page, expression, label) {
  await page.waitForFunction(expression, null, { timeout: 15_000 }).catch(async (error) => {
    const diagnostics = await page.evaluate(() => ({
      rootGame: Boolean(window.__GAME),
      lastLightGame: Boolean(window.__GAME__),
      layoutScene: window.__GAME_LAYOUT_BOUNDS__?.scene || null,
      title: document.title,
    })).catch(() => ({}));
    throw new Error(`${label}: ${error.message}; diagnostics=${JSON.stringify(diagnostics)}`);
  });
}

async function checkPage(browser, path, viewport, setup) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

  try {
    const response = await page.goto(`http://127.0.0.1:${server.address().port}${path}`, { waitUntil: 'domcontentloaded' });
    if (!response || !response.ok()) throw new Error(`${path} returned ${response?.status() || 'no response'}`);
    await page.locator('canvas').waitFor({ state: 'visible', timeout: 15_000 });
    await setup(page);
    if (consoleErrors.length || pageErrors.length || failedRequests.length) {
      throw new Error(JSON.stringify({ consoleErrors, pageErrors, failedRequests }, null, 2));
    }
  } finally {
    await page.close();
  }
}

if (!existsSync(join(artifactRoot, 'index.html')) || !existsSync(join(artifactRoot, 'last-light-zero-hour', 'index.html'))) {
  throw new Error(`Expected Pages artifact with both apps: ${artifactRoot}`);
}

const server = createServer(serveArtifact);
await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));

const browser = await chromium.launch({ headless: true });
try {
  await checkPage(browser, `${pagePrefix}/`, viewports[0], async (page) => {
    await waitForGame(page, 'Boolean(window.__GAME)', 'root game did not boot');
  });

  for (const viewport of viewports) {
    await checkPage(browser, `${pagePrefix}/last-light-zero-hour/`, viewport, async (page) => {
      await waitForGame(page, "Boolean(window.__GAME__ && window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home')", 'Last Light Home did not boot');

      const canvas = await page.locator('canvas').boundingBox();
      if (!canvas) throw new Error('Last Light canvas has no bounds');
      await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height * (1635 / 2560));
      await waitForGame(page, "Boolean(window.__GAME__?.scene?.isActive?.('Game'))", 'Last Light did not enter Game scene');
    });
  }

  await checkPage(browser, `${pagePrefix}/last-light-zero-hour`, viewports[0], async (page) => {
    await waitForGame(page, "Boolean(window.__GAME__ && window.__GAME_LAYOUT_BOUNDS__?.scene === 'Home')", 'Last Light no-slash URL did not boot');
  });
}
finally {
  await browser.close();
  await new Promise((resolveClosed) => server.close(resolveClosed));
}

console.log(`Pages artifact smoke OK: root + Last Light at ${viewports.map(({ width, height }) => `${width}x${height}`).join(', ')}`);
