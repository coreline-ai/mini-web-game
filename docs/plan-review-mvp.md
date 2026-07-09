# Plan Review: Don't Get Pooped! — MVP

> Review date: 2026-07-02
> Reviewed files: `cocept.txt`, `docs/impl-plan-mvp.md`, `assets/manifest.json`
> Status: **DONE_WITH_CONCERNS** — plan is implementable, but needs a few corrections before coding.

---

## Executive Verdict

The MVP plan is directionally correct: Phaser + Vite, one-hand drag movement, falling obstacle pool, score, best score, and game-over loop are the right first slice.

However, before implementation, update the plan in four areas:

1. **Use the existing SVG assets instead of placeholder-first rendering.** The repo already has 77 standalone SVG assets, so placeholder-only bootstrapping is stale.
2. **Add a minimum automated test gate.** Current tests are mostly manual; this is too weak for difficulty, scoring, pooling, and restart-state regressions.
3. **Make the difficulty curve piecewise, not just linear.** The concept promises “1 minute easy, 5 minutes crazy”; a single linear ramp is unlikely to deliver that feel.
4. **Harden mobile input and lifecycle behavior.** Touch-action, pointer-down/move, pause/resume, orientation/resize, and localStorage failure handling should be explicit.

Recommended next step: revise `docs/impl-plan-mvp.md` before coding, then implement Phase 0.

---

## Step 0 — Scope Challenge

### What already exists

| Existing item | Current state | Review decision |
|---|---:|---|
| `cocept.txt` | Full concept, stages, scoring, items, assets, roadmap | Keep as product source of truth |
| `docs/impl-plan-mvp.md` | MVP plan exists | Keep, but patch before coding |
| `assets/manifest.json` | 77 SVG assets indexed | Reuse immediately |
| `assets/characters/players/*` | 8 player SVGs | Use `player_boy.svg` as default MVP sprite |
| `assets/enemies/poop/*` | 17 poop enemy SVGs | Use `poop_basic_01.svg` as MVP obstacle |
| `assets/ui/*`, `assets/messages/*` | HUD/buttons/messages exist | Use selectively for Start/GameOver if fast |
| Build/runtime code | None | Create from scratch |
| Git repo | Not initialized | Initialize before first implementation commit |

### Minimum changes that achieve the MVP

Keep MVP narrow, but not visually sterile:

```
START -> PLAY -> HIT -> GAME_OVER -> RESTART
           |       |
           |       + save best score
           + spawn pooled poop + score survival/dodge + ramp difficulty
```

Do **not** implement items, shop, skins, boss, full 10-stage campaign, ads, ranking, or audio in MVP.

### Complexity check

The plan introduces 13 source files. For a new Phaser project this is acceptable, but only if each module has a clear boundary:

- Scenes own UI flow and Phaser lifecycle.
- Entities own object positioning/hitbox logic.
- Systems own pure gameplay rules where possible.
- Config owns constants and asset keys.

Do not add more systems/classes in MVP unless a test proves the current structure is becoming tangled.

### Completeness check

The current plan is not a shortcut in gameplay scope, but it **is** a shortcut in verification. Add automated checks now; they are cheap and prevent tuning regressions.

---

## NOT in scope

| Deferred area | Rationale |
|---|---|
| Full 10-stage campaign | MVP must verify the 30-second core loop first |
| Items and power-ups | Adds state interactions before baseline difficulty is tuned |
| Coin shop / skins / background unlocks | Meta loop should wait until core loop retention is proven |
| Toilet boss | Requires separate attack-state architecture and animation timing |
| Ads / continue | Monetization flow should not be added before gameplay is fun |
| Online ranking / friends | Needs backend or platform integration; not needed for MVP |
| Audio / vibration | High polish, but not required to validate first gameplay slice |
| AI raster image generation | Current SVG set is sufficient for MVP; raster polish can be a later art pass |

---

## Architecture Review

### 1. Asset pipeline is stale against current repo state — **High**

**Evidence**

- `docs/impl-plan-mvp.md` says only concept + SVG rule exist and SVG may be incomplete.
- Current `assets/manifest.json` lists 77 SVG files, including 8 runtime 1080x1920 backgrounds and 8 preserved 320x480 card backgrounds.
- The plan still chooses placeholder-first rendering.

**Risk**

If MVP uses placeholder shapes, it will fail to validate the intended “retro arcade + modern mobile” feel even though assets are already available.

**Recommendation**

Patch Phase 0/1/2 to load real SVGs through an `ASSET_KEYS` map, with generated placeholder fallback only if asset loading fails.

Suggested contract:

```js
export const ASSET_KEYS = {
  playerDefault: 'player_boy',
  poopBasic: 'poop_basic_01',
  hudPanel: 'hud_panel',
  gameOver: 'game_over',
};
```

### 2. Difficulty model is under-specified — **High**

**Evidence**

- Concept goal: 1 minute easy, 5 minutes very hard.
- Plan says `Difficulty.js` uses linear increase + clamp.

**Risk**

A single linear ramp will either make 0–60 seconds too hard or 180–300 seconds too flat. It also does not prepare for later stage/event content.

**Recommendation**

Use a piecewise curve from day one:

```txt
0–60s     onboarding       slow fall, wide gaps
60–180s   arcade ramp      faster fall, tighter spawn
180–300s  panic ramp       burst windows begin, near misses common
300s+     endless clamp    max speed/interval with controlled randomness
```

Keep only basic poop in MVP, but structure `Difficulty.getParams(elapsedMs)` to return future-safe fields:

```js
{ phase, fallSpeed, spawnIntervalMs, maxConcurrent, burstChance }
```

### 3. Scene/state lifecycle needs a stricter state machine — **Medium**

**Risk**

Phaser scenes can leave timers, physics bodies, and input listeners alive across restarts if cleanup is implicit.

**Recommendation**

Add this state machine to the implementation plan and code comments in `GameScene`:

```txt
BOOT -> START -> PLAYING -> GAME_OVER
                 |   ^        |
                 |   |        v
                 +---+---- RESTART
```

`GameScene.shutdown()` or equivalent cleanup must stop timers, remove listeners, and deactivate pooled bodies.

### 4. Phaser/Vite version choices need refresh — **Medium**

**Evidence**

Checked via npm registry on 2026-07-02:

- `phaser` latest: `4.2.0`
- `phaser@3` latest: `3.90.0`
- `vite` latest: `8.1.3`

**Recommendation**

Use **Phaser 3 latest minor** for MVP stability, not Phaser 4 yet:

```json
"dependencies": {
  "phaser": "^3.90.0"
},
"devDependencies": {
  "vite": "^8.1.3",
  "vitest": "^latest",
  "playwright": "^latest"
}
```

Reason: Phaser 3 is proven for Arcade Physics tutorials/examples; Phaser 4 may spend an innovation token before the game loop is proven.

---

## Code Quality Review

### 5. Manual debug hooks should not leak into production — **Medium**

The plan suggests adding `window.__scene` for browser-console inspection. That is useful, but it must be gated:

```js
if (import.meta.env.DEV) {
  window.__gameScene = this;
}
```

### 6. Score, difficulty, and clamp logic should be pure-testable — **High**

Keep Phaser dependencies out of:

- score calculation
- best-score parsing
- difficulty curve calculation
- x-position clamp calculation

This allows fast Vitest coverage without launching a browser.

### 7. Mobile input should be explicit — **High**

Add these to Phase 1:

- CSS: `touch-action: none; overscroll-behavior: none; user-select: none;`
- Input: handle both `pointerdown` and `pointermove`.
- Clamp using game-world coordinates, not raw DOM pixels.
- On pointer leaving canvas, keep last valid x.

### 8. localStorage access needs failure-safe wrapper — **Medium**

The plan handles corrupted values, but also handle storage exceptions:

- private browsing restriction
- quota error
- disabled storage

`ScoreManager` should use `try/catch` and fallback to in-memory best for the current run.

---

## Test Review

### Test diagram

```txt
[App load]
   -> BootScene asset preload
      -> StartScene title/best
         -> pointerdown
            -> GameScene
               -> Player clamp
               -> PoopSpawner spawn/recycle
               -> Difficulty params by elapsed time
               -> ScoreManager survival/dodge score
               -> Collision overlap
                  -> GameOverScene
                     -> save/load best
                     -> pointerdown restart
```

### Required automated gates before MVP is called done

| Area | Test type | Must cover |
|---|---|---|
| `Difficulty.getParams` | Vitest unit | 0s, 60s, 180s, 300s+, clamp, no NaN |
| `ScoreManager` | Vitest unit | survival score, dodge score, corrupted storage, storage throw |
| `Player` clamp helper | Vitest unit | left edge, right edge, center, invalid x fallback |
| `PoopSpawner` pool | Vitest or Phaser-lite integration | maxSize, recycle, spawn skip when full |
| Scene smoke | Playwright | app loads, Start->Game, GameOver->Restart |
| Build | npm script | `npm run build` succeeds |

### Critical gap

The current plan has many manual test cases, but no `npm test` / `npm run test:e2e` gate. Add this before implementation starts.

Recommended scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## Performance Review

### 9. Object pooling direction is correct — pass with one addition

The plan correctly uses Phaser Group pooling. Add a visible debug counter in dev mode:

```txt
activePoops / maxPoolSize / fps
```

This catches recycling failures before they become mobile FPS drops.

### 10. SVG loading needs raster-size discipline — Medium

Phaser SVG loading can produce unexpected texture sizes if not explicit. Define target dimensions per asset type:

| Asset | Suggested runtime size |
|---|---:|
| Player | 128×128 or 160×160 |
| Basic poop | 96×96 to 128×128 |
| Large poop later | 160×160 |
| HUD panel | native or scaled UI container |

Do not repeatedly rescale large SVG textures every frame.

### 11. Timer reconfiguration can cause spawn jitter — Medium

Instead of destroying/recreating a Phaser timer every difficulty tick, use an accumulator-based spawn clock:

```txt
spawnAccumulator += delta
if spawnAccumulator >= currentInterval:
  spawn()
  spawnAccumulator -= currentInterval
```

This is easier to test and avoids timer churn.

---

## Failure Modes

| Code path | Failure mode | Covered now? | Needed action |
|---|---|---:|---|
| Boot asset preload | Missing SVG path causes blank sprite | No | fallback texture + load error logging |
| Pointer input | Mobile browser scrolls page instead of moving player | No | CSS touch-action + pointerdown/move tests |
| Difficulty | Params become NaN or exceed max | Partial manual | unit tests for boundary times |
| Spawner pool | Full pool creates unlimited objects or throws | Partial manual | unit/integration test maxSize behavior |
| Collision | Multiple overlaps trigger multiple scene transitions | Planned | keep guard flag + test |
| Restart | Old timer/listener survives restart | No | shutdown cleanup + Playwright restart smoke |
| Best score | localStorage throws | Partial | try/catch wrapper test |

Critical silent gaps: **2**

1. Restart cleanup can silently duplicate timers/listeners.
2. Asset load failure can silently render invisible gameplay objects.

---

## Recommended Plan Patch Before Coding

Apply these changes to `docs/impl-plan-mvp.md`:

1. Replace stale current-state note with: “code 없음, but 77 SVG assets exist and should be loaded from `assets/manifest.json`.”
2. Phase 0: initialize git before install; add `test`, `test:e2e`, and `build` gates.
3. Phase 0: set dependency versions to `phaser@^3.90.0`, current Vite, Vitest, Playwright.
4. Phase 1: load `player_boy.svg`; placeholder fallback only.
5. Phase 1: add mobile CSS/input hardening.
6. Phase 2: load `poop_basic_01.svg`; define runtime texture sizes.
7. Phase 5: replace linear-only ramp with piecewise difficulty params.
8. Add a Phase 6 “MVP hardening” gate: automated tests, restart cleanup, 5-minute soak, build.

---

## Proposed TODOs

If not patched into the MVP plan immediately, capture these later:

1. **Stage/event system plan** — convert concept stages 1–10 into JSON-driven patterns after MVP.
2. **Asset generation backlog** — separate SVG assets vs `gpt 이미지젠 스킬` 기반 raster polish outputs.
3. **Audio/haptics pass** — add tic/near-miss/golden/game-over sounds and mobile vibration.
4. **Monetization/continue design** — define ad continue limits and fairness rules.
5. **Skin/shop economy plan** — define coin drop rates, skin prices, and retention loops.

---

## Completion Summary

- Step 0: Scope Challenge — **scope accepted, but plan patch required before coding**
- Architecture Review: **4 issues found**
- Code Quality Review: **4 issues found**
- Test Review: **diagram produced, 1 major gate gap identified**
- Performance Review: **3 issues found**
- NOT in scope: **written**
- What already exists: **written**
- TODO candidates: **5 proposed**
- Failure modes: **2 critical silent gaps flagged**
- Lake Score: **8/10** — strong MVP slice, incomplete verification gate
