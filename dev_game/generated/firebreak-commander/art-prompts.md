# Firebreak Commander · Built-in Imagegen Prompts

모든 production 이미지의 생성 경로는 built-in `image_gen`이며 manifest에는 `method: codex-gpt-imagegen-skill`, `model: openai-builtin-image_gen (version opaque)`, `sourceSkill: imagegen`을 기록한다. built-in 출력의 실제 native 크기는 raw 파일에 기록하며, production runtime background는 cover-fit과 DPR3 기준을 위해 2160x3840 WebP로 통합한다. 리샘플을 네이티브 생성 크기로 오인하여 기록하지 않는다.

## Stage 1 · Dry Front

```text
Use case: stylized-concept
Asset type: production background for the mobile portrait strategy game Firebreak Commander, stage 1 Dry Front
Primary request: create a premium high-resolution vertical wildfire command backdrop for a 10 by 15 tactical grid game, composed for a 2160x3840 portrait master
Scene/backdrop: Pine Ridge mountain valley in a dry late-summer afternoon, layered distant mountains, pine forest edges, a faint smoke haze far on the horizon, rugged command-zone atmosphere
Style/medium: polished stylized 3D mobile game environment, tactile diorama materials, crisp clean shapes, sophisticated realistic lighting, production-quality casual strategy game art
Composition/framing: strict 9:16 portrait; keep the large central rectangle from roughly 8% to 92% width and 14% to 78% height visually quiet, evenly lit, low-detail, and unobstructed for the runtime tactical grid; concentrate scenic detail in distant top mountains and narrow outer edges; leave dark clean zones at top and bottom for runtime HUD and controls
Lighting/mood: dry warm daylight, restrained amber highlights, readable green and ochre terrain palette, tense but not apocalyptic
Constraints: background only; no active flames, no fire icons, no vehicles, no helicopters, no firefighters, no houses, no power station, no animals, no roads forming a gameplay grid, no UI panels, no buttons, no labels, no letters, no numbers, no watermark; no baked gameplay objects; central playfield must remain calm and readable; no blur, no low-resolution texture, no clipping; design must remain clear when downscaled to 390x844
```

Raw built-in output: `assets/_source/stage-1-dry-front-raw.png`, 941x1672.

## Stage 2 · Wind Shift

```text
Use case: stylized-concept
Asset type: production background for the mobile portrait strategy game Firebreak Commander, stage 2 Wind Shift
Primary request: create a premium high-resolution vertical wildfire command backdrop for a 10 by 15 tactical grid game, composed for a 2160x3840 portrait master
Scene/backdrop: the same type of Pine Ridge mountain valley at smoky amber twilight, stronger wind bending only the outer-edge pine branches, layered distant ridgelines partly veiled by atmospheric smoke, rugged dry ground around a broad empty command field
Style/medium: polished stylized 3D mobile game environment, tactile diorama materials, crisp clean shapes, sophisticated cinematic lighting, production-quality casual strategy game art
Composition/framing: strict 9:16 portrait; preserve a large central rectangle from roughly 8% to 92% width and 14% to 78% height as visually quiet, evenly readable, low-detail open ground for a runtime tactical grid; concentrate rocks, trees, wind movement, and smoke in the distant top and narrow outer edges; reserve dark clean zones at top and bottom for runtime HUD and controls
Lighting/mood: smoky amber twilight with teal-gray shadows, tense wind-shift atmosphere, strong depth but high gameplay readability
Constraints: background only; no active flames, no glowing embers in the central area, no fire icons, no vehicles, no helicopters, no firefighters, no houses, no power station, no animals, no roads forming a gameplay grid, no UI panels, no buttons, no labels, no letters, no numbers, no watermark; no baked gameplay objects; central playfield must remain calm and readable; no blur, no low-resolution texture, no clipping; must remain clear when downscaled to 390x844
```

Raw built-in output: `assets/_source/stage-2-wind-shift-raw.png`, 941x1672.

## Stage 3 · Ember Night

```text
Use case: stylized-concept
Asset type: production background for the mobile portrait strategy game Firebreak Commander, stage 3 Ember Night
Primary request: create a premium high-resolution vertical wildfire command backdrop for a 10 by 15 tactical grid game, composed for a 2160x3840 portrait master
Scene/backdrop: Pine Ridge mountain valley at deep blue night after a wind shift, dramatic smoke layers glowing faintly orange only on the far horizon, moonlit rocky edges and dark pine silhouettes surrounding a broad empty tactical command field, subtle airborne ash confined to the distant upper atmosphere
Style/medium: polished stylized 3D mobile game environment, tactile diorama materials, crisp clean shapes, sophisticated cinematic lighting, production-quality casual strategy game art
Composition/framing: strict 9:16 portrait; preserve a large central rectangle from roughly 8% to 92% width and 14% to 78% height as quiet, low-detail, evenly readable dark ground for the runtime tactical grid; concentrate trees, rocks, smoke drama, and distant orange glow only at the top horizon and narrow outer edges; reserve clean dark zones at top and bottom for runtime HUD and controls
Lighting/mood: deep navy and teal moonlight with restrained warm orange horizon contrast, urgent but readable, no crushed blacks in the central field
Constraints: background only; no active flames, no individual glowing embers in the central area, no fire icons, no vehicles, no helicopters, no firefighters, no houses, no power station, no animals, no roads forming a gameplay grid, no UI panels, no buttons, no labels, no letters, no numbers, no watermark; no baked gameplay objects; central playfield must remain calm and readable; no blur, no low-resolution texture, no clipping; must remain clear when downscaled to 390x844
```

Raw built-in output: `assets/_source/stage-3-ember-night-raw.png`, 941x1672.

## Response Objects Sheet

```text
Use case: stylized-concept
Asset type: six-object production sprite source sheet for the mobile portrait strategy game Firebreak Commander
Primary request: create exactly six isolated premium stylized 3D mobile game objects arranged in a strict 3-column by 2-row contact sheet, one centered object per equal square cell
Cell assignments: top-left a wildfire-response helicopter seen from a high three-quarter top-down angle, top-center a compact white-and-red wildland fire engine seen from the same angle, top-right a yellow tracked firebreak bulldozer seen from the same angle; bottom-left a compact Pine Ridge village cluster of three small cabins, bottom-center a compact electrical substation with transformer and safe fenced equipment, bottom-right a wildlife refuge ranger shelter surrounded by two small pine silhouettes
Style/medium: polished stylized 3D casual strategy game assets, tactile diorama materials, crisp clean outline, consistent camera, consistent warm daylight, realistic but simplified proportions, high color and edge detail
Composition/framing: strict 3x2 equal-cell sheet; every object fully contained inside its own cell, centered, same virtual ground scale, 14 to 18 percent empty padding on every side, no overlap, no cropping, no cell dividers
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background covering the entire image
Constraints: the background must be one uniform #ff00ff with no gradients, texture, floor plane, shadows, reflections, glow, or lighting variation; do not use magenta anywhere in the objects; opaque solid object faces, no holes or missing surfaces; no cast shadow, no contact shadow; no people, no flames, no smoke; no text, no letters, no numbers, no labels, no logos, no watermark; no duplicate object; no UI frame; crisp edges suitable for local chroma-key removal
```

Raw built-in output: `assets/_source/response-objects-sheet.png`, 1024x1536. Crop and normalization provenance is produced by `scripts/process_object_sheet.py`.

## Fire / UI / FX Sheet

```text
Use case: stylized-concept
Asset type: six-icon production FX and UI source sheet for the mobile portrait strategy game Firebreak Commander
Primary request: create exactly six isolated premium stylized mobile game icons arranged in a strict 3-column by 2-row contact sheet, one centered icon per equal cell
Cell assignments: top-left an opaque layered wildfire flame symbol with red orange and pale-yellow solid shapes, top-center an opaque blue water-drop splash symbol, top-right an opaque stylized gray smoke-cloud puff symbol; bottom-left a bold teal wind-direction arrow symbol, bottom-center a rugged circular pause symbol containing two clean vertical bars, bottom-right a green containment shield badge with a simple pale firebreak slash motif
Style/medium: polished stylized 3D casual strategy game icons, tactile beveled materials, crisp clean silhouette, consistent camera and lighting, high color and edge detail, readable at 64 logical pixels
Composition/framing: strict 3x2 equal-cell sheet; every icon fully contained and centered in its own cell, equal visual scale, 16 percent empty padding on every side, no overlap, no cropping, no cell dividers
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background covering the entire image
Constraints: background must be one uniform #ff00ff with no gradients, texture, floor, shadows, reflections, or lighting variation; do not use magenta in the icons; icons must be visually opaque solid shapes rather than translucent wisps; no cast shadow or contact shadow; no text, no letters, no numbers, no labels, no logos, no watermark; no duplicate icon; no extra symbols; crisp edges for local chroma-key removal
```

Raw built-in output: `assets/_source/fire-ui-fx-sheet.png`, 1024x1536. Crop and normalization provenance is produced by `scripts/process_fx_sheet.py`.
