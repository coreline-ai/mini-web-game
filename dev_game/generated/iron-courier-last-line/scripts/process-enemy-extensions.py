#!/usr/bin/env python3
"""Normalize enemy sheets to 512px cells and repack 72 approved extensions."""

import hashlib
import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {
    "rifle-extension-a": ("enemy-rifle", ["idle", "idle", "run", "run", "run", "run", "aim", "aim", "fire", "recoil", "hurt", "death"]),
    "rifle-extension-b": ("enemy-rifle", ["idle", "idle", "aim", "aim", "fire", "recoil", "hurt", "hurt", "death", "death", "death", "death"]),
    "shield-extension-a": ("enemy-shield", ["idle", "idle", "march", "march", "march", "guard", "guard", "bash", "bash", "stagger", "shield-break", "death"]),
    "shield-extension-b": ("enemy-shield", ["march", "march", "march", "guard", "guard", "bash", "bash", "bash", "shield-break", "shield-break", "death", "death"]),
    "grenadier-extension-a": ("enemy-grenadier", ["idle", "idle", "run", "run", "run", "windup", "windup", "throw", "throw", "recover", "hurt", "death"]),
    "drone-extension-a": ("enemy-drone", ["hover", "hover", "hover", "bank-left", "bank-left", "bank-right", "bank-right", "charge", "charge", "fire", "hit", "explode"]),
}
EXISTING = {
    "enemy-rifle-actions": "rifle-actions",
    "enemy-shield-actions": "shield-actions",
    "enemy-grenadier-actions": "grenadier-actions",
    "enemy-drone-actions": "drone-actions",
}
FRAME_COUNTS = {
    "enemy-rifle": {"idle": 6, "run": 6, "aim": 5, "fire": 3, "recoil": 2, "hurt": 4, "death": 6},
    "enemy-shield": {"idle": 3, "march": 8, "guard": 5, "bash": 6, "stagger": 2, "shield-break": 4, "death": 4},
    "enemy-grenadier": {"idle": 3, "run": 5, "windup": 3, "throw": 3, "recover": 2, "hurt": 2, "death": 2},
    "enemy-drone": {"hover": 5, "bank-left": 3, "bank-right": 3, "charge": 3, "fire": 2, "hit": 2, "explode": 2},
}
PROMPT = "Iron Courier identity-locked enemy animation extension exact 4x3 chroma green."


def clean_components(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    pixels = alpha.load(); visited = bytearray(alpha.width * alpha.height); components = []
    for sy in range(alpha.height):
        for sx in range(alpha.width):
            offset = sy * alpha.width + sx
            if visited[offset] or pixels[sx, sy] < 24:
                continue
            stack = [(sx, sy)]; visited[offset] = 1; component = []
            while stack:
                x, y = stack.pop(); component.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= alpha.width or ny >= alpha.height:
                        continue
                    no = ny * alpha.width + nx
                    if visited[no] or pixels[nx, ny] < 24:
                        continue
                    visited[no] = 1; stack.append((nx, ny))
            components.append(component)
    largest = max((len(component) for component in components), default=0)
    keep = {point for component in components if len(component) >= max(48, largest * 0.012) for point in component}
    target = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if (x, y) not in keep or target[x, y][3] < 24:
                target[x, y] = (0, 0, 0, 0)
    return rgba


def connected_pose_frames(source: Image.Image) -> list[Image.Image]:
    """Recover 12 whole ground poses even when the generated grid crosses cells."""
    alpha = source.getchannel("A")
    pixels = alpha.load()
    visited = bytearray(alpha.width * alpha.height)
    components = []
    for sy in range(alpha.height):
        for sx in range(alpha.width):
            offset = sy * alpha.width + sx
            if visited[offset] or pixels[sx, sy] < 24:
                continue
            stack = [(sx, sy)]
            visited[offset] = 1
            count = 0
            min_x = max_x = sx
            min_y = max_y = sy
            sum_x = sum_y = 0
            while stack:
                x, y = stack.pop()
                count += 1
                sum_x += x; sum_y += y
                min_x = min(min_x, x); max_x = max(max_x, x)
                min_y = min(min_y, y); max_y = max(max_y, y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= alpha.width or ny >= alpha.height:
                        continue
                    neighbour = ny * alpha.width + nx
                    if visited[neighbour] or pixels[nx, ny] < 24:
                        continue
                    visited[neighbour] = 1
                    stack.append((nx, ny))
            if count >= 1000:
                components.append({
                    "count": count,
                    "cx": sum_x / count,
                    "cy": sum_y / count,
                    "bounds": (max(0, min_x - 4), max(0, min_y - 4), min(source.width, max_x + 5), min(source.height, max_y + 5)),
                })
    if len(components) != 12:
        raise RuntimeError(f"expected 12 connected poses, found {len(components)}")
    components.sort(key=lambda item: (min(2, int(item["cy"] * 3 / source.height)), item["cx"]))
    return [clean_components(source.crop(item["bounds"])) for item in components]


def extension_frames(name: str, role: str) -> list[Image.Image]:
    source = Image.open(ROOT / f"assets/source/cleaned/characters/enemies/{name}.png").convert("RGBA")
    if role != "enemy-drone":
        return connected_pose_frames(source)
    frames = []
    for index in range(12):
        col, row = index % 4, index // 4
        x0, x1 = round(source.width * col / 4), round(source.width * (col + 1) / 4)
        y0, y1 = round(source.height * row / 3), round(source.height * (row + 1) / 3)
        frames.append(clean_components(source.crop((x0, y0, x1, y1))))
    return frames


def repack_extension(frames: list[Image.Image], scale: float, flying: bool) -> Image.Image:
    output = Image.new("RGBA", (2048, 1536), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        bounds = frame.getchannel("A").getbbox()
        if not bounds:
            continue
        subject = frame.crop(bounds)
        fit = min(scale, 474 / subject.width, 452 / subject.height)
        subject = subject.resize((max(1, round(subject.width * fit)), max(1, round(subject.height * fit))), Image.Resampling.LANCZOS)
        cell = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        x = (512 - subject.width) // 2
        y = (512 - subject.height) // 2 if flying else 480 - subject.height
        cell.alpha_composite(subject, (x, y))
        output.alpha_composite(cell, ((index % 4) * 512, (index // 4) * 512))
    return output


def repack_existing(source_name: str) -> Image.Image:
    source = Image.open(ROOT / f"assets/source/cleaned/characters/enemies/{source_name}.png").convert("RGBA")
    output = Image.new("RGBA", (2048, 1024), (0, 0, 0, 0))
    flying = source_name == "drone-actions"
    for index in range(8):
        col, row = index % 4, index // 4
        frame = clean_components(source.crop((col * 384, row * 512, (col + 1) * 384, (row + 1) * 512)))
        bounds = frame.getchannel("A").getbbox()
        if not bounds:
            continue
        subject = frame.crop(bounds)
        fit = min(1.0, 474 / subject.width, 452 / subject.height)
        if fit < 1:
            subject = subject.resize((max(1, round(subject.width * fit)), max(1, round(subject.height * fit))), Image.Resampling.LANCZOS)
        x = (512 - subject.width) // 2
        y = (512 - subject.height) // 2 if flying else 480 - subject.height
        output.alpha_composite(subject, (col * 512 + x, row * 512 + y))
    return output


def identity_scale(role: str, frames: list[Image.Image]) -> float:
    source_name = role.replace("enemy-", "") + "-actions"
    reference = Image.open(ROOT / f"assets/source/cleaned/characters/enemies/{source_name}.png").convert("RGBA").crop((0, 0, 384, 512))
    ref_bounds = reference.getchannel("A").getbbox()
    ext_bounds = frames[0].getchannel("A").getbbox()
    if not ref_bounds or not ext_bounds:
        return 1
    ref_w, ref_h = ref_bounds[2] - ref_bounds[0], ref_bounds[3] - ref_bounds[1]
    ext_w, ext_h = ext_bounds[2] - ext_bounds[0], ext_bounds[3] - ext_bounds[1]
    return (ref_w / ext_w) if role == "enemy-drone" else (ref_h / ext_h)


def main() -> None:
    frame_sets = {name: extension_frames(name, role) for name, (role, _) in EXTENSIONS.items()}
    results = {}
    for name, (role, _) in EXTENSIONS.items():
        results[name] = repack_extension(frame_sets[name], identity_scale(role, frame_sets[name]), role == "enemy-drone")
    normalized_existing = {asset_id: repack_existing(source_name) for asset_id, source_name in EXISTING.items()}
    for name, image in {**normalized_existing, **results}.items():
        runtime_name = EXISTING.get(name, name)
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / f"assets/runtime/characters/enemies/{runtime_name}.png"
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, optimize=True)

    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for item in manifest.get("images", []):
        if item.get("id") in EXISTING:
            item.update({"frames": 4, "totalFrames": 8, "rows": 2, "frameWidth": 512, "frameHeight": 512, "runtimeSize": {"width": 2048, "height": 1024}, "baseline": 480, "rootAnchor": "center" if item.get("id") == "enemy-drone-actions" else "foot-ground-center"})
            processing = item.setdefault("provenance", {}).setdefault("postProcessing", [])
            if "position-only-root-normalization" not in processing:
                processing.append("position-only-root-normalization")
    extension_ids = set(EXTENSIONS)
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in extension_ids]
    for name, (role, states) in EXTENSIONS.items():
        manifest["images"].append({
            "id": name,
            "path": f"assets/runtime/characters/enemies/{name}.png",
            "type": "spritesheet",
            "role": "animation-sheet",
            "entityRole": "enemy",
            "family": role,
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
            "baseline": 256 if role == "enemy-drone" else 480,
            "rootAnchor": "center" if role == "enemy-drone" else "foot-ground-center",
            "renderOwner": "phaser-spritesheet",
            "status": "approved",
            "provenance": {
                "source": "generated-for-game", "generatedFor": "iron-courier-last-line",
                "method": "codex-gpt-imagegen-skill", "model": "gpt 이미지젠 스킬", "sourceSkill": "imagegen",
                "promptHash": hashlib.sha256(f"{PROMPT}:{name}".encode()).hexdigest(),
                "postProcessing": ["chroma-key-removal", "soft-matte", "despill", "proportional-cell-repack", "tiny-component-cleanup", "512-virtual-cell-normalization", "position-only-root-normalization"],
            },
        })
    for family, counts in FRAME_COUNTS.items():
        animation = next(item for item in manifest.get("animations", []) if item.get("family") == family)
        animation["frameCounts"] = counts
        animation["totalFrames"] = sum(counts.values())
        animation["baseline"] = 256 if family == "enemy-drone" else 480
        animation["rootAnchor"] = "center" if family == "enemy-drone" else "foot-ground-center"
    manifest["enemyAnimationTotalFrames"] = sum(sum(counts.values()) for counts in FRAME_COUNTS.values())
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("Normalized enemy cells and registered 72 extensions; enemy animation total is 104 frames.")


if __name__ == "__main__":
    main()
