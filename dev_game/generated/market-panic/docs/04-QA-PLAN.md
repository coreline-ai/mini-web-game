# 04 - QA Plan: Market Panic

## Automated Gates

Run from the repo root:

```bash
node dev_game/generator/src/cli.mjs --validate-only \
  --spec dev_game/generator/examples/market-panic.spec.json

cd dev_game/generated/market-panic
npm run build

npm --prefix dev_game run factory:production-demo-qa -- \
  --project dev_game/generated/market-panic --require-gpt-imagegen

npm --prefix dev_game run factory:image-quality-qa -- \
  --project dev_game/generated/market-panic

npm --prefix dev_game run factory:visual-layout-qa -- \
  --project dev_game/generated/market-panic \
  --viewports 390x844,430x932,1080x1920

npm --prefix dev_game run factory:scene-composite-qa -- \
  --project dev_game/generated/market-panic \
  --viewports 390x844,430x932,1080x1920

npm --prefix dev_game run factory:production-gate -- \
  --project dev_game/generated/market-panic \
  --require-gpt-imagegen \
  --viewports 390x844,430x932,1080x1920
```

## Browser Smoke

Required browser assertions:

- Page title is `Market Panic`.
- Loading reaches Home without console/page errors.
- Play enters Game.
- `action-buy`, `action-sell`, `action-hedge`, and `action-cash` are visible layout items.
- Tapping an action changes at least one of portfolio, risk, or confidence.
- Pause opens and resumes.
- GameOver can display a terminal title and retry/home controls.

## Captured-State Matrix

| State | Evidence |
|---|---|
| Loading | scene-composite screenshot and layout JSON |
| Home | title, mascot, Play, Sound |
| Game | HUD, news panel, stock cards, action buttons |
| Pause | overlay blocks game input |
| GameOver | terminal title, metrics, Retry/Home |
| Stage advance | state sample reaches Stage 2+ |
| Terminal | sampled fail or win terminal |

## Market-Specific Assertions

- Difficulty is monotonic: stage index, elapsed time, and panic pressure increase challenge.
- Return target and portfolio floor are stage data, not hardcoded loose values.
- Fake signal mistakes increment `fakeHits`.
- Risk `100` reaches `CIRCUIT BREAKER`.
- Confidence `0` reaches `INVESTOR RUN`.
- Portfolio below floor reaches `MARGIN CALL`.
- Stage 4 close can reach `MARKET SAVED` or `MASTER TRADER`.

## Visual QA

- No stock card overlaps HUD, news panel, or action buttons at 390x844, 430x932, or 1080x1920.
- Text stays inside panels and buttons.
- Backgrounds remain behind UI and do not hide readable metrics.
- Pause icon direction and button state are correct.
- FX bursts do not linger after decision feedback.
- No debug rectangles or unclassified shapes appear in final captures.

## Acceptance

The game is production-demo complete only when build, production-demo QA, image-quality QA,
visual-layout QA, scene-composite QA, custom browser smoke, and final production gate pass.
