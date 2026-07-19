#!/usr/bin/env python3
"""Finalize physical-frame counts for rescue and boss animation contracts."""

import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(path.read_text())
    rescue_counts = {
        "rescue-technician": {"bound-idle": 2, "struggle": 2, "freed": 1, "ability": 1, "exit": 2},
        "rescue-medic": {"bound-idle": 2, "signal": 2, "freed": 1, "ability": 1, "exit": 2},
        "rescue-artillery": {"bound-idle": 2, "radio": 2, "freed": 1, "ability": 1, "exit": 2},
    }
    for animation in manifest.get("animations", []):
        family = animation.get("family")
        if family in rescue_counts:
            animation["frameCounts"] = rescue_counts[family]
            animation["totalFrames"] = 8
            animation["physicalFrames"] = 8
        elif family == "boss-crane":
            animation.update({"totalFrames": 8, "physicalFrames": 8, "unusedPhysicalFrames": [6]})
        elif family == "boss-iron-mole":
            animation.update({"totalFrames": 8, "physicalFrames": 8, "sharedPhysicalFrames": {"phase-3/core-exposed": 4}})
    for item in [*manifest.get("stageBackgrounds", []), *manifest.get("images", [])]:
        file_path = ROOT / item["path"]
        width, height = Image.open(file_path).size
        item.setdefault("family", item.get("role", item.get("id")))
        item.setdefault("pivot", [0.5, 0.5])
        item.setdefault("sourceSize", {"width": width, "height": height})
        item.setdefault("runtimeSize", {"width": width, "height": height})
        item["status"] = "approved"
        if not item.get("renderOwner"):
            if int(item.get("totalFrames", 1)) > 1 or item.get("frames", 1) > 1:
                item["renderOwner"] = "phaser-spritesheet"
            elif item.get("family") == "vfx":
                item["renderOwner"] = "phaser-image-transient"
            elif item.get("type") in {"tile", "parallax-layer", "background-layer"}:
                item["renderOwner"] = "phaser-tile-sprite"
            else:
                item["renderOwner"] = "phaser-image"
    manifest["physicalEntityAnimationFrames"] = sum(int(animation.get("physicalFrames", animation.get("totalFrames", 0)) or 0) for animation in manifest.get("animations", []))
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Finalized entity animation metadata: {manifest['physicalEntityAnimationFrames']} physical frames.")


if __name__ == "__main__":
    main()
