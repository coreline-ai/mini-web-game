#!/usr/bin/env python3
"""Idempotently register the Phase 6 production image assets."""

import hashlib
import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "assets/asset-manifest.json"

PROMPTS = {
    "ui": "Iron Courier production 4x2 industrial harbor UI atlas, eight isolated controls and frames, no text, chroma green.",
    "environment-prop": "Iron Courier production 4x2 industrial harbor prop atlas, eight isolated side-view props, no text, chroma green.",
    "vfx": "Iron Courier production 4x2 chronological cream cyan orange arcade hit-spark sequence, chroma green.",
}


def provenance(family: str, post_processing: list[str]) -> dict:
    return {
        "source": "generated-for-game",
        "generatedFor": "iron-courier-last-line",
        "method": "codex-gpt-imagegen-skill",
        "model": "gpt 이미지젠 스킬",
        "sourceSkill": "imagegen",
        "promptHash": hashlib.sha256(PROMPTS[family].encode()).hexdigest(),
        "postProcessing": post_processing,
    }


def entry(asset_id: str, relative_path: str, asset_type: str, role: str, family: str, *, spritesheet: bool = False) -> dict:
    width, height = Image.open(ROOT / relative_path).size
    result = {
        "id": asset_id,
        "path": relative_path,
        "type": asset_type,
        "role": role,
        "family": family,
        "quality": "production-demo",
        "requiresAlpha": True,
        "runtimeSize": {"width": width, "height": height},
        "renderOwner": "phaser-spritesheet" if spritesheet else "phaser-image",
        "status": "approved",
    }
    if spritesheet:
        result.update({"frames": 4, "totalFrames": 8, "rows": 2, "frameWidth": 512, "frameHeight": 512})
    result["provenance"] = provenance(
        family,
        ["chroma-key-removal", "soft-matte", "despill", "proportional-cell-repack"]
        if spritesheet
        else ["chroma-key-removal", "soft-matte", "despill", "grid-rule-detection", "alpha-bbox-trim"],
    )
    return result


def main() -> None:
    data = json.loads(MANIFEST.read_text())
    additions = []
    for name in [
        "joystick-base", "joystick-knob", "action-fire", "action-jump", "action-grenade", "action-pause", "hud-frame", "menu-button-base",
        "action-fire-pressed", "action-fire-disabled", "action-jump-pressed", "action-jump-disabled", "action-grenade-pressed", "action-grenade-disabled",
    ]:
        semantic_type = "ui-control" if "action" in name or "joystick" in name else "ui-frame"
        additions.append(entry(f"ui-{name}", f"assets/runtime/ui/{name}.png", semantic_type, semantic_type, "ui"))
    for name in ["shipping-crate", "barricade", "chain-fence", "flood-lamp", "pipe-cluster", "warning-plate", "cable-hook", "debris"]:
        additions.append(entry(f"prop-{name}", f"assets/runtime/environment/props/prop-{name}.png", "prop", "environment-prop", "environment-prop"))
    additions.append(entry("fx-hit-spark-sequence", "assets/runtime/vfx/hit-spark-sequence.png", "sprite", "combat-vfx", "vfx", spritesheet=True))

    additions_by_id = {item["id"]: item for item in additions}
    data["images"] = [item for item in data.get("images", []) if item.get("id") not in additions_by_id]
    data["images"].extend(additions)
    allowed = data.setdefault("assetCoverageContract", {}).setdefault("allowedRuntimeVisuals", [])
    for value in ["dynamic-loading-progress", "cinematic-color-grade", "modal-input-mask"]:
        if value not in allowed:
            allowed.append(value)
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"Registered {len(additions)} Phase 6 image assets in {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
