import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTRY_GROUPS = [
  ['stageBackgrounds', 'background'],
  ['images', 'image'],
  ['audio', 'audio'],
  ['hqScreenAssets', 'hq-screen'],
  ['files', 'file'],
];
const DELIVERY_VALUES = new Set(['runtime', 'source']);
const LAYOUT_VERSIONS = new Set(['runtime-assets-v1', 'production-images-v1']);
const FORBIDDEN_SEGMENTS = new Set(['_source', 'references', 'imagegen', 'raw', 'sheets']);
const RESERVED_OUTPUTS = new Set(['index.html', 'runtime-asset-manifest.json']);

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function posixPath(value) {
  return String(value).replaceAll('\\', '/');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function stripQueryAndHash(value) {
  return String(value).split(/[?#]/, 1)[0];
}

export function normalizeLoaderRuntimeUrl(value) {
  const raw = String(value);
  let pathname;
  try { pathname = decodeURIComponent(new URL(raw, 'http://runtime.local').pathname); } catch { throw new Error(`loader URL is invalid: ${raw}`); }
  const normalized = path.posix.normalize(posixPath(pathname));
  if (normalized === '/..' || normalized.startsWith('/../')) throw new Error(`loader URL escapes the output root: ${raw}`);
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function normalizeSourcePath(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}.path must be a non-empty string`);
  if (value !== stripQueryAndHash(value)) throw new Error(`${label}.path must not contain a query string or hash`);
  const portable = posixPath(value);
  let decoded;
  try { decoded = decodeURIComponent(portable); } catch { throw new Error(`${label}.path is not valid URL encoding`); }
  if (decoded !== portable && (decoded.includes('../') || decoded.includes('..\\') || decoded.startsWith('/'))) {
    throw new Error(`${label}.path contains encoded traversal or an absolute path`);
  }
  if (portable.startsWith('/') || /^[a-zA-Z]:\//.test(portable)) throw new Error(`${label}.path must be relative`);
  const normalized = path.posix.normalize(portable);
  if (normalized === '..' || normalized.startsWith('../')) throw new Error(`${label}.path escapes the project`);
  if (!normalized.startsWith('assets/')) throw new Error(`${label}.path must stay inside assets/: ${value}`);
  return normalized;
}

function normalizeRuntimeUrl(value, sourcePath, label) {
  if (value != null && String(value) !== stripQueryAndHash(value)) throw new Error(`${label}.runtimeUrl must not contain a query string or hash`);
  const raw = value == null ? sourcePath.slice('assets/'.length) : String(value);
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw) || raw.startsWith('//')) throw new Error(`${label}.runtimeUrl must not be absolute or use a protocol`);
  const rawPortable = posixPath(raw);
  if (rawPortable.startsWith('//')) throw new Error(`${label}.runtimeUrl must not be an absolute network path`);
  let portable = rawPortable.replace(/^\/+/, '');
  try { portable = decodeURIComponent(portable); } catch { throw new Error(`${label}.runtimeUrl is not valid URL encoding`); }
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(portable) || portable.startsWith('//')) throw new Error(`${label}.runtimeUrl must not encode a protocol or absolute path`);
  const normalized = path.posix.normalize(portable);
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`${label}.runtimeUrl escapes the output root`);
  }
  if (normalized === 'assets' || normalized.startsWith('assets/')) throw new Error(`${label}.runtimeUrl uses the reserved Vite bundle namespace`);
  if (RESERVED_OUTPUTS.has(normalized)) throw new Error(`${label}.runtimeUrl uses reserved output: ${normalized}`);
  return `/${normalized}`;
}

function entryType(group, fallback, entry) {
  return String(entry.type || fallback || group);
}

function validateAssetLayout(manifest) {
  const layout = manifest.assetLayout;
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) {
    throw new Error('asset-manifest.assetLayout must be an object');
  }
  if (!LAYOUT_VERSIONS.has(layout.version)) {
    throw new Error(`asset-manifest.assetLayout.version must be one of: ${[...LAYOUT_VERSIONS].join(', ')}`);
  }
  if (layout.version === 'runtime-assets-v1' && layout.runtimeRoot !== 'assets') {
    throw new Error('runtime-assets-v1 requires assetLayout.runtimeRoot="assets"');
  }
  if (layout.version === 'production-images-v1' && layout.runtimeImageRoot !== 'assets/images/production') {
    throw new Error('production-images-v1 requires assetLayout.runtimeImageRoot="assets/images/production"');
  }
}

function validateRuntimeSource(projectRoot, assetsRoot, sourcePath, label) {
  const sourceFile = path.resolve(projectRoot, ...sourcePath.split('/'));
  if (!isInside(assetsRoot, sourceFile)) throw new Error(`${label}.path escapes assets/: ${sourcePath}`);
  if (!fs.existsSync(sourceFile)) throw new Error(`${label} runtime file is missing: ${sourcePath}`);
  let cursor = assetsRoot;
  for (const segment of sourcePath.split('/').slice(1)) {
    cursor = path.join(cursor, segment);
    if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`${label} runtime path must not contain a symlink: ${sourcePath}`);
  }
  const stat = fs.lstatSync(sourceFile);
  if (stat.isSymbolicLink()) throw new Error(`${label} runtime file must not be a symlink: ${sourcePath}`);
  if (!stat.isFile()) throw new Error(`${label} runtime path must be a file: ${sourcePath}`);
  const realFile = fs.realpathSync(sourceFile);
  const realAssets = fs.realpathSync(assetsRoot);
  if (!isInside(realAssets, realFile)) throw new Error(`${label} runtime realpath escapes assets/: ${sourcePath}`);
  const segments = sourcePath.split('/').map((part) => part.toLowerCase());
  if (segments.some((part) => FORBIDDEN_SEGMENTS.has(part))) {
    throw new Error(`${label} runtime file is inside a provenance-only directory: ${sourcePath}`);
  }
  return realFile;
}

export function resolveRuntimeAssets(projectRoot = process.cwd(), options = {}) {
  const root = path.resolve(projectRoot);
  const manifestFile = path.resolve(root, options.manifestPath || 'assets/asset-manifest.json');
  if (!fs.existsSync(manifestFile)) throw new Error(`asset manifest is missing: ${manifestFile}`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (!manifest.assetLayout) {
    if (options.allowLegacy === true) return { projectRoot: root, manifestFile, manifest, assets: [], legacy: true };
    throw new Error('asset-manifest.assetLayout rollout marker is required for runtime delivery');
  }
  validateAssetLayout(manifest);
  if (!Number.isFinite(manifest.runtimeBudgetBytes) || manifest.runtimeBudgetBytes <= 0) {
    throw new Error('asset-manifest.runtimeBudgetBytes must be a positive number');
  }
  const assetsRoot = path.join(root, 'assets');
  if (!fs.existsSync(assetsRoot) || !fs.statSync(assetsRoot).isDirectory()) throw new Error('project assets/ directory is missing');

  const bySource = new Map();
  const byUrl = new Map();
  for (const [group, fallbackType] of ENTRY_GROUPS) {
    const entries = manifest[group] ?? [];
    if (!Array.isArray(entries)) throw new Error(`asset-manifest.${group} must be an array`);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const label = `${group}[${index}]`;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`${label} must be an object`);
      if (!DELIVERY_VALUES.has(entry.delivery)) throw new Error(`${label}.delivery must be "runtime" or "source"`);
      const sourcePath = normalizeSourcePath(entry.path, label);
      if (manifest.assetLayout.version === 'production-images-v1' && entry.delivery === 'runtime' && (group === 'stageBackgrounds' || group === 'images' || group === 'hqScreenAssets')) {
        const rootPrefix = `${manifest.assetLayout.runtimeImageRoot}/`;
        if (!sourcePath.startsWith(rootPrefix)) throw new Error(`${label}.path must start with ${rootPrefix}`);
      }
      if (entry.delivery === 'source') continue;
      const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : null;
      if (!id) throw new Error(`${label}.id must be a non-empty string for runtime delivery`);
      const url = normalizeRuntimeUrl(entry.runtimeUrl, sourcePath, label);
      const sourceFile = validateRuntimeSource(root, assetsRoot, sourcePath, label);
      const type = entryType(group, fallbackType, entry);
      const sourceExisting = bySource.get(sourcePath);
      if (sourceExisting) {
        if (sourceExisting.url !== url) {
          throw new Error(`runtime metadata conflict for duplicate source ${sourcePath}`);
        }
        continue;
      }
      const urlExisting = byUrl.get(url);
      if (urlExisting && urlExisting.sourcePath !== sourcePath) {
        throw new Error(`runtime output URL collision at ${url}: ${urlExisting.sourcePath} vs ${sourcePath}`);
      }
      const buffer = fs.readFileSync(sourceFile);
      const resolved = { id, type, url, sourcePath, sourceFile, bytes: buffer.byteLength, sha256: sha256(buffer) };
      bySource.set(sourcePath, resolved);
      byUrl.set(url, resolved);
    }
  }
  return { projectRoot: root, manifestFile, manifest, assets: [...bySource.values()] };
}

function publicEntry(asset) {
  return { id: asset.id, type: asset.type, url: asset.url, bytes: asset.bytes, sha256: asset.sha256 };
}

export function runtimeAssetManifest(resolved) {
  return {
    schemaVersion: '1.0.0',
    assets: resolved.assets.map(publicEntry).sort((a, b) => a.url.localeCompare(b.url)),
  };
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  })[ext] || 'application/octet-stream';
}

export function createRuntimeAssetDeliveryPlugin(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  let resolved;
  const refresh = () => { resolved = resolveRuntimeAssets(projectRoot, options); return resolved; };
  return {
    name: 'runtime-asset-delivery',
    enforce: 'pre',
    configResolved() { refresh(); },
    buildStart() { refresh(); },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!resolved) refresh();
        let pathname;
        try { pathname = normalizeLoaderRuntimeUrl(req.url || '/'); } catch { next(); return; }
        const asset = resolved.assets.find((candidate) => candidate.url === pathname);
        if (!asset) {
          if (pathname === '/assets' || pathname.startsWith('/assets/')) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Not found');
            return;
          }
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', contentType(asset.sourceFile));
        res.setHeader('Content-Length', String(asset.bytes));
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(asset.sourceFile).pipe(res);
      });
    },
    generateBundle() {
      const current = refresh();
      for (const asset of current.assets) {
        this.emitFile({ type: 'asset', fileName: asset.url.slice(1), source: fs.readFileSync(asset.sourceFile) });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'runtime-asset-manifest.json',
        source: `${JSON.stringify(runtimeAssetManifest(current), null, 2)}\n`,
      });
    },
  };
}

function walkFiles(root, dir = root, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(root, file, out);
    else out.push({ file, rel: posixPath(path.relative(root, file)) });
  }
  return out;
}

export function qaDistRuntime(projectRoot = process.cwd(), options = {}) {
  const resolved = resolveRuntimeAssets(projectRoot, options);
  const distDir = path.resolve(resolved.projectRoot, options.distDir || 'dist');
  const outputManifestFile = path.join(distDir, 'runtime-asset-manifest.json');
  const errors = [];
  if (!fs.existsSync(outputManifestFile)) throw new Error(`dist runtime manifest is missing: ${outputManifestFile}`);
  let output;
  try { output = JSON.parse(fs.readFileSync(outputManifestFile, 'utf8')); } catch (error) { throw new Error(`dist runtime manifest is invalid JSON: ${error.message}`); }
  const expected = runtimeAssetManifest(resolved);
  if (output.schemaVersion !== expected.schemaVersion || JSON.stringify(output.assets) !== JSON.stringify(expected.assets)) {
    errors.push('dist runtime asset file-set or metadata does not match source manifest');
  }

  let totalBytes = 0;
  for (const asset of expected.assets) {
    const outputFile = path.resolve(distDir, ...asset.url.slice(1).split('/'));
    if (!isInside(distDir, outputFile) || !fs.existsSync(outputFile)) {
      errors.push(`dist runtime file is missing: ${asset.url}`);
      continue;
    }
    const stat = fs.lstatSync(outputFile);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      errors.push(`dist runtime output must be a regular file: ${asset.url}`);
      continue;
    }
    const buffer = fs.readFileSync(outputFile);
    totalBytes += buffer.byteLength;
    if (buffer.byteLength !== asset.bytes) errors.push(`dist byte size mismatch: ${asset.url}`);
    if (sha256(buffer) !== asset.sha256) errors.push(`dist SHA-256 mismatch: ${asset.url}`);
  }

  for (const { file, rel } of walkFiles(distDir)) {
    const segments = rel.split('/').map((part) => part.toLowerCase());
    if (segments.some((part) => FORBIDDEN_SEGMENTS.has(part))) errors.push(`forbidden provenance directory in dist: ${rel}`);
    if (fs.lstatSync(file).isSymbolicLink()) errors.push(`symlink is forbidden in dist: ${rel}`);
  }
  const expectedFiles = new Set(['index.html', 'runtime-asset-manifest.json', ...expected.assets.map((asset) => asset.url.slice(1))]);
  for (const { rel } of walkFiles(distDir)) {
    const isViteBundle = /^assets\/(?:.+\/)*[^/]+-[A-Za-z0-9_-]{8,}\.[^/]+$/i.test(rel);
    if (!expectedFiles.has(rel) && !isViteBundle) errors.push(`unexpected file outside runtime allowlist: ${rel}`);
  }
  const budget = options.maxRuntimeBytes == null ? resolved.manifest.runtimeBudgetBytes : Number(options.maxRuntimeBytes);
  if (!Number.isFinite(budget) || budget <= 0) errors.push('runtime byte budget must be a positive number');
  else if (totalBytes > budget) errors.push(`runtime assets exceed byte budget: ${totalBytes} > ${budget}`);
  if (errors.length) throw new Error(`Dist runtime QA failed:\n- ${errors.join('\n- ')}`);
  return { assets: expected.assets.length, totalBytes, budget, distDir };
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args[0] !== 'qa') return;
  let projectRoot = process.cwd();
  let distDir = 'dist';
  let maxRuntimeBytes;
  for (let i = 1; i < args.length; i += 1) {
    if (args[i] === '--project') projectRoot = path.resolve(args[++i]);
    else if (args[i] === '--dist') distDir = args[++i];
    else if (args[i] === '--max-runtime-bytes') maxRuntimeBytes = Number(args[++i]);
    else throw new Error(`Unknown runtime asset QA argument: ${args[i]}`);
  }
  const result = qaDistRuntime(projectRoot, { distDir, maxRuntimeBytes });
  console.log(`Dist runtime QA OK: ${result.assets} assets, ${result.totalBytes}/${result.budget} bytes`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runCli().catch((error) => { console.error(error.message || error); process.exit(1); });
}
