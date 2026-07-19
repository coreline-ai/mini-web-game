#!/usr/bin/env python3
"""Repack the three approved 4x3 player continuation sheets to 512px cells."""

import hashlib
import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SHEETS = {
    "player-extension-a": ["idle", "idle", "idle", "idle", "jump", "jump", "fall", "crouch", "grenade", "grenade", "grenade", "grenade"],
    "player-extension-b": ["shoot-forward", "shoot-forward", "shoot-diagonal", "shoot-diagonal", "shoot-up", "shoot-up", "melee", "melee", "melee", "melee", "melee", "hurt"],
    "player-extension-c": ["grenade", "hurt", "death", "death", "death", "death", "death", "death", "death", "death", "idle-safety", "idle-safety"],
}
FRAME_COUNTS = {
    "idle": 6, "run": 8, "jump": 3, "fall": 2, "crouch": 2,
    "shoot-forward": 4, "shoot-diagonal": 4, "shoot-up": 4,
    "grenade": 6, "melee": 6, "hurt": 3, "death": 10,
}
PROMPT = "Iron Courier identity-locked player animation continuation sheets A B C, exact 4x3, chroma green."


def remove_tiny_components(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    pixels = alpha.load()
    visited = bytearray(alpha.width * alpha.height)
    components = []
    for start_y in range(alpha.height):
        for start_x in range(alpha.width):
            offset = start_y * alpha.width + start_x
            if visited[offset] or pixels[start_x, start_y] < 24:
                continue
            stack = [(start_x, start_y)]; visited[offset] = 1; component = []
            while stack:
                x, y = stack.pop(); component.append((x, y))
                for next_x, next_y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if next_x < 0 or next_y < 0 or next_x >= alpha.width or next_y >= alpha.height:
                        continue
                    next_offset = next_y * alpha.width + next_x
                    if visited[next_offset] or pixels[next_x, next_y] < 24:
                        continue
                    visited[next_offset] = 1; stack.append((next_x, next_y))
            components.append(component)
    largest = max((len(component) for component in components), default=0)
    keep = {point for component in components if len(component) >= max(48, largest * 0.01) for point in component}
    rgba_pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, a = rgba_pixels[x, y]
            if (x, y) not in keep or a < 24:
                rgba_pixels[x, y] = (0, 0, 0, 0)
    return rgba


def source_frames(name: str) -> list[Image.Image]:
    source = Image.open(ROOT / f"assets/source/cleaned/characters/player/{name}.png").convert("RGBA")
    frames = []
    for index in range(12):
        col, row = index % 4, index // 4
        x0, x1 = round(source.width * col / 4), round(source.width * (col + 1) / 4)
        y0, y1 = round(source.height * row / 3), round(source.height * (row + 1) / 3)
        frames.append(remove_tiny_components(source.crop((x0, y0, x1, y1))))
    return frames


def repack_extension(frames: list[Image.Image], identity_scale: float) -> Image.Image:
    output = Image.new("RGBA", (2048, 1536), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        col, row = index % 4, index // 4
        bounds = frame.getchannel("A").getbbox()
        if not bounds:
            continue
        subject = frame.crop(bounds)
        scale = min(identity_scale, 472 / subject.width, 448 / subject.height)
        subject = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
        frame_canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        frame_canvas.alpha_composite(subject, ((512 - subject.width) // 2, 480 - subject.height))
        output.alpha_composite(frame_canvas, (col * 512, row * 512))
    return output


def repack_existing(source_name: str) -> Image.Image:
    source = Image.open(ROOT / f"assets/source/cleaned/characters/player/{source_name}.png").convert("RGBA")
    output = Image.new("RGBA", (2048, 1024), (0, 0, 0, 0))
    for index in range(8):
        col, row = index % 4, index // 4
        x0, x1 = round(source.width * col / 4), round(source.width * (col + 1) / 4)
        y0, y1 = round(source.height * row / 2), round(source.height * (row + 1) / 2)
        frame = source.crop((x0, y0, x1, y1))
        offset_x = (512 - frame.width) // 2
        offset_y = (512 - frame.height) // 2
        # The authored crouch frame has its opaque foot line well above the
        # shared player baseline.  Keep the original pixels and size, but move
        # that one frame down inside its virtual cell so both crouch frames
        # contact the same ground plane after the 384px runtime downscale.
        if source_name == "player-movement-actions" and index == 4:
            bounds = frame.getchannel("A").getbbox()
            if bounds:
                offset_y = 480 - bounds[3]
        output.alpha_composite(frame, (col * 512 + offset_x, row * 512 + offset_y))
    return output


def main() -> None:
    frame_sets = {name: source_frames(name) for name in SHEETS}
    reference = Image.open(ROOT / "assets/source/cleaned/characters/player/player-movement-actions.png").convert("RGBA")
    reference_heights = []
    for index in [0, 1]:
        frame = reference.crop((index * 384, 0, (index + 1) * 384, 512))
        bounds = frame.getchannel("A").getbbox()
        if bounds:
            reference_heights.append(bounds[3] - bounds[1])
    extension_heights = []
    for frame in frame_sets["player-extension-a"][:4]:
        bounds = frame.getchannel("A").getbbox()
        if bounds:
            extension_heights.append(bounds[3] - bounds[1])
    identity_scale = (sum(reference_heights) / len(reference_heights)) / (sum(extension_heights) / len(extension_heights))

    results = {name: repack_extension(frames, identity_scale) for name, frames in frame_sets.items()}
    existing = {
        "player-run": repack_existing("player-run-original"),
        "player-movement-actions": repack_existing("player-movement-actions"),
        "player-combat-actions": repack_existing("player-combat-actions"),
    }
    for name, image in {**existing, **results}.items():
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / f"assets/runtime/characters/player/{name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, optimize=True)

    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for item in manifest.get("images", []):
        if item.get("id") in existing:
            item.update({"frames": 4, "totalFrames": 8, "rows": 2, "frameWidth": 512, "frameHeight": 512, "runtimeSize": {"width": 2048, "height": 1024}, "baseline": 480, "rootAnchor": "foot-ground-center"})
            processing = item.setdefault("provenance", {}).setdefault("postProcessing", [])
            if "512-virtual-cell-normalization" not in processing:
                processing.append("512-virtual-cell-normalization")
            if item.get("id") == "player-movement-actions" and "crouch-baseline-alignment" not in processing:
                processing.append("crouch-baseline-alignment")
    ids = set(SHEETS)
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in ids]
    for name, states in SHEETS.items():
        manifest["images"].append({
            "id": name,
            "path": f"assets/runtime/characters/player/{name}.png",
            "type": "spritesheet",
            "role": "animation-sheet",
            "entityRole": "player",
            "family": "player",
            "states": states,
            "quality": "production-demo",
            "requiresAlpha": True,
            "frames": 4,
            "totalFrames": 12,
            "rows": 3,
            "frameWidth": 512,
            "frameHeight": 512,
            "sourceSize": {"width": 2048, "height": 1536},
            "runtimeSize": {"width": 2048, "height": 1536},
            "baseline": 480,
            "rootAnchor": "foot-ground-center",
            "renderOwner": "phaser-spritesheet",
            "status": "approved",
            "provenance": {
                "source": "generated-for-game",
                "generatedFor": "iron-courier-last-line",
                "method": "codex-gpt-imagegen-skill",
                "model": "gpt 이미지젠 스킬",
                "sourceSkill": "imagegen",
                "promptHash": hashlib.sha256(f"{PROMPT}:{name}".encode()).hexdigest(),
                "postProcessing": ["chroma-key-removal", "soft-matte", "despill", "proportional-cell-repack", "tiny-component-cleanup", "transparent-rgb-sanitize"],
            },
        })
    player_animation = next(item for item in manifest.get("animations", []) if item.get("family") == "player")
    player_animation["frameCounts"] = FRAME_COUNTS
    player_animation["totalFrames"] = sum(FRAME_COUNTS.values())
    player_animation["baseline"] = 480
    player_animation["rootAnchor"] = "foot-ground-center"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Normalized all player sheets to 512px virtual cells and processed 36 extensions (identity scale {identity_scale:.3f}); contract totals 58 frames.")


if __name__ == "__main__":
    main()
