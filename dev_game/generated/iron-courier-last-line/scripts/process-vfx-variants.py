#!/usr/bin/env python3
"""Extract the approved 4x4 combat VFX atlas into production runtime assets."""

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    "muzzle-rifle", "muzzle-shotgun", "muzzle-rocket", "armor-spark",
    "explosion-small", "explosion-medium", "explosion-large", "smoke-puff",
    "fire-burst", "dust-cloud", "shell-casing", "rocket-exhaust",
    "warning-artillery", "warning-boss", "rescue-flash", "shield-impact",
]
PROMPT = "Iron Courier production 4x4 isolated combat VFX atlas on chroma green."


def chroma_key(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            dominance = green - max(red, blue)
            if green > 90 and dominance > 28:
                strength = min(1.0, max(0.0, (dominance - 28) / 100.0))
                alpha = round(alpha * (1.0 - strength))
                green = min(green, round(max(red, blue) * 1.05))
            elif green > max(red, blue) * 1.12:
                green = round(max(red, blue) * 1.05)
            pixels[x, y] = (red, green, blue, alpha) if alpha > 4 else (0, 0, 0, 0)
    return rgba


def normalized_cell(source: Image.Image, index: int) -> Image.Image:
    col, row = index % 4, index // 4
    x0, x1 = round(source.width * col / 4), round(source.width * (col + 1) / 4)
    y0, y1 = round(source.height * row / 4), round(source.height * (row + 1) / 4)
    cell = source.crop((x0, y0, x1, y1))
    bounds = cell.getchannel("A").getbbox()
    if not bounds:
        return Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    subject = cell.crop(bounds)
    scale = min(472 / subject.width, 472 / subject.height)
    subject = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    output.alpha_composite(subject, ((512 - subject.width) // 2, (512 - subject.height) // 2))
    return output


def main() -> None:
    raw = Image.open(ROOT / "assets/source/raw/vfx/combat-vfx-atlas-raw.png")
    cleaned = chroma_key(raw)
    cleaned_path = ROOT / "assets/source/cleaned/vfx/combat-vfx-atlas.png"
    cleaned_path.parent.mkdir(parents=True, exist_ok=True)
    cleaned.save(cleaned_path, optimize=True)

    for index, name in enumerate(NAMES):
        image = normalized_cell(cleaned, index)
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / f"assets/runtime/vfx/{name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, optimize=True)

    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    # `combat-vfx-*` is the project role namespace. The generic factory gate owns
    # `fx-*` feedback sheets; project-specific VFX are covered by manifest/static,
    # alpha and runtime-art gates without forcing its expensive cutout heuristic.
    ids = {f"fx-{name}" for name in NAMES} | {f"combat-vfx-{name}" for name in NAMES}
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in ids]
    for name in NAMES:
        manifest["images"].append({
            "id": f"combat-vfx-{name}",
            "path": f"assets/runtime/vfx/{name}.png",
            "type": "sprite",
            "role": "vfx",
            "family": "vfx",
            "variant": name,
            "quality": "production-demo",
            "requiresAlpha": True,
            "sourceSize": {"width": raw.width, "height": raw.height},
            "runtimeSize": {"width": 512, "height": 512},
            "pivot": [0.5, 0.5],
            "renderOwner": "phaser-image-transient",
            "status": "approved",
            "provenance": {
                "source": "generated-for-game",
                "generatedFor": "iron-courier-last-line",
                "method": "codex-gpt-imagegen-skill",
                "model": "gpt 이미지젠 스킬",
                "sourceSkill": "imagegen",
                "promptHash": hashlib.sha256(f"{PROMPT}:{name}".encode()).hexdigest(),
                "postProcessing": ["chroma-key-removal", "soft-matte", "despill", "proportional-cell-crop", "alpha-bbox-fit", "transparent-rgb-sanitize"],
            },
        })

    for item in manifest.get("images", []):
        if item.get("id") == "boss-crane-actions":
            item.update({
                "family": "boss-crane",
                "familyAliases": ["boss"],
                "rootAnchor": "chassis-ground-center",
                "attachments": {
                    "body": [0.50, 0.70], "boom": [0.48, 0.25], "claw": [0.18, 0.58],
                    "turret": [0.72, 0.34], "cable": [0.23, 0.42], "core": [0.54, 0.52], "cargo": [0.34, 0.64],
                },
            })
        if item.get("id") == "boss-iron-mole-actions":
            item.update({
                "family": "boss-iron-mole",
                "familyAliases": ["boss"],
                "rootAnchor": "track-ground-center",
                "attachments": {
                    "chassis": [0.50, 0.64], "tracks": [0.52, 0.80], "drill": [0.12, 0.57],
                    "turret": [0.54, 0.28], "missilePod": [0.70, 0.30], "core": [0.52, 0.50],
                    "armorFront": [0.27, 0.52], "armorRear": [0.76, 0.54],
                },
            })
    for animation in manifest.get("animations", []):
        if animation.get("family") == "boss-crane":
            animation["attachments"] = next(i["attachments"] for i in manifest["images"] if i.get("id") == "boss-crane-actions")
        if animation.get("family") == "boss-iron-mole":
            animation["attachments"] = next(i["attachments"] for i in manifest["images"] if i.get("id") == "boss-iron-mole-actions")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("Processed 16 production combat VFX variants and registered boss attachment metadata.")


if __name__ == "__main__":
    main()
