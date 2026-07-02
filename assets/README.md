# Game DD SVG Assets

Reference-inspired standalone SVG assets for the game prototype.

## Style Contract

- Cute mobile casual / chibi proportions
- Thick dark outlines, soft gradients, simple highlights
- Transparent background for icons and sprites
- Standalone SVG only; no external image or font files

## Folder Map

- `characters/players/` — player character icons
- `enemies/poop/` — poop enemy variants
- `enemies/boss/` — toilet boss assets
- `items/` — powerups, coins, hearts
- `ui/` — HUD and buttons
- `messages/` — popup text assets
- `backgrounds/` — 1080×1920 themed mobile game backgrounds
- `backgrounds/cards/` — original 320×480 reference/card versions
- `effects/common/` — generic effects
- `effects/hazard/` — hazard/floor effects
- `animations/` — SVG sprite sheets
- `audio/` — generated OGG/Vorbis SFX and UI sounds

## Generated Set

- Total SVG files: 77
- Total OGG audio files: 10
- Runtime backgrounds: `assets/backgrounds/bg_*.svg` are now `viewBox="0 0 1080 1920"` to match the vertical game resolution.
- Preserved background cards: `assets/backgrounds/cards/*_card.svg`
- Audio manifest: `assets/audio/audio-manifest.json`
- Manifest: `assets/manifest.json`
- Sprite sheets:
  - `assets/animations/player_walk_8frames.svg`
  - `assets/animations/poop_spin_8frames.svg`
  - `assets/animations/toilet_boss_attack_12frames.svg`
