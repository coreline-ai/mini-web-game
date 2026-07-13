# Runtime Asset Delivery Contract

Generated games publish only the files explicitly marked for runtime delivery. Source sheets, references, raw imagegen output, and other provenance material remain in the package but never enter `dist` or the Vite dev-server surface.

## Manifest schema

Every entry in `stageBackgrounds`, `images`, `audio`, `hqScreenAssets`, and `files` must include `delivery: "runtime"` or `delivery: "source"`. There is no implicit default.

```json
{
  "assetLayout": {
    "version": "runtime-assets-v1",
    "runtimeRoot": "assets"
  },
  "runtimeBudgetBytes": 16777216,
  "images": [
    {
      "id": "player",
      "type": "sprite",
      "path": "assets/images/player.png",
      "delivery": "runtime"
    },
    {
      "id": "player-source",
      "type": "source",
      "path": "assets/images/_source/player-sheet.png",
      "delivery": "source"
    }
  ]
}
```

`assetLayout` is the rollout marker. Legacy games without it remain on their old delivery behavior until their project workstream migrates the manifest and Vite config together. Once the marker is present, strict `delivery` validation is active.

`path` is always a project-relative `assets/...` path and must not contain a query string or hash. Optional `runtimeUrl` is also query-free. A cache buster belongs only in loader code; request comparison normalizes `/images/player.png?v=2` to `/images/player.png`. The emitted runtime manifest never stores a query string.

For games migrated to the production image tree, use:

```json
{
  "assetLayout": {
    "version": "production-images-v1",
    "runtimeImageRoot": "assets/images/production"
  }
}
```

With this marker, runtime `stageBackgrounds`, `images`, and `hqScreenAssets` paths must be below `assets/images/production/`. Keep `asset-plan.json.path` as the generation source and add `runtimePath` when post-processing produces a different runtime file.

## Generated project integration

The generator copies the canonical `generator/templates/runtime-asset-delivery.mjs` into each project as `scripts/runtime-asset-delivery.mjs`. Its Vite config uses `publicDir: false` and `createRuntimeAssetDeliveryPlugin()`. The same resolver serves the dev allowlist, emits the build allowlist, and powers dist QA.

Build output includes `dist/runtime-asset-manifest.json` with only `id`, `type`, `url`, `bytes`, and `sha256`. Run:

```bash
npm --prefix generated/<game-id> run build
npm --prefix generated/<game-id> run qa:dist-runtime
```

The workspace wrapper is:

```bash
npm run factory:dist-runtime-qa -- --project generated/<game-id>
```

## Dedupe and collision rules

- Repeating one physical source across logical manifest arrays or texture keys emits one file when its normalized output URL agrees; the first logical `id` and `type` become its runtime-manifest metadata.
- Repeating a source with a conflicting normalized output URL fails.
- Mapping different source files to the same normalized output URL fails.
- Missing runtime files fail Vite startup/build instead of returning a late 404.
- Runtime paths containing `..`, absolute paths, symlinks, or realpaths outside the game's `assets/` fail.
- `_source`, `references`, `imagegen`, `raw`, and `sheets` path segments are provenance-only and fail when marked runtime.

## Leaf migration checklist

1. Classify every manifest entry explicitly as `runtime` or `source`.
2. Add `assetLayout` and a measured `runtimeBudgetBytes` without weakening existing image/audio budgets.
3. Copy the canonical helper into `scripts/`, set Vite `publicDir: false`, and add the helper plugin.
4. Verify Phaser loader URLs match normalized runtime URLs; do not place `assets/` at the start of loader URLs.
5. Build, run dist runtime QA, then run the game's production and browser gates.
6. Preserve source/provenance files; migration changes delivery, not history.

Do not copy another game's runtime file, create cross-game symlinks, lower quality thresholds to pass, delete raw/reference material, or put a source directory back under Vite `publicDir`.
