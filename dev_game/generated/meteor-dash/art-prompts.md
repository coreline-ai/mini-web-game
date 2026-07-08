# Art Prompts — Meteor Dash

Generate each asset with your image tool at the listed size and path, matching the style guide.
After generation, set the matching asset-manifest entry `quality:"production-demo"`.

## Style guide
- palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward
- outline: clean bold silhouettes, high readability at small size
- lighting: soft top light, gentle drop shadow, subtle rim
- camera: flat 2D, portrait, gameplay reads in the bottom 60%
- mood: deep-space, punchy, mobile-arcade

## Stage backgrounds
### stage-1 (Origin)
- path: `assets/backgrounds/stage-1.png`
- size: 390×844
- prompt: Ultra-detailed vertical PORTRAIT mobile game background, theme "Origin" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at the image tool's MAXIMUM native resolution (portrait, at least 1024x1536, larger is better) — do NOT shrink or fit to any game/canvas size. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.

### stage-2 (Night Rush)
- path: `assets/backgrounds/stage-2.png`
- size: 390×844
- prompt: Ultra-detailed vertical PORTRAIT mobile game background, theme "Night Rush" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at the image tool's MAXIMUM native resolution (portrait, at least 1024x1536, larger is better) — do NOT shrink or fit to any game/canvas size. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.

### stage-3 (Deep Field)
- path: `assets/backgrounds/stage-3.png`
- size: 390×844
- prompt: Ultra-detailed vertical PORTRAIT mobile game background, theme "Deep Field" for Meteor Dash. deep-space, punchy, mobile-arcade. Render at the image tool's MAXIMUM native resolution (portrait, at least 1024x1536, larger is better) — do NOT shrink or fit to any game/canvas size. Crisp high detail, layered parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Cohesive with palette: anchored on #070a1c bg, #4fd8ff hero, #ffe066 reward.

## Core sprites
### player (player)
- path: `assets/characters/player.png`
- size: 256×256
- prompt: A HORIZONTAL SPRITE SHEET rendered at the tool's MAXIMUM resolution (wide, at least 2048px total): exactly 4 equal-width cells in ONE row, each cell containing THE SAME Meteor Dash hero character in a slightly different run/hover pose (frame1 legs together, frame2 mid-stride, frame3 together, frame4 opposite stride). CRITICAL: identical, HIGHLY DETAILED character design, identical colors, identical scale and vertical position in every cell; cells evenly spaced; character centered within each cell. deep-space, punchy, mobile-arcade.

### hazard (hazard)
- path: `assets/enemies/hazard.png`
- size: 256×256
- prompt: Primary "Meteor" obstacle sprite, transparent, clearly dangerous silhouette, readable at 64px, deep-space, punchy, mobile-arcade.

### collectible (collectible)
- path: `assets/items/collectible.png`
- size: 192×192
- prompt: "Star" pickup sprite, transparent, inviting/positive, distinct from hazard color, deep-space, punchy, mobile-arcade.

## UI
### btn-frame (ui-icon)
- path: `assets/ui/btn-frame.png`
- size: 768×256
- prompt: A single WIDE horizontal pill-shaped mobile game button, vibrant green with a smooth gradient and a bright glossy top highlight, HARD CRISP edges. The button is very wide (roughly 3:1) and fills the whole frame edge to edge. NO text, NO icon, NO outer glow, NO drop shadow, NO blur — the area outside the pill must be flat solid pure magenta right up to the crisp button edge.

### btn-pause (ui-icon)
- path: `assets/ui/btn-pause.png`
- size: 256×256
- prompt: A circular glossy green mobile game pause button showing two rounded white vertical bars (pause symbol), glossy top highlight, HARD CRISP circular edge, NO outer glow, NO drop shadow — flat solid pure magenta right up to the circle edge, centered and filling the frame.

## FX
### fx-hit (feedback)
- path: `assets/effects/fx-hit.png`
- size: 256×256
- prompt: Impact burst spritesheet frame, transparent, energetic.

### fx-collect (feedback)
- path: `assets/effects/fx-collect.png`
- size: 192×192
- prompt: Sparkle/collect burst, transparent, positive.
