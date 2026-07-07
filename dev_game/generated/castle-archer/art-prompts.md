# Art Prompts — Castle Archer

Generate each asset with your image tool at the listed size and path, matching the style guide.
After generation, set the matching asset-manifest entry `quality:"production-demo"`.

## Style guide
- palette: anchored on #87b7e8 bg, #3f7fd6 hero, #ff6b81 reward
- outline: clean bold silhouettes, high readability at small size
- lighting: soft top light, glossy specular highlight, gentle ambient occlusion
- camera: clean 2.5D game render, portrait, gameplay reads in the bottom 60%
- mood: retro-arcade, glossy 3D mobile-arcade

## Current runtime notes

The prompt text below is generation history. For the current build, use these runtime facts:

- `assets/characters/player.png` is an 8-frame 4096×512 archer sheet, not a 4-frame 256×256 sprite.
- Runtime enemy sheets are `goblin-basic-sheet.png`, `goblin-shield-sheet.png`, `goblin-runner-sheet.png`, and `orc-brute-sheet.png`, each 1024×256 with 4 frames.
- `arrow.png`, `goblin-runner-sheet.png`, `runner-goblin.png`, `orc-brute-sheet.png`, `brute-orc.png`, `collectible.png`, and `btn-frame.png` received a 2026-07-07 fragment/padding cleanup pass.
- `assets/asset-manifest.json` is the source of truth for current production-demo provenance and post-processing notes.

## Stage backgrounds
### stage-1 (Origin)
- path: `assets/backgrounds/stage-1.png`
- size: 1080×1920
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. BACKGROUND look: bright, airy and deliberately LOW-CONTRAST with soft simple depth; keep all detail smooth and de-emphasized so foreground gameplay objects pop; large calm readable empty area through the center and bottom. A clean glossy 3D-cartoon environment, NOT a busy detailed painting. Vertical PORTRAIT mobile game background, theme "Origin" for Castle Archer. Render at 1080x1920 portrait resolution OR LARGER (2K portrait preferred) — this is a hard minimum; never output below 1080x1920 and never shrink to any game/canvas size. Layered but SMOOTH parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Palette: anchored on #87b7e8 bg, #3f7fd6 hero, #ff6b81 reward.

### stage-2 (Night Rush)
- path: `assets/backgrounds/stage-2.png`
- size: 1080×1920
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. BACKGROUND look: bright, airy and deliberately LOW-CONTRAST with soft simple depth; keep all detail smooth and de-emphasized so foreground gameplay objects pop; large calm readable empty area through the center and bottom. A clean glossy 3D-cartoon environment, NOT a busy detailed painting. Vertical PORTRAIT mobile game background, theme "Night Rush" for Castle Archer. Render at 1080x1920 portrait resolution OR LARGER (2K portrait preferred) — this is a hard minimum; never output below 1080x1920 and never shrink to any game/canvas size. Layered but SMOOTH parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Palette: anchored on #87b7e8 bg, #3f7fd6 hero, #ff6b81 reward.

### stage-3 (Deep Field)
- path: `assets/backgrounds/stage-3.png`
- size: 1080×1920
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. BACKGROUND look: bright, airy and deliberately LOW-CONTRAST with soft simple depth; keep all detail smooth and de-emphasized so foreground gameplay objects pop; large calm readable empty area through the center and bottom. A clean glossy 3D-cartoon environment, NOT a busy detailed painting. Vertical PORTRAIT mobile game background, theme "Deep Field" for Castle Archer. Render at 1080x1920 portrait resolution OR LARGER (2K portrait preferred) — this is a hard minimum; never output below 1080x1920 and never shrink to any game/canvas size. Layered but SMOOTH parallax depth, empty readable center and bottom third for gameplay, no characters, no text, no UI, no border. Palette: anchored on #87b7e8 bg, #3f7fd6 hero, #ff6b81 reward.

## Core sprites
### player (player)
- path: `assets/characters/player.png`
- size: 256×256
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. CHARACTER MUST BE A CHIBI GAME MASCOT: about 2 to 2.5 heads tall, oversized friendly head, small rounded body, big cute expressive eyes, an extremely simple bold silhouette that still reads clearly when shrunk to 64px. Standing/idle front-facing 3/4 view, cheerful and appealing. ABSOLUTELY NOT a realistic 6-8 heads-tall adult, NOT a detailed armored warrior, NOT a side-profile action pose, NOT heavy ornamentation. A HORIZONTAL SPRITE SHEET at maximum resolution (wide, at least 2048px total): exactly 4 equal-width cells in ONE row, each cell the SAME chibi mascot character for Castle Archer in a slightly different walk pose (frame1 legs together, frame2 mid-stride, frame3 together, frame4 opposite stride). CRITICAL: identical character design, identical colors, identical scale and vertical position in every cell; cells evenly spaced; character centered within each cell. Place the subject on a FLAT SOLID PURE MAGENTA #FF00FF background that fills the entire frame right up to the crisp subject edge. Hard clean edge. NO outer glow, NO drop shadow, NO soft/feathered edge, NO colored fringe, NO haze around the subject.

### hazard (hazard)
- path: `assets/enemies/hazard.png`
- size: 256×256
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. A single "Goblin Raider" obstacle sprite as a cute-but-clearly-dangerous glossy 3D-cartoon object, bold simple silhouette readable at 64px. Place the subject on a FLAT SOLID PURE MAGENTA #FF00FF background that fills the entire frame right up to the crisp subject edge. Hard clean edge. NO outer glow, NO drop shadow, NO soft/feathered edge, NO colored fringe, NO haze around the subject.

### collectible (collectible)
- path: `assets/items/collectible.png`
- size: 192×192
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. A single "Healing Potion" pickup sprite as an inviting glossy 3D-cartoon icon, positive and shiny, distinct from the hazard color, bold simple silhouette. Place the subject on a FLAT SOLID PURE MAGENTA #FF00FF background that fills the entire frame right up to the crisp subject edge. Hard clean edge. NO outer glow, NO drop shadow, NO soft/feathered edge, NO colored fringe, NO haze around the subject.

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
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. A glossy cartoon impact/hit burst effect (energetic star/spark shape), bold and readable. Place the subject on a FLAT SOLID PURE MAGENTA #FF00FF background that fills the entire frame right up to the crisp subject edge. Hard clean edge. NO outer glow, NO drop shadow, NO soft/feathered edge, NO colored fringe, NO haze around the subject.

### fx-collect (feedback)
- path: `assets/effects/fx-collect.png`
- size: 192×192
- prompt: ART STYLE (mandatory, identical for every asset): 3D-rendered glossy mobile cartoon, 2.5D, in the polished casual-mobile style of Subway Surfers / Candy Crush. Thick clean dark outline, soft cel-shading, smooth clean gradients, glossy specular highlights, gentle ambient occlusion, rounded volumetric forms, vibrant but harmonious colors. STRICTLY NOT painterly, NOT oil-painting, NOT watercolor, NOT realistic, NOT anime/gacha splash art, NOT concept art. NO busy high-frequency texture, NO gritty grain, NO fine filigree noise, NO sketchy linework. Keep shapes simple, clean and readable. A glossy cartoon sparkle/collect burst effect (positive twinkle shape), bright and cheerful. Place the subject on a FLAT SOLID PURE MAGENTA #FF00FF background that fills the entire frame right up to the crisp subject edge. Hard clean edge. NO outer glow, NO drop shadow, NO soft/feathered edge, NO colored fringe, NO haze around the subject.
