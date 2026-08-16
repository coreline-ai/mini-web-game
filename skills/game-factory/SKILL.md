---
name: game-factory
description: "Turn a game idea into a high-quality first production-grade mobile/web game demo through an LLM game-studio workflow: idea analysis, GDD, technical design, Phaser/Vite foundation, custom gameplay implementation, production-grade assets/audio planning, post-production captured gameplay QA/fix passes, and enforced QA gates. Use when the user asks to create a new game, 새 게임 만들기, 게임 팩토리, dev_game 생성, production-demo game, playable arcade prototype, post-production game QA, or wants an idea converted into a playable game."
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
| `dev_game/generator/schemas/game-spec.v1.schema.json` / `game-spec.v2.schema.json` | versioned arcade compatibility and custom-loop specs |
| `dev_game/generator/examples/poop-dodge.spec.json` | known-good Foundation spec |
| `dev_game/generator/scripts/production-demo-qa.mjs` | production-demo docs/assets/manifest/layout-contract gate |
| `dev_game/generator/scripts/visual-layout-qa.mjs` | browser visual layout, safe-area, overlap gate, and the **DPR backing-store assert** — the logical canvas must be large enough that the browser is not upscaling the whole game (§2.0.2) |
| `dev_game/generator/scripts/scene-composite-qa.mjs` | rendered scene art-direction gate for broken button highlights, clipped stamps, transparent/hollow sprites, conveyor/road breaks, and external overlays |
| `dev_game/generator/scripts/image-quality-qa.mjs` | role-aware pixel/alpha/bbox gate for high-quality imagegen assets |
| `dev_game/generator/scripts/hq-screen-quality-qa.mjs` | optional gate for manifest asset fidelity plus market-event depth; market-event checks run only for games with `marketConfig.js` or `--require-market-events`. DPR/backing-store asserts do **not** live here — they belong to `captured-state-qa.mjs` |
| `dev_game/generator/scripts/captured-state-qa.mjs` | capture-matrix runner; records `devicePixelRatio` and `backingScale` per captured state — the source of DPR evidence |
| `dev_game/docs/post-production-qa-contract.md` | defect-class contract for post-production fix passes: lifecycle race, visual singularity, UI/gameplay ambiguity, difficulty-axis independence, progression completeness, machine-assertable evidence, fix→re-capture loop |
| `dev_game/docs/qa-evidence/` | tracked summaries for generated-game QA evidence when `dev_game/generated/**` is gitignored |
| `dev_game/generated/<game-id>/` | generated/custom game output, gitignored by default |
| `src/`, `assets/`, `docs/DEV-GUIDE.md` | shipped game reference for expansion patterns |

## Authoritative contracts

These documents are the single source of truth. This SKILL.md defines the workflow; the contracts define the rules. Read the relevant one before judging quality, and never restate its numbers here.

| Document | Owns |
|---|---|
| `dev_game/docs/production-demo-quality-contract.md` | asset quality, resolution (§2.0.5 + declared resample), **UI button sizing and theme derivation (§2.0.25)**, per-game isolation, provenance, capture-state coverage, completion criteria |
| `dev_game/docs/post-production-qa-contract.md` | defect classes A–N, symptom → fix rules, verification method (automated gate vs manual capture check — see its §3.1 applicability table) |
| `dev_game/docs/ai-art-pipeline.md` | host adapters, art execution rules, Path A/B provenance checklist |

## Non-negotiable production-demo standard

Build success is not completion. `factory:qa` success is not completion.

A game may be reported as complete only after it satisfies `production-demo-quality-contract.md` **in full** — manifest `qualityTier`, per-game asset isolation and provenance, stage/theme backgrounds, non-placeholder core assets (v1 legacy roles, v2/custom-loop spec `requiredAssetRoles`), audio state control, `window.__GAME_LAYOUT_BOUNDS__` publication, declared capture-state coverage, scene-first artboard workflow, role-specific alpha/bbox rules, and the regenerate-don't-patch rule for bad art all live there. This skill enforces the contract through the gates in step 6, not by restating it.

Art acquisition is host-dependent; the standard is not:

- Image assets come from the `gpt 이미지젠 스킬` 경로 whatever host runs this skill. **A host without built-in image generation (Claude Code) does not draw its own art and does not skip the step — it reaches the same path by spawning `codex exec`, which is what `factory:imagegen` already does.** Run `factory:host-preflight` first and follow the adapter and long-run execution rules in `ai-art-pipeline.md#호스트-어댑터`.
- Two production routes are legitimate and share one completion standard: **Path A** (`asset-plan.json` → `factory:imagegen`, provenance automatic) and **Path B** (`art-prompts.md` → built-in `image_gen` directly, provenance written by hand against the field checklist in `ai-art-pipeline.md`).
- No generated game may include external image SDK runners, image-key setup steps, or service-backed asset-generation commands.
- If art is impossible on this host, build with `--skip-art` and report **production-demo 미통과** — never substitute placeholder art.

If any gate fails or any contract item is unmet, report **production-demo 미통과** with the failing gates. Do not call the game complete.

## Fast path — one command

Once the spec/idea is settled, the whole pipeline (scaffold → productionize → AI art via Codex imagegen skill → QA) runs in one command:

```bash
npm --prefix dev_game run factory:make -- --name "My Game" --out generated/my-game
npm --prefix dev_game run factory:make -- --spec generator/examples/<id>.spec.json --out generated/<id>
# --skip-art (structure only) | --gate none|demo|full | --stages N
```

**Paths are relative to `dev_game/`, not the repo root** — `npm --prefix dev_game` runs with `dev_game/` as the working directory, so `--out dev_game/generated/x` lands in `dev_game/dev_game/generated/x`. Omitting `--out` entirely uses `dev_game/generated/<game-id>`, which is what you almost always want.

AI art uses the `gpt 이미지젠 스킬` built-in mode. Do not create external image SDK runners, do not wait for image service keys, and do not leave project assets under `$CODEX_HOME/generated_images`. Every generated game ships game-specific stage backgrounds, sprites/animation, UI/buttons/FX, audio, and layout-QA compliance. `factory:make` runs `factory:host-preflight` immediately **before** the art step (after scaffold and productionize), so an art-incapable host stops before burning generation time — the scaffold, planning docs, and asset-plan are already on disk and the run resumes with `--from art`. Preflight is not stage 0: putting it first would block custom-loop shells, which never call imagegen at all. Running `factory:host-preflight` yourself first is still the cheapest check. A full art run is minutes long and normally outruns a caller's command timeout — run it in the background and resume with `--skip-existing` rather than restarting. See `dev_game/docs/ai-art-pipeline.md#호스트-어댑터`. The steps below are the same pipeline done manually for finer control.

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
- QA plan: common smoke plus genre-specific gameplay assertions plus production-demo gates plus a captured-state visual QA matrix for every major scene and moving gameplay state
- Adversarial review: why this is not just a reskinned existing template

### 3.5. Decide the UI art direction before writing any scene

Contract §2.0.26 splits the interface in two: the **spec** is shared by every game (button size
tokens, the five first-play elements, layout-registry required IDs, DPR rules) and the
**expression** must not be (composition, button form, typography, motion).

Before implementing scenes, declare the expression as data in
`src/game/config/uiDirection.js` — `layoutMetaphor`, `homeComposition`, `buttonForm`,
`typeScale`, `motionSignature`. The scenes then read it, so the declaration cannot drift from
what is on screen. `factory:ui-direction` fails the build if a game has no declaration, if two
games share the same metaphor/composition/form triple, or if a home screen reuses another
game's vertical placement ladder.

**Do not carry a previous game's layout across.** Measured on 2026-08-16, two games built in
sequence by the same author ended up with `LayoutRegistry`, `AudioManager`, `MobileButton` and
`SaveData` byte-identical, `GameOverScene` 88% identical, and home screens placed at
`0.16/0.15 · 0.225/0.215 · 0.335/0.345` — only the words and the backdrop differed. Three
custom-loop games written by other authors were all distinct, so the cause was repetition by the
author, not the scaffold.

Porting a **bug fix** between games is right; copying a file that decides how the game *looks*
is not. `MobileButton.js` and `theme.js` are design, not infrastructure — start them from the
declared direction each time, even when the fix inside them is worth reusing.

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

Frame sheets and motion assets are not a solo job for this skill. Brief them with `game-feel-motion-skill` **before** generating — cell size, gap, pivot, baseline and the non-overlap contract are what stop outer frames from being clipped at the sheet edge. When a generated sheet comes back with wrong spacing or a drifting baseline, retry generation once; if it repeats, switch to `game-asset-creation`, which repositions approved frames without touching their pixels. Both routes and the generate-vs-correct boundary are specified in `dev_game/docs/ai-art-pipeline.md#시트모션-워크플로--어느-스킬을-언제-쓰나`.

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
npm --prefix dev_game run factory:hq-screen-quality-qa -- --project dev_game/generated/<game-id>
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
```

`factory:production-gate` chains `factory:qa` plus the production-demo, image-quality, visual-layout, and scene-composite gates. Run `factory:hq-screen-quality-qa` separately when asset-fidelity or market-event coverage is in scope; DPR/backing-store coverage comes from `factory:captured-state-qa`.

Also run or create a browser smoke that proves:

- Canvas renders
- PLAY enters gameplay
- No console/page errors
- The core input changes game state
- The genre-defining action works
- UI elements do not overlap in target mobile viewports

Post-production defect fixing follows `dev_game/docs/post-production-qa-contract.md`: classify each capture/user-reported symptom into a defect class (entity-lifecycle race, visual-singularity violation, UI/gameplay ambiguity, difficulty-axis dependence, progression incompleteness), apply that class's fix rules, then re-capture under the original repro conditions. Iterative post-launch fix passes on an existing generated game can also run through the dedicated `game-polish` skill.

Captured-state QA is mandatory before any completion report. What every capture must prove — icon correctness and direction, layout bounds, motion readability, layering order, animation application, entity lifecycle reset, genre-specific visual conflicts, exception-free runs — is specified in `production-demo-quality-contract.md` and the defect classes of `post-production-qa-contract.md`. The operative rule here: **a problem found in a capture is fixed and re-captured, never downgraded to a known gap** in a production-demo completion report.

Likewise, asset/audio QA and imagegen alpha/bbox/scene-composite rules (including when to regenerate instead of patching around bad art) are contract-owned. Apply them; do not paraphrase them into the report.

Evidence handling:

- Save final screenshots, contact sheets, browser videos, and gameplay samples under `dev_game/generated/<game-id>/qa-captures/` or another per-game evidence folder.
- Add or update `dev_game/generated/<game-id>/docs/06-FINAL-QA-SUMMARY.md` with capture paths, custom assertions, production-gate results, fixes made after capture review, and remaining non-blocking expansion ideas.
- Seed `dev_game/generated/<game-id>/docs/07-REGRESSION-CHECKLIST.md` with the repro scenario (input pattern, scene/stage, viewport, assert values) of every defect fixed during capture review, so later `game-polish` sessions re-run them first.
- Because `dev_game/generated/**` is gitignored by default, mirror a concise durable summary under `dev_game/docs/qa-evidence/<game-id>-<YYYY-MM-DD>.md` or clearly tell the user which generated artifacts are untracked and must be force-added/preserved if they want them committed.

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
- Captured gameplay-state evidence confirms icons, layout, movement, layering, directionality, animation application, runtime entity lifecycle, stage/reward/end-state flow, and exception-free behavior
- Post-production issues found in screenshots or video were fixed and re-captured instead of only documented
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
- Captured QA evidence paths, including screenshots/video/contact sheets and any durable `dev_game/docs/qa-evidence/` summary
- Post-production fixes applied after capture review
- Known gaps or next expansion recommendations

## Schema v2 / custom-loop 완료 계약

- arcade Foundation은 `game-spec.v1.schema.json`; 신규 custom-loop는 `game-spec.v2.schema.json`과 `--template custom-shell`을 사용한다.
- custom-shell은 Scene shell, SaveData, AudioManager, LayoutRegistry, one-shot MobileButton, QA hook만 만들며 player/falling hazard/coin gameplay를 만들지 않는다.
- `implementationStatus: foundation`은 Production Demo 실패가 정상이다. 장르 고유 루프를 구현하고 `production-demo`로 바꾼 뒤에만 완료 판정한다.
- runtime config → `window.__GAME_RULES__` → UI/GDD의 단방향 Rules Contract를 유지하고 `factory:docs-runtime-sync-qa`를 통과한다.
- `qa/capture-matrix.json`과 project adapter로 모든 declared state를 캡처하며 필수 UI는 Layout Registry `requiredIds`로 선언한다.
- 첫 플레이 목표/승패/첫 행동/진행 지표/도움말 일시정지·재호출, transition one-shot, multi-pointer block, 저장/오디오/visibility/Retry 누수를 검사한다.
- custom 에셋은 spec `requiredAssetRoles`로 검사하고 해상도·패딩은 `dev_game/docs/production-demo-quality-contract.md#205-공통-고해상도-에셋-규격--authoritative-source`만 따른다.
- 완료 명령: `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --mode custom-loop-full`.
- 최종 증거는 같은 캡처 runId를 가진 `qa-captures/qa-session-report.json`이다.
