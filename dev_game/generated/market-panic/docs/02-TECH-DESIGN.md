# 02 - Technical Design: Market Panic

## Runtime

- Engine: Phaser 3 + Vite.
- Canvas: native `1080x1920`, portrait, `Scale.FIT`, centered.
- DOM UI uses a centered `390x844` base-composition board transformed into the native FHD world, preserving existing dense market UI spacing without DPR backing-store multiplication.
- Scenes: `Boot -> Loading -> Home -> Game -> Pause -> GameOver`.
- Build decision: `custom-loop`.

The generator Foundation is used only for shell, loading, audio, persistence, and scene
structure. The gameplay loop is custom and owned by `MarketEngine` plus `GameScene`.

## Core Files

| File | Responsibility |
|---|---|
| `src/game/config/marketConfig.js` | Market stages, tickers, action metadata, event deck |
| `src/game/systems/MarketEngine.js` | Portfolio/risk/confidence simulation, stage progression, terminal conditions |
| `src/game/scenes/GameScene.js` | Market engine binding, DOM game UI lifecycle, pause/terminal flow, stage rendering |
| `src/game/ui/DomGameUI.js` | Portfolio/return/risk/confidence/timer HUD, news panel, stock cards, action buttons, feedback |
| `src/game/ui/DomSceneUI.js` | Home/Pause/GameOver DOM screen overlays on the centered FHD board |
| `src/game/scenes/GameOverScene.js` | Win/fail terminal summary and retry/home |
| `src/game/scenes/LoadingScene.js` | Imagegen asset and background loading |

## Data Model

`marketPanic` in `src/game/data/game-spec.json` provides the durable game configuration:

- Initial portfolio/risk/confidence.
- Action list.
- Ticker list with sector and beta.
- Stage list with duration, active tickers, return target, portfolio floor, risk ceiling,
  confidence floor, event interval, volatility, fake-signal budget, and final rush settings.

The runtime never uses a player-replenishable value as the difficulty axis. Difficulty grows
from stage index, elapsed time, event count, volatility, and panic pressure.

## Market Engine

`MarketEngine` owns:

- `portfolio`, `risk`, `confidence`, `score`, `elapsedMs`.
- `stageIndex`, `currentEvent`, `selectedTickerId`.
- ticker prices and short-term trend values.
- fake-signal counters, good-hedge counters, wrong-call streaks.
- immediate terminal checks and closing-bell stage resolution.

Action resolution:

- `BUY` rewards bullish/recovery signals but increases risk.
- `SELL` reduces risk on bearish signals but punishes missed bullish moves.
- `HEDGE` protects against bearish/systemic/high-volatility events at a cost.
- `CASH` stabilizes confidence and punishes overreaction to fake or noisy signals.

## Scene Flow

Home:

- Shows production background, mascot, best score, Play, Sound toggle.

Game:

- Creates `StageManager` background.
- Creates HUD, news panel, stock cards, and 2x2 action grid.
- Publishes layout bounds for QA using `LayoutRegistry`.
- Plays gameplay music and pauses on document hidden.
- Ends through `MarketEngine.terminal`.

Pause:

- Stops gameplay scene updates, pauses music, exposes Resume/Home.

GameOver:

- Displays terminal title, reason, score, portfolio, return, risk, confidence, best score.

## Asset Loading

Imagegen assets are loaded by stable keys:

- `bg_0` to `bg_3` for stage backgrounds.
- `player` spritesheet at `characters/player.webp`.
- `hazard`, `collectible`, UI panels/cards/action buttons, `ui_frame`, `ui_pause`, `fx_hit`, `fx_collect`.
- `gameKeys.js` owns Boot/Loading spritesheet, image, background, UI, FX, and audio path maps.

`StageManager.coverFit()` uses cover scaling to avoid background distortion.

## QA Hooks

- `window.__GAME__` exposes Phaser game instance for browser assertions.
- `window.__GAME_LAYOUT_BOUNDS__` exposes current scene and visible registered layout items.
- Game state can be sampled through `game.scene.getScene('Game').engine.snapshot()` or `window.__MARKET_PANIC_DEBUG__.get()`.

Required runtime assertions:

- Home reaches Game through the Play button.
- Action buttons mutate portfolio/risk/confidence.
- Stage index can progress.
- Win and fail terminals are reachable.
- Console/page errors remain `0`.
