#!/usr/bin/env python3
"""Build tightly packed, high-resolution runtime projectile cutouts.

The original pass kept every projectile on a 512x512 transparent square. At
gameplay sizes that made the actual rifle/bolt art thinner than one CSS pixel.
Runtime images now retain the full 512px resample quality, then trim transparent
padding while preserving a small safety gutter for filtering.
"""

import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    "projectile-rifle",
    "projectile-shotgun",
    "projectile-rocket",
    "projectile-grenade",
    "projectile-enemy-bolt",
    "projectile-drone-pulse",
    "projectile-boss-missile",
    "projectile-crane-hook",
]


def sanitize(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def tight_crop(image: Image.Image, padding: int = 12) -> Image.Image:
    rgba = sanitize(image)
    bounds = rgba.getchannel("A").getbbox()
    if not bounds:
        return rgba
    cutout = rgba.crop(bounds)
    canvas = Image.new("RGBA", (cutout.width + padding * 2, cutout.height + padding * 2), (0, 0, 0, 0))
    canvas.alpha_composite(cutout, (padding, padding))
    return sanitize(canvas)


def main() -> None:
    for name in NAMES:
        source = sanitize(Image.open(ROOT / f"assets/source/cleaned/weapons/{name}.png"))
        canvas = tight_crop(source.resize((512, 512), Image.Resampling.LANCZOS))
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / f"assets/runtime/weapons/projectiles/{name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            canvas.save(destination, optimize=True)

    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for item in manifest.get("images", []):
        if item.get("id") not in NAMES:
            continue
        runtime = Image.open(ROOT / item["path"])
        item["runtimeSize"] = {"width": runtime.width, "height": runtime.height}
        processing = item.setdefault("provenance", {}).setdefault("postProcessing", [])
        processing[:] = [step for step in processing if step != "512-square-runtime-canvas"]
        for step in ["transparent-rgb-sanitize", "alpha-tight-crop-12px-gutter"]:
            if step not in processing:
                processing.append(step)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("Normalized 8 projectile assets into tightly cropped runtime cutouts.")


if __name__ == "__main__":
    main()
