# 03 · Asset & Audio Plan — Jungle Arc Shot

## Art direction / style guide
- Palette: anchored on #7fd0a8 bg, #f0a95a hero, #58c7f2 reward
- Outline: clean bold silhouettes, high readability at small size
- Lighting: soft top light, glossy specular highlight, gentle ambient occlusion
- Camera: clean 2.5D game render, portrait, gameplay reads in the bottom 60%
- Mood: retro-arcade, glossy 3D mobile-arcade

All assets must share this style. No mismatched rendering, no flat placeholder shapes in
the final demo. Machine-readable prompts live in `asset-plan.json`.

## Stage/theme backgrounds (raster PNG/WebP, ≥ canvas size)
- `assets/backgrounds/stage-1.png` (1080×1920) — Origin: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. BACKGROUND look: bright, airy and deliberately LOW-CONTRAST with soft simple depth; keep all detail smooth and de-emphasized so foreground gameplay objects pop; large calm readable empty area through the center and bottom. A clean glossy 3D-cartoon environment, NOT a busy detailed painting. Vertical PORTRAIT mobile game background, theme "Origin" for Jungle Arc Shot. Render at 1080x1920 portrait resolution OR LARGER (2K portrait preferred) — this is a hard minimum; never output below 1080x1920 and never shrink to any game/canvas size. Layered but SMOOTH parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Palette: anchored on #7fd0a8 bg, #f0a95a hero, #58c7f2 reward.
- `assets/backgrounds/stage-2.png` (1080×1920) — Night Rush: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. BACKGROUND look: bright, airy and deliberately LOW-CONTRAST with soft simple depth; keep all detail smooth and de-emphasized so foreground gameplay objects pop; large calm readable empty area through the center and bottom. A clean glossy 3D-cartoon environment, NOT a busy detailed painting. Vertical PORTRAIT mobile game background, theme "Night Rush" for Jungle Arc Shot. Render at 1080x1920 portrait resolution OR LARGER (2K portrait preferred) — this is a hard minimum; never output below 1080x1920 and never shrink to any game/canvas size. Layered but SMOOTH parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Palette: anchored on #7fd0a8 bg, #f0a95a hero, #58c7f2 reward.
- `assets/backgrounds/stage-3.png` (1080×1920) — Deep Field: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. BACKGROUND look: bright, airy and deliberately LOW-CONTRAST with soft simple depth; keep all detail smooth and de-emphasized so foreground gameplay objects pop; large calm readable empty area through the center and bottom. A clean glossy 3D-cartoon environment, NOT a busy detailed painting. Vertical PORTRAIT mobile game background, theme "Deep Field" for Jungle Arc Shot. Render at 1080x1920 portrait resolution OR LARGER (2K portrait preferred) — this is a hard minimum; never output below 1080x1920 and never shrink to any game/canvas size. Layered but SMOOTH parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Palette: anchored on #7fd0a8 bg, #f0a95a hero, #58c7f2 reward.

## Core sprites and UI assets (raster PNG, transparent)

2026-07-07 HQ asset fidelity pass (superseded by the 2026-07-08 native 1080 canvas pass for runtime sizing):

| Asset | Runtime key/path | Source size | Runtime display | Quality rule |
|---|---:|---:|---:|---|
| Player sheet | `player` / `assets/characters/player.png` | `3072×768`, 4 frames of `768×768` | Home `130×130`, game `100×100` | Frame source is far above `display × DPR2`; alpha is recentered with no edge clipping. |
| Fruit target | `fruit`, `hazard` / `assets/enemies/fruit.png` | `768×768` | `58×58` | Replaces the old `images/hazard.svg` placeholder load; tight canvas keeps edge detail measurable. |
| Balloon target | `balloon`, `collectible` / `assets/items/balloon.png` | `512×768` | `54×66` | Replaces the old `images/collectible.svg` placeholder load; tall canvas preserves string without excess transparent padding. |
| Arrow projectile | `arrow` / `assets/items/arrow.png` | `512×1024` | `24×52` | Vertical direction preserved; tight vertical canvas prevents rotated-flight clipping and edge metric dilution. |
| Hit / collect FX | `fx_hit`, `fx_collect` | `1024×1024` each | approx. `64×64` | Spark/burst alpha bbox is safely inside the source canvas. |
| Pause icon | `ui_pause` / `assets/ui/btn-pause.png` | `512×512` | `56×56` | Pressed state uses fixed `displaySize`; no cumulative scale growth. |
| Extra UI icons | `ui_sound_on`, `ui_sound_off`, `ui_home`, `ui_retry` | `512×512` each | icon-ready | Generated and loaded for crisp icon menus/overlays. |
| Text buttons | generated texture per button size | `3×` logical size | Play/Sound/Resume/Home/Retry | Text is runtime-rendered; background is size-specific and one-shot guarded. |

Source sheets are preserved in `assets/_source/`:

- `jungle-arcshot-hq-player-sheet-20260707.png`
- `jungle-arcshot-hq-targets-items-fx-sheet-20260707.png`
- `jungle-arcshot-hq-ui-sheet-20260707.png`

Runtime fidelity policy:

- The current runtime canvas is native `1080×1920`; the browser scales this down to the device viewport instead of upscaling a `390×844` canvas.
- The original `390×844` composition is preserved inside the centered crop-safe region using `SCALE_Y` and `worldX()` helpers.
- Key runtime assets must satisfy `sourcePixels >= renderedWorldPixels` for the native 1080 canvas.
- All transparent assets are chroma-key removed, alpha-bbox recentered, checked for `clippedEdges: []`, and tightened when oversized transparent padding would dilute browser/image-quality metrics.

2026-07-08 native 1080 canvas pass:

| Asset | Runtime key/path | Source size | Runtime display in 1080 world | Quality rule |
|---|---:|---:|---:|---|
| Player sheet | `player` / `assets/characters/player.png` | `2944×736`, 4 frames of `736×736` | Home `296×296`, game `227×227` | Frame source remains 2.4×+ larger than rendered world size while staying under size/edge QA budgets. |
| Fruit target | `fruit`, `hazard` / `assets/enemies/fruit.png` | `768×768` | `132×132` | Rightsized to preserve edgeVar and avoid the softened edge produced by oversized resampling. |
| Balloon target | `balloon`, `collectible` / `assets/items/balloon.png` | `512×768` | `123×150` | Tall source preserves the string and still exceeds rendered world size. |
| Arrow projectile | `arrow` / `assets/items/arrow.png` | `512×1024` | `55×118` | Vertical source remains far above rendered size; no rotated-flight upscale. |
| Pause icon | `ui_pause` / `assets/ui/btn-pause.png` | `512×512` | `127×127` | Safe in the 1080 crop-safe HUD area; fixed display size prevents growth. |

2026-07-10 runtime loader contract:

- `src/game/constants/gameKeys.js` is the source of truth for spritesheet, image, and audio preload paths.
- `LoadingScene` preloads that centralized runtime list; `GameScene` no longer late-loads `fruit`, `balloon`, or `arrow`.
- Runtime image formats are PNG/WebP only. Any legacy `assets/images/*.svg` scaffold files are not part of the runtime preload contract.
- Stage backgrounds are generated production-demo assets; `asset-manifest.json` no longer marks them as placeholders.

## Audio
- UI click, collect, hit, game-over SFX + a looping gameplay BGM.
- Web format OGG preferred for release; procedural WAV acceptable for the first demo.

## Production rule
Promotion to `qualityTier:"production-demo"` requires generated game-specific PNG backgrounds, runtime PNG/WebP preload paths, and current QA evidence. Legacy scaffold SVG files are acceptable only as non-runtime leftovers.
