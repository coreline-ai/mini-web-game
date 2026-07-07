# Market Panic QA Evidence - 2026-07-06

## Summary

`Market Panic` is a production-demo mobile portrait arcade strategy game built with the
`game-factory` workflow. It uses a custom stock-market decision loop instead of the
Foundation falling-object gameplay.

Generated project:

```text
dev_game/generated/market-panic
```

Tracked planning/spec artifacts:

```text
dev_game/docs/market-panic-scenario.md
dev_game/generator/examples/market-panic.spec.json
```

Generated-project docs:

```text
dev_game/generated/market-panic/docs/01-GDD.md
dev_game/generated/market-panic/docs/02-TECH-DESIGN.md
dev_game/generated/market-panic/docs/03-ASSET-AUDIO-PLAN.md
dev_game/generated/market-panic/docs/04-QA-PLAN.md
dev_game/generated/market-panic/docs/05-ADVERSARIAL-REVIEW.md
dev_game/generated/market-panic/docs/06-FINAL-QA-SUMMARY.md
dev_game/generated/market-panic/docs/07-REGRESSION-CHECKLIST.md
```

## Capture Evidence

Final capture folder:

```text
dev_game/generated/market-panic/qa-captures/final-2026-07-06
```

Captured states:

- Loading: `screenshots/01-loading.png`
- Home: `screenshots/02-home.png`
- Game initial: `screenshots/03-game-initial.png`
- Game after `BUY`: `screenshots/04-game-after-buy.png`
- Moving gameplay frame: `screenshots/05-game-motion-frame.png`
- Stage advance: `screenshots/06-stage-advance.png`
- Pause: `screenshots/07-pause.png`
- Resumed Game: `screenshots/08-resumed-game.png`
- GameOver: `screenshots/09-gameover-circuit-breaker.png`
- State samples: `state-samples.json`

Important sampled assertions:

| Assertion | Result |
|---|---|
| `BUY` changes market state | Pass |
| Gameplay frame changes over time | Pass |
| Market state ticks during motion | Pass |
| Stage 1 advances to Stage 2 | Pass |
| Pause overlay appears and resumes | Pass |
| GameOver terminal is reachable | Pass |
| Console/page/network errors | `0` |

Sample `BUY` result:

```text
portfolio 100.0 -> 103.9
return 0.0% -> 3.9%
risk 28.6 -> 31.6
confidence 71.9 -> 75.3
```

## Post-Capture Fixes

- Fixed Stage 2 transition crash by destroying Phaser stock-card containers correctly.
- Repositioned HUD timer/return text and reduced pause icon size to remove overlap.
- Raised panic text inside the news panel.
- Replaced produce-market-looking mascot with a stock-trader mascot generated through
  the `imagegen` skill and repacked as the runtime `player.png`.
- Postprocessed the market-shock hazard asset to satisfy alpha coverage and crop-edge QA.
- Added a Home rule block and an in-game target strip after the user reported that the
  first screens did not make the play method clear.

Instruction clarity polish evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/before
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-instructions/after
```

Full production polish sweep evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-full-sweep/baseline
```

The full sweep passed:

- Regression checklist MP-R001 through MP-R006.
- Triple Play, pause/resume x10, and triple Retry input hostility checks.
- Home -> Game -> Home audio cycle x3 with max BGM instances `1`.
- Best score and mute persistence reload checks.
- Corrupted settings JSON boot recovery.
- Visibility auto-pause without large timer delta.
- 2-minute long-run plus 5 retries.

Machine assert summary:

```text
browserErrors=0
pageErrors=0
failedResponses=0
duplicateVisibleEntities=0
lingeringTransientGraphics=0
activeBgmInstancesMax=1
sceneStackDuplicateSamples=0
longRunSamples=14
longRun maxDisplay=36 maxTimers=0 maxTweens=0 minFps=59.52
```

## Korean Playability Hotfix

User-reported symptom:

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

Runtime fixes applied:

- Korean-localized Loading, Home, HUD, News, Goal, Stock status, Action buttons,
  Feedback, Pause, GameOver, browser title, and game title.
- Added action symbols and labels: `▲ 매수`, `▼ 매도`, `◆ 헤지`, `● 현금`.
- Added event-specific hint and next-news countdown in the Game scene.
- Added stock-card status badges for `뉴스`, `선택됨`, and `뉴스·선택`.
- Added action-result metric deltas for `자산`, `위험`, and `신뢰`.

Before/after evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/before
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/after
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-korean-playability/regression
```

Machine assert summary from the Korean playability regression sweep:

```text
browserErrors=0
pageErrors=0
failedResponses=0
duplicateVisibleEntities=0
lingeringTransientGraphics=0
staleResultStamps=0
activeBgmInstancesMax=0
sceneStackDuplicateSamples=0
longRunSamples=16
longRun maxDisplay=36 maxTimers=0 maxTweens=0
persistenceBest=777
corruptedSettingsScene=Home
visibilityAutoPauseScenes=Pause
```

## HQ Screen Asset Refresh

User-reported symptom:

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

Parallel-agent work:

- HQ Asset QA agent completed a read-only audit and produced stricter acceptance
  criteria for full-screen visual quality.
- News data agent expanded `MARKET_EVENTS` from `13` to `59` Korean events across
  all tickers, with `14` rumor/fake events.

Runtime fixes applied:

- Replaced stage backgrounds with four high-quality `1080x1920` WebP assets generated
  through the `imagegen` skill and preserved sources under
  `qa-captures/asset-sources/hq-refresh-2026-07-06`.
- Added HQ UI assets for menu panel, modal panel, HUD panel, news panel, goal strip,
  stock-card states, and all four action button backgrounds.
- Converted foreground gameplay images to HQ WebP runtime assets for player, hazard,
  collectible, hit FX, and collect FX.
- Rewired Loading, Home, Game, Pause, and GameOver to use the HQ assets.
- Added `factory:hq-screen-quality-qa` for HQ assets plus market-news quotas.

Before/after evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/before
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/after
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/regression
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-hq-refresh/final
```

HQ QA and regression summary:

```text
hqAssetsChecked=22
stageBackgrounds=4x1080x1920 WebP
foregroundAndFx=player/hazard/collectible/fx WebP
marketNewsEvents=59
rumorOrFakeEvents=14
finalTextureKeysVerified=23
browserErrors=0
pageErrors=0
failedResponses=0
sceneStackDuplicateSamples=0
longRunSamples=16
longRun maxDisplay=35 maxTimers=0 maxTweens=0
```

## Gate Results

Passing checks run after the post-capture fixes, Korean playability hotfix, and HQ
asset refresh:

```text
node dev_game/generator/src/cli.mjs --validate-only --spec dev_game/generator/examples/market-panic.spec.json
npm run build
npm --prefix dev_game run factory:hq-screen-quality-qa -- --project dev_game/generated/market-panic
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/market-panic --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/market-panic
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/market-panic --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/market-panic --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
```

## News Deck Expansion and Signal Lens

User-reported symptom:

```text
다양한 뉴스가 나오게 경우수를 최소 종목당 30개 이상으로 만들고!
힌트가 너무 직관적이야 누가 봐도 호재 ? 매수 악재 매도! 루머? 안좋아 위험축소 ?좋아 알수 있잖아
좀더 시나리오를 탄탄하게 다듬어봐
```

Runtime fixes applied:

- Expanded the market event deck to `295` unique Korean headlines.
- Verified per-stock counts: `NOVA 46`, `VOLT 43`, `BIOZ 44`, `GRID 42`,
  `SAFE 44`, `CBNK 44`; market-wide events: `32`.
- Replaced visible direct-answer signal labels with source/scope, volatility,
  horizon, and verification labels.
- Reworked early scenario copy into mixed signals and changed sequencing so the
  player must choose the ticker instead of following an auto-selected news card.
- Hid crowded news meta text and allowed three headline lines inside the news card.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/news-depth-report.json
```

Machine assert summary:

```text
uniqueHeadlines=295
stockCounts=NOVA:46,VOLT:43,BIOZ:44,GRID:42,SAFE:44,CBNK:44
marketWide=32
directActionLeakInSignal=false
selectedAutoFollowsNews=false
newsHeadlineInsidePanel=true
textOverflow=0
browserErrors=0
```

Re-run gates:

```text
npm run build
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --port 4198 --viewports 390x844,430x932,1080x1920
```

## Home Subtitle Legibility

User-reported symptom:

```text
처음 실행 화면 상단 텍스트 마켓패닉 및에 텍스트 가독성이 떨어져 안보여!
```

Runtime fixes applied:

- Added a dark high-contrast plate behind the Home subtitle under `마켓 패닉`.
- Increased text weight and adjusted vertical placement to separate it from the title,
  mascot, and bright background highlights.

Evidence:

```text
Before:
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-news-depth/after-pass-4/390x844-home.png

After:
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-subtitle-legibility/after-pass-1
```

Machine assert summary:

```text
subtitleOverflow=false
browserErrors=0
titleSubtitleGap390=20px
subtitlePanelGap390=136px
```

Re-run gates:

```text
npm run build
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --port 4199 --viewports 390x844,430x932,1080x1920
```

## Action Help Menu

User-reported symptom:

```text
하단 4개 버튼 역할을 알려줘!
위 내용을 도움말 항목을 만들어서 넣어주는 메뉴를 하나 만들어줘! 대안 제시 해줘
```

Runtime fixes applied:

- Added a reusable DOM help overlay for action-button explanations.
- Added `? 도움말` to Home and Pause so players can read it before starting or during
  a paused run.
- Help content explains the four lower action buttons: `매수`, `매도`, `헤지`, `현금`.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-help-menu/after-pass-1
```

Machine assert summary:

```text
homeHelpVisible=true
pauseHelpVisible=true
homeHelpHasRoles=true
homeOverflow=0
homeOutOfBounds=0
pauseOverflow=0
pauseOutOfBounds=0
browserErrors=0
```

Re-run gates:

```text
npm run build
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --port 4200 --viewports 390x844,430x932,1080x1920
```

## Home Panel Text Balance

User-reported symptom:

```text
최초 홈 화면 설명 뷰 안에 텍스트 상단 에 더 붙여줘 상하단 벨런스 유지 해줘
```

Runtime fixes applied:

- Moved the Home rules list upward inside the explanation panel.
- Slightly adjusted the goal, score, Play, Help, and Sound control positions to keep
  top and bottom whitespace balanced.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-home-panel-balance/after-pass-1
```

Machine assert summary:

```text
panelTopGap390=31px
panelBottomGap390=27px
panelBalanceDelta390=4px
overflow=0
outOfBounds=0
browserErrors=0
```

Re-run gates:

```text
npm run build
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --port 4201 --viewports 390x844,430x932,1080x1920
```

## Decision Lock and Scenario Clarity Hotfix

User-reported symptom:

```text
매수 매도 라고 사인을 주고 그냥 그대로 누르면 되는 시나리오인거야? 따라하기 껨이야?
그리고 한번에 버튼 한번 누르게 해야 되는데 계속 연속 누를수 있는건 왜 그래?
게임 시나리오를 모르겠어 완전히
```

Runtime fixes applied:

- Replaced direct-answer hints such as `호재: 매수` with non-prescriptive context labels
  such as `호재성`, `악재성`, `루머 판단`, and `출처 의심`.
- Reframed the scenario as `뉴스당 1회 결정`: read news, choose a stock, and commit one
  action per news event.
- Added engine-level same-news decision locking so a second click cannot apply another
  portfolio/risk/confidence delta.
- Disabled all four action buttons after a decision and re-enabled them when the next
  news event arrives.

Evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/before
dev_game/generated/market-panic/qa-captures/polish-2026-07-07-decision-lock/after-pass-1
```

Machine assert summary:

```text
directAnswerHint=false
buttonsDisabledAfterFirstAction=true
repeatedActionApplied=false
sameDecisionAfterSecondClick=true
buttonsUnlockedOnNextNews=true
textOverflowCount=0
browserErrors=0
```

Re-run gates:

```text
npm run build
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --port 4197 --viewports 390x844,430x932,1080x1920
```

The final combined `factory:production-gate` run completed successfully with the HQ
WebP asset refresh applied.

## Preservation Note

`dev_game/generated/**` is ignored by git in this repo. This file is the durable tracked
summary. Force-add or otherwise preserve `dev_game/generated/market-panic/**` if the
generated game itself must be committed.

## Text/Button Clarity Hotfix

User-reported symptom:

```text
게임 실행 화면의 상단 텍스트가 너무 흐려 보여
버튼이 모두 이상해 투명 효과야 뭐야?
```

Classification:

```text
Class L - Asset fidelity violation
Class C - UI/gameplay visual ambiguity
Severity 3 - visual legibility and button affordance blocker
```

Runtime fixes applied:

- Moved the top HUD labels and bars to a browser-rendered Korean DOM overlay so the
  important status text renders crisply on DPR2 mobile captures.
- Replaced translucent/glossy button image surfaces with opaque runtime-generated
  solid button textures for Home, Pause, GameOver, and all four action buttons.
- Increased HUD contrast, stroke, font size, and removed the confusing button shine.

Before/after evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/before
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-text-button-clarity/after
```

Machine assert summary:

```text
domHudExists=true
domHudDisplay=block
solidButtonTextures=7/7
browserErrors=0
pageErrors=0
failedResponses=0
```

Re-run gates:

```text
npm run build
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/market-panic --require-gpt-imagegen
npm --prefix dev_game run factory:hq-screen-quality-qa -- --project dev_game/generated/market-panic
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/market-panic
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/market-panic --viewports 390x844,430x932,1080x1920
```

## Full DOM UI Overhaul

User-reported symptom:

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

Parallel-agent conclusion:

- The previous pass only moved part of the HUD to DOM. News, goal, stock cards,
  action buttons, Home/Pause/GameOver buttons, and most Korean labels still used
  canvas text or low-resolution generated button textures.
- The fix needed consistent UI ownership: key reading and input surfaces should be
  `dom-css`, while Phaser keeps the background, engine, audio, and scene flow.

Runtime fixes applied:

- Added a full `DomGameUI` overlay for Game HUD, news, goal, stock cards, feedback,
  pause button, and all four action buttons.
- Added a shared `DomSceneUI` overlay for Home, Pause, and GameOver text/buttons.
- Removed the visible generated `solid_*` button-texture path from player-facing
  controls; buttons are now browser-rendered CSS controls.
- Preserved Phaser for full-screen backgrounds, trader image, scene transitions,
  audio, and market engine state.

Before/after evidence:

```text
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/before
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/after-full-dom
dev_game/generated/market-panic/qa-captures/polish-2026-07-06-dom-ui-overhaul/regression
```

Machine assert summary:

```text
uiOwnership=dom-css for HUD/news/goal/cards/actions/home/pause/gameover text and buttons
viewports=390x844,430x932,1080x1920
textOverflow=0
outOfBounds=0
browserErrors=0
pageErrors=0
failedResponses=0
```

Re-run gates:

```text
npm run build
npm --prefix dev_game run factory:hq-screen-quality-qa -- --project dev_game/generated/market-panic
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/market-panic --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/market-panic
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/market-panic --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/market-panic --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/market-panic --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
```
