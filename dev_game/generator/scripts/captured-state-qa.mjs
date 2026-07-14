#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') args.project = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--matrix') args.matrix = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && (!args.project || !args.url)) throw new Error('Required: --project <dir> --url <http-url>');
  return args;
}

function resolveProject(input) {
  const candidates = [path.resolve(process.cwd(), input), path.resolve(process.cwd(), '..', input), path.resolve(process.cwd(), 'generated', input)];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function validateMatrix(matrix) {
  const errors = [];
  if (matrix?.schemaVersion !== '1.0.0') errors.push('schemaVersion must be 1.0.0');
  if (!Array.isArray(matrix?.viewports) || matrix.viewports.length < 1) errors.push('viewports must be a non-empty array');
  if (!Array.isArray(matrix?.states) || matrix.states.length < 1) errors.push('states must be a non-empty array');
  for (const [index, viewport] of (matrix?.viewports || []).entries()) {
    if (!Number.isInteger(viewport.width) || viewport.width < 320) errors.push(`viewports[${index}].width invalid`);
    if (!Number.isInteger(viewport.height) || viewport.height < 568) errors.push(`viewports[${index}].height invalid`);
    if (!(viewport.dpr >= 1 && viewport.dpr <= 4)) errors.push(`viewports[${index}].dpr invalid`);
  }
  const ids = new Set();
  for (const [index, state] of (matrix?.states || []).entries()) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(state.id || '')) errors.push(`states[${index}].id invalid`);
    if (ids.has(state.id)) errors.push(`duplicate state id: ${state.id}`); ids.add(state.id);
    if (!state.expectedScene) errors.push(`states[${index}].expectedScene required`);
    if (!Array.isArray(state.requiredIds)) errors.push(`states[${index}].requiredIds must be an array`);
    if (state.terminal && !['none', 'win', 'loss'].includes(state.terminal)) errors.push(`states[${index}].terminal invalid`);
    if (state.capture !== undefined && typeof state.capture !== 'boolean') errors.push(`states[${index}].capture must be boolean`);
  }
  if (errors.length) throw new Error(`capture matrix validation failed:\n- ${errors.join('\n- ')}`);
}

const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const overlapAllowed = (a, b) => a.allowOverlap || b.allowOverlap || a.allowOverlapWith?.includes(b.id) || b.allowOverlapWith?.includes(a.id);

async function makeContactSheet(browser, files, labels, output) {
  const page = await browser.newPage({ viewport: { width: 1240, height: 900 } });
  const cards = files.map((file, index) => {
    const data = fs.readFileSync(file).toString('base64');
    return `<figure><figcaption>${labels[index]}</figcaption><img src="data:image/png;base64,${data}"></figure>`;
  }).join('');
  await page.setContent(`<style>html,body{margin:0;background:#111820;color:white;font:14px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px}figure{margin:0;background:#18232d;padding:8px}figcaption{height:22px}img{display:block;width:100%;height:auto}</style><main>${cards}</main>`);
  await page.screenshot({ path: output, fullPage: true });
  await page.close();
}

async function run(args) {
  const projectDir = resolveProject(args.project);
  const spec = JSON.parse(fs.readFileSync(path.join(projectDir, 'src/game/data/game-spec.json'), 'utf8'));
  const matrixFile = path.resolve(projectDir, args.matrix || spec.captureMatrix || 'qa/capture-matrix.json');
  const driverFile = path.resolve(projectDir, 'qa/capture-driver.mjs');
  if (!fs.existsSync(matrixFile)) throw new Error(`capture matrix missing: ${matrixFile}`);
  if (!fs.existsSync(driverFile)) throw new Error(`capture driver missing: ${driverFile}`);
  const matrix = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
  validateMatrix(matrix);
  const driver = await import(`${pathToFileURL(driverFile).href}?t=${Date.now()}`);
  if (typeof driver.prepareState !== 'function') throw new Error('capture-driver.mjs must export prepareState(page, state, helpers)');
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = path.join(projectDir, 'qa-captures', 'captured-state', runId);
  await fsp.mkdir(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--disable-gpu-sandbox', '--no-sandbox'] });
  const report = { schemaVersion: '1.0.0', runId, gameId: spec.game.id, matrix: path.relative(projectDir, matrixFile), viewports: {}, totals: { captures: 0, overlaps: 0, outOfBounds: 0, missingRequiredIds: 0, assertionFailures: 0, browserErrors: 0 }, ok: true };

  for (const viewport of matrix.viewports) {
    const label = `${viewport.width}x${viewport.height}@${viewport.dpr}`;
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.dpr });
    const page = await context.newPage();
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:error: ${message.text()}`); });
    const waitScene = (scene) => page.waitForFunction((expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected, scene, { timeout: 10_000 });
    const clickLogical = async (x, y) => { const canvas = await page.locator('canvas').boundingBox(); await page.mouse.click(canvas.x + x * canvas.width / spec.canvas.width, canvas.y + y * canvas.height / spec.canvas.height); };
    const helpers = { baseUrl: args.url, waitScene, clickLogical, spec };
    const states = [];
    const screenshotFiles = [];
    const screenshotLabels = [];
    const vpDir = path.join(outputRoot, label.replace('@', '-dpr'));
    await fsp.mkdir(vpDir, { recursive: true });

    for (const state of matrix.states) {
      await driver.prepareState(page, state, helpers);
      await waitScene(state.expectedScene);
      await page.waitForTimeout(120);
      const sample = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        return { layout: globalThis.__GAME_LAYOUT_BOUNDS__ || { scene: '', items: [], requiredIds: [] }, canvas: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, backing: { width: canvas.width, height: canvas.height }, dpr: devicePixelRatio, debug: globalThis.__FIREBREAK_DEBUG__?.get?.() || globalThis.__GAME_QA__?.getState?.() || null, rules: globalThis.__GAME_RULES__ || null };
      });
      const visible = (sample.layout.items || []).filter((item) => item.visible !== false && item.width > 0 && item.height > 0);
      const required = [...new Set([...(sample.layout.requiredIds || []), ...(state.requiredIds || [])])];
      const missingRequiredIds = required.filter((id) => !visible.some((item) => item.id === id));
      const overlaps = [];
      const outOfBounds = [];
      const assertionFailures = [];
      for (const item of visible) {
        const margin = 3;
        if (item.x < sample.canvas.x + margin || item.y < sample.canvas.y + margin || item.x + item.width > sample.canvas.x + sample.canvas.width - margin || item.y + item.height > sample.canvas.y + sample.canvas.height - margin) outOfBounds.push(item.id);
      }
      for (let i = 0; i < visible.length; i += 1) for (let j = i + 1; j < visible.length; j += 1) if (!overlapAllowed(visible[i], visible[j]) && intersects(visible[i], visible[j])) overlaps.push(`${visible[i].id}<->${visible[j].id}`);
      for (const [key, expected] of Object.entries(state.assertions?.debugEquals || {})) {
        if (sample.debug?.[key] !== expected) assertionFailures.push(`debug.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(sample.debug?.[key])}`);
      }
      if (state.assertions?.minBackingScale !== undefined && sample.backing.width / sample.canvas.width < state.assertions.minBackingScale) assertionFailures.push(`backingScale below ${state.assertions.minBackingScale}`);
      const file = path.join(vpDir, `${state.id}.png`);
      if (state.capture !== false) {
        await page.screenshot({ path: file });
        screenshotFiles.push(file); screenshotLabels.push(state.id);
      }
      states.push({ id: state.id, expectedScene: state.expectedScene, layoutScene: sample.layout.scene, requiredIds: required, missingRequiredIds, overlaps, outOfBounds, assertionFailures, backingScale: sample.backing.width / sample.canvas.width, terminal: state.terminal || 'none', debug: sample.debug, rules: sample.rules });
      report.totals.captures += 1; report.totals.overlaps += overlaps.length; report.totals.outOfBounds += outOfBounds.length; report.totals.missingRequiredIds += missingRequiredIds.length; report.totals.assertionFailures += assertionFailures.length;
    }
    const contactSheet = path.join(outputRoot, `contact-${label.replace('@', '-dpr')}.png`);
    await makeContactSheet(browser, screenshotFiles, screenshotLabels, contactSheet);
    report.totals.browserErrors += browserErrors.length;
    report.viewports[label] = { browserErrors, states, contactSheet: path.relative(projectDir, contactSheet) };
    await context.close();
  }
  report.ok = report.totals.overlaps === 0 && report.totals.outOfBounds === 0 && report.totals.missingRequiredIds === 0 && report.totals.assertionFailures === 0 && report.totals.browserErrors === 0;
  const reportFile = path.join(outputRoot, 'report.json');
  await fsp.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  await fsp.mkdir(path.dirname(path.join(projectDir, 'qa-captures', 'captured-state', 'latest-report.json')), { recursive: true });
  await fsp.writeFile(path.join(projectDir, 'qa-captures', 'captured-state', 'latest-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify({ ok: report.ok, runId, ...report.totals, report: reportFile }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) console.log('captured-state-qa --project <dir> --url <url> [--matrix <relative-path>]');
else run(args).catch((error) => { console.error(error.stack || error.message || error); process.exit(1); });
