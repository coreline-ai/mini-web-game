# Art prompts — Meteor Dash

Generated for per-game asset isolation. Final runtime art is stored under this game's `assets/` folder and sized for a 390×844 logical canvas with DPR3 output.

## Stage backgrounds
- `assets/backgrounds/stage-1.webp` (1170×2532) — Origin: Ultra-detailed vertical PORTRAIT mobile game background, theme "Origin" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at 1170x2532 DPR3 portrait resolution or larger — hard minimum; never below 1080x1920. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.
- `assets/backgrounds/stage-2.webp` (1170×2532) — Night Rush: Ultra-detailed vertical PORTRAIT mobile game background, theme "Night Rush" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at 1170x2532 DPR3 portrait resolution or larger — hard minimum; never below 1080x1920. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.
- `assets/backgrounds/stage-3.webp` (1170×2532) — Deep Field: Ultra-detailed vertical PORTRAIT mobile game background, theme "Deep Field" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at 1170x2532 DPR3 portrait resolution or larger — hard minimum; never below 1080x1920. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.

## Core sprites
- `assets/characters/player.webp` [player] (2048×512) — A HORIZONTAL SPRITE SHEET rendered at the tool's MAXIMUM resolution (wide, at least 2048px total): exactly 4 equal-width cells in ONE row, each cell containing THE SAME Meteor Dash hero character in a slightly different run/hover pose (frame1 legs together, frame2 mid-stride, frame3 together, frame4 opposite stride). CRITICAL: identical, HIGHLY DETAILED character design, identical colors, identical scale and vertical position in every cell; cells evenly spaced; character centered within each cell. deep-space, punchy, mobile-arcade.
- `assets/enemies/hazard.webp` [hazard] (1024×1024) — Primary "Meteor" obstacle sprite, transparent, clearly dangerous silhouette, readable at 64px, deep-space, punchy, mobile-arcade.
- `assets/items/collectible.webp` [collectible] (1024×1024) — "Star" pickup sprite, transparent, inviting/positive, distinct from hazard color, deep-space, punchy, mobile-arcade.
- `assets/items/shield.webp` [powerup] (1024×1024) — Primary "Meteor" obstacle sprite, transparent, clearly dangerous silhouette, readable at 64px, deep-space, punchy, mobile-arcade. A single glossy ENERGY SHIELD powerup game sprite: a rounded hexagonal cyan-blue force-field badge with a soft inner glow core and a thin silver rim, futuristic but cute, bold simple silhouette readable at 64px. Place the subject on a FLAT SOLID PURE MAGENTA #FF00FF background filling the frame right up to the crisp subject edge. Hard clean edge. NO outer glow, NO drop shadow, NO soft edge, NO colored fringe, NO haze.

## UI buttons & icons
- `assets/ui/btn-frame.webp` [ui-icon] (1320×384) — Wide glossy green rounded pill button frame, no text, no icon, transparent outside, high-DPI mobile UI.
- `assets/ui/btn-frame-slim.webp` [ui-icon] (1320×312) — Slim glossy green rounded pill button frame for compact mobile buttons, no text, transparent outside.
- `assets/ui/btn-frame-dialog.webp` [ui-icon] (1380×372) — Dialog-width glossy green rounded pill button frame, no text, transparent outside.
- `assets/ui/btn-pause.webp` [ui-icon] (768×768) — Circular blue-green glossy pause icon button with two white rounded pause bars, transparent outside.

## Feedback FX
- `assets/effects/fx-hit.webp` [feedback] (1024×1024) — Impact burst spritesheet frame, transparent, energetic.
- `assets/effects/fx-collect.webp` [feedback] (1024×1024) — Sparkle/collect burst, transparent, positive.
