# Market Panic Scenario

## Concept

`Market Panic` is a mobile portrait arcade strategy game about surviving a panic market close.
The player is not a full brokerage simulator user. The player is a crisis trader who must read
short news shocks, watch three to four volatile stocks, and choose `BUY`, `SELL`, `HEDGE`, or
`CASH` before risk, confidence, or portfolio value collapses.

Core promise:

```text
News tempts the player.
Charts shake the player.
Risk punishes greed.
Confidence punishes fear.
```

## Core Loop

1. A market event card appears.
2. Stock cards update direction, volatility, and sentiment.
3. The player selects one ticker and one action.
4. The portfolio, return, risk, confidence, and panic level update.
5. Stage goals check at the closing bell.

## Core Inputs

| Input | Purpose |
|---|---|
| Tap stock card | Select the ticker to act on |
| `BUY` | Gain more on bullish/positive signals, lose more on crashes |
| `SELL` | Reduce exposure and risk, but miss rebounds |
| `HEDGE` | Reduce downside and panic growth at a cost |
| `CASH` | Stabilize confidence and risk, but slows return growth |

## Player State

| State | Meaning | Failure risk |
|---|---|---|
| Portfolio | Current capital index, starts at `100` | Below stage floor causes `MARGIN CALL` |
| Return | Percent gain/loss from start | Must hit stage target |
| Risk | Exposure and panic pressure | `100` causes `CIRCUIT BREAKER` |
| Confidence | Investor trust | `0` causes `INVESTOR RUN` |
| Panic Level | Difficulty pressure | Raises volatility and event speed |

## Stage Summary

| Stage | Name | Duration | Tickers | Win target | Hard failure |
|---|---:|---:|---:|---|---|
| 1 | Opening Bell | 45s | 2 | Return >= `+5%`, Risk < `80`, Confidence >= `35` | Portfolio < `70`, Risk `100`, Confidence `0` |
| 2 | Earnings Storm | 60s | 3 | Return >= `+10%`, Risk < `75`, at least one good hedge | Portfolio < `65`, Risk `100`, three same-ticker wrong calls |
| 3 | Rumor Spiral | 75s | 4 | Return >= `+15%`, Risk < `70`, fake signal hits <= 2 | Portfolio < `60`, Risk `100`, Confidence `0`, fake signal hits >= 3 |
| 4 | Circuit Breaker | 90s | 4 + index | Return >= `+20%` or Portfolio >= `120`, Risk < `85`, Confidence >= `25` | Portfolio < `55`, Risk `100`, Confidence `0` |

## Stage 1 - Opening Bell

The opening bell is readable and forgiving. The goal is to teach that each action has a tradeoff.

Tickers:

- `NOVA AI`: growth stock, strong upside, moderate risk.
- `GREEN VOLT`: energy stock, slower but more stable.

Event examples:

- `NOVA AI signs a cloud infrastructure deal`
- `GREEN VOLT input costs fall`
- `Rates steady; growth stocks recover`

Stage end:

- Win if the player survives 45 seconds and satisfies target metrics.
- Fail immediately on `MARGIN CALL`, `CIRCUIT BREAKER`, or `INVESTOR RUN`.

## Stage 2 - Earnings Storm

Earnings make signals mixed. A good decision may still increase risk, so the player must learn
when to hedge instead of pressing buy.

Tickers:

- `NOVA AI`
- `BIOZEN`
- `IRON GRID`

Event examples:

- `BIOZEN trial readout pending`
- `NOVA AI beats revenue but raises spending`
- `IRON GRID wins infrastructure bid`
- `Analysts trim next-quarter guidance`

Extra rule:

- At least one `HEDGE` must reduce damage from a bearish or high-volatility event.

## Stage 3 - Rumor Spiral

Rumors and real news mix. The player must stop reacting to every card.

Tickers:

- `NOVA AI`
- `BIOZEN`
- `CRYPTOBANK`
- `SAFEFOOD`

Event examples:

- `CRYPTOBANK liquidity rumor spreads`
- `BIOZEN approval headline has unclear source`
- `SAFEFOOD draws defensive inflows`
- `NOVA AI insider-sale rumor hits tape`

Extra rules:

- Some event cards are `Fake Signal`.
- A strong reaction to fake bullish or bearish signals damages confidence.
- `CASH` can slow panic growth when the board is noisy.

## Stage 4 - Circuit Breaker

The final stage is a market-collapse boss round. Panic pressure rises quickly, the market index
affects every ticker, and the last 15 seconds accelerate.

Tickers:

- `NOVA AI`
- `BIOZEN`
- `CRYPTOBANK`
- `SAFEFOOD`
- `MARKET INDEX`

Event examples:

- `Exchange warns volatility controls may trigger`
- `Rate shock reprices the market`
- `Institutions accelerate selling`
- `Emergency stabilization package rumored`
- `Panic selling hits the tape`

Terminal states:

- `MARKET SAVED`: stage 4 win.
- `MASTER TRADER`: stage 4 win with Risk <= `50` and Return >= `+25%`.
- `CIRCUIT BREAKER`: Risk reaches `100`.
- `MARGIN CALL`: Portfolio falls below the stage floor.
- `INVESTOR RUN`: Confidence reaches `0`.

## Difficulty Progression

| Axis | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---:|---:|---:|---:|
| Ticker count | 2 | 3 | 4 | 4 + index |
| Event speed | Slow | Medium | Fast | Very fast |
| Volatility | Low | Medium | High | Extreme |
| Fake signals | None | Rare | Common | Medium |
| Risk tolerance | Wide | Medium | Narrow | Very narrow |
| Decision time | Relaxed | Moderate | Tight | Very tight |

Difficulty must be monotonic. It may use elapsed time, stage index, resolved event count, and
panic level. It must not decrease simply because the player earned more portfolio value.

## Production Demo Scope

The first production demo includes:

- Four stages with different backgrounds and market moods.
- Four action buttons and selectable stock cards.
- News/event deck with bullish, bearish, fake, and systemic events.
- Portfolio, return, risk, confidence, panic, and timer HUD.
- Win and fail terminal states.
- Browser-captured QA evidence for Home, Game, Pause, GameOver, stage transitions, and terminal states.

Out of scope for the first demo:

- Real market data.
- Real financial advice.
- Brokerage mechanics, options, short selling, leverage, or order book simulation.
- Backend accounts, multiplayer, rankings, or ads.
