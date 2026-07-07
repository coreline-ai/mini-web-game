# Market Panic

Mobile portrait arcade strategy game generated through `game-factory`.

## Concept

Read breaking market news, pick a ticker, and choose `BUY`, `SELL`, `HEDGE`, or `CASH`
before portfolio value, risk, or investor confidence collapses.

## Run

```bash
npm install
npm run dev
npm run build
```

## Game Loop

- Stock cards represent active stage tickers.
- News cards create bullish, bearish, fake, or systemic shocks.
- Action buttons update portfolio, return, risk, confidence, panic, and score.
- Stages end at the closing bell.
- Terminals include `MARKET SAVED`, `MASTER TRADER`, `CIRCUIT BREAKER`, `MARGIN CALL`,
  `INVESTOR RUN`, `TARGET MISSED`, and `RUMOR TRAP`.

## Key Files

| Path | Purpose |
|---|---|
| `src/game/config/marketConfig.js` | Tickers, action metadata, event deck |
| `src/game/systems/MarketEngine.js` | Market state and stage rules |
| `src/game/scenes/GameScene.js` | Main custom gameplay UI |
| `docs/01-GDD.md` | Game design |
| `docs/02-TECH-DESIGN.md` | Runtime design |
| `docs/04-QA-PLAN.md` | QA gates and custom assertions |

## Production Assets

The generated game contains per-game imagegen assets under `assets/**` and a production
manifest at `assets/asset-manifest.json`.

Excluded by design: real market data, investment advice, backend accounts, ads/IAP,
multiplayer, native packaging, and live brokerage simulation.
