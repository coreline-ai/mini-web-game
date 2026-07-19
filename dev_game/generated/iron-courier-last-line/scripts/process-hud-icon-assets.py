#!/usr/bin/env python3
"""Split, clean, upscale, and register the HUD icon atlas."""

import hashlib
import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    "weapon-rifle", "weapon-shotgun", "weapon-rocket", "rescue-technician",
    "rescue-medic", "rescue-artillery", "warning-plate", "mission-complete",
]
PROMPT = "Iron Courier production 4x2 weapon rescue warning mission HUD icon atlas on chroma green."


def trim(image: Image.Image, padding: int = 8) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 0 if value < 32 else value)
    rgba.putalpha(alpha)
    pixels = alpha.load()
    visited = bytearray(alpha.width * alpha.height)
    components = []
    for start_y in range(alpha.height):
        for start_x in range(alpha.width):
            offset = start_y * alpha.width + start_x
            if visited[offset] or pixels[start_x, start_y] == 0:
                continue
            stack = [(start_x, start_y)]
            visited[offset] = 1
            component = []
            while stack:
                x, y = stack.pop()
                component.append((x, y))
                for next_x, next_y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if next_x < 0 or next_y < 0 or next_x >= alpha.width or next_y >= alpha.height:
                        continue
                    next_offset = next_y * alpha.width + next_x
                    if visited[next_offset] or pixels[next_x, next_y] == 0:
                        continue
                    visited[next_offset] = 1
                    stack.append((next_x, next_y))
            components.append(component)
    keep = set(max(components, key=len)) if components else set()
    rgba_pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if (x, y) not in keep:
                rgba_pixels[x, y] = (0, 0, 0, 0)
    alpha = rgba.getchannel("A")
    bounds = alpha.getbbox()
    if bounds:
        left, top, right, bottom = bounds
        rgba = rgba.crop((max(0, left - padding), max(0, top - padding), min(rgba.width, right + padding), min(rgba.height, bottom + padding)))
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba.resize((rgba.width * 2, rgba.height * 2), Image.Resampling.LANCZOS)


def main() -> None:
    source = Image.open(ROOT / "assets/source/cleaned/ui/hud-icon-atlas.png").convert("RGBA")
    outputs = {}
    for index, name in enumerate(NAMES):
        col, row = index % 4, index // 4
        x0, x1 = round(source.width * col / 4), round(source.width * (col + 1) / 4)
        y0, y1 = round(source.height * row / 2), round(source.height * (row + 1) / 2)
        outputs[name] = trim(source.crop((x0, y0, x1, y1)))
    outputs["mission-failed"] = outputs["warning-plate"].copy()

    for name, image in outputs.items():
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / f"assets/runtime/ui/icons/{name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, optimize=True)

    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    ids = {f"ui-{name}" for name in outputs}
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in ids]
    for name, image in outputs.items():
        manifest["images"].append({
            "id": f"ui-{name}",
            "path": f"assets/runtime/ui/icons/{name}.png",
            "type": "hud-icon",
            "role": "hud-icon",
            "family": "ui",
            "quality": "production-demo",
            "requiresAlpha": True,
            "sourceSize": {"width": source.width, "height": source.height},
            "runtimeSize": {"width": image.width, "height": image.height},
            "renderOwner": "phaser-image",
            "status": "approved",
            "provenance": {
                "source": "generated-for-game",
                "generatedFor": "iron-courier-last-line",
                "method": "codex-gpt-imagegen-skill",
                "model": "gpt 이미지젠 스킬",
                "sourceSkill": "imagegen",
                "promptHash": hashlib.sha256(PROMPT.encode()).hexdigest(),
                "postProcessing": ["chroma-key-removal", "soft-matte", "despill", "equal-cell-crop", "alpha-bbox-trim", "lanczos-2x-runtime"],
            },
        })
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Processed and registered {len(outputs)} HUD icon assets.")


if __name__ == "__main__":
    main()
