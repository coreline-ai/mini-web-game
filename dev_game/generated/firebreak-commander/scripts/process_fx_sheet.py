#!/usr/bin/env python3
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "assets" / "_source" / "fire-ui-fx-sheet.png"
CROPS = ROOT / "assets" / "_source" / "crops"
OUT = ROOT / "assets" / "images" / "production"
HELPER = Path.home() / ".codex" / "skills" / ".system" / "imagegen" / "scripts" / "remove_chroma_key.py"
CROPS.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

SPECS = [
    ("fx-fire", 0, 0),
    ("fx-water", 1, 0),
    ("fx-smoke", 2, 0),
    ("ui-wind", 0, 1),
    ("ui-pause", 1, 1),
    ("ui-containment", 2, 1),
]


def bounds(index: int, count: int, size: int) -> tuple[int, int]:
    return round(index * size / count), round((index + 1) * size / count)


with Image.open(SHEET).convert("RGB") as sheet:
    for name, column, row in SPECS:
        x0, x1 = bounds(column, 3, sheet.width)
        y0, y1 = bounds(row, 2, sheet.height)
        keyed = CROPS / f"{name}-keyed.png"
        alpha_crop = CROPS / f"{name}-alpha.png"
        sheet.crop((x0, y0, x1, y1)).save(keyed)
        subprocess.run([
            "python3", str(HELPER), "--input", str(keyed), "--out", str(alpha_crop),
            "--auto-key", "border", "--soft-matte", "--transparent-threshold", "14",
            "--opaque-threshold", "210", "--despill", "--edge-contract", "1", "--force",
        ], check=True)
        with Image.open(alpha_crop).convert("RGBA") as transparent:
            bbox = transparent.getchannel("A").getbbox()
            if not bbox:
                raise RuntimeError(f"empty alpha crop: {name}")
            subject = transparent.crop(bbox)
            # Strong FX may use the documented 12% exception; status/risk icons
            # stay on the standard 10% padding ceiling.
            subject_extent = 0.76 if name.startswith("fx-") else 0.80
            max_size = int(768 * subject_extent)
            scale = min(max_size / subject.width, max_size / subject.height)
            resized = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", (768, 768), (0, 0, 0, 0))
            x = (768 - resized.width) // 2
            y = (768 - resized.height) // 2
            canvas.alpha_composite(resized, (x, y))
            output = OUT / f"{name}.png"
            canvas.save(output, optimize=True)
            print(name, "source", (x0, y0, x1, y1), "bbox", bbox, "alpha", canvas.getchannel("A").getbbox())
