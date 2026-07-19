#!/usr/bin/env python3
"""Split the approved 3x3 zone parallax atlas and register runtime layers."""

import hashlib
import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    "mid-harbor", "mid-yard", "mid-arena",
    "near-harbor", "near-yard", "near-arena",
    "ambience-harbor", "ambience-yard", "ambience-arena",
]
PROMPT = "Iron Courier 3x3 zone midground foreground ambience parallax atlas on chroma green."


def cell(image: Image.Image, index: int) -> Image.Image:
    col, row = index % 3, index // 3
    x0, x1 = round(image.width * col / 3), round(image.width * (col + 1) / 3)
    y0, y1 = round(image.height * row / 3), round(image.height * (row + 1) / 3)
    result = image.crop((x0, y0, x1, y1)).resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA")
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def main() -> None:
    source = Image.open(ROOT / "assets/source/cleaned/background-layers/zone-parallax-atlas.png").convert("RGBA")
    for index, name in enumerate(NAMES):
        runtime = cell(source, index)
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / f"assets/runtime/backgrounds/zones/{name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            runtime.save(destination, optimize=True)

    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    ids = {f"background-{name}" for name in NAMES}
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in ids]
    for name in NAMES:
        layer_kind, zone = name.split('-', 1)
        manifest["images"].append({
            "id": f"background-{name}",
            "path": f"assets/runtime/backgrounds/zones/{name}.png",
            "type": "parallax-layer",
            "role": "background-layer",
            "family": "background-layer",
            "zone": zone,
            "layer": layer_kind,
            "quality": "production-demo",
            "requiresAlpha": True,
            "sourceSize": {"width": source.width, "height": source.height},
            "runtimeSize": {"width": 512, "height": 512},
            "renderOwner": "phaser-tile-sprite",
            "status": "approved",
            "provenance": {
                "source": "generated-for-game",
                "generatedFor": "iron-courier-last-line",
                "method": "codex-gpt-imagegen-skill",
                "model": "gpt 이미지젠 스킬",
                "sourceSkill": "imagegen",
                "promptHash": hashlib.sha256(PROMPT.encode()).hexdigest(),
                "postProcessing": ["chroma-key-removal", "soft-matte", "despill", "proportional-cell-repack", "transparent-rgb-sanitize"],
            },
        })
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("Processed and registered 9 zone parallax/ambience layers.")


if __name__ == "__main__":
    main()
