#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_BACKGROUND_FORMATS = new Set(['png', 'webp', 'jpg', 'jpeg']);
const CORE_GAMEPLAY_ROLES = new Set([
  'player', 'vehicle', 'car', 'parcel', 'hazard', 'obstacle', 'enemy', 'boss',
  'collectible', 'reward', 'sort-bin', 'item', 'powerup', 'projectile',
  'stage-background', 'background', 'warehouse', 'road', 'lane', 'target', 'goal',
]);
const SVG_ALLOWED_ROLES = new Set(['ui-icon', 'icon', 'feedback', 'debug', 'placeholder', 'badge', 'label']);
const REQUIRED_DOCS = [
  'docs/01-GDD.md',
  'docs/02-TECH-DESIGN.md',
  'docs/03-ASSET-AUDIO-PLAN.md',
  'docs/04-QA-PLAN.md',
  'docs/05-ADVERSARIAL-REVIEW.md',
];

function usage() {
  console.log(`Usage:
  node generator/scripts/production-demo-qa.mjs --project <generated-game-dir>

Options:
  --project <dir>                 Generated/custom game directory to inspect
  --min-stage-backgrounds <n>      Minimum stage/theme backgrounds (default: 3)
  --allow-svg-backgrounds          Allow SVG stage backgrounds (default: false)
  --help                          Show this help

This gate is intentionally stricter than factory:qa. It decides whether a game is a
high-quality first production-demo, not merely a generated foundation starter.
It also enforces per-game asset isolation: no shared runtime assets, no symlinked assets,
and all manifest assets must be generated for this specific game.`);
}

function parseArgs(argv) {
  const args = { minStageBackgrounds: 3, allowSvgBackgrounds: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--min-stage-backgrounds') args.minStageBackgrounds = Number(argv[++i]);
    else if (a === '--allow-svg-backgrounds') args.allowSvgBackgrounds = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project) throw new Error('Missing required --project <dir>');
  if (!Number.isInteger(args.minStageBackgrounds) || args.minStageBackgrounds < 1) {
    throw new Error('--min-stage-backgrounds must be a positive integer');
  }
  return args;
}

function resolveProject(input) {
  const candidates = [path.resolve(process.cwd(), input)];
  candidates.push(path.resolve(process.cwd(), '..', input));
  candidates.push(path.resolve(process.cwd(), 'generated', input));
  candidates.push(path.resolve(process.cwd(), '..', 'generated', input));
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function readJson(file, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    errors.push(`${path.relative(process.cwd(), file)} JSON parse failed: ${err.message}`);
    return null;
  }
}

function isInsideDir(file, dir) {
  const rel = path.relative(dir, file);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveAssetFile(projectDir, relPath, label, errors) {
  if (typeof relPath !== 'string' || relPath.trim() === '') {
    errors.push(`${label} path must be a non-empty relative string`);
    return null;
  }
  if (path.isAbsolute(relPath)) {
    errors.push(`${label} path must be project-relative, not absolute: ${relPath}`);
    return null;
  }
  const normalizedParts = relPath.split(/[\/]+/);
  if (normalizedParts.includes('..')) {
    errors.push(`${label} path must not escape the generated project: ${relPath}`);
    return null;
  }
  const projectRoot = path.resolve(projectDir);
  const assetsRoot = path.resolve(projectDir, 'assets');
  const file = path.resolve(projectDir, relPath);
  if (!isInsideDir(file, assetsRoot)) {
    errors.push(`${label} must live under this game's assets/ directory: ${relPath}`);
    return file;
  }
  if (!isInsideDir(file, projectRoot)) {
    errors.push(`${label} resolves outside the generated project: ${relPath}`);
    return file;
  }
  if (fs.existsSync(file)) {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) {
      errors.push(`${label} must be a real per-game file, not a symlink: ${relPath}`);
    }
    try {
      const realFile = fs.realpathSync(file);
      const realAssetsRoot = fs.realpathSync(assetsRoot);
      if (!isInsideDir(realFile, realAssetsRoot)) {
        errors.push(`${label} realpath escapes this game's assets/ directory: ${relPath}`);
      }
    } catch {}
  }
  return file;
}

function validateNoAssetSymlinks(projectDir, errors) {
  const assetsRoot = path.join(projectDir, 'assets');
  if (!fs.existsSync(assetsRoot)) return;
  for (const file of walkFiles(assetsRoot)) {
    if (fs.lstatSync(file).isSymbolicLink()) {
      errors.push(`assets/ must not contain symlinks for production-demo isolation: ${path.relative(projectDir, file)}`);
    }
  }
}

function entryProvenance(entry) {
  const p = entry?.provenance && typeof entry.provenance === 'object' ? entry.provenance : {};
  return {
    source: p.source ?? entry?.source,
    generatedFor: p.generatedFor ?? entry?.generatedFor,
    reusedFrom: p.reusedFrom ?? entry?.reusedFrom ?? entry?.copiedFrom ?? entry?.sourceProject,
    generator: p.generator ?? entry?.generator,
    method: p.method ?? entry?.method,
    model: p.model ?? entry?.model,
    rawPath: p.rawPath ?? entry?.rawPath,
    promptHash: p.promptHash ?? entry?.promptHash,
  };
}

function validateEntryProvenance(entry, label, gameId, errors) {
  const p = entryProvenance(entry);
  if (p.source !== 'generated-for-game') {
    errors.push(`${label} provenance.source must be "generated-for-game"; shared/common runtime assets are forbidden`);
  }
  if (p.generatedFor !== gameId) {
    errors.push(`${label} provenance.generatedFor must match this game id (${gameId})`);
  }
  if (p.reusedFrom) {
    errors.push(`${label} must not declare reused/copied/shared source (${p.reusedFrom}); generate a new asset for this game`);
  }
}

function validateAssetIsolation(projectDir, manifest, spec, errors) {
  const gameId = spec?.game?.id;
  const isolation = manifest.assetIsolation || {};
  if (isolation.mode !== 'per-game') errors.push('asset-manifest.assetIsolation.mode must be "per-game"');
  if (isolation.generatedFor !== gameId) errors.push(`asset-manifest.assetIsolation.generatedFor must match spec.game.id (${gameId})`);
  if (isolation.noSharedRuntimeAssets !== true) errors.push('asset-manifest.assetIsolation.noSharedRuntimeAssets must be true');
  if (manifest.sharedAssets || manifest.allowSharedAssets || isolation.sharedAssetsAllowed) {
    errors.push('shared runtime assets are forbidden for production-demo; generate assets inside the game project instead');
  }
  validateNoAssetSymlinks(projectDir, errors);
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function parseSvgViewBox(text) {
  const match = text.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!match) return null;
  const nums = match[1].trim().split(/[\s,]+/).map(Number);
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) return null;
  return { width: nums[2], height: nums[3] };
}

function readPngSize(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpSize(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + ((b3 << 6) | (b2 >> 2) | ((b1 & 0xc0) << 6));
    return { width, height };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    const start = 20;
    if (buffer[start + 3] === 0x9d && buffer[start + 4] === 0x01 && buffer[start + 5] === 0x2a) {
      return { width: buffer.readUInt16LE(start + 6) & 0x3fff, height: buffer.readUInt16LE(start + 8) & 0x3fff };
    }
  }
  return null;
}

function readImageSize(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const buffer = fs.readFileSync(file);
  if (ext === 'png') return readPngSize(buffer);
  if (ext === 'jpg' || ext === 'jpeg') return readJpegSize(buffer);
  if (ext === 'webp') return readWebpSize(buffer);
  if (ext === 'svg') return parseSvgViewBox(buffer.toString('utf8'));
  return null;
}

function fileExt(relPath) {
  return path.extname(relPath || '').slice(1).toLowerCase();
}

function isCoreGameplayImage(image) {
  const role = String(image.role || '').toLowerCase();
  const type = String(image.type || '').toLowerCase();
  if (CORE_GAMEPLAY_ROLES.has(role)) return true;
  return type === 'background' || type === 'sprite' && !SVG_ALLOWED_ROLES.has(role);
}

function validateDocs(projectDir, errors) {
  for (const rel of REQUIRED_DOCS) {
    const file = path.join(projectDir, rel);
    if (!fs.existsSync(file)) {
      errors.push(`required planning doc missing: ${rel}`);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8').trim();
    if (text.length < 400) errors.push(`${rel} is too thin for production-demo (${text.length} chars < 400)`);
  }
  const adversarial = path.join(projectDir, 'docs/05-ADVERSARIAL-REVIEW.md');
  if (fs.existsSync(adversarial)) {
    const text = fs.readFileSync(adversarial, 'utf8').toLowerCase();
    if (!/(reskin|스킨|이름만|placeholder|플레이스홀더|차별)/i.test(text)) {
      errors.push('docs/05-ADVERSARIAL-REVIEW.md must explicitly challenge reskin/placeholder risk');
    }
  }
}

function validateStageBackgrounds(projectDir, manifest, spec, args, errors) {
  const backgrounds = manifest.stageBackgrounds;
  if (!Array.isArray(backgrounds)) {
    errors.push('asset-manifest.stageBackgrounds must exist and be an array');
    return;
  }
  if (backgrounds.length < args.minStageBackgrounds) {
    errors.push(`asset-manifest.stageBackgrounds must contain at least ${args.minStageBackgrounds} backgrounds (${backgrounds.length} found)`);
  }
  const canvasWidth = Number(spec?.canvas?.width || 0);
  const canvasHeight = Number(spec?.canvas?.height || 0);
  for (const bg of backgrounds) {
    const label = bg?.id || bg?.path || '<unknown background>';
    if (!bg || typeof bg !== 'object') { errors.push('stageBackgrounds entry must be an object'); continue; }
    if (!bg.id) errors.push(`stage background missing id: ${JSON.stringify(bg)}`);
    if (!bg.path) { errors.push(`${label} missing path`); continue; }
    validateEntryProvenance(bg, label, spec?.game?.id, errors);
    if (bg.quality !== 'production-demo') errors.push(`${label} quality must be "production-demo"`);
    const ext = fileExt(bg.path);
    if (ext === 'svg' && !args.allowSvgBackgrounds) errors.push(`${label} uses SVG; production-demo stage backgrounds must be raster PNG/WebP/JPG`);
    if (!args.allowSvgBackgrounds && !ALLOWED_BACKGROUND_FORMATS.has(ext)) errors.push(`${label} unsupported background format: ${ext}`);
    const file = resolveAssetFile(projectDir, bg.path, label, errors);
    if (!file || !fs.existsSync(file)) { errors.push(`${label} file missing: ${bg.path}`); continue; }
    const size = readImageSize(file);
    if (!size) { errors.push(`${label} image size could not be read`); continue; }
    const minWidth = Number(bg.minWidth || canvasWidth);
    const minHeight = Number(bg.minHeight || canvasHeight);
    if (size.width < canvasWidth || size.height < canvasHeight) {
      errors.push(`${label} actual size ${size.width}x${size.height} is smaller than canvas ${canvasWidth}x${canvasHeight}`);
    }
    if (size.width < minWidth || size.height < minHeight) {
      errors.push(`${label} actual size ${size.width}x${size.height} is smaller than manifest minimum ${minWidth}x${minHeight}`);
    }
  }
}

function validateImages(projectDir, manifest, spec, args, errors) {
  const images = Array.isArray(manifest.images) ? manifest.images : [];
  if (images.length === 0) errors.push('asset-manifest.images must not be empty');
  for (const image of images) {
    if (!image || typeof image !== 'object') { errors.push('images entry must be an object'); continue; }
    const label = image.id || image.path || '<unknown image>';
    if (!image.path) { errors.push(`${label} missing path`); continue; }
    validateEntryProvenance(image, label, spec?.game?.id, errors);
    const file = resolveAssetFile(projectDir, image.path, label, errors);
    if (!file || !fs.existsSync(file)) { errors.push(`${label} file missing: ${image.path}`); continue; }
    const ext = fileExt(image.path);
    const role = String(image.role || '').toLowerCase();
    const core = isCoreGameplayImage(image);
    if (core && image.quality !== 'production-demo') {
      errors.push(`${label} (${role || image.type || 'image'}) quality must be "production-demo"`);
    }
    if (core && ext === 'svg' && !SVG_ALLOWED_ROLES.has(role)) {
      errors.push(`${label} uses SVG for core gameplay role "${role || image.type}"; use PNG/WebP production art or mark as non-core UI/feedback`);
    }
    if (String(image.type || '').toLowerCase() === 'background' && ext === 'svg') {
      errors.push(`${label} background is SVG; production-demo backgrounds must be raster PNG/WebP/JPG`);
    }
    const size = readImageSize(file);
    if (!size) { errors.push(`${label} image size could not be read`); continue; }
    if (image.minWidth && size.width < Number(image.minWidth)) errors.push(`${label} width ${size.width} < minWidth ${image.minWidth}`);
    if (image.minHeight && size.height < Number(image.minHeight)) errors.push(`${label} height ${size.height} < minHeight ${image.minHeight}`);
  }
}

function validateAudio(projectDir, manifest, spec, errors) {
  if (spec?.audio?.enabled === false) {
    errors.push('production-demo must include audio; spec.audio.enabled is false');
    return;
  }
  const audio = Array.isArray(manifest.audio) ? manifest.audio : [];
  for (const item of audio) {
    const label = item?.id || item?.path || '<unknown audio>';
    if (!item?.path) { errors.push(`${label} missing path`); continue; }
    validateEntryProvenance(item, label, spec?.game?.id, errors);
    const file = resolveAssetFile(projectDir, item.path, label, errors);
    if (!file || !fs.existsSync(file)) errors.push(`${label} file missing: ${item.path}`);
  }
  const required = ['ui', 'sfx', 'bgm'];
  for (const type of required) {
    if (!audio.some((a) => a?.type === type || (type === 'sfx' && ['collect', 'hit', 'game_over'].includes(a?.id)))) {
      errors.push(`production-demo audio missing required type: ${type}`);
    }
  }
}

function validateLayoutRegistry(projectDir, errors) {
  const srcDir = path.join(projectDir, 'src');
  const files = walkFiles(srcDir).filter((file) => /\.(js|mjs|ts|tsx|jsx)$/.test(file));
  const found = files.some((file) => fs.readFileSync(file, 'utf8').includes('__GAME_LAYOUT_BOUNDS__'));
  if (!found) {
    errors.push('visual layout registry missing: expose window.__GAME_LAYOUT_BOUNDS__ for UI overlap/safe-area QA');
  }
}

function qaProject(projectDir, args) {
  const errors = [];
  const manifestFile = path.join(projectDir, 'assets/asset-manifest.json');
  const specFile = path.join(projectDir, 'src/game/data/game-spec.json');
  const packageFile = path.join(projectDir, 'package.json');
  if (!fs.existsSync(projectDir)) errors.push(`project directory missing: ${projectDir}`);
  if (!fs.existsSync(manifestFile)) errors.push('assets/asset-manifest.json missing');
  if (!fs.existsSync(specFile)) errors.push('src/game/data/game-spec.json missing');
  if (!fs.existsSync(packageFile)) errors.push('package.json missing');
  if (errors.length) return errors;

  const manifest = readJson(manifestFile, errors);
  const spec = readJson(specFile, errors);
  if (!manifest || !spec) return errors;

  if (manifest.qualityTier !== 'production-demo') {
    errors.push('asset-manifest.qualityTier must be "production-demo"');
  }
  if (spec?.game?.id && path.basename(projectDir) !== spec.game.id) {
    errors.push(`project directory name (${path.basename(projectDir)}) should match spec.game.id (${spec.game.id})`);
  }

  validateAssetIsolation(projectDir, manifest, spec, errors);
  validateDocs(projectDir, errors);
  validateStageBackgrounds(projectDir, manifest, spec, args, errors);
  validateImages(projectDir, manifest, spec, args, errors);
  validateAudio(projectDir, manifest, spec, errors);
  validateLayoutRegistry(projectDir, errors);
  return errors;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  const projectDir = resolveProject(args.project);
  const errors = qaProject(projectDir, args);
  if (errors.length) {
    console.error(`Production demo QA failed: ${projectDir}`);
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }
  console.log(`Production demo QA OK: ${projectDir}`);
} catch (err) {
  console.error(err.message || err);
  usage();
  process.exit(1);
}
