# 03 · Asset & Audio Plan — Sky Archer

## Art direction / style guide
- Palette: anchored on #1b1030 bg, #8be27c hero, #ffd54a reward
- Outline: clean bold silhouettes, high readability at small size
- Lighting: soft top light, gentle drop shadow, subtle rim
- Camera: flat 2D, portrait, gameplay reads in the bottom 60%
- Mood: retro-arcade, punchy, mobile-arcade

All runtime assets share this style and are used on a native 1080×1920 logical canvas without DPR backing-store multiplication. Machine-readable prompts live in `asset-plan.json`.

## Stage/theme backgrounds (raster PNG, native FHD runtime)
- `assets/backgrounds/stage-1.png` (1080×1920) — Origin: 3D-rendered glossy mobile cartoon portrait background, low-contrast and readable through the center/bottom gameplay area.
- `assets/backgrounds/stage-2.png` (1080×1920) — Night Rush: 3D-rendered glossy mobile cartoon portrait background, low-contrast and readable through the center/bottom gameplay area.
- `assets/backgrounds/stage-3.png` (1080×1920) — Deep Field: 3D-rendered glossy mobile cartoon portrait background, low-contrast and readable through the center/bottom gameplay area.

## Core sprites (raster PNG/WebP, transparent)
- `assets/characters/player.webp` [player] (2048×512, 4 frames) — Sky Archer hero sprite sheet with safe alpha padding.
- `assets/enemies/hazard.png` [hazard] (768×768) — Balloon Target obstacle sprite, transparent, readable at FHD gameplay size.
- `assets/items/collectible.png` [collectible] (768×768) — Golden Bullseye pickup sprite, transparent, distinct from hazard color.
- `assets/items/arrow.png` [projectile] (512×1024) — Upward arrow projectile sprite, transparent, loaded through the central runtime preload map.

## UI buttons (transparent, no baked text, FHD-safe)
- `assets/ui/btn-frame.png` [ui-icon] (1320×384) — glossy green action button background for scaled `220×64` base-composition buttons, transparent safe padding, no baked text/icon.
- `assets/ui/btn-frame-slim.png` [ui-icon] (1320×312) — glossy green slim button background for scaled `220×52` base-composition buttons, transparent safe padding, no baked text/icon.
- `assets/ui/btn-frame-dialog.png` [ui-icon] (1380×372) — glossy green dialog button background for scaled `230×62` base-composition buttons, transparent safe padding, no baked text/icon.
- `assets/ui/btn-pause.png` [ui-icon] (768×768) — glossy circular green pause icon for scaled HUD display, transparent safe padding.
- Runtime rule: `MobileButton` selects the matching source texture per scaled button size; do not non-uniformly stretch one button source across different aspect ratios.

## Audio
- UI click, collect, hit, game-over SFX + a looping gameplay BGM.
- Web format OGG preferred for release; procedural WAV acceptable for the first demo.

## Production rule
Runtime art is generated for `sky-archer`, uses PNG/WebP production assets, and is listed in `assets/asset-manifest.json` with `qualityTier:"production-demo"`. `gameKeys.js` and `LoadingScene` are the source of truth for runtime preload paths; stale SVG scaffolds must not be requested by the browser during gameplay.
