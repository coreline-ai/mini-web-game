#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "_source"
OUTPUT = ROOT / "assets" / "backgrounds"
OUTPUT.mkdir(parents=True, exist_ok=True)

for raw in sorted(SOURCE.glob("stage-*-raw.png")):
    stem = raw.name.removesuffix("-raw.png")
    with Image.open(raw).convert("RGB") as image:
        production = ImageOps.fit(image, (2160, 3840), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        blur_radius = 1.15 if stem == "stage-1-dry-front" else 0.35
        production = production.filter(ImageFilter.GaussianBlur(blur_radius))
        # Preserve broad, readable ridgeline edges at the final 2160x3840
        # runtime size without reintroducing high-frequency painterly noise.
        if stem in {"stage-1-dry-front", "stage-3-ember-night"}:
            production = ImageEnhance.Contrast(production).enhance(1.13)
        production.save(OUTPUT / f"{stem}.webp", "WEBP", quality=93, method=6)
        print(f"{raw.name}: {image.size} -> {stem}.webp: {production.size}")
