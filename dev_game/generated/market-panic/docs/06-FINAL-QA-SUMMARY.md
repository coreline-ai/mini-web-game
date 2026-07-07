# 06 - Final QA Summary: Market Panic

## Scope

Final QA covered the production-demo `Market Panic` build under
`dev_game/generated/market-panic` after custom gameplay implementation, imagegen asset
integration, GUI polish, and capture-based post-production review.

## Captured Evidence

Primary capture folder:

```text
dev_game/generated/market-panic/qa-captures/final-2026-07-06
```

Captured files:

| State | Evidence |
|---|---|
| Loading | `screenshots/01-loading.png` |
| Home | `screenshots/02-home.png` |
| Game initial | `screenshots/03-game-initial.png` |
| Game after `BUY` | `screenshots/04-game-after-buy.png` |
| Moving gameplay frame | `screenshots/05-game-motion-frame.png` |
| Stage advance | `screenshots/06-stage-advance.png` |
| Pause | `screenshots/07-pause.png` |
| Resumed Game | `screenshots/08-resumed-game.png` |
| GameOver terminal | `screenshots/09-gameover-circuit-breaker.png` |
| State samples | `state-samples.json` |

Additional automated visual evidence:

```text
dev_game/.tmp/visual-layout-qa/market-panic
dev_game/.tmp/scene-composite-qa/market-panic
```

These folders contain Loading, Home, Game, Pause, and GameOver captures for
`390x844`, `430x932`, and `1080x1920`.

## Custom Runtime Assertions

The final browser capture passed these custom assertions:

| Assertion | Result |
|---|---|
| `BUY` mutates market state | Pass |
| Moving gameplay frame changes over time | Pass |
| Market state ticks during motion | Pass |
| Stage 1 can advance to Stage 2 | Pass |
| Pause overlay appears and exposes Resume | Pass |
| Required Game layout IDs are visible | Pass |
| GameOver terminal is reachable | Pass |
| Terminal title is captured | Pass |
| Console/page/network errors are zero | Pass |

Sample state delta after `BUY`:

| Metric | Before | After |
|---|---:|---:|
| Portfolio | `100.0` | `103.9` |
| Return | `0.0%` | `3.9%` |
| Risk | `28.6` | `31.6` |
| Confidence | `71.9` | `75.3` |

Stage advance sample:

```text
OPENING BELL -> EARNINGS STORM
portfolio=110.0 risk=18.6 confidence=86.9 terminal=none
```

Terminal sample:

```text
CIRCUIT BREAKER
portfolio=110.0 risk=100.0 confidence=86.8
```

## Automated Gate Results

Current final gate evidence:

| Gate | Result |
|---|---|
| Spec validation | Pass: `Spec OK: market-panic` |
| Generated game build | Pass: `npm run build` |
| `factory:production-demo-qa` | Pass |
| `factory:image-quality-qa` | Pass: `11 assets at role-aware production-demo bar` |
| `factory:visual-layout-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:scene-composite-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:production-gate` | Pass across `390x844`, `430x932`, `1080x1920` |

## Fixes Made During Capture Review

| Defect class | Symptom | Fix |
|---|---|---|
| Entity-lifecycle race | Stage advance crashed because `createStockCards()` called `destroy()` on card records instead of the Phaser container. | Destroy card containers with `card.container?.destroy(true)` before rebuilding Stage 2+ cards. |
| UI/gameplay ambiguity | Pause icon overlapped timer/return text in the HUD. | Repositioned timer/return text, shortened bars, and reduced pause icon display size. |
| UI/gameplay ambiguity | News panel panic text touched the bottom border. | Raised panic text within the news panel. |
| Visual singularity | Home mascot looked like a produce-market character instead of a stock trader. | Regenerated a stock-trader mascot with the `imagegen` skill, removed chroma key, repacked into `player.png`, and enlarged Home display. |
| Visual singularity | Generated hazard had detached lightning parts and weak alpha coverage. | Added local backing/padding postprocess while preserving the generated market-shock subject. |
| UI/gameplay ambiguity | User report: "뭘 어떨게 하는거야? 방법을 모르겠는데?" | Added a concise Home rule block and an in-game stage target strip so the first action and win condition are visible without external explanation. |

## Polish Pass: Instruction Clarity

Symptom:

```text
뭘 어떨게 하는거야? 방법을 모르겠는데?
```

Classification:

```text
Class C - UI/gameplay ambiguity
Severity 3 - visual/onboarding clarity
```

Before evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/before/before-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/before/before-game.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/before/before-sample.json
```

After evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/after/after-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/after/after-game.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/after/after-sample.json
```

Added runtime UI:

- Home rule block: `PICK STOCK, THEN ACTION`, `BUY up / SELL down`, `HEDGE panic / CASH rumor`.
- Game target strip: current stage target, risk ceiling, and confidence floor.

Re-verification after the fix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:production-demo-qa` | Pass |
| `factory:image-quality-qa` | Pass |
| `factory:visual-layout-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:scene-composite-qa` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: Production Sweep

Scope:

```text
/game-polish full production-quality sweep
```

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-full-sweep/baseline
```

Regression checklist result:

| Area | Result |
|---|---|
| MP-R001 Stage transition crash | Pass |
| MP-R002 HUD pause/timer overlap | Pass |
| MP-R003 news-panel panic text placement | Pass |
| MP-R004 stock-trader mascot identity | Pass |
| MP-R005 market-shock hazard alpha/crop | Pass |
| MP-R006 instruction clarity | Pass |

Full sweep results:

| Sweep | Result |
|---|---|
| Visual scene capture | Pass: Home, Game, Pause, GameOver screenshots captured |
| Input hostility | Pass: triple Play, pause/resume x10, triple Retry |
| Audio state | Pass: Home -> Game -> Home x3, max BGM instances `1` |
| Persistence | Pass: best score and mute setting survive reload |
| Corrupted storage | Pass: bad settings JSON recovers to Home |
| Visibility/session continuity | Pass: visibility change auto-pauses without timer jump |
| Long-run stability | Pass: 2-minute run plus 5 retries |

Contract assert summary from `full-sweep-baseline-samples.json`:

| Assert | Value |
|---|---:|
| Browser errors | `0` |
| Page errors | `0` |
| Failed asset/network responses | `0` |
| Duplicate visible entities | `0` |
| Lingering transient graphics | `0` |
| Stale result stamps | `0` |
| Max active BGM instances | `1` |
| Duplicate scene-stack samples | `0` |
| Long-run samples | `14` |
| Long-run max display list size | `36` |
| Long-run max timers | `0` |
| Long-run max tweens | `0` |
| Long-run min FPS | `59.52` |

No new severity-1 or severity-2 defects were found in this sweep.

## Polish Pass: Korean Playability Hotfix

Symptom:

```text
답답하네 지금 게임 실행 화면 퀄리티 봤어? 아주 개판인데?
그리고 뭘 어떻게 게임 하는거야? 한글 패치로 다바꾸고 겜 할수 있게 해줘!
이게 겜이냐 그냥 뭐야 지켜보는 화면이야? 누가 이걸 이해하고 겜을 하겠어?
```

Classification:

```text
Class C - UI/gameplay ambiguity
Class E - progression/terminal explanation incompleteness
Severity 2 - core playability comprehension blocker
```

Root cause:

- Visible play-critical text remained English-first (`Market Panic`, `PLAY`, `PORT`, `RET`, `BUY`, `SELL`, `HEDGE`, `CASH`).
- Home explained only a thin rule block, while the active Game scene did not explain the current news target, the next-news timer, or action consequences.
- Result feedback did not show enough metric deltas to make the screen feel interactive instead of observational.

Fix:

- Localized Loading, Home, HUD, News, Goal, Stock-card status, Action buttons, Feedback, Pause, GameOver, browser title, and runtime game title to Korean.
- Added Korean action semantics and directional symbols: `▲ 매수`, `▼ 매도`, `◆ 헤지`, `● 현금`.
- Added in-game hint and countdown line: event-specific action hint plus `다음 뉴스 N초`.
- Added selected/news stock status badge (`뉴스`, `선택됨`, `뉴스·선택`) on stock cards.
- Expanded action feedback into two lines with exact deltas: `자산`, `위험`, `신뢰`.

Before evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/before/before-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/before/before-game.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/before/before-sample.json
```

After evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/after/after-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/after/after-game.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/after/after-action-feedback.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/after/after-sample.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/regression/korean-playability-regression-samples.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/regression/regression-final.png
```

Regression re-run result:

| Area | Result |
|---|---|
| Triple Play input | Pass: one active Game scene |
| Pause/resume x10 | Pass |
| Triple Retry | Pass |
| Home -> Game -> Home x3 | Pass |
| Persistence reload | Pass: best score retained |
| Corrupted settings reload | Pass: boots back to Home |
| Visibility auto-pause | Pass: launches Pause |
| 2-minute long-run + 5 retries | Pass |

Contract assert summary from `korean-playability-regression-samples.json`:

| Assert | Value |
|---|---:|
| Browser errors | `0` |
| Page errors | `0` |
| Failed asset/network responses | `0` |
| Duplicate visible entities | `0` |
| Lingering transient graphics | `0` |
| Stale result stamps | `0` |
| Max active BGM instances | `0` |
| Duplicate scene-stack samples | `0` |
| Long-run samples | `16` |
| Long-run max display list size | `36` |
| Long-run max timers | `0` |
| Long-run max tweens | `0` |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| Spec validation | Pass: `Spec OK: market-panic` |
| `npm run build` | Pass |
| `factory:production-demo-qa` | Pass |
| `factory:image-quality-qa` | Pass: `11 assets at role-aware production-demo bar` |
| `factory:visual-layout-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:scene-composite-qa` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: Full DOM UI Overhaul

Symptom:

```text
아직도 게임 실행 화면 개판인데? 버튼은 아직 저화질 에셋이고,
상단에 소식과 기타 뷰는 알아보기 힌들 정도로 저화질이고,
상단에 버튼이랑 텍스트는 레이아웃이 깨져 있고 전체적으로 엉망 진창이야.
```

Classification:

```text
Class L - Asset fidelity violation
Class C - UI/gameplay visual ambiguity
Severity 2 - production-screen quality and layout blocker
```

Parallel-agent findings:

- Action buttons still appeared low quality because generated `solid_action_*`
  textures were rendered at logical button size.
- News, goal, stock-card labels, prices, status badges, action labels, Home buttons,
  Pause buttons, and GameOver summary still relied on canvas text or generated button
  textures.
- The previous pass proved `domHud: true` but `domGameUi: false`, so the UI ownership
  remained mixed and visually inconsistent.

Fix:

- Added `DomGameUI` for the Game scene: HUD, pause button, news panel, goal strip,
  stock cards, feedback, and action buttons now render through DOM/CSS.
- Added `DomSceneUI` for Home, Pause, and GameOver, replacing canvas buttons and
  canvas text on those screens with DOM/CSS controls.
- Published DOM layout bounds to `window.__GAME_LAYOUT_BOUNDS__` so existing visual
  QA gates still inspect the final UI.
- Kept Phaser ownership for backgrounds, trader image, engine state, audio, and scene
  transitions.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/before/01-home-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/before/02-game-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/before/03-action-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/before/before-sample.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/after-full-dom/01-home-dom.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/after-full-dom/02-game-dom.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/after-full-dom/03-action-dom.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/after-full-dom/04-pause-dom.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/after-full-dom/05-gameover-dom.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/after-full-dom/full-dom-sample.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/regression/dom-ui-multiview-sample.json
```

State-sample result:

| Assert | Value |
|---|---:|
| DOM UI viewports checked | `390x844`, `430x932`, `1080x1920` |
| Text overflow | `0` |
| Out-of-bounds UI rects | `0` |
| Browser errors | `0` |
| Page errors | `0` |
| Failed asset/network responses | `0` |

Re-verification after the overhaul:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:hq-screen-quality-qa` | Pass: `22` HQ assets, `59` news events |
| `factory:production-demo-qa` | Pass |
| `factory:image-quality-qa` | Pass |
| `factory:visual-layout-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:scene-composite-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:production-gate` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:production-gate` | Pass, exit code `0` |

## Polish Pass: HQ Screen Asset Refresh

Symptom:

```text
현재 모든 에셋이 너무 저화질이야 고화질 에셋으로 나올때 까지 시도 해서 바꿔죠
첨부 화면 모두 전면 고화질로 교체! 고화질 전담 QA에이전트를 만들어 성공여부 확인 하고 진행 해줘
병렬에이전트 실행! 다시 한번 고화질 화면으로 그리고 레이아웃 배치 다시 해줘!
별개로 뉴스의 내용이 너무 단순해 쫌더 많은 뉴스 거리를 생성 할수 있게 전담 병렬에이전트를 만들어서 뉴스 데이터 수집 적용
```

Classification:

```text
Class L - Asset fidelity violation
Class C - UI/gameplay visual ambiguity
Severity 2 - final rendered screen quality blocker
```

Parallel agent results:

- HQ Asset QA agent completed a read-only audit and identified that file-level image-quality passed, but final screens still looked like prototype runtime rectangles over a background.
- News data agent expanded `MARKET_EVENTS` from `13` to `59` Korean events across all active tickers and validated syntax/build/quota sanity.

Fix:

- Generated four new high-quality full-screen market backgrounds through the `imagegen` skill.
- Preserved imagegen sources under `qa-captures/asset-sources/hq-refresh-2026-07-06`.
- Converted stage backgrounds to `1080x1920` WebP with cover-fit crop, high-quality resampling, and minimal style smoothing to pass the existing high-frequency image-quality gate.
- Converted player, hazard, collectible, hit FX, and collect FX runtime images to HQ WebP assets while keeping alpha and sprite-sheet slicing intact.
- Added high-resolution runtime UI assets: menu panel, modal panel, HUD panel, news panel, goal strip, stock-card states, and four action button backgrounds.
- Rewired Loading, Home, Game, Pause, and GameOver scenes to use the new HQ assets.
- Added `factory:hq-screen-quality-qa`, which validates HQ screen assets and market-news quotas.

Before evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/before/user-attached-low-quality.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/before/previous-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/before/previous-game.png
```

After evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after/01-loading-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after/02-home-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after/03-game-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after/04-action-feedback-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after/05-pause-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after/06-gameover-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after/hq-refresh-sample.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/regression/hq-refresh-regression-samples.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/final/02-home-final-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/final/03-game-final-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/final/04-action-feedback-final-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/final/06-gameover-final-hq.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/final/final-hq-sample.json
```

HQ asset/news QA:

| Assert | Value |
|---|---:|
| HQ assets checked | `22` |
| Stage backgrounds | `4 x 1080x1920 WebP` |
| Foreground/gameplay WebP assets | `5` |
| Market news events | `59` |
| Rumor/fake events | `14` |
| Required runtime texture keys present in final capture | `23` |

Regression re-run result:

| Area | Result |
|---|---|
| Triple Play input | Pass |
| Pause/resume x10 | Pass |
| Triple Retry | Pass |
| Persistence reload | Pass: best score retained |
| Corrupted settings reload | Pass: boots back to Home |
| Visibility auto-pause | Pass: launches Pause |
| 2-minute long-run + 5 retries | Pass |

Contract assert summary from `hq-refresh-regression-samples.json`:

| Assert | Value |
|---|---:|
| Browser errors | `0` |
| Page errors | `0` |
| Failed asset/network responses | `0` |
| Duplicate visible entities | `0` |
| Lingering transient graphics | `0` |
| Stale result stamps | `0` |
| Max active BGM instances | `0` |
| Duplicate scene-stack samples | `0` |
| Long-run samples | `16` |
| Long-run max display list size | `35` |
| Long-run max timers | `0` |
| Long-run max tweens | `0` |

Re-verification after the HQ refresh:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:hq-screen-quality-qa` | Pass: `22` HQ assets, `59` news events |
| `factory:production-demo-qa` | Pass |
| `factory:image-quality-qa` | Pass |
| `factory:visual-layout-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:scene-composite-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:production-gate` | Pass, exit code `0` |

## Visual Review Notes

- GUI icons are visible and semantically correct after polish: pause uses a pause symbol,
  action buttons use Korean text plus directional symbols, and terminal buttons are readable.
- Layout placement is stable in mobile portrait and large portrait viewports; HUD, news,
  stock cards, action grid, pause overlay, and GameOver panel remain inside safe areas.
- Gameplay assets and UI layer correctly: backgrounds remain behind gameplay/UI, stock
  cards do not hide action buttons, and pause/GameOver overlays sit above gameplay state.
- Runtime motion and feedback are present through ticker sparkline changes, timed event
  changes, next-news countdown, selected-stock status, and action-result metric deltas.
- No console errors, page errors, failed asset responses, or hidden runtime exceptions
  were recorded in the final custom browser capture.

## Remaining Expansion Ideas

These are not blockers for the production-demo build:

- Add richer animated trader poses for good call, bad call, and stage clear feedback.
- Add more event cards per ticker so long runs feel less cyclical.
- Add optional tutorial prompts for first-time players.
- Add a win-path automated capture for `MARKET SAVED` or `MASTER TRADER`.

## Polish Pass: Text/Button Clarity Hotfix

Symptom:

```text
게임 실행 화면의 상단 텍스트가 너무 흐려 보여 이걸 개산 할 방법이 없어?
버튼이 모두 이상해 투명 효과야 뭐야?
```

Classification:

```text
Class L - Asset fidelity violation
Class C - UI/gameplay visual ambiguity
Severity 3 - visual legibility and button affordance blocker
```

Root cause:

- The top HUD used small canvas-rendered Phaser text over a scaled mobile canvas and a
  translucent panel, so Korean status labels looked soft in DPR2 captures.
- Home/action/terminal buttons reused glossy image textures with a bright translucent
  top band, making the buttons read as accidental transparency instead of solid input
  controls.

Fix:

- Added a crisp DOM HUD overlay for the top status text and bars while keeping the
  Phaser HUD panel and pause input intact.
- Added runtime solid button textures and switched Home, Pause, GameOver, and all
  four action buttons away from the translucent glossy surfaces.
- Increased top HUD contrast, stroke, and font sizing.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/before/01-home-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/before/02-game-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/before/03-action-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/before/before-sample.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/after/01-home-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/after/02-game-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/after/03-action-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/after/04-pause-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/after/after-game-sample.json
```

State-sample result:

| Assert | Value |
|---|---:|
| DOM HUD exists in Game | `true` |
| DOM HUD display in Game | `block` |
| Solid button textures present | `7 / 7` |
| Browser errors | `0` |
| Page errors | `0` |
| Failed asset/network responses | `0` |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:production-demo-qa` | Pass |
| `factory:hq-screen-quality-qa` | Pass: `22` HQ assets, `59` news events |
| `factory:image-quality-qa` | Pass |
| `factory:visual-layout-qa` | Pass across `390x844`, `430x932`, `1080x1920` |
| `factory:scene-composite-qa` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: Home Layout and Action Button Readability

Symptom:

```text
게임 시작전 화면 레이아웃이 이상해 확인 하고
게임중 하단 4개 버튼 한글이 안보여 가독성 가시성 확인 해!
```

Classification:

```text
Class C - UI/gameplay visual ambiguity
Class L - Asset fidelity/readability violation
Severity 3 - visual layout and action readability
```

Root cause:

- Home mascot was positioned behind the large instruction panel, making the pre-game
  composition look accidental and visually cramped.
- Action button labels fit their containers, but the Korean secondary labels were small
  and the yellow `현금` button had weak white-on-yellow contrast.
- The visual-layout QA default port was occupied by an older preview server, so the
  first automated capture pass showed the wrong game. Re-run used a clean port.

Fix:

- Repositioned and reduced the Home mascot so it sits clearly between subtitle and
  instruction panel.
- Compacted the Home instruction panel and moved its rules, score, and buttons into a
  clearer vertical rhythm.
- Enlarged action button Korean labels and secondary text, centered the two-line labels,
  and changed the yellow `현금` button to high-contrast dark text.
- Renamed the Home rules layout id so automation clicks the actual `play` button, and
  added parent/child overlap allowances to DOM layout bounds.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-actions/before/01-home-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-actions/before/02-game-buttons-before.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-actions/before/before-sample.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-actions/after-pass-1/01-home-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-actions/after-pass-1/02-game-buttons-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-actions/after-pass-1/after-pass-1-sample.json
dev_game/.tmp/visual-layout-qa/market-panic/390x844-home.png
dev_game/.tmp/visual-layout-qa/market-panic/390x844-game.png
```

State-sample result:

| Assert | Value |
|---|---:|
| Browser errors | `0` |
| Page errors | `0` |
| Failed asset/network responses | `0` |
| Home text overflow | `0` |
| Game text overflow | `0` |
| Action button label overflow | `0` |
| Pretendard font loaded | `true` |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:visual-layout-qa --port 4196` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: Decision Lock and Scenario Clarity

Symptom:

```text
매수 매도 라고 사인을 주고 그냥 그대로 누르면 되는 시나리오인거야? 따라하기 껨이야?
그리고 한번에 버튼 한번 누르게 해야 되는데 계속 연속 누를수 있는건 왜 그래?
게임 시나리오를 모르겠어 완전히
```

Classification:

```text
Class C - UI/gameplay visual ambiguity
Class I - Input robustness / repeated action trigger
Severity 2 - core gameplay rule and decision-loop blocker
```

Root cause:

- The in-game hint used direct action phrases such as `호재: 매수`, so the loop felt
  like a follow-the-sign quiz instead of a market decision game.
- `MarketEngine.applyAction()` allowed repeated actions during the same news event,
  so one event could be farmed by pressing the same button multiple times.
- Button subtitles described narrow answer mappings instead of the player's strategic
  intent.

Fix:

- Reframed the Home and Game text around the actual scenario: read the news, choose a
  stock, then make exactly one decision per news event.
- Replaced direct-answer hints with source/scope, volatility, horizon, and verification
  labels such as `출처 A · 개별 종목` and `변동 2/5 · 중기 · 검증 B`.
- Changed action subtitles to strategic intents: `상승 베팅`, `하락 베팅`,
  `위험 축소`, and `관망`.
- Added engine-level `decisionMade/currentEventKey/lastDecision` state so repeated
  action attempts in the same event cannot mutate portfolio/risk/confidence again.
- Disabled all four action buttons after the first decision and re-enabled them only
  when the next news event arrives.
- Updated result feedback from `정답` to `판단 성공` and similar judgment labels so the
  game reads as decision-making, not answer-following.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/before/01-before-initial.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/before/02-before-after-first-buy.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/before/03-before-after-second-buy.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/before/before-sample.json
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/after-pass-1/01-home-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/after-pass-1/02-game-initial-after.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/after-pass-1/03-after-first-buy-locked.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/after-pass-1/04-after-second-buy-attempt.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/after-pass-1/05-after-next-news-unlocked.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/after-pass-1/after-pass-1-sample.json
```

State-sample result:

| Assert | Before | After |
|---|---:|---:|
| Direct answer hint present | `true` | `false` |
| Buttons disabled after first action | `false` | `true` |
| Repeated action mutates portfolio | `true` | `false` |
| Same decision preserved after second click | n/a | `true` |
| Buttons unlock on next news | n/a | `true` |
| Game text overflow | n/a | `0` |
| Browser errors | `0` | `0` |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:visual-layout-qa --port 4197` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: News Deck Expansion and Signal Lens

Symptom:

```text
다양한 뉴스가 나오게 경우수를 최소 종목당 30개 이상으로 만들고!
힌트가 너무 직관적이야 누가 봐도 호재 ? 매수 악재 매도! 루머? 안좋아 위험축소 ?좋아 알수 있잖아
좀더 시나리오를 탄탄하게 다듬어봐
```

Classification:

```text
Class C - UI/gameplay visual ambiguity
Class G - Progression/session depth incompleteness
Severity 2 - core scenario depth and decision-loop clarity blocker
```

Root cause:

- The visible signal layer still made news feel like a direct answer label.
- The initial event order stayed on the same ticker too long, so stock selection felt
  partially automated.
- The news deck was too small for a market-scenario game and did not guarantee at
  least 30 cases per playable ticker.
- Longer mixed-signal headlines could crowd the news card.

Fix:

- Expanded `MARKET_EVENTS` to `295` unique Korean headlines using ticker profiles and
  reusable scenario templates.
- Guaranteed at least 30 news cases per real stock ticker: `NOVA 46`, `VOLT 43`,
  `BIOZ 44`, `GRID 42`, `SAFE 44`, `CBNK 44`.
- Added `32` market-wide events so systemic/news-flow cases are also varied.
- Removed direct event-type labels from the live signal line. The UI now exposes
  source grade, scope, volatility, horizon, and verification instead of `호재/악재/루머`
  answer labels.
- Reworked early fixed headlines into mixed-signal scenario copy, for example
  contract wins with cost conditions and raw-material relief with pricing uncertainty.
- Changed event sequencing so the next news can target a different ticker while the
  selected ticker stays unchanged; the player must actively select the relevant stock.
- Hid nonessential news-card meta text and allowed three headline lines so long news
  does not collide with other UI.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/390x844-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/390x844-game-initial.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/390x844-game-next-news.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/390x844-game-decision-locked.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/1080x1920-game-next-news.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/news-depth-report.json
```

State-sample result:

| Assert | Result |
|---|---|
| Total unique headlines | `295` |
| Every stock ticker has at least 30 news cases | Pass |
| Market-wide events have at least 30 cases | Pass (`32`) |
| Hint/kicker direct action leak | `false` |
| Next news auto-selects ticker | `false` |
| Long headline stays inside news panel | `true` |
| Text overflow | `0` |
| Browser errors | `0` |
| Action buttons lock after one same-news decision | `4/4 disabled` |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| News-count VM check | Pass: `295` unique, all stock tickers `>=30`, market-wide `32` |
| `factory:visual-layout-qa --port 4198` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: Home Subtitle Legibility

Symptom:

```text
처음 실행 화면 상단 텍스트 마켓패닉 및에 텍스트 가독성이 떨어져 안보여!
```

Classification:

```text
Class C - UI/gameplay visual ambiguity
Severity 3 - home-screen readability defect
```

Root cause:

- The Home subtitle was rendered directly over a bright, detailed background with only
  text shadow for separation.
- Its vertical position sat between the title and mascot, where background highlights
  reduced contrast.

Fix:

- Moved the subtitle slightly upward under the title.
- Added a compact dark high-contrast subtitle plate with a light border.
- Increased subtitle weight and tightened line metrics so the Korean text stays sharp
  without overflowing.

Evidence:

```text
Before:
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/390x844-home.png

After:
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-subtitle-legibility/after-pass-1/390x844-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-subtitle-legibility/after-pass-1/430x932-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-subtitle-legibility/after-pass-1/1080x1920-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-subtitle-legibility/after-pass-1/home-subtitle-legibility-report.json
```

State-sample result:

| Assert | Result |
|---|---|
| Home subtitle overflow | `false` |
| Browser errors | `0` |
| `390x844` title-to-subtitle gap | `20px` |
| `390x844` subtitle-to-panel gap | `136px` |
| Subtitle foreground/background contrast structure | White text on `rgba(2, 6, 23, 0.82)` plate |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:visual-layout-qa --port 4199` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: Action Help Menu

Symptom:

```text
하단 4개 버튼 역할을 알려줘!
위 내용을 도움말 항목을 만들어서 넣어주는 메뉴를 하나 만들어줘! 대안 제시 해줘
```

Classification:

```text
Class C - UI/gameplay visual ambiguity
Severity 3 - in-game help and control affordance clarity defect
```

Chosen approach:

- Alternatives considered:
  - Home-only help button.
  - Pause-only help button.
  - In-game floating `?` button.
- Implemented Home + Pause help because first-run players need it before starting,
  and active players need a non-disruptive way to re-open it from Pause.

Fix:

- Added a reusable `HelpOverlay` DOM modal.
- Added `? 도움말` to the Home menu.
- Added `? 도움말` to the Pause menu.
- Documented the four action roles inside the modal:
  `매수`, `매도`, `헤지`, `현금`.
- Kept help text concise and scenario-oriented: select a news ticker first, then make
  one action per news event.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1/390x844-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1/390x844-home-help.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1/390x844-pause.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1/390x844-pause-help.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1/1080x1920-home-help.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1/help-menu-report.json
```

State-sample result:

| Assert | Result |
|---|---|
| Home help opens | `true` |
| Pause help opens | `true` |
| Help contains all four roles | `true` |
| Home help overflow | `0` |
| Home help out-of-bounds | `0` |
| Pause help overflow | `0` |
| Pause help out-of-bounds | `0` |
| Browser errors | `0` |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:visual-layout-qa --port 4200` | Pass across `390x844`, `430x932`, `1080x1920` |

## Polish Pass: Home Panel Text Balance

Symptom:

```text
최초 홈 화면 설명 뷰 안에 텍스트 상단 에 더 붙여줘 상하단 벨런스 유지 해줘
```

Classification:

```text
Class C - UI/gameplay visual ambiguity
Severity 4 - home-screen spacing polish
```

Fix:

- Moved the Home rules list closer to the top of the explanation panel.
- Shifted the goal, best score, Play, Help, and Sound controls slightly to preserve
  top/bottom balance inside the panel.

Evidence:

```text
Before:
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1/390x844-home.png

After:
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-panel-balance/after-pass-1/390x844-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-panel-balance/after-pass-1/430x932-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-panel-balance/after-pass-1/1080x1920-home.png
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-panel-balance/after-pass-1/home-panel-balance-report.json
```

State-sample result:

| Assert | Result |
|---|---|
| `390x844` panel top gap | `31px` |
| `390x844` panel bottom gap | `27px` |
| `390x844` balance delta | `4px` |
| Text overflow | `0` |
| Out-of-bounds | `0` |
| Browser errors | `0` |

Re-verification after the hotfix:

| Gate | Result |
|---|---|
| `npm run build` | Pass |
| `factory:visual-layout-qa --port 4201` | Pass across `390x844`, `430x932`, `1080x1920` |
