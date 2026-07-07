# 01 - Game Design Document: Market Panic

## Pitch

`Market Panic` is a mobile portrait arcade strategy game. The player is a crisis trader
who must survive a panic market close by reading short news shocks, selecting a ticker,
and choosing `BUY`, `SELL`, `HEDGE`, or `CASH` before portfolio value, risk, or investor
confidence collapses.

This is not a real trading terminal and not financial advice. The fantasy is fast,
readable pressure: news tempts the player, charts shake the player, risk punishes greed,
and confidence punishes fear.

## Core Loop

1. A market event appears in the news panel.
2. Stock cards update price and trend.
3. The player taps a ticker card to focus it.
4. The player taps one action: `BUY`, `SELL`, `HEDGE`, or `CASH`.
5. Portfolio, return, risk, confidence, panic level, score, and stage status update.
6. The closing bell checks stage targets or triggers a terminal state.

## Controls

| Input | Effect |
|---|---|
| Tap stock card | Select the ticker to act on |
| Tap `BUY` | Press bullish or recovery signals for upside, but increase risk |
| Tap `SELL` | Cut exposure on bearish signals, but miss rebounds |
| Tap `HEDGE` | Reduce downside and risk at a cost |
| Tap `CASH` | Wait out noisy/fake/systemic signals and stabilize confidence |
| Pause button | Opens pause overlay with Resume/Home |

## Player State

| Metric | Starts | Role |
|---|---:|---|
| Portfolio | `100` | Capital index. A stage-specific floor causes `MARGIN CALL`. |
| Return | `0%` | Stage win target. |
| Risk | `28` | Market exposure. `100` causes `CIRCUIT BREAKER`. |
| Confidence | `72` | Investor trust. `0` causes `INVESTOR RUN`. |
| Panic Level | derived | Increases event pressure and volatility. |

## Stages

| Stage | Duration | Active tickers | Win target | Failure pressure |
|---|---:|---|---|---|
| Opening Bell | 45s | NOVA, VOLT | Return >= `+5%`, Risk < `80`, Confidence >= `35` | Portfolio < `70` |
| Earnings Storm | 60s | NOVA, BIOZ, GRID | Return >= `+10%`, Risk < `75`, at least one good hedge | Portfolio < `65`, wrong-call streak |
| Rumor Spiral | 75s | NOVA, BIOZ, CBNK, SAFE | Return >= `+15%`, Risk < `70`, fake signal hits <= 2 | Portfolio < `60`, fake signal traps |
| Circuit Breaker | 90s | NOVA, BIOZ, CBNK, SAFE + market index events | Return >= `+20%` or Portfolio >= `120`, Risk < `85`, Confidence >= `25` | Portfolio < `55`, Risk `100`, Confidence `0` |

## Terminal States

| Terminal | Type | Trigger |
|---|---|---|
| `MARKET SAVED` | Win | Stage 4 close meets targets |
| `MASTER TRADER` | Win+ | Stage 4 close with Return >= `+25%` and Risk <= `50` |
| `CIRCUIT BREAKER` | Fail | Risk reaches `100` |
| `MARGIN CALL` | Fail | Portfolio breaches the stage floor |
| `INVESTOR RUN` | Fail | Confidence reaches `0` |
| `TARGET MISSED` | Fail | Closing bell reached without stage targets |
| `RUMOR TRAP` | Fail | Too many fake-signal mistakes |

## 30-Second Experience

The first 30 seconds show the full game grammar: the player sees a bullish headline,
taps the relevant ticker, chooses `BUY`, gains portfolio value, then sees risk rise.
The next headline creates a tradeoff where `HEDGE` or `CASH` is safer than another buy.
The fun is not perfect prediction; it is fast risk judgment under noisy signals.

## 1-Minute Easy State

By the end of Stage 1 the player has seen two tickers, clear bullish/bearish event cards,
safe action feedback, and a closing-bell target. The game should feel learnable with one
thumb and no external finance knowledge.

## 5-Minute Chaos State

Later runs reach Stage 4, where systemic news affects all tickers, event cadence accelerates,
and Risk/Confidence create a tense double constraint. The last 15 seconds of Circuit Breaker
feel like a boss round: pressing `BUY` can still win, but one greedy click can end the market.

## Production Demo Scope

Included:

- Four-stage scenario with explicit goals, rewards, and terminal states.
- Stock cards, news panel, metric HUD, action buttons, pause, retry, and home.
- Production-demo imagegen assets: 4 backgrounds, trader mascot, market shock asset, alpha signal, UI buttons, FX.
- Audio hooks for start, good call, bad call, game over, and looping gameplay music.
- Browser QA evidence for Loading, Home, Game, Pause, and GameOver.

Out of scope:

- Real stock prices or financial advice.
- Order book, leverage, options, shorting, broker accounts, backend, multiplayer, ads, or IAP.
