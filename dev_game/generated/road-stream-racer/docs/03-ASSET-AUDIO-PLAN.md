# 03 · Asset & Audio Plan — Road Stream Racer

## FHD Runtime Rule
The game runs on a native 1080×1920 Phaser canvas. Backgrounds are 1080×1920, road
segments are 1080×640, and all core sprite frames are 512px or larger. The desktop
browser view uses a centered 9:16 shell with a bright blurred background outside the
game canvas.

## Imagegen Provenance
The style reference was created through the `gpt 이미지젠 스킬` and stored at
`assets/references/imagegen-road-stream-asset-sheet.png`. Runtime files were adapted
from that reference into per-game FHD PNGs and are declared in `assets/asset-manifest.json`
with `method:"codex-gpt-imagegen-skill"`, `sourceSkill:"imagegen"`,
and per-asset `promptHash`.

## Runtime Images
- Backgrounds: `assets/backgrounds/stage-1.png`, `stage-2.png`, `stage-3.png`.
- Road stream tiles: `assets/roads/road-straight-1.png`, `road-straight-2.png`,
  `road-construction-1.png`, `road-construction-2.png`, `road-crosswalk-1.png`.
- Player: `assets/characters/player-car.png`, 4 frames at 512×512.
- Traffic: blue car, yellow car, truck.
- Obstacles/items: cone, barricade, coin sheet, boost pad.
- UI/FX: button frame, pause/boost icons, hit/collect/boost bursts.

## Audio
Audio is local per-game WAV: UI click, collect, hit, game over, and looping gameplay
music. Audio unlock is tied to the first play tap and mute persists through localStorage.

## Quality Gates
The shipped set must pass production-demo QA, image-quality QA, visual-layout QA,
scene-composite QA, and the integrated production-gate. SVG starter files are not final
art and must not be reintroduced into runtime loading.
