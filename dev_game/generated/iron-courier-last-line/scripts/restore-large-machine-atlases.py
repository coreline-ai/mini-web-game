#!/usr/bin/env python3
"""Rebuild vehicle and boss sheets at 512px cells for large-screen clarity."""

import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SHEETS = {
    "transport-actions": ("assets/source/cleaned/characters/vehicle", "transport", "assets/runtime/characters/vehicle/transport-actions.png"),
    "boss-crane-actions": ("assets/source/cleaned/characters/bosses/cells/crane", "crane", "assets/runtime/characters/bosses/crane-actions.png"),
    "boss-iron-mole-actions": ("assets/source/cleaned/characters/bosses/cells/iron-mole", "iron-mole", "assets/runtime/characters/bosses/iron-mole-actions.png"),
}


def remove_edge_fragments(frame: Image.Image) -> Image.Image:
    """Discard neighboring-cell shards while preserving detached machine parts."""
    rgba = frame.convert("RGBA")
    alpha = rgba.getchannel("A"); pix = alpha.load(); visited = bytearray(alpha.width * alpha.height); components = []
    for sy in range(alpha.height):
        for sx in range(alpha.width):
            offset = sy * alpha.width + sx
            if visited[offset] or pix[sx, sy] < 20: continue
            stack = [(sx, sy)]; visited[offset] = 1; points = []
            while stack:
                x, y = stack.pop(); points.append((x, y))
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if nx < 0 or ny < 0 or nx >= alpha.width or ny >= alpha.height: continue
                    no = ny * alpha.width + nx
                    if visited[no] or pix[nx, ny] < 20: continue
                    visited[no] = 1; stack.append((nx, ny))
            components.append(points)
    largest = max((len(c) for c in components), default=0)
    keep = set()
    for component in components:
        xs = [p[0] for p in component]; ys = [p[1] for p in component]
        touches_edge = min(xs) <= 2 or max(xs) >= alpha.width - 3 or min(ys) <= 2 or max(ys) >= alpha.height - 3
        side_shard = min(xs) < alpha.width * 0.12 or max(xs) > alpha.width * 0.88
        if len(component) == largest or (not touches_edge and not side_shard and len(component) >= max(32, largest * 0.003)):
            keep.update(component)
    target = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if (x, y) not in keep: target[x, y] = (0, 0, 0, 0)
    return rgba


def build(directory: str, prefix: str) -> Image.Image:
    output = Image.new("RGBA", (2048, 1024), (0, 0, 0, 0))
    for index in range(8):
        frame = Image.open(ROOT / directory / f"{prefix}-{index:02d}.png").convert("RGBA")
        if prefix == "crane" and index in {2, 3}:
            # The original proportional extraction retained a connected sliver
            # from the previous cell along the left edge of these two frames.
            frame.paste((0, 0, 0, 0), (0, 0, 78, frame.height))
        frame = remove_edge_fragments(frame)
        bounds = frame.getchannel("A").getbbox()
        if not bounds:
            continue
        subject = frame.crop(bounds)
        scale = min(500 / subject.width, 468 / subject.height)
        if scale < 1:
            subject = subject.resize((round(subject.width * scale), round(subject.height * scale)), Image.Resampling.LANCZOS)
        cell = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        cell.alpha_composite(subject, ((512 - subject.width) // 2, 496 - subject.height))
        output.alpha_composite(cell, ((index % 4) * 512, (index // 4) * 512))
    return output


def main() -> None:
    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    by_id = {item.get("id"): item for item in manifest.get("images", [])}
    for asset_id, (directory, prefix, relative) in SHEETS.items():
        image = build(directory, prefix)
        for root in (ROOT, ROOT / "public"):
            destination = root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination, optimize=True)
        item = by_id[asset_id]
        item.update({"frameWidth": 512, "frameHeight": 512, "runtimeSize": {"width": 2048, "height": 1024}, "baseline": 496})
        processing = item.setdefault("provenance", {}).setdefault("postProcessing", [])
        if "large-actor-512-runtime-cell" not in processing:
            processing.append("large-actor-512-runtime-cell")
        if "mobile-384-virtual-cell" in processing:
            processing.remove("mobile-384-virtual-cell")
    for animation in manifest.get("animations", []):
        if animation.get("family") in {"transport", "boss-crane", "boss-iron-mole"}:
            animation["baseline"] = 496
            animation["runtimeCell"] = {"width": 512, "height": 512}
            animation["runtimeOptimization"] = "large-actor-512-runtime-cell"
    manifest["runtimeLargeActorCell"] = {"width": 512, "height": 512, "roles": ["vehicle", "boss"], "reason": "large-screen-silhouette-fidelity"}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("Restored transport and boss base sheets to 512px runtime cells.")


if __name__ == "__main__":
    main()
