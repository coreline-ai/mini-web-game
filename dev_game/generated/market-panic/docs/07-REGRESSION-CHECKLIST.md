# 07 - Regression Checklist: Market Panic

Run this checklist first during future `game-polish` passes.

## Required Commands

```bash
node dev_game/generator/src/cli.mjs --validate-only \
  --spec dev_game/generator/examples/market-panic.spec.json

cd dev_game/generated/market-panic
npm run build

npm --prefix dev_game run factory:production-gate -- \
  --project dev_game/generated/market-panic \
  --require-gpt-imagegen \
  --viewports 390x844,430x932,1080x1920
```

## Capture Repro

Viewport:

```text
390x844, mobile emulation, deviceScaleFactor=2
```

Capture sequence:

1. Load with `?qaHoldLoading=1`.
2. Capture Loading.
3. Release to Home.
4. Capture Home and verify the trader mascot appears, not a produce-market mascot.
5. Tap Play.
6. Capture active Game.
7. Tap `매수` (`BUY` action id).
8. Verify portfolio, return, risk, or confidence changes.
9. Wait for a moving gameplay frame and verify screenshot/state changes.
10. Force Stage 1 close with passing metrics and verify Stage 2 stock cards rebuild without exception.
11. Tap Pause and verify `계속하기`/`홈으로` overlay.
12. Resume to Game.
13. Force risk to `100` and verify `서킷 브레이커` GameOver.

## Fixed Defects To Re-Test

| ID | Defect | Re-test |
|---|---|---|
| MP-R001 | Stage transition crash from destroying stock-card record objects. | Force Stage 1 completion and confirm Stage 2 renders `NOVA`, `BIOZ`, and `GRID` without console/page errors. |
| MP-R002 | Pause icon overlapped HUD timer/return text. | Capture Game at `390x844`; pause icon must not cover `timeLeft`, `자산`, or `수익`. |
| MP-R003 | News panel panic text was too close to the bottom border. | Capture Game at `390x844`; `공포` and `루머 실수` text must remain inside the news panel. |
| MP-R004 | Home mascot looked like a produce-market character. | Capture Home; mascot must wear trader/business clothing and hold a chart tablet. |
| MP-R005 | Market shock hazard had weak alpha coverage and detached lightning parts. | Run `factory:image-quality-qa`; hazard must pass crop-edge and alpha coverage checks. |
| MP-R006 | Player did not know what to do from the first screens. | Capture Home and Game at `390x844`; Home must show the stock/action rule block and Game must show the stage target strip. |
| MP-R007 | Production sweep must stay clean after polish. | Run the full sweep: triple Play, pause/resume x10, triple Retry, Home -> Game -> Home x3, persistence reload, corrupted storage boot, visibility auto-pause, 2-minute run, and 5 retries. |
| MP-R008 | Korean playability hotfix regressed into English/ambiguous passive screen. | Capture Loading, Home, Game, action feedback, Pause, and GameOver; all play-critical visible text must be Korean, Game must show news target, hint/countdown, selected stock, and metric deltas after action. |
| MP-R009 | HQ screen refresh regressed into low-fidelity background or flat prototype UI. | Run `factory:hq-screen-quality-qa`, capture Loading/Home/Game/Pause/GameOver, and verify all HQ texture keys are present with no layout overlap across `390x844`, `430x932`, and `1080x1920`. |
| MP-R010 | Top HUD text became blurry or buttons reverted to translucent/glossy surfaces. | Capture Home, Game, action feedback, and Pause at DPR2 `390x844`; DOM HUD must exist/display in Game, top text must be legible, and solid button textures must exist for Home/action/pause controls. |
| MP-R011 | UI ownership regressed into mixed DOM/canvas text or low-resolution button textures. | Capture Home, Game, action feedback, Pause, and GameOver across `390x844`, `430x932`, and `1080x1920`; HUD/news/goal/cards/actions/home/pause/gameover text and buttons must be DOM/CSS with `textOverflow=0` and `outOfBounds=0`. |
| MP-R012 | Home layout or action-button Korean readability regressed. | Capture Home and Game at DPR2 `390x844`; Home mascot must not be hidden by the rules panel, `게임 시작`/`소리 켬` must be inside the panel, four action buttons must show readable Korean labels/subtitles, and `factory:visual-layout-qa --port <free-port>` must click Play into Game. |
| MP-R013 | Market decision loop regressed into direct-answer hints or repeated same-news actions. | Capture Game at DPR2 `390x844`; hint must not contain direct action labels (`매수/매도/헤지/현금`), one action must disable all four action buttons, a second click in the same news must not change portfolio, and the next news must re-enable the buttons. |
| MP-R014 | News deck or signal lens regressed into shallow/direct-answer scenario flow. | Run the news-count check; every real stock ticker must have `>=30` news cases and market-wide events should stay `>=30`. Capture initial and next-news Game states; kicker/hint must not expose direct labels (`호재/악재/가짜뉴스/루머/매수/매도/헤지/현금`), the next ticker must not auto-select itself, long headlines must stay inside the news card, and `factory:visual-layout-qa --port <free-port>` must pass. |
| MP-R015 | Home subtitle under `마켓 패닉` regressed into low-contrast unreadable text. | Capture Home at `390x844`, `430x932`, and `1080x1920`; the subtitle must sit on a dark contrast plate, remain below the title without overlap, avoid the mascot/panel, show `subtitleOverflow=false`, and pass `factory:visual-layout-qa --port <free-port>`. |
| MP-R016 | Action help menu regressed or no longer explains the four lower buttons. | Capture Home and Pause at `390x844`, `430x932`, and `1080x1920`; `? 도움말` must open a modal from both scenes, the modal must include `매수`, `매도`, `헤지`, and `현금`, close cleanly with `확인`, report `overflow=0` and `outOfBounds=0`, and `factory:visual-layout-qa --port <free-port>` must pass. |
| MP-R017 | Home explanation panel spacing regressed with the rules list floating too low or bottom controls crowded. | Capture Home at `390x844`, `430x932`, and `1080x1920`; rules should sit closer to the panel top while preserving bottom balance, `390x844` top/bottom panel gaps should stay within roughly `10px`, and `overflow=0`, `outOfBounds=0`, plus `factory:visual-layout-qa --port <free-port>` must pass. |

## Market-Specific Assertions

- `BUY` on `ai-contract` changes portfolio from `100.0` to a higher value and raises risk.
- `HEDGE` can count toward `goodHedges` on bearish/high-volatility events.
- Fake-signal bad reactions increment `fakeHits`.
- `risk >= 100` triggers `서킷 브레이커`.
- `confidence <= 0` triggers `투자심리 붕괴`.
- Portfolio below the stage floor triggers `마진콜`.
- Stage close with insufficient targets triggers `목표 미달`.
- Stage 4 passing close reaches `시장 생존` or `마스터 트레이더`.

## Production Sweep Assertions

- `browserErrors`, `pageErrors`, and failed responses stay at `0`.
- `activeBgmInstancesMax <= 1`.
- Triple-tapping Play or Retry does not create duplicate active scenes.
- Pause/resume repeated 10 times returns to one active Game scene.
- Best score and mute settings survive reload.
- Corrupted settings JSON boots back to Home.
- Visibility change launches Pause without a large timer delta.
- Two-minute long-run plus 5 retries does not show monotonic timer/tween/display-list growth.

## Visual Checklist

- Loading, Home, Game, Pause, and GameOver expose layout bounds through
  `window.__GAME_LAYOUT_BOUNDS__`.
- HUD, news panel, stock cards, and action buttons do not overlap across
  `390x844`, `430x932`, and `1080x1920`.
- Home first screen exposes the Korean core rule: news -> stock card -> action.
- Game first screen exposes Korean stage target, risk ceiling, confidence floor, current news target, event-specific hint, and next-news countdown.
- Top HUD text is rendered by the crisp DOM overlay in Game and does not look blurred in DPR2 captures.
- Action feedback shows the selected ticker/action and `자산`, `위험`, `신뢰` deltas.
- Game HUD, news panel, goal strip, stock cards, action buttons, Home controls, Pause controls, and GameOver controls share a DOM/CSS ownership model rather than mixed canvas text and button textures.
- HQ visual refresh remains active: stage backgrounds load from `1080x1920` WebP assets, foreground gameplay/FX load from WebP assets, game panels/cards/action buttons use HQ UI textures, `factory:hq-screen-quality-qa` checks at least `22` HQ assets, and `MARKET_EVENTS` contains at least `56` unique Korean headlines.
- Buttons use opaque solid surfaces; no gray translucent gloss strip is visible on Home, Game, Pause, or GameOver controls.
- Background art never covers stock cards, buttons, HUD, or terminal metrics.
- Pause and GameOver overlays dim gameplay and remain above all gameplay UI.
- Button text stays inside buttons and does not resize the layout.
- Generated sprites have transparent corners and no visible chroma fringe.
- No debug rectangles or placeholder-only SVG runtime assets are visible.
