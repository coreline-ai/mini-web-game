# 03 - Asset & Audio Plan: Market Panic

## Art Direction

Style: glossy 3D mobile cartoon with clean silhouettes, smooth gradients, bold outlines,
and readable shapes at phone size. The game should feel like an arcade trading desk, not a
finance dashboard.

Palette:

- Deep market background: `#111827`
- Cool market UI: `#38bdf8`
- Reward/attention: `#facc15`
- Panic/failure: red/orange accents

## Generated Assets

All final runtime images are game-specific and live under `dev_game/generated/market-panic/assets/**`.
The manifest uses `qualityTier: "production-demo"` and imagegen provenance with:

- `method: "codex-gpt-imagegen-skill"`
- `sourceSkill: "imagegen"`
- `toolMode: "built-in-image_gen"`
- `generatedFor: "market-panic"`

Runtime canvas: native `1080x1920`, `maxTargetDpr: 1`. DOM overlays keep their proven `390x844` base-composition CSS and are transformed into a centered FHD board at runtime.

## Backgrounds

| Asset | Runtime key | Role |
|---|---|---|
| `assets/backgrounds/stage-1.webp` | `bg_0` | Opening Bell trading desk mood |
| `assets/backgrounds/stage-2.webp` | `bg_1` | Earnings Storm mood |
| `assets/backgrounds/stage-3.webp` | `bg_2` | Rumor Spiral mood |
| `assets/backgrounds/stage-4.webp` | `bg_3` | Circuit Breaker collapse mood |

All backgrounds are `1080x1920` raster PNGs and are cover-fit at runtime to avoid stretching.

## Sprites, UI, FX

| Asset | Role | Runtime use |
|---|---|---|
| `assets/characters/player.webp` | player | Home mascot and production-demo core player asset |
| `assets/enemies/hazard.webp` | hazard | Market Shock production-demo core object asset |
| `assets/items/collectible.webp` | collectible | Alpha Signal production-demo reward asset |
| `assets/ui/btn-frame.png` | ui-icon | Button frame texture fallback |
| `assets/ui/btn-pause.png` | ui-icon | Pause button texture |
| `assets/effects/fx-hit.webp` | feedback | Bad-call burst |
| `assets/effects/fx-collect.webp` | feedback | Good-call burst |

The active gameplay UI uses Phaser text/graphics for live financial metrics because prices,
events, and button states must be dynamic and machine-readable. Generated sprites still ship
as production-demo core assets and are used in Home/UI/FX surfaces.

After capture review, `player.png` was replaced with a stock-trader mascot because the first
generated mascot read as a produce-market character. The final imagegen source was chroma-key
removed and repacked into the required 4-frame `2048x512` spritesheet.

## Audio

| Asset | Use |
|---|---|
| `assets/audio/ui_click.wav` | Play, ticker select, event cue |
| `assets/audio/collect.wav` | Good call, stage advance, win |
| `assets/audio/hit.wav` | Bad call, risk spike |
| `assets/audio/game_over.wav` | Fail terminal |
| `assets/audio/game_loop.wav` | Gameplay loop |

Audio state requirements:

- Music starts only in Game.
- Music pauses on Pause and document hidden.
- Music stops on Home and GameOver.
- Mute persists through `SaveData`.

## Asset QA Notes

`hazard.png` received a local alpha-backing/padding postprocess after imagegen because the
generated market-shock shape had many detached lightning parts. The final file still uses
the imagegen subject, but now passes role-aware alpha coverage and crop-edge checks.

2026-07-10 FHD cleanup: `collectible.webp` received transparent padding (`1254x1254` -> `1446x1446`) so the FHD image-quality gate no longer reports crop-edge contact. Legacy SVG scaffolds remain non-runtime leftovers and must not be requested by browser samples.
