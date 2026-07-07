#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const VALID_ACTIONS = new Set(['BUY', 'SELL', 'HEDGE', 'CASH']);
const MIN_EVENTS = 180;
const MIN_MARKET_EVENTS = 30;
const MIN_PER_TICKER = 30;
const MIN_RUMOR_OR_FAKE = 24;
const MAX_HEADLINE_CHARS = 72;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project') args.project = argv[++i];
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.help && !args.project) throw new Error('Missing --project <generated-game-dir>');
  return args;
}

function usage() {
  console.log('Usage: node generator/scripts/hq-screen-quality-qa.mjs --project <generated-game-dir>');
}

function resolveProject(projectArg) {
  const candidates = [
    path.resolve(process.cwd(), projectArg),
    path.resolve(process.cwd(), '..', projectArg),
    path.resolve(process.cwd(), 'generated', projectArg),
    path.resolve(process.cwd(), '..', 'generated', projectArg),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function measureImages(files) {
  const py = `
import sys, json, os
from PIL import Image, ImageFilter, ImageStat
out=[]
for p in json.load(sys.stdin):
    try:
        im=Image.open(p)
        w,h=im.size
        rgb=im.convert('RGB')
        small=rgb.resize((min(256,w),min(256,h)))
        colors=len(set(list(small.getdata())))
        edge=ImageStat.Stat(rgb.convert('L').filter(ImageFilter.FIND_EDGES)).var[0]
        alpha=False
        pads=None
        if im.mode in ('RGBA','LA','PA'):
            a=im.convert('RGBA').getchannel('A')
            mn,_=a.getextrema()
            alpha = mn < 250
            bbox=a.getbbox()
            if bbox:
                pads=[bbox[0],bbox[1],w-bbox[2],h-bbox[3]]
        out.append({'p':p,'w':w,'h':h,'colors':colors,'edge':round(edge,1),'alpha':alpha,'pads':pads,'bytes':os.path.getsize(p)})
    except Exception as e:
        out.append({'p':p,'err':str(e)})
print(json.dumps(out))
`;
  const result = spawnSync('python3', ['-c', py], {
    input: JSON.stringify(files),
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return new Map(JSON.parse(result.stdout).map((item) => [item.p, item]));
}

function extractMarketEvents(configSource, projectDir) {
  const specPath = path.join(projectDir, 'src/game/data/game-spec.json');
  const SPEC = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const runnableSource = configSource
    .replace("import { SPEC } from '../data/spec.js';", '')
    .replace(/export function /g, 'function ')
    .replace(/export const MARKET_EVENTS = /, 'globalThis.MARKET_EVENTS = ')
    .replace(/export const /g, 'const ');
  const context = vm.createContext({ SPEC, globalThis: {} });
  vm.runInContext(runnableSource, context, {
    filename: path.join(projectDir, 'src/game/config/marketConfig.js'),
    timeout: 1000,
  });
  if (!Array.isArray(context.globalThis.MARKET_EVENTS)) throw new Error('MARKET_EVENTS export did not evaluate to an array');
  return context.globalThis.MARKET_EVENTS;
}

function validateNews(projectDir, errors) {
  const file = path.join(projectDir, 'src/game/config/marketConfig.js');
  const source = fs.readFileSync(file, 'utf8');
  const events = extractMarketEvents(source, projectDir);
  const ids = new Set();
  const perTicker = new Map();
  let rumorOrFake = 0;
  for (const event of events) {
    if (ids.has(event.id)) errors.push(`duplicate MARKET_EVENTS id: ${event.id}`);
    ids.add(event.id);
    perTicker.set(event.ticker, (perTicker.get(event.ticker) || 0) + 1);
    if (event.fake || event.type === 'fake' || event.type === 'rumor') rumorOrFake += 1;
    const good = new Set(event.good || []);
    const bad = new Set(event.bad || []);
    for (const action of [...good, ...bad]) {
      if (!VALID_ACTIONS.has(action)) errors.push(`${event.id} has invalid action ${action}`);
    }
    for (const action of good) {
      if (bad.has(action)) errors.push(`${event.id} action ${action} appears in both good and bad`);
    }
    if (String(event.headline || '').length < 8) errors.push(`${event.id} headline too short`);
    if (String(event.headline || '').length > MAX_HEADLINE_CHARS) errors.push(`${event.id} headline too long for mobile panel`);
  }
  if (events.length < MIN_EVENTS) errors.push(`MARKET_EVENTS count ${events.length} < ${MIN_EVENTS}`);
  if ((perTicker.get('MARKET') || 0) < MIN_MARKET_EVENTS) errors.push(`MARKET events ${(perTicker.get('MARKET') || 0)} < ${MIN_MARKET_EVENTS}`);
  for (const ticker of ['NOVA', 'VOLT', 'BIOZ', 'GRID', 'SAFE', 'CBNK']) {
    if ((perTicker.get(ticker) || 0) < MIN_PER_TICKER) errors.push(`${ticker} events ${(perTicker.get(ticker) || 0)} < ${MIN_PER_TICKER}`);
  }
  if (rumorOrFake < MIN_RUMOR_OR_FAKE) errors.push(`rumor/fake events ${rumorOrFake} < ${MIN_RUMOR_OR_FAKE}`);
  return { events: events.length, perTicker: Object.fromEntries(perTicker), rumorOrFake };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const projectDir = resolveProject(args.project);
  const manifestPath = path.join(projectDir, 'assets/asset-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const errors = [];
  const assets = [
    ...(manifest.stageBackgrounds || []).map((entry) => ({ ...entry, kind: 'background' })),
    ...(manifest.images || []).map((entry) => ({ ...entry, kind: 'manifest-image' })),
    ...(manifest.hqScreenAssets || []).map((entry) => ({ ...entry, kind: 'hq-ui' })),
  ];
  const files = assets.map((entry) => path.join(projectDir, entry.path));
  const measurements = measureImages(files);
  for (const entry of assets) {
    const file = path.join(projectDir, entry.path);
    const m = measurements.get(file);
    if (!m || m.err) {
      errors.push(`${entry.id} unreadable: ${m?.err || 'missing measurement'}`);
      continue;
    }
    if (!fs.existsSync(file)) errors.push(`${entry.id} missing: ${entry.path}`);
    if (m.w < Number(entry.minWidth || 0) || m.h < Number(entry.minHeight || 0)) {
      errors.push(`${entry.id} ${m.w}x${m.h} below ${entry.minWidth}x${entry.minHeight}`);
    }
    if (entry.kind === 'background') {
      if (m.w < 1080 || m.h < 1920) errors.push(`${entry.id} must be at least 1080x1920`);
      if (m.colors < 8000) errors.push(`${entry.id} colors ${m.colors} < 8000`);
      if (m.edge < 60) errors.push(`${entry.id} edge variance ${m.edge} < 60`);
      if (m.bytes > 3.5 * 1024 * 1024) errors.push(`${entry.id} file size ${(m.bytes / 1024 / 1024).toFixed(2)}MiB > 3.5MiB`);
      if (entry.provenance?.method !== 'codex-gpt-imagegen-skill') errors.push(`${entry.id} missing imagegen provenance`);
    } else if (entry.kind === 'manifest-image') {
      const limitKb = Number(manifest.imagePolicy?.maxSpriteKB || 512);
      if (entry.requiresAlpha && !m.alpha) errors.push(`${entry.id} requires alpha`);
      if (m.bytes > limitKb * 1024) errors.push(`${entry.id} file size ${(m.bytes / 1024).toFixed(1)}KiB > ${limitKb}KiB`);
      if (entry.provenance?.method !== 'codex-gpt-imagegen-skill') errors.push(`${entry.id} missing imagegen provenance`);
    } else {
      if (entry.requiresAlpha && !m.alpha) errors.push(`${entry.id} requires alpha`);
      if (m.bytes > 512 * 1024) errors.push(`${entry.id} file size ${(m.bytes / 1024).toFixed(1)}KiB > 512KiB`);
    }
  }
  const news = validateNews(projectDir, errors);
  if (errors.length) {
    console.error(`HQ screen quality QA failed: ${projectDir}`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`HQ screen quality QA OK: ${projectDir}`);
  console.log(`Checked assets=${assets.length}, newsEvents=${news.events}, rumorOrFake=${news.rumorOrFake}`);
}

main();
