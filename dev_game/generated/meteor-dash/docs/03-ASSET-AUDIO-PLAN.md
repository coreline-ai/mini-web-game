# 03 · Asset & Audio Plan — Meteor Dash

## Art direction / style guide
- Palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward
- Outline: clean bold silhouettes, high readability at small size
- Lighting: soft top light, gentle drop shadow, subtle rim
- Camera: flat 2D, portrait, gameplay reads in the bottom 60%
- Mood: deep-space, punchy, mobile-arcade

All assets must share this style. No mismatched rendering, no flat placeholder shapes in
the final demo. Machine-readable prompts live in `asset-plan.json`.

## Stage/theme backgrounds (raster PNG/WebP, ≥ canvas size)
- `assets/backgrounds/stage-1.png` (390×844) — Origin: Ultra-detailed vertical PORTRAIT mobile game background, theme "Origin" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at the image tool's MAXIMUM native resolution (portrait, at least 1024x1536, larger is better) — do NOT shrink or fit to any game/canvas size. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.
- `assets/backgrounds/stage-2.png` (390×844) — Night Rush: Ultra-detailed vertical PORTRAIT mobile game background, theme "Night Rush" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at the image tool's MAXIMUM native resolution (portrait, at least 1024x1536, larger is better) — do NOT shrink or fit to any game/canvas size. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.
- `assets/backgrounds/stage-3.png` (390×844) — Deep Field: Ultra-detailed vertical PORTRAIT mobile game background, theme "Deep Field" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at the image tool's MAXIMUM native resolution (portrait, at least 1024x1536, larger is better) — do NOT shrink or fit to any game/canvas size. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.

## Core sprites (raster PNG/WebP, transparent)
- `assets/characters/player.png` [player] (256×256) — A HORIZONTAL SPRITE SHEET rendered at the tool's MAXIMUM resolution (wide, at least 2048px total): exactly 4 equal-width cells in ONE row, each cell containing THE SAME Meteor Dash hero character in a slightly different run/hover pose (frame1 legs together, frame2 mid-stride, frame3 together, frame4 opposite stride). CRITICAL: identical, HIGHLY DETAILED character design, identical colors, identical scale and vertical position in every cell; cells evenly spaced; character centered within each cell. deep-space, punchy, mobile-arcade.
- `assets/enemies/hazard.png` [hazard] (256×256) — Primary "Meteor" obstacle sprite, transparent, clearly dangerous silhouette, readable at 64px, deep-space, punchy, mobile-arcade.
- `assets/items/collectible.png` [collectible] (192×192) — "Star" pickup sprite, transparent, inviting/positive, distinct from hazard color, deep-space, punchy, mobile-arcade.

## Audio
- UI click, collect, hit, game-over SFX + a looping gameplay BGM.
- Web format OGG preferred for release; procedural WAV acceptable for the first demo.

## Production rule
Backgrounds ship as `quality:"draft"` placeholders from productionize.mjs and MUST be
replaced with production art before promotion to `qualityTier:"production-demo"`.
