# Parcel Sort Rush — Regression Checklist

## 2026-07-10 Full-Resolution Baseline

Previous regression checklist status: no prior checklist existed for this game.

Re-run these checks at the start of the next parcel polish session:

1. Imagegen verifier stays green.
   - Command: `python3 dev_game/generated/parcel-sort-rush/scripts/verify_gpt_imagegen_assets.py`
   - Expected: OK, 27 assets verified.
   - Guards: `stamp_wrong` expected and actual size remain `512x512`; `chute_cold` and `chute_fragile` stay inside the sort-bin alpha-quality limits.

2. Manifest-only provenance verifier stays green.
   - Command: `python3 dev_game/generated/parcel-sort-rush/scripts/verify_gpt_imagegen_assets.py --manifest-only`
   - Expected: OK, 27 assets verified.
   - Guards: manifest paths remain query-string-free real file paths while runtime preload paths may include cache-buster query strings.

3. Image-quality QA stays green.
   - Command: `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/parcel-sort-rush`
   - Expected: OK, 27 assets at role-aware production-demo bar.
   - Guards: high-frequency ceilings for `warehouse_day`, `parcel_cold`, `parcel_heavy`, `combo_perfect`, `stamp_correct`, `hud_panel`, and `hud_panel_compact` do not regress.

4. Native full-resolution runtime sample stays green.
   - Repro: launch the game at viewport `390x844`, DPR `3`, wait for Home, then sample `window.__GAME__`.
   - Expected assertions:
     - `game.config.width === 1080`
     - `game.config.height === 1920`
     - `canvas.width === 1080`
     - `canvas.height === 1920`
     - `canvas.width !== 3240`
     - `canvas.height !== 5760`
     - active scene includes `Home`
     - required production texture keys are loaded
     - browser errors are `0`

5. Production gate stays green for the baseline viewports.
   - Command: `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/parcel-sort-rush --require-gpt-imagegen --viewports 390x844,430x932,1080x1920`
   - Expected: common QA, production-demo QA, image-quality QA, build, visual-layout QA, and scene-composite QA pass.

6. Runtime delivery stays manifest-only and within budget.
   - `npm --prefix dev_game/generated/parcel-sort-rush run qa:dist-runtime` reports 33 physical files within 12 MiB.
   - The three duplicated background declarations emit one file each, and chute/stamp query strings do not create duplicate outputs.
   - `imagegen/raw`, `imagegen/sheets`, `player_supervisor.png`, and `audio/README.md` must not appear in `dist`.

7. Imagegen provenance verification remains green.
   - Run `python3 scripts/verify_gpt_imagegen_assets.py` and `python3 scripts/verify_gpt_imagegen_assets.py --manifest-only` with a Python environment containing Pillow.
