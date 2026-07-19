#!/usr/bin/env python3
"""Downscale oversized entity atlases to a mobile-safe 384px virtual cell.

The source/cleaned masters stay untouched. At 3x DPR the largest regular actor
is still rendered at or below native runtime resolution, while decoded texture
memory drops by 43.75% for these sheets.
"""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TARGET_CELL = 384
ENTITY_ROLES = {"player", "enemy"}


def main() -> None:
    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    optimized = []
    families = set()
    for item in manifest.get("images", []):
        is_player_run = item.get("id") == "player-run"
        if not is_player_run and (item.get("role") != "animation-sheet" or item.get("entityRole") not in ENTITY_ROLES):
            continue
        if item.get("frameWidth") != 512 or item.get("frameHeight") != 512:
            continue
        cols = int(item.get("frames", 4))
        rows = int(item.get("rows", 1))
        expected = (cols * 512, rows * 512)
        runtime_rel = Path(item["path"])
        runtime_path = ROOT / runtime_rel
        image = Image.open(runtime_path).convert("RGBA")
        if image.size != expected:
            raise RuntimeError(f"{item['id']}: expected {expected}, got {image.size}")
        resized = image.resize((cols * TARGET_CELL, rows * TARGET_CELL), Image.Resampling.LANCZOS)
        for prefix in (ROOT, ROOT / "public"):
            destination = prefix / runtime_rel
            destination.parent.mkdir(parents=True, exist_ok=True)
            resized.save(destination, optimize=True)
        item["frameWidth"] = TARGET_CELL
        item["frameHeight"] = TARGET_CELL
        item["runtimeSize"] = {"width": cols * TARGET_CELL, "height": rows * TARGET_CELL}
        if isinstance(item.get("baseline"), (int, float)):
            item["baseline"] = round(item["baseline"] * TARGET_CELL / 512)
        processing = item.setdefault("provenance", {}).setdefault("postProcessing", [])
        if "mobile-384-virtual-cell" not in processing:
            processing.append("mobile-384-virtual-cell")
        optimized.append(item["id"])
        family = item.get("family") or ("player" if is_player_run else None)
        if family:
            families.add(family)

    for animation in manifest.get("animations", []):
        if animation.get("family") not in families:
            continue
        if isinstance(animation.get("baseline"), (int, float)) and animation["baseline"] > TARGET_CELL:
            animation["baseline"] = round(animation["baseline"] * TARGET_CELL / 512)
        animation["runtimeCell"] = {"width": TARGET_CELL, "height": TARGET_CELL}
        animation["runtimeOptimization"] = "mobile-384-virtual-cell"

    manifest["runtimeAnimationCell"] = {"width": TARGET_CELL, "height": TARGET_CELL, "reason": "mobile-dpr3-memory-budget"}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Optimized {len(optimized)} entity animation sheets to {TARGET_CELL}px cells.")


if __name__ == "__main__":
    main()
