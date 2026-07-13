#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveRuntimeAssets } from '../templates/runtime-asset-delivery.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatorRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(generatorRoot, '..');
const cli = path.join(generatorRoot, 'src/cli.mjs');
const defaultSpec = path.join(generatorRoot, 'examples/poop-dodge.spec.json');
const tmpRoot = path.join(workspaceRoot, '.tmp', 'asset-qa');

function parseArgs(argv) {
  const args = { spec: defaultSpec, keep: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--keep') args.keep = true;
    else if (a === '--project') { args.project = path.resolve(argv[++i]); }
    else if (a === '--spec') { args.spec = path.resolve(argv[++i]); }
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function kb(bytes) { return bytes / 1024; }
function fail(errors, msg) { errors.push(msg); }

function parseSvgViewBox(text) {
  const match = text.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!match) return null;
  const nums = match[1].trim().split(/[\s,]+/).map(Number);
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) return null;
  return { width: nums[2], height: nums[3] };
}

function qaImage(projectDir, image, policy, errors) {
  const file = path.join(projectDir, image.path);
  if (!fs.existsSync(file)) return fail(errors, `missing image: ${image.path}`);
  const stat = fs.statSync(file);
  if (policy.maxSpriteKB && kb(stat.size) > policy.maxSpriteKB) fail(errors, `${image.id} exceeds maxSpriteKB: ${kb(stat.size).toFixed(1)}KB`);
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!policy.allowedFormats?.includes(ext)) fail(errors, `${image.id} has unsupported image format: ${ext}`);
  if (ext === 'svg') {
    const text = fs.readFileSync(file, 'utf8');
    if (!/^\s*<svg[\s>]/i.test(text)) fail(errors, `${image.id} is not an SVG root document`);
    if (/<script\b/i.test(text)) fail(errors, `${image.id} contains script tag`);
    if (/\b(?:href|xlink:href)\s*=\s*["']https?:\/\//i.test(text)) fail(errors, `${image.id} references external resources`);
    const viewBox = parseSvgViewBox(text);
    if (!viewBox) fail(errors, `${image.id} missing valid SVG viewBox`);
    if (viewBox && image.minWidth && viewBox.width < image.minWidth) fail(errors, `${image.id} width below minimum: ${viewBox.width} < ${image.minWidth}`);
    if (viewBox && image.minHeight && viewBox.height < image.minHeight) fail(errors, `${image.id} height below minimum: ${viewBox.height} < ${image.minHeight}`);
    if (image.requiresAlpha && /<rect[^>]+width\s*=\s*["']100%["'][^>]+height\s*=\s*["']100%["'][^>]+(?:fill|opacity)\s*=/i.test(text)) {
      fail(errors, `${image.id} appears to include a full opaque SVG background`);
    }
  }
}

function parseWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not RIFF/WAVE');
  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4),
        bitsPerSample: buffer.readUInt16LE(start + 14),
      };
    } else if (id === 'data') {
      data = { start, size };
    }
    offset = start + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('missing fmt or data chunk');
  const bytesPerSample = fmt.bitsPerSample / 8;
  const durationMs = (data.size / (fmt.sampleRate * fmt.channels * bytesPerSample)) * 1000;
  let peak = 0;
  let firstAudible = null;
  let lastAudible = null;
  if (fmt.bitsPerSample === 16) {
    const sampleCount = Math.floor(data.size / 2);
    for (let i = 0; i < sampleCount; i += 1) {
      const abs = Math.abs(buffer.readInt16LE(data.start + i * 2));
      peak = Math.max(peak, abs);
      if (abs > 128) {
        if (firstAudible === null) firstAudible = i;
        lastAudible = i;
      }
    }
    const samplesPerMs = (fmt.sampleRate * fmt.channels) / 1000;
    const leadingSilenceMs = firstAudible === null ? durationMs : firstAudible / samplesPerMs;
    const trailingSilenceMs = lastAudible === null ? durationMs : (sampleCount - lastAudible - 1) / samplesPerMs;
    return { ...fmt, durationMs, peakDb: peak > 0 ? 20 * Math.log10(peak / 32767) : -Infinity, leadingSilenceMs, trailingSilenceMs };
  }
  return { ...fmt, durationMs, peakDb: 0, leadingSilenceMs: 0, trailingSilenceMs: 0 };
}

function qaAudio(projectDir, audio, policy, errors) {
  const file = path.join(projectDir, audio.path);
  if (!fs.existsSync(file)) return fail(errors, `missing audio: ${audio.path}`);
  const stat = fs.statSync(file);
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!policy.allowedFormats?.includes(ext)) fail(errors, `${audio.id} has unsupported audio format: ${ext}`);
  const maxKb = audio.type === 'bgm' ? policy.maxBgmKB : policy.maxSfxKB;
  if (maxKb && kb(stat.size) > maxKb) fail(errors, `${audio.id} exceeds size budget: ${kb(stat.size).toFixed(1)}KB > ${maxKb}KB`);
  if (ext === 'wav') {
    try {
      const info = parseWav(fs.readFileSync(file));
      if (audio.maxDurationMs && info.durationMs > audio.maxDurationMs + 1) fail(errors, `${audio.id} too long: ${Math.round(info.durationMs)}ms > ${audio.maxDurationMs}ms`);
      if (policy.maxPeakDb !== undefined && info.peakDb > policy.maxPeakDb) fail(errors, `${audio.id} peak too hot: ${info.peakDb.toFixed(2)}dBFS > ${policy.maxPeakDb}dBFS`);
      if (policy.maxTrimSilenceMs !== undefined && Math.max(info.leadingSilenceMs, info.trailingSilenceMs) > policy.maxTrimSilenceMs) {
        fail(errors, `${audio.id} has too much edge silence`);
      }
    } catch (err) {
      fail(errors, `${audio.id} WAV parse failed: ${err.message}`);
    }
  }
}

function qaProject(projectDir) {
  const errors = [];
  const manifestFile = path.join(projectDir, 'assets/asset-manifest.json');
  const specFile = path.join(projectDir, 'src/game/data/game-spec.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`Missing manifest: ${manifestFile}`);
  if (!fs.existsSync(specFile)) throw new Error(`Missing generated spec: ${specFile}`);
  const manifest = readJson(manifestFile);
  const spec = readJson(specFile);
  if (manifest.assetLayout) {
    try { resolveRuntimeAssets(projectDir); } catch (error) { fail(errors, `runtime delivery contract: ${error.message}`); }
  }
  const imagePolicy = manifest.imagePolicy || {};
  const audioPolicy = manifest.audioPolicy || {};
  for (const image of manifest.images || []) qaImage(projectDir, image, imagePolicy, errors);
  for (const audio of manifest.audio || []) qaAudio(projectDir, audio, audioPolicy, errors);
  const audioFilesDir = path.join(projectDir, 'assets/audio');
  const wavCount = fs.existsSync(audioFilesDir) ? fs.readdirSync(audioFilesDir).filter((name) => name.endsWith('.wav')).length : 0;
  if (spec.audio?.enabled === false && (manifest.audio || []).length > 0) fail(errors, 'audio disabled spec has non-empty audio manifest');
  if (spec.audio?.enabled === false && wavCount > 0) fail(errors, 'audio disabled spec generated wav files');
  if (spec.audio?.enabled !== false && (manifest.audio || []).length === 0) fail(errors, 'audio enabled spec has empty audio manifest');
  if (errors.length) {
    console.error(`Asset QA failed for ${projectDir}`);
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(`Asset QA OK: ${projectDir}`);
}

function generateFixtures(spec) {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });
  const normal = path.join(tmpRoot, 'poop-dodge-assets');
  const noSfx = path.join(tmpRoot, 'poop-dodge-assets-no-sfx');
  run(process.execPath, [cli, '--force', '--spec', spec, '--out', normal]);
  run(process.execPath, [cli, '--force', '--no-sfx', '--spec', spec, '--out', noSfx]);
  return [normal, noSfx];
}

const args = parseArgs(process.argv.slice(2));
const projects = args.project ? [args.project] : generateFixtures(args.spec);
for (const project of projects) qaProject(project);
if (!args.keep && !args.project) fs.rmSync(tmpRoot, { recursive: true, force: true });
