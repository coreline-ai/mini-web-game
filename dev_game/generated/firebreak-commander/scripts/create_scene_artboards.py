#!/usr/bin/env python3
import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / "qa-captures"
OUT = ROOT / "assets" / "artboards"
CONTACT = ROOT / "assets" / "qa" / "contact-sheets"
OUT.mkdir(parents=True, exist_ok=True)
CONTACT.mkdir(parents=True, exist_ok=True)

SCENES = {
    "home": "home-final.png",
    "game": "game-phase-2-wind-shift.png",
    "pause": "pause-final.png",
    "gameover": "result-loss-final.png",
}

for scene, filename in SCENES.items():
    source = Image.open(CAPTURES / filename).convert("RGB")
    backdrop = ImageOps.fit(source, (2160, 3840), Image.Resampling.LANCZOS)
    backdrop = ImageEnhance.Brightness(backdrop.filter(ImageFilter.GaussianBlur(38))).enhance(0.34)
    foreground = source.resize((round(3840 * source.width / source.height), 3840), Image.Resampling.LANCZOS)
    x = (2160 - foreground.width) // 2
    backdrop.paste(foreground, (x, 0))
    backdrop.save(OUT / f"{scene}.png", optimize=True)
    preview = backdrop.resize((540, 960), Image.Resampling.LANCZOS)
    preview.save(CONTACT / f"{scene}-comparison.png", optimize=True)
    print(scene, source.size, "->", backdrop.size, "content x", x)

slice_map = {
    "version": "1.0.0",
    "game": "firebreak-commander",
    "artboardSize": {"width": 2160, "height": 3840},
    "logicalViewport": {"width": 390, "height": 844},
    "scenes": [
        {"id": scene, "artboard": f"assets/artboards/{scene}.png", "runtimeCapture": f"qa-captures/{filename}", "purpose": "runtime recomposition reference"}
        for scene, filename in SCENES.items()
    ],
    "sourceSheets": [
        {"path": "assets/_source/response-objects-sheet.png", "grid": {"columns": 3, "rows": 2}, "processor": "scripts/process_object_sheet.py"},
        {"path": "assets/_source/fire-ui-fx-sheet.png", "grid": {"columns": 3, "rows": 2}, "processor": "scripts/process_fx_sheet.py"},
    ],
    "ownership": {
        "background": ["mountains", "sky", "non-functional haze", "outer-edge forest"],
        "runtime": ["terrain grid", "fire", "risk preview", "firebreak", "helicopter", "engine", "objectives", "water FX"],
        "ui": ["HUD", "wind", "resources", "objective integrity", "command dock", "runtime text"],
    },
}
(OUT / "slice-map.json").write_text(json.dumps(slice_map, indent=2) + "\n")

# Final runtime evidence sheet: Loading, front-end flow, all three gameplay
# phases, pause, and both terminal outcomes at the actual 390x844 render.
final_captures = [
    ("LOADING", "loading-final.png"), ("HOME", "home-final.png"), ("TUTORIAL", "tutorial-final.png"),
    ("PHASE 1", "game-phase-1-dry-front.png"), ("PHASE 2", "game-phase-2-wind-shift.png"), ("PHASE 3", "game-phase-3-ember-night.png"),
    ("PAUSE", "pause-final.png"), ("WIN 3 STAR", "lifecycle-soak-final.png"), ("LOSS", "result-loss-final.png"),
]
thumb_w, thumb_h = 195, 422
sheet = Image.new("RGB", (thumb_w * 3, (thumb_h + 34) * 3), "#06140f")
from PIL import ImageDraw, ImageFont
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()
for index, (label, filename) in enumerate(final_captures):
    row, col = divmod(index, 3)
    image = Image.open(CAPTURES / filename).convert("RGB")
    image = ImageOps.fit(image, (thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x, y = col * thumb_w, row * (thumb_h + 34)
    sheet.paste(image, (x, y))
    draw.text((x + 8, y + thumb_h + 10), label, fill="#f4e7c5", font=font)
sheet.save(CONTACT / "final-runtime-captures.png", optimize=True)
