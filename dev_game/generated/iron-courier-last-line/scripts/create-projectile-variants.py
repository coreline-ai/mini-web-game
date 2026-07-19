#!/usr/bin/env python3
"""Create distinct runtime projectile variants from approved imagegen masters."""

import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
VARIANTS = {
    "projectile-shield-pistol": ("projectile-enemy-bolt", (255, 192, 92)),
    "projectile-enemy-grenade": ("projectile-grenade", (218, 112, 78)),
    "projectile-crane-burst": ("projectile-enemy-bolt", (73, 216, 209)),
    "projectile-mole-cannon": ("projectile-boss-missile", (246, 205, 106)),
    "projectile-mole-overdrive": ("projectile-drone-pulse", (255, 78, 50)),
    "projectile-artillery-shell": ("projectile-boss-missile", (120, 194, 142)),
}


def tight_crop(image: Image.Image, padding: int = 12) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        return image
    cutout = image.crop(bounds)
    canvas = Image.new("RGBA", (cutout.width + padding * 2, cutout.height + padding * 2), (0, 0, 0, 0))
    canvas.alpha_composite(cutout, (padding, padding))
    return canvas


def variant(source: Image.Image, tint: tuple[int, int, int]) -> Image.Image:
    rgba = source.convert("RGBA").resize((512, 512), Image.Resampling.LANCZOS)
    alpha = rgba.getchannel("A")
    color = Image.new("RGB", rgba.size, tint)
    colored = Image.blend(rgba.convert("RGB"), color, 0.28).convert("RGBA")
    colored.putalpha(alpha)
    pixels = colored.load()
    for y in range(colored.height):
        for x in range(colored.width):
            red, green, blue, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return tight_crop(colored)


def main() -> None:
    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    original_by_id = {item.get("id"): item for item in manifest.get("images", [])}
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in VARIANTS]
    for name, (source_name, tint) in VARIANTS.items():
        source_file = ROOT / f"assets/source/cleaned/weapons/{source_name}.png"
        image = variant(Image.open(source_file), tint)
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / f"assets/runtime/weapons/projectiles/{name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, optimize=True)
        source_provenance = original_by_id[source_name]["provenance"]
        manifest["images"].append({
            "id": name,
            "path": f"assets/runtime/weapons/projectiles/{name}.png",
            "type": "sprite",
            "role": "projectile-variant",
            "family": "projectile",
            "quality": "production-demo",
            "requiresAlpha": True,
            "sourceSize": {"width": 443, "height": 443},
            "runtimeSize": {"width": image.width, "height": image.height},
            "renderOwner": "phaser-image",
            "status": "approved",
            "derivedFrom": source_name,
            "provenance": {
                **source_provenance,
                "postProcessing": [
                    *[step for step in (source_provenance.get("postProcessing") or []) if step != "512-square-runtime-canvas"],
                    "identity-preserving-color-variant",
                    "alpha-tight-crop-12px-gutter",
                ],
            },
        })
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Created and registered {len(VARIANTS)} projectile variants.")


if __name__ == "__main__":
    main()
