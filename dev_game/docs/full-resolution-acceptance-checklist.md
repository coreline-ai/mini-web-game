# Full-Resolution Acceptance Checklist

Use this checklist for every game under `dev_game/generated/*` when upgrading toward the `parcel-sort-rush` full-resolution baseline.

## Runtime Contract

- `game-spec.json` declares `canvas.width = 1080`, `canvas.height = 1920`, portrait, and `scaleMode: fit` unless a game-specific doc explains another production strategy.
- Phaser config uses the full logical canvas directly from the game spec.
- A game that still uses a small base composition canvas must not multiply an already-1080x1920 canvas by DPR. The browser sample must prove there is no accidental `3240x5760` backing store.
- At a mobile viewport, the canvas backing store is `1080x1920` for native-FHD games.
- At a desktop/wide viewport, the game remains a centered portrait experience and does not stretch into an unbounded landscape layout.

## Asset Contract

- Runtime backgrounds or screen-level assets cover at least `1080x1920` without upscaling.
- Runtime sprite/UI source pixels meet or exceed their rendered world size for native-FHD games.
- Stale SVG/scaffold/foundation assets are not loaded by the production runtime.
- Production assets live in a per-game runtime tree, preferably `assets/images/production/**` and `assets/audio/production/**`.
- `asset-manifest.json` records the actual runtime file paths without query-string cache busters.
- Migrated games declare `assetLayout`, positive `runtimeBudgetBytes`, and explicit `delivery: runtime|source` for every runtime collection entry.
- Migrated Vite configs use `publicDir: false` and the package-local canonical runtime delivery helper.
- `dist/runtime-asset-manifest.json` matches the manifest allowlist by physical file, byte size, and SHA-256.
- `_source`, `references`, `imagegen`, `raw`, and `sheets` never appear in `dist`.
- If runtime preload paths use query strings for cache busting, the game docs explicitly say those query strings are not manifest/provenance paths.

## Evidence Contract

- Per-game `docs/06-FINAL-QA-SUMMARY.md` records symptoms, defect class, severity, root cause, fix, evidence paths, and gate results.
- Per-game `docs/07-REGRESSION-CHECKLIST.md` records the checks that must be re-run before the next polish pass.
- A durable tracked summary exists under `dev_game/docs/qa-evidence/<game-id>-<YYYY-MM-DD>.md`.
- Asset fidelity evidence includes at least: runtime strategy, DPR, max target DPR, logical canvas, physical canvas target, CSS size, backing-store size, game config, active scene, key texture source sizes, and browser error count.

## Required Gates

Run the game's own build first:

```bash
npm --prefix dev_game/generated/<game-id> run build
npm --prefix dev_game/generated/<game-id> run qa:dist-runtime
```

Then run the common production gates:

```bash
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/<game-id> --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/<game-id>
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920,1280x900
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
```

## Runtime Assertions

Add or run a custom Playwright sample when the existing gates do not expose these values:

- `game.config.width === 1080`
- `game.config.height === 1920`
- Phaser runtime logical game size is `1080x1920`
- Canvas backing store is `1080x1920` for native-FHD games
- Canvas backing store is not `3240x5760`
- Required production texture keys are loaded
- Key texture source sizes meet the documented rendered size requirement
- Browser errors are `0`

## Completion Rule

A game is not considered aligned to the full-resolution baseline until the runtime contract, asset contract, evidence contract, gates, and runtime assertions are all proven by current evidence.
