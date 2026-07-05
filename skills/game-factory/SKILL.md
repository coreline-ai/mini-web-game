---
name: game-factory
description: "Turn a game idea into a high-quality first production-grade mobile/web game demo through an LLM game-studio workflow: idea analysis, GDD, technical design, Phaser/Vite foundation, custom gameplay implementation, production-grade assets/audio planning, and enforced QA gates. Use when the user asks to create a new game, 새 게임 만들기, 게임 팩토리, dev_game 생성, production-demo game, playable arcade prototype, or wants an idea converted into a playable game."
---

# Game Factory

Use this repo's `dev_game` area as an **LLM Game Studio**, not as a fixed list of possible games and not as a simple prompt-demo generator.

Core rule:

```text
This skill does not ship simple demos.
It ships high-quality first production-grade demos.
There are no shared runtime assets.
Every new game gets newly generated, self-contained assets.
Archetype is not the limit of what can be made.
Archetype is only a reference pattern to start faster.
```

If the user's idea does not fit an existing pattern, do not force it into the dodge starter. Design a custom loop and implement game-specific systems.

## Locate the project

Start in the current repo or walk upward until these exist:

- `dev_game/generator/src/cli.mjs`
- `dev_game/generator/examples/poop-dodge.spec.json`
- `dev_game/package.json`

If not found, ask for the `game-dd` repo path. Do not recreate the generator.

## Key paths

| Path | Purpose |
|---|---|
| `dev_game/docs/llm-game-studio-pipeline.md` | authoritative idea → GDD → technical design → custom build → QA pipeline |
| `dev_game/docs/production-demo-quality-contract.md` | mandatory high-quality first production-demo contract and fail gates |
| `dev_game/docs/new-game-start-guide.md` | operational guide for starting a new idea-first game |
| `dev_game/docs/game-archetype-recipes.md` | reference patterns only, not supported-game limits |
| `dev_game/generator/src/cli.mjs` | zero-dependency Foundation generator CLI, Node >= 18 |
| `dev_game/generator/schemas/game-spec.schema.json` | schema enforced by CLI validation for the Foundation spec |
| `dev_game/generator/examples/poop-dodge.spec.json` | known-good Foundation spec |
| `dev_game/generator/scripts/production-demo-qa.mjs` | production-demo docs/assets/manifest/layout-contract gate |
| `dev_game/generator/scripts/visual-layout-qa.mjs` | browser visual layout, safe-area, overlap gate |
| `dev_game/generator/scripts/scene-composite-qa.mjs` | rendered scene art-direction gate for broken button highlights, clipped stamps, transparent/hollow sprites, conveyor/road breaks, and external overlays |
| `dev_game/generator/scripts/image-quality-qa.mjs` | role-aware pixel/alpha/bbox gate for high-quality imagegen assets |
| `dev_game/generated/<game-id>/` | generated/custom game output, gitignored by default |
| `src/`, `assets/`, `docs/DEV-GUIDE.md` | shipped game reference for expansion patterns |

## Non-negotiable production-demo standard

Build success is not completion. `factory:qa` success is not completion.

A game may be reported as complete only after it satisfies the production-demo contract:

- `assets/asset-manifest.json` has `qualityTier: "production-demo"`.
- Stage/theme backgrounds exist: at least 3 raster backgrounds (`png`, `webp`, `jpg`, `jpeg`) at canvas size or larger.
- Runtime assets are generated for this game only and live under `dev_game/generated/<game-id>/assets/**`; no root/shared/common assets, symlinks, or assets from another game.
- `assets/asset-manifest.json` has `assetIsolation.mode: "per-game"`, `assetIsolation.generatedFor: "<game-id>"`, and `assetIsolation.noSharedRuntimeAssets: true`.
- Every manifest image/audio/background entry has `provenance.source: "generated-for-game"` and `provenance.generatedFor: "<game-id>"`.
- Main gameplay assets are not simple SVG placeholders. Core roles such as `player`, `hazard`, `obstacle`, `enemy`, `boss`, `collectible`, `vehicle`, `parcel`, `sort-bin` need `quality: "production-demo"`.
- Runtime exposes `window.__GAME_LAYOUT_BOUNDS__` so browser QA can catch HUD/button/text overlap and safe-area violations.
- Audio exists and state control works: gameplay music only during gameplay, paused/stopped on pause/home/background.
- `factory:production-demo-qa`, `factory:image-quality-qa`, `factory:visual-layout-qa`, and `factory:scene-composite-qa` pass for the generated project.
- Image assets are produced through the Codex `imagegen` skill path, then copied into the generated game. Manifest provenance for imagegen assets uses `method: "codex-gpt-imagegen-skill"`, `model: "gpt-image-2"`, `sourceSkill: "imagegen"`, and a `promptHash`.
- No generated game may include external image SDK runners, image-key setup steps, or service-backed asset-generation commands.
- Visual QA covers Loading, Home, Game, Pause, and GameOver at 390×844, 430×932, and 1080×1920. It must catch canvas off-centering, HUD/pause overlap, coin/text baseline mismatch, stretched buttons, item-card clipping, panel overflow, required layout item omissions, and missing safe-area margins. Scenes should declare `requiredIds` for HUD text, buttons, panels, game playfield, hit zones, and result stamps.
- Scene-first composite QA is mandatory: create representative full-scene artboards or equivalent contact sheets before slicing assets, then verify runtime recomposition with `factory:scene-composite-qa`. It must catch clipped warning/stamp icons, broken button top bars, transparent parcel/vehicle faces, hollow chutes/bins, broken conveyor/road strips, invisible panel borders, and browser/OS overlay contamination.
- Imagegen integration must run role-specific alpha/bbox QA: gameplay structures must not become hollow/over-transparent, parcels/vehicles must not lose internal faces, feedback stamps must be square with padding, and buttons/panels must not touch edges or stretch.
- If AI art is blurry, low-resolution, style-inconsistent, clipped, distorted, over-transparent, leaves chroma/gray residue, has unreadable text, or is below canvas size for backgrounds, regenerate with a stricter high-quality prompt before integration.

If any item is missing, report **production-demo 미통과** with the failing gates. Do not call the game complete.

## Fast path — one command

Once the spec/idea is settled, the whole pipeline (scaffold → productionize → AI art via Codex imagegen skill → QA) runs in one command:

```bash
npm --prefix dev_game run factory:make -- --name "My Game" --out dev_game/generated/my-game
npm --prefix dev_game run factory:make -- --spec generator/examples/<id>.spec.json --out dev_game/generated/<id>
# --skip-art (structure only) | --gate none|demo|full | --stages N
```

AI art uses the Codex `imagegen` skill built-in mode / `image_gen` tool. Do not create external image SDK runners, do not wait for image service keys, and do not leave project assets under `$CODEX_HOME/generated_images`. Every generated game ships game-specific stage backgrounds, sprites/animation, UI/buttons/FX, audio, and layout-QA compliance. See `dev_game/docs/ai-art-pipeline.md`. The steps below are the same pipeline done manually for finer control.

## Required workflow

### 1. Idea intake first

For every new game, identify:

- One-line pitch
- Core input
- Core fun
- Fail condition
- 30-second loop
- 1-minute easy state and 5-minute chaos state
- Required entities/systems/assets/audio
- What makes it different from existing games

If any of these are missing, make reasonable assumptions and proceed unless the missing item is blocking.

### 2. Pattern fit decision

Classify the build before writing code:

| Decision | When | Action |
|---|---|---|
| `archetype-start` | Existing pattern is 70%+ aligned | Use it as a starting point and add unique systems |
| `hybrid` | Existing pattern is partly useful | Reuse common shell, write custom gameplay systems |
| `custom-loop` | Existing patterns do not fit | Design custom entities/systems from scratch on the Phaser shell |

Never report a game as complete if only names, labels, or placeholder assets changed.

### 3. Write planning artifacts

For non-trivial games, create or update these under the generated project or a suitable docs path:

```text
docs/01-GDD.md
docs/02-TECH-DESIGN.md
docs/03-ASSET-AUDIO-PLAN.md
docs/04-QA-PLAN.md
docs/05-ADVERSARIAL-REVIEW.md
```

Minimum required content:

- GDD: pitch, loop, controls, scoring, difficulty, fail/retry, content list
- Tech design: scenes, entities, systems, config/data, collision, state flow
- Asset/audio plan: required newly generated per-game sprites, UI, stage/theme backgrounds, SFX/BGM triggers, provenance, and isolation rules
- QA plan: common smoke plus genre-specific gameplay assertions plus production-demo gates
- Adversarial review: why this is not just a reskinned existing template

### 4. Use the generator only as Foundation when appropriate

The current CLI intentionally creates a Foundation starter:

- Boot/Loading/Home/Game/Pause/GameOver
- One-hand control
- Falling hazards and one collectible
- Score/best, pause, localStorage
- Placeholder SVG/WAV for Foundation only; never acceptable as final production-demo assets

Commands:

```bash
node dev_game/generator/src/cli.mjs --validate-only --spec dev_game/generator/examples/<game-id>.spec.json
node dev_game/generator/src/cli.mjs --spec dev_game/generator/examples/<game-id>.spec.json --out dev_game/generated/<game-id>
```

Useful flags:

- `--dry-run`
- `--force` only under `dev_game/generated/*`, empty directories, or generated-marker directories
- `--no-sfx`
- `--with-pwa`

Do not treat this Foundation output as the final game when the user's requested loop requires custom behavior or production-demo quality. Do not reuse existing project assets as a shortcut; generate new game-specific assets instead.

### 5. Implement custom gameplay when needed

If the idea requires custom behavior, add explicit game-specific files, for example:

```text
src/entities/<PlayerOrWorldEntity>.js
src/entities/<EnemyOrObstacle>.js
src/systems/<GameSpecificSystem>.js
src/config/<gameSpecificConfig>.js
```

Examples:

- Lane racer: `RoadSystem`, `LaneSystem`, `PlayerCar`, `TrafficVehicle`, `NitroSystem`, `PoliceChaseSystem`, `NearMissSystem`
- Parcel sorting: `ConveyorSystem`, `ParcelEntity`, `SortBin`, `DragSortInput`, `RushEventSystem`, `ComboScannerSystem`
- Shooter: `WeaponSystem`, `BulletPool`, `EnemyWaveSystem`, `BossSystem`
- Rhythm: `BeatClock`, `NoteSpawner`, `TimingJudge`, `ComboSystem`
- Puzzle: `GridSystem`, `MergeSystem`, `MoveValidator`, `GoalSystem`

### 6. Verify with real gates

Always run the relevant current-state checks and report exact pass/fail.

Foundation checks:

```bash
npm --prefix dev_game run factory:qa
```

Specific generated game checks:

```bash
cd dev_game/generated/<game-id>
npm install
npm run build
npm run dev
```

Production-demo completion gates:

```bash
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/<game-id> --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/<game-id>
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
```

Also run or create a browser smoke that proves:

- Canvas renders
- PLAY enters gameplay
- No console/page errors
- The core input changes game state
- The genre-defining action works
- UI elements do not overlap in target mobile viewports

Asset/audio QA must catch obvious broken output: missing files, black boxes, ratio distortion, silence, wrong trigger, UI overlap, missing production backgrounds, placeholder-only core assets, shared/common asset references, symlinked assets, missing per-game provenance, and final screenshot recomposition defects.

Imagegen asset QA must additionally inspect the generated sheet/runtime screenshot before delivery and enforce role-specific alpha/bbox/scene-composite contracts. Regenerate rather than patch around bad art when: background is smaller than the canvas, a subject is squashed/stretched, chroma-key removal leaves a visible box, sprites become hollow/over-transparent, UI panels scale non-uniformly, feedback stamps are banner-squashed/clipped, buttons duplicate text/icons or show gray slot lines, conveyors/roads are visually broken, or any scene looks like a placeholder prompt demo.

### 7. Completion standard

Build success is not game completion.

A game is complete only when current evidence proves:

- Required scenes exist
- Requested core loop is implemented
- Game-specific systems are wired into runtime
- Assets/audio appear and trigger correctly enough for MVP
- Stage/theme backgrounds and main assets satisfy production-demo contract
- All runtime assets are newly generated for this game and self-contained inside the generated project
- Browser smoke verifies the gameplay action, not just scene entry
- Visual layout QA catches no safe-area or overlap failures
- Adversarial review does not identify it as a simple reskin

If production-demo gates fail, give a blocker list and next fix plan instead of claiming completion.

## Scope limits

Do not add backend, login, server ranking, ads/IAP, native packaging, multiplayer, analytics SDKs, or external image-service integration unless the user explicitly asks.

## Response format

End with:

- Game name and one-line concept
- Build decision: `archetype-start` / `hybrid` / `custom-loop`
- Planning docs created/updated
- Spec path, if used
- Output path
- Key systems actually implemented
- Commands run and exact QA result, including production-demo gates
- Known gaps or next expansion recommendations
