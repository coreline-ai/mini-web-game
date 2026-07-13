#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRuntimeAssetDeliveryPlugin, normalizeLoaderRuntimeUrl, qaDistRuntime, resolveRuntimeAssets, runtimeAssetManifest } from '../templates/runtime-asset-delivery.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-asset-delivery-'));

function project(name, entries, options = {}) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'assets/images'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets/images/player.png'), Buffer.from('player-runtime'));
  fs.writeFileSync(path.join(dir, 'assets/images/other.png'), Buffer.from('other-runtime'));
  fs.mkdirSync(path.join(dir, 'assets/_source'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets/_source/source.psd'), Buffer.from('source-only'));
  const manifest = {
    assetLayout: { version: 'runtime-assets-v1', runtimeRoot: 'assets' },
    runtimeBudgetBytes: options.budget ?? 1024,
    stageBackgrounds: [], images: entries, audio: [], hqScreenAssets: [], files: [],
  };
  fs.writeFileSync(path.join(dir, 'assets/asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return dir;
}

function expectFailure(label, fn, pattern) {
  assert.throws(fn, pattern, label);
}

try {
  const normal = project('normal', [
    { id: 'player', type: 'sprite', path: 'assets/images/player.png', delivery: 'runtime', runtimeUrl: '/images/player.png' },
    { id: 'source', type: 'source', path: 'assets/_source/source.psd', delivery: 'source' },
    { id: 'player-alias', type: 'background', path: 'assets/images/player.png', delivery: 'runtime', runtimeUrl: 'images/player.png' },
  ]);
  const resolved = resolveRuntimeAssets(normal);
  assert.equal(resolved.assets.length, 1, 'identical duplicate source entries must dedupe');
  assert.equal(resolved.assets[0].url, '/images/player.png', 'query string must not reach runtime URL');
  assert.equal(normalizeLoaderRuntimeUrl('/images/player.png?v=8#cache'), '/images/player.png', 'loader queries must normalize for comparison');
  const plugin = createRuntimeAssetDeliveryPlugin({ projectRoot: normal });
  plugin.configResolved();
  let middleware;
  plugin.configureServer({ middlewares: { use(fn) { middleware = fn; } } });
  let nextCalled = false;
  let ended = false;
  const blockedResponse = { statusCode: 0, setHeader() {}, end() { ended = true; } };
  middleware({ url: '/assets/_source/source.psd?cache=1' }, blockedResponse, () => { nextCalled = true; });
  assert.equal(blockedResponse.statusCode, 404, 'source asset URL must be blocked by dev middleware');
  assert.equal(ended, true, 'blocked dev request must terminate');
  assert.equal(nextCalled, false, 'blocked dev request must not fall through to Vite');

  const dist = path.join(normal, 'dist');
  fs.mkdirSync(path.join(dist, 'images'), { recursive: true });
  fs.copyFileSync(resolved.assets[0].sourceFile, path.join(dist, 'images/player.png'));
  fs.writeFileSync(path.join(dist, 'runtime-asset-manifest.json'), `${JSON.stringify(runtimeAssetManifest(resolved), null, 2)}\n`);
  assert.deepEqual(qaDistRuntime(normal), { assets: 1, totalBytes: 14, budget: 1024, distDir: dist });
  assert.equal(fs.existsSync(path.join(dist, '_source/source.psd')), false, 'source-only file must not be emitted');

  const missing = project('missing', [{ id: 'missing', path: 'assets/images/missing.png', delivery: 'runtime' }]);
  expectFailure('missing runtime file', () => resolveRuntimeAssets(missing), /runtime file is missing/);

  const traversal = project('traversal', [{ id: 'bad', path: '../outside.png', delivery: 'runtime' }]);
  expectFailure('traversal path', () => resolveRuntimeAssets(traversal), /escapes the project/);

  const absolute = project('absolute', [{ id: 'bad', path: '/tmp/outside.png', delivery: 'runtime' }]);
  expectFailure('absolute path', () => resolveRuntimeAssets(absolute), /must be relative/);

  const noDelivery = project('no-delivery', [{ id: 'bad', path: 'assets/images/player.png' }]);
  expectFailure('missing delivery', () => resolveRuntimeAssets(noDelivery), /delivery must be/);

  const collision = project('collision', [
    { id: 'one', path: 'assets/images/player.png', delivery: 'runtime', runtimeUrl: '/images/shared.png' },
    { id: 'two', path: 'assets/images/other.png', delivery: 'runtime', runtimeUrl: '/images/shared.png' },
  ]);
  expectFailure('output URL collision', () => resolveRuntimeAssets(collision), /output URL collision/);

  const metadata = project('metadata', [
    { id: 'one', type: 'sprite', path: 'assets/images/player.png', delivery: 'runtime', runtimeUrl: '/images/one.png' },
    { id: 'two', type: 'ui', path: 'assets/images/player.png', delivery: 'runtime', runtimeUrl: '/images/two.png' },
  ]);
  expectFailure('duplicate metadata conflict', () => resolveRuntimeAssets(metadata), /metadata conflict/);

  const queryInManifest = project('query-manifest', [
    { id: 'bad', path: 'assets/images/player.png', delivery: 'runtime', runtimeUrl: '/images/player.png?v=1' },
  ]);
  expectFailure('manifest query string', () => resolveRuntimeAssets(queryInManifest), /must not contain a query string/);

  const protocolUrl = project('protocol-url', [
    { id: 'bad', path: 'assets/images/player.png', delivery: 'runtime', runtimeUrl: 'https://example.com/player.png' },
  ]);
  expectFailure('protocol URL', () => resolveRuntimeAssets(protocolUrl), /must not be absolute or use a protocol/);

  const encodedTraversal = project('encoded-traversal', [
    { id: 'bad', path: 'assets/%2e%2e/outside.png', delivery: 'runtime' },
  ]);
  expectFailure('encoded traversal', () => resolveRuntimeAssets(encodedTraversal), /encoded traversal/);

  const forbiddenRuntime = project('forbidden-runtime', [
    { id: 'bad', path: 'assets/_source/source.psd', delivery: 'runtime' },
  ]);
  expectFailure('forbidden runtime directory', () => resolveRuntimeAssets(forbiddenRuntime), /provenance-only directory/);

  const symlink = project('symlink', [{ id: 'link', path: 'assets/images/link.png', delivery: 'runtime' }]);
  fs.symlinkSync(path.join(symlink, 'assets/images/player.png'), path.join(symlink, 'assets/images/link.png'));
  expectFailure('symlink runtime source', () => resolveRuntimeAssets(symlink), /symlink/);

  fs.writeFileSync(path.join(dist, 'images/player.png'), Buffer.from('tampered'));
  expectFailure('SHA mismatch', () => qaDistRuntime(normal), /SHA-256 mismatch/);
  fs.copyFileSync(resolved.assets[0].sourceFile, path.join(dist, 'images/player.png'));

  fs.mkdirSync(path.join(dist, 'references'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'references/leak.txt'), 'leak');
  expectFailure('forbidden dist directory', () => qaDistRuntime(normal), /forbidden provenance directory/);
  fs.rmSync(path.join(dist, 'references'), { recursive: true });

  expectFailure('runtime byte budget', () => qaDistRuntime(normal, { maxRuntimeBytes: 1 }), /exceed byte budget/);
  console.log('Runtime asset delivery tests OK: validation, dedupe, collision, query, SHA, forbidden dirs, budget');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
