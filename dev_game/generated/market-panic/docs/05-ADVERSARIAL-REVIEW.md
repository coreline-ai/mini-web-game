# 05 - Adversarial Review: Market Panic

## Reskin Challenge

This is not a renamed dodge game. The original Foundation falling-object loop was removed
from the active Game scene. Runtime play is now a custom market decision loop:

- selectable ticker cards,
- event/news deck,
- portfolio/risk/confidence simulation,
- `BUY`/`SELL`/`HEDGE`/`CASH` action resolution,
- stage-specific targets,
- win/fail financial terminal states.

If the player can only move a mascot and dodge objects, this review fails. Current runtime
evidence must show action buttons changing market state.

## Dashboard Trap

Risk: the game becomes a static finance dashboard instead of an arcade game.

Mitigation:

- events arrive on a timer,
- action feedback is immediate,
- panic pressure rises,
- stage terminal states provide tension,
- visuals stay large and phone-readable.

## Simulation Trap

Risk: trying to model real markets makes the first version too complex.

Mitigation:

- no real market data,
- no broker/order-book mechanics,
- no financial advice,
- deterministic event deck,
- arcade metrics instead of realistic accounting.

## Difficulty Trap

Risk: a player who earns more portfolio value accidentally makes the game easier.

Mitigation:

- challenge is driven by stage index, elapsed time, event cadence, volatility, and panic level,
- portfolio value is a success metric, not the only difficulty input.

## Visual Ambiguity Trap

Risk: stock UI, event cards, and action buttons overlap or become unreadable on mobile.

Mitigation:

- `window.__GAME_LAYOUT_BOUNDS__` registers HUD, news, stock cards, and action buttons,
- visual-layout QA runs across 390x844, 430x932, and 1080x1920,
- scene-composite QA checks final browser screenshots.

## Production-Demo Evidence Checklist

- [x] Foundation spec validates.
- [x] Custom runtime loop implemented.
- [x] Production imagegen assets generated and isolated per game.
- [x] `production-demo-qa` passes with imagegen provenance.
- [x] `image-quality-qa` passes.
- [x] `visual-layout-qa` passes across target viewports.
- [x] `scene-composite-qa` passes across target viewports.

The game may still receive polish passes, but it is no longer a simple reskin or prompt demo.
