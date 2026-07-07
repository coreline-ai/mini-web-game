# Art Prompts - Target Shooter Rush

This file records the final production-demo asset direction. The authoritative
runtime manifest is `assets/asset-manifest.json`; generated raw art is preserved
under `assets/imagegen/raw/`.

## Style Guide

- Polished glossy 3D mobile-cartoon shooting gallery.
- Thick clean outlines, simple silhouettes, soft cel-shading, smooth gradients.
- Bright teal/gold/red arcade highlights with readable low-noise backgrounds.
- Mobile portrait composition with clear center gameplay space.
- No text in raster art except UI created by Phaser.

## Production Backgrounds

### Gallery Day

- Runtime path: `assets/images/production/backgrounds/gallery_day.png`
- Raw path: `assets/imagegen/raw/backgrounds/gallery_day.png`
- Size: 1080 x 1920
- Purpose: DAY stage and Home/Loading base.

### Gallery Night

- Runtime path: `assets/images/production/backgrounds/gallery_night.png`
- Raw path: `assets/imagegen/raw/backgrounds/gallery_night.png`
- Size: 1080 x 1920
- Purpose: NIGHT stage.

### Gallery Rush

- Runtime path: `assets/images/production/backgrounds/gallery_rush.png`
- Raw path: `assets/imagegen/raw/backgrounds/gallery_rush.png`
- Size: 1080 x 1920
- Purpose: RUSH stage and GameOver background.

## Production Sprites And UI

### Player Blaster

- Runtime path: `assets/images/production/characters/player_blaster.png`
- Raw source: `assets/imagegen/raw/sprites/player_blaster.png`
- Final postprocess: chroma-key cleanup, edge-key despeckle, near-transparent normalization, and padding restore from the raw sprite.
- Note: loaded for the per-game asset contract, but final gameplay does not draw
  this as a separate player image over the baked cannon composition.

### Bullseye Target

- Runtime path: `assets/images/production/targets/bullseye_target.png`
- Raw source: `assets/imagegen/raw/sprites/bullseye_target.png`
- Purpose: active moving target.

### Hit Burst

- Runtime path: `assets/images/production/effects/hit_burst.png`
- Raw source: `assets/imagegen/raw/sprites/hit_burst.png`
- Purpose: hit/perfect feedback burst.

### Pause Button

- Runtime path: `assets/images/production/ui/button_pause.png`
- Raw source: `assets/imagegen/raw/sprites/button_pause.png`
- Purpose: active pause icon.

### Crosshair Artifact

- Runtime file path: `assets/images/production/ui/crosshair.png`
- Note: retained in `asset-manifest.json` with `runtimeActive: false`, but active
  gameplay creates and uses `reticle_ui`, a thin Phaser-generated cyan/white reticle.

## Final Runtime Composition

The active game screen recomposes:

- stage background (`bg_0`, `bg_1`, `bg_2`)
- moving `bullseye_target.png`
- loading/home/game target focus plates and subtle gameplay focus veil
- runtime `reticle_ui`
- baked cannon background plus small muzzle-flash anchor
- HUD text/panel
- `button_pause.png`
- `hit_burst.png`

Scene-composite QA must reject duplicate player sprites, target-like reticles,
visible debug rectangles, clipped buttons, invisible targets, or browser/OS
overlay contamination.
