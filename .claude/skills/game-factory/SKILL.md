---
name: game-factory
description: Scaffold, validate, and QA a new mobile portrait Phaser/Vite arcade game from a single game-spec JSON using this repo's dev_game factory. Use when the user asks to create a new game, 새 게임 만들기, 게임 팩토리, game starter, arcade/dodge/runner prototype, dev_game 생성, or wants to turn a game idea into a playable starter with QA gates.
---

# Game Factory

Create a playable mobile-portrait Phaser 3 + Vite arcade starter from one idea/spec, then guide expansion using this repo's real `Don't Get Pooped!` project patterns.

## Locate the project

Start in the current repo or walk upward until these exist:

- `dev_game/generator/src/cli.mjs`
- `dev_game/generator/examples/poop-dodge.spec.json`
- `dev_game/package.json`

If not found, ask for the `game-dd` repo path. Do not recreate the generator.

## Key paths

| Path | Purpose |
|---|---|
| `dev_game/generator/src/cli.mjs` | zero-dependency generator CLI, Node >= 18 |
| `dev_game/generator/schemas/game-spec.schema.json` | schema enforced by CLI validation |
| `dev_game/generator/examples/poop-dodge.spec.json` | known-good base spec |
| `dev_game/generated/<game-id>/` | generated starter output, gitignored |
| `dev_game/docs/new-game-start-guide.md` | detailed new-game kickoff guide |
| `src/`, `assets/`, `docs/DEV-GUIDE.md` | real shipped game reference for expansion |

## Workflow

### 1. Shape the concept

Collect only what is missing. Default aggressively:

- Title/theme: what the player dodges and collects
- Controls: `drag` default, or `tap-lane` / `swipe`
- Difficulty: `easy` / `normal` / `hard`, default `normal`
- Canvas: default `390x844` portrait
- Output id: kebab-case, e.g. `rush-lane-racer`

If the user only gives a vague idea, produce a one-line pitch and proceed with sensible defaults.

### 2. Write the spec

Copy the base spec and edit only supported fields first:

```bash
cp dev_game/generator/examples/poop-dodge.spec.json dev_game/generator/examples/<game-id>.spec.json
```

Update:

- `game.id`, `game.title`, `game.description`
- `player.moveMode`, `player.speed`, `player.hitbox`
- `hazards.label`, `spawnRateStart`, `spawnRateMax`, `fallSpeedStart`, `fallSpeedMax`, `poolSize`
- `collectibles.label`, `spawnRate`, `scoreValue`
- `difficulty.rampEverySeconds`, `maxLevel`
- `theme.colors` with valid hex colors only

Do not set unsupported starter features:

- `lives` must remain `{ "start": 1, "max": 1 }`
- `session.countdownSeconds` must remain `0`
- `session.maxDurationSeconds` must remain `null`
- `ui.showLives` must remain `false`

### 3. Validate and generate

```bash
node dev_game/generator/src/cli.mjs --validate-only --spec dev_game/generator/examples/<game-id>.spec.json
node dev_game/generator/src/cli.mjs --spec dev_game/generator/examples/<game-id>.spec.json --out dev_game/generated/<game-id>
```

Useful flags:

- `--dry-run` to inspect generated files
- `--force` only for `dev_game/generated/*`, an empty directory, or a directory with `.dev-game-generated.json`
- `--no-sfx` for silent starter output
- `--with-pwa` for a minimal web manifest

Never point `--force` at an arbitrary project folder.

### 4. Verify the generated game

Run the full factory gate from repo root:

```bash
npm --prefix dev_game run factory:qa
```

If Playwright Chromium is missing:

```bash
npm --prefix dev_game install
npm --prefix dev_game exec playwright install chromium
```

For a specific generated game:

```bash
cd dev_game/generated/<game-id>
npm install
npm run build
npm run dev
```

Report exact pass/fail results. Do not claim success without a green build or browser smoke.

### 5. Expand beyond the starter

The generator intentionally creates only the Foundation: Boot/Loading/Home/Game/Pause/GameOver, falling hazards, one collectible, score/best, pause, localStorage, placeholder SVG/WAV.

For production-style expansion, mirror the shipped game:

| Need | Reference |
|---|---|
| scenes such as Shop/Ranking/Settings | `src/scenes/` |
| score, coins, difficulty, boss, powerups | `src/systems/` |
| player/entity structure | `src/entities/` |
| UI kit and viewport handling | `src/ui/` |
| balance/config constants | `src/config/gameConfig.js` |
| asset manifest style | `assets/manifest.json` |
| audio manifest style | `assets/audio/audio-manifest.json` |
| implementation docs | `docs/DEV-GUIDE.md`, `docs/impl-plan-mvp.md` |

Read deeper docs only when needed:

- `dev_game/docs/game-production-template.md` for full production phases
- `dev_game/docs/game-archetype-recipes.md` for genre recipes
- `dev_game/docs/common-game-systems-checklist.md` for foundation completeness
- `dev_game/docs/automation-scope-proposals.md` for generator scope/exclusions

## Scope limits

Do not add backend, login, server ranking, ads/IAP, native packaging, multiplayer, analytics SDKs, or AI image API integration unless the user explicitly asks for custom work beyond the starter.

## Response format

End with:

- Game name and one-line concept
- Spec path
- Output path
- Commands run
- QA result
- Any blockers or next expansion recommendations
