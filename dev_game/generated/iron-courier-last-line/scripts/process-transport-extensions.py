#!/usr/bin/env python3
"""Key, normalize and register the 42-frame transport animation extension."""

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "assets/source/raw/vehicles/transport"
CLEAN_DIR = ROOT / "assets/source/cleaned/vehicles/transport"
SHEETS = {
    "transport-extension-a": ["idle"] * 3 + ["drive"] * 6 + ["hit"] + ["damaged"] * 6,
    "transport-extension-b": ["damaged"] + ["critical"] * 9 + ["repair"] * 5 + ["destroyed"],
    "transport-extension-c": ["destroyed"] * 10 + ["destroyed-safety"] * 6,
}
FRAME_COUNTS = {
    "idle": 4,
    "drive": 8,
    "hit": 2,
    "damaged": 8,
    "critical": 10,
    "repair": 6,
    "destroyed": 12,
}
PROMPT = "Iron Courier identity-locked armored transport 4x4 continuation sheets on chroma green."


def chroma_key(source: Image.Image) -> Image.Image:
    """Soft green removal plus edge despill; transparent RGB is sanitized."""
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


def clean_components(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    pixels = alpha.load()
    visited = bytearray(alpha.width * alpha.height)
    components = []
    for sy in range(alpha.height):
        for sx in range(alpha.width):
            offset = sy * alpha.width + sx
            if visited[offset] or pixels[sx, sy] < 20:
                continue
            stack = [(sx, sy)]
            visited[offset] = 1
            component = []
            while stack:
                x, y = stack.pop()
                component.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= alpha.width or ny >= alpha.height:
                        continue
                    no = ny * alpha.width + nx
                    if visited[no] or pixels[nx, ny] < 20:
                        continue
                    visited[no] = 1
                    stack.append((nx, ny))
            components.append(component)
    largest = max((len(component) for component in components), default=0)
    keep = {p for component in components if len(component) >= max(24, largest * 0.002) for p in component}
    target = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if (x, y) not in keep or target[x, y][3] < 20:
                target[x, y] = (0, 0, 0, 0)
    return rgba


def source_frames(name: str) -> list[Image.Image]:
    raw_path = RAW_DIR / f"{name}-raw.png"
    keyed = chroma_key(Image.open(raw_path))
    CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    keyed.save(CLEAN_DIR / f"{name}.png", optimize=True)
    frames = []
    for index in range(16):
        col, row = index % 4, index // 4
        x0, x1 = round(keyed.width * col / 4), round(keyed.width * (col + 1) / 4)
        y0, y1 = round(keyed.height * row / 4), round(keyed.height * (row + 1) / 4)
        frames.append(clean_components(keyed.crop((x0, y0, x1, y1))))
    return frames


def identity_scale(frames: list[Image.Image]) -> float:
    reference = Image.open(ROOT / "assets/runtime/characters/vehicle/transport-actions.png").convert("RGBA")
    ref_bounds = reference.crop((0, 0, 512, 512)).getchannel("A").getbbox()
    heights = []
    for frame in frames[:4]:
        bounds = frame.getchannel("A").getbbox()
        if bounds:
            heights.append(bounds[3] - bounds[1])
    if not ref_bounds or not heights:
        return 1.0
    return (ref_bounds[3] - ref_bounds[1]) / (sum(heights) / len(heights))


def repack(frames: list[Image.Image], scale: float) -> Image.Image:
    output = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        bounds = frame.getchannel("A").getbbox()
        if not bounds:
            continue
        subject = frame.crop(bounds)
        fit = min(scale, 500 / subject.width, 468 / subject.height)
        subject = subject.resize(
            (max(1, round(subject.width * fit)), max(1, round(subject.height * fit))),
            Image.Resampling.LANCZOS,
        )
        cell = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        cell.alpha_composite(subject, ((512 - subject.width) // 2, 496 - subject.height))
        output.alpha_composite(cell, ((index % 4) * 512, (index // 4) * 512))
    return output


def save_mirrored_webp(image: Image.Image, relative: str) -> None:
    for prefix in (ROOT, ROOT / "public"):
        destination = prefix / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "WEBP", quality=96, method=6, exact=True)
        legacy = destination.with_suffix(".png")
        if prefix == ROOT / "public" and legacy.exists():
            legacy.unlink()


def main() -> None:
    frame_sets = {name: source_frames(name) for name in SHEETS}
    scale = identity_scale(frame_sets["transport-extension-a"])
    for name, frames in frame_sets.items():
        save_mirrored_webp(repack(frames, scale), f"assets/runtime/characters/vehicle/{name}.webp")

    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    extension_ids = set(SHEETS)
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in extension_ids]
    for name, states in SHEETS.items():
        manifest["images"].append({
            "id": name,
            "path": f"assets/runtime/characters/vehicle/{name}.webp",
            "type": "spritesheet",
            "role": "animation-sheet",
            "entityRole": "vehicle",
            "family": "transport",
            "states": states,
            "quality": "production-demo",
            "requiresAlpha": True,
            "frames": 4,
            "totalFrames": 16,
            "rows": 4,
            "frameWidth": 512,
            "frameHeight": 512,
            "sourceSize": {"width": 2048, "height": 2048},
            "runtimeSize": {"width": 2048, "height": 2048},
            "baseline": 496,
            "rootAnchor": "wheel-ground-center",
            "renderOwner": "phaser-spritesheet",
            "status": "approved",
            "provenance": {
                "source": "generated-for-game",
                "generatedFor": "iron-courier-last-line",
                "method": "codex-gpt-imagegen-skill",
                "model": "gpt 이미지젠 스킬",
                "sourceSkill": "imagegen",
                "promptHash": hashlib.sha256(f"{PROMPT}:{name}".encode()).hexdigest(),
                "postProcessing": ["chroma-key-removal", "soft-matte", "despill", "proportional-cell-repack", "tiny-component-cleanup", "512-virtual-cell-normalization"],
            },
        })

    transport_sheet = next(item for item in manifest["images"] if item.get("id") == "transport-actions")
    transport_sheet["family"] = "transport"
    transport_sheet["familyAliases"] = ["vehicle"]
    transport_sheet["rootAnchor"] = "wheel-ground-center"
    transport_sheet["attachments"] = {
        "frontWheel": [0.78, 0.78],
        "rearWheel": [0.22, 0.78],
        "roofCargo": [0.46, 0.24],
        "repairPanel": [0.48, 0.50],
        "exhaust": [0.12, 0.42],
    }
    animation = next(item for item in manifest.get("animations", []) if item.get("family") == "transport")
    animation.update({
        "frameCounts": FRAME_COUNTS,
        "totalFrames": sum(FRAME_COUNTS.values()),
        "baseline": 496,
        "rootAnchor": "wheel-ground-center",
        "attachments": transport_sheet["attachments"],
    })
    manifest["transportAnimationTotalFrames"] = sum(FRAME_COUNTS.values())
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Processed 42 transport extension frames at identity scale {scale:.3f}; contract totals 50 frames.")


if __name__ == "__main__":
    main()
