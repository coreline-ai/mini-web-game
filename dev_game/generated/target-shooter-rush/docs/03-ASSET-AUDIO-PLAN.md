# 03 Asset And Audio Plan - Target Shooter Rush

## Art Direction
The visual target is a polished 3D glossy mobile-cartoon shooting gallery: rounded arcade props, clean dark outlines, smooth gradients, bright teal/gold/red highlights, and low-contrast background detail so the moving target reads instantly on a phone.

## Generated Per-Game Images
- `assets/images/production/backgrounds/gallery_day.png`: daytime arcade shooting booth, 1080x1920.
- `assets/images/production/backgrounds/gallery_night.png`: blue neon night range, 1080x1920.
- `assets/images/production/backgrounds/gallery_rush.png`: warm rush-mode range, 1080x1920.
- `assets/images/production/characters/player_blaster.png`: transparent blaster/turret player asset.
- `assets/images/production/targets/bullseye_target.png`: transparent moving bullseye target.
- `assets/images/production/effects/hit_burst.png`: transparent hit/perfect feedback burst.
- `assets/images/production/ui/button_pause.png`: transparent pause button.
- `assets/images/production/ui/crosshair.png`: generated-art-derived artifact retained with the asset set; gameplay uses runtime `reticle_ui` instead.

`player_blaster.png` remains generated and loaded for the per-game asset contract, but the final gameplay scene does not draw it as a separate sprite over the baked cannon background.

## Provenance And Isolation
All runtime images live under this generated game's `assets/**` directory. The manifest marks them as `quality: "production-demo"` with `provenance.source: "generated-for-game"`, `generatedFor: "target-shooter-rush"`, `method: "codex-gpt-imagegen-skill"`, `sourceSkill: "imagegen"`, and `promptHash`.

## Audio
The MVP uses per-game generated Foundation WAV audio. `ui_click.wav` plays UI/start feedback, `collect.wav` plays hit/perfect feedback, `hit.wav` plays miss feedback, `game_over.wav` plays on result transition, and `game_loop.wav` loops during gameplay. Runtime music starts during gameplay, pauses on Pause/background, resumes on game resume, and stops on Home/GameOver. These WAVs satisfy the MVP asset contract, but a release pass should replace or remaster them with final authored SFX/BGM.

## Recomposition QA
The final screen recomposes production gallery backgrounds with the moving target, runtime `reticle_ui`, muzzle anchor, HUD, pause button, and hit burst. Scene-composite QA should catch clipped buttons, invisible target faces, broken button highlights, duplicate player sprites, target-like reticles, visible debug overlays, or external browser/OS overlays.
