---
name: game-factory
description: "Turn a game idea into a high-quality first production-grade mobile/web game demo through an LLM game-studio workflow: idea analysis, GDD, technical design, Phaser/Vite foundation, custom gameplay implementation, production-grade assets/audio planning, and enforced QA gates. Use when the user asks to create a new game, 새 게임 만들기, 게임 팩토리, dev_game 생성, production-demo game, playable arcade prototype, or wants an idea converted into a playable game. Also use to add a new feature or mode to a game that already exists under dev_game/generated (expansion work), and to close acceptance defects found before that game's first production-demo PASS. Do not use to repair a game whose production-demo PASS is still current — factory:production-pass-status reports pass or legacy-pass there, and the repair belongs to game-polish; a stale, invalid, or unknown status is this skill's work."
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

### Existing-game entry check

For an existing `dev_game/generated/<game-id>` target, classify the request **before editing**:

- New feature, mode, or expansion → stay in `game-factory`, regardless of prior PASS state.
- Defect/repair → run the status command below. Exit 0 (`pass`, or `legacy-pass` for games built
  before receipts existed — a missing receipt alone does not make it factory's) means the acceptance
  state still holds; stop and route the repair to `game-polish`. Exit 1 (`stale`, `invalid`,
  `unknown`) means it does not, so this skill closes the defect and drives the gate to a
  first/current PASS.

```bash
npm --prefix dev_game run factory:production-pass-status -- --project dev_game/generated/<game-id>
```

Do not create or refresh a receipt just to change routing. Only a successful production gate writes it.

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
| `dev_game/generator/scripts/*.mjs` | the individual gates. **Which gate checks what, and which run automatically on v1 vs v2, is the §3.1 applicability table of `post-production-qa-contract.md`** — not this file |
| `dev_game/docs/post-production-qa-contract.md` | defect classes, symptom → fix rules, and §3.1: automated gate vs manual capture check |
| `dev_game/docs/qa-evidence/` | tracked QA-evidence summaries and production-PASS receipts — tracked whether or not the game directory itself is |
| `dev_game/generated/<game-id>/` | generated/custom game output — tracked or ignored **per game** via `dev_game/.gitignore` allowlist; verify with `git check-ignore -v <path>` |
| `src/`, `assets/`, `docs/DEV-GUIDE.md` | shipped game reference for expansion patterns |

## Authoritative contracts

These documents are the single source of truth. This SKILL.md defines the workflow; the contracts define the rules. Read the relevant one before judging quality, and never restate its numbers here.

| Document | Owns |
|---|---|
| `dev_game/docs/production-demo-quality-contract.md` | asset quality, resolution (§2.0.5 + declared resample), **UI button sizing and theme derivation (§2.0.25)**, per-game isolation, provenance, capture-state coverage, completion criteria |
| `dev_game/docs/post-production-qa-contract.md` | defect classes, symptom → fix rules, verification method (automated gate vs manual capture check — see its §3.1 applicability table) |
| `dev_game/docs/ai-art-pipeline.md` | host adapters, art execution rules, Path A/B provenance checklist |

## Non-negotiable production-demo standard

Build success is not completion. `factory:qa` success is not completion.

A game may be reported as complete only after it satisfies `production-demo-quality-contract.md` **in full** — manifest `qualityTier`, per-game asset isolation and provenance, stage/theme backgrounds, non-placeholder core assets (v1 legacy roles, v2/custom-loop spec `requiredAssetRoles`), audio state control, `window.__GAME_LAYOUT_BOUNDS__` publication, declared capture-state coverage, scene-first artboard workflow, role-specific alpha/bbox rules, and the regenerate-don't-patch rule for bad art all live there. This skill enforces the contract through the gates in step 6, not by restating it. Regeneration runs through `asset-plan.json`, so a game predating that convention needs `factory:asset-plan-recover` before `factory:imagegen` will run at all. That rebuilds the plan from the manifest but cannot recover prompts, which the manifest never stored (only `promptHash`) — write those before regenerating, and never run `productionize.mjs` on a shipped game to obtain a plan: it overwrites the planning docs.

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
# --skip-art (structure only) | --gate none|artifact-contract-only|full | --stages N
```

`full` is the default and the only gate that makes a completion claim. `artifact-contract-only`
checks the manifest/provenance/asset contract and nothing else — no build, no browser, no layout.
**A syntax-broken source passes it.** It is not a completion gate.

**Paths are relative to `dev_game/`, not the repo root** — `npm --prefix dev_game` runs with `dev_game/` as the working directory, so `--out dev_game/generated/x` lands in `dev_game/dev_game/generated/x`. Omitting `--out` entirely uses `dev_game/generated/<game-id>`, which is what you almost always want.

AI art uses the `gpt 이미지젠 스킬` built-in mode. Do not create external image SDK runners, do not wait for image service keys, and do not leave project assets under `$CODEX_HOME/generated_images`. `factory:make` runs `factory:host-preflight` before the art step, so an art-incapable host stops before burning generation time and resumes with `--from art`. **A full art run outruns a normal command timeout — run it in the background and resume with `--skip-existing` rather than restarting.** Host adapters and the long-run execution rules are owned by `dev_game/docs/ai-art-pipeline.md#호스트-어댑터`.

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

Porting a **bug fix** between games is right; copying a file that decides how the game *looks*
is not — `MobileButton.js` and `theme.js` are design, not infrastructure. The measurement behind
this rule, and the spec-vs-expression boundary it comes from, are in contract §2.0.26.

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

Production-demo completion gates — run the chain, not the pieces:

```bash
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --require-gpt-imagegen
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --mode custom-loop-full   # schema v2
```

**The individual gate commands are not listed here.** They lived in this file, in `game-polish/SKILL.md`, in the quality contract, and in the pipeline doc — four copies of one list. `production-demo-quality-contract.md` §4 is the single source; open it when you need to run one gate in isolation.

Also run or create a browser smoke that proves:

- Canvas renders
- PLAY enters gameplay
- No console/page errors
- The core input changes game state
- The genre-defining action works
- UI elements do not overlap in target mobile viewports — where an overlap is by design (a bar's
  fill inside its track, a badge pinned on a card), declare the pair with `allowOverlapWith` in the
  layout registry rather than moving a correctly-placed element to satisfy the gate

Captured-state QA is mandatory before any completion report. What a capture must prove, how to
classify what it shows, and the asset/imagegen rules are contract-owned — apply them, do not
paraphrase them. The operative rule here: **a problem found in a capture is fixed and re-captured,
never downgraded to a known gap.**

Evidence handling:

- Save final screenshots, contact sheets, browser videos, and gameplay samples under `dev_game/generated/<game-id>/qa-captures/` or another per-game evidence folder.
- Add or update `dev_game/generated/<game-id>/docs/06-FINAL-QA-SUMMARY.md` with capture paths, custom assertions, production-gate results, fixes made after capture review, and remaining non-blocking expansion ideas.
- Seed `dev_game/generated/<game-id>/docs/07-REGRESSION-CHECKLIST.md` with the repro scenario (input pattern, scene/stage, viewport, assert values) of every defect fixed during capture review, so later `game-polish` sessions re-run them first.
- Whether a generated game is tracked depends on the `dev_game/.gitignore` allowlist, not on a blanket rule — several games are explicitly un-ignored and thousands of generated files are tracked today. Run `git check-ignore -v <path>` to find out, mirror a concise durable summary under `dev_game/docs/qa-evidence/<game-id>-<YYYY-MM-DD>.md`, and only then tell the user which artifacts would be lost.

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

Four bullets above have no automatic gate: requested core loop, gameplay-action smoke, genre-defining action, and non-reskin adversarial review. A green run does not prove them. **Whether an action executes and whether it achieves its purpose are different claims** — the gates only prove the first.

Contract class O puts numbers on the second, and contract §0.1 says why a measurement you built is not evidence until it passes its own positive control. Read both before quoting any number you produced.

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
- **custom-shell은 gameplay를 만들지 않는다.** Scene shell·SaveData·AudioManager·LayoutRegistry·QA hook만 만들며, 장르 고유 루프는 직접 구현해야 한다. `implementationStatus: foundation`은 Production Demo 실패가 정상이고, `production-demo`로 바꾼 뒤에만 완료 판정한다.
- 나머지 v2 요구는 계약과 스키마가 소유한다. Rules Contract 단방향성·`__GAME_RULES__`·`factory:docs-runtime-sync-qa`는 `post-production-qa-contract.md`, 해상도·패딩·자산 규격은 `production-demo-quality-contract.md`, 필드 정의는 `game-spec.v2.schema.json`이다.
- 최종 증거는 같은 캡처 runId를 가진 `qa-captures/qa-session-report.json`이다. 완료 명령은 위 6절의 두 줄이 전부다.
