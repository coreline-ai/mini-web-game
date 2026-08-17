#!/usr/bin/env python3
"""Build the per-game asset manifest with source hashes and runtime metadata."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_record(asset_id: str, rel: str, role: str, source: str) -> dict:
    path = ROOT / rel
    with Image.open(path) as image:
        source_path = ROOT / source
        record = {
            "id": asset_id,
            "path": rel,
            "type": "background" if role in {"background", "stage-background"} else "sprite",
            "role": role,
            "width": image.width,
            "height": image.height,
            "format": image.format.lower(),
            "mode": image.mode,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "quality": "production-demo",
            "provenance": {
                "source": "generated-for-game",
                "generatedFor": "skybreak-gunship",
                "method": "codex-gpt-imagegen-skill",
                "model": "openai-builtin-image_gen (version opaque)",
                "sourceSkill": "imagegen",
                "promptHash": sha256(source_path)[:16] if source_path.exists() else sha256(path)[:16],
                "tool": "image_gen.imagegen",
                "generatedOn": "2026-07-12",
                "rawPath": source,
                "postProcess": "scripts/process_assets.py",
            },
        }
        if role not in {"background", "stage-background", "artboard"}:
            record["requiresAlpha"] = True
            record["alphaBBox"] = image.getchannel("A").getbbox()
        return record


def main() -> None:
    backgrounds = [
        ("city-approach", "assets/backgrounds/city-approach.webp", "assets/_source/city-approach-raw.png"),
        ("city-conflict", "assets/backgrounds/city-conflict.webp", "assets/_source/city-conflict-raw.png"),
        ("bridge-extraction", "assets/backgrounds/bridge-extraction.webp", "assets/_source/bridge-extraction-raw.png"),
    ]
    sprites = [
        ("enemy-rifleman", "enemy-rifleman.png", "enemy", "assets/_source/core-entities-magenta.png"),
        ("enemy-rocketman", "enemy-rocketman.png", "enemy", "assets/_source/core-entities-magenta.png"),
        ("enemy-drone", "enemy-drone.png", "enemy", "assets/_source/core-entities-magenta.png"),
        ("enemy-apc", "enemy-apc.png", "vehicle", "assets/_source/core-entities-magenta.png"),
        ("friendly-rescue-truck", "friendly-rescue-truck.png", "vehicle", "assets/_source/core-entities-magenta.png"),
        ("friendly-civilians", "friendly-civilians.png", "target", "assets/_source/core-entities-magenta.png"),
        ("boss-helicopter", "boss-helicopter.png", "boss", "assets/_source/boss-projectiles-magenta.png"),
        ("boss-helicopter-damaged", "boss-helicopter-damaged.png", "boss", "assets/_source/boss-projectiles-magenta.png"),
        ("boss-missile-pod", "boss-missile-pod.png", "target", "assets/_source/boss-projectiles-magenta.png"),
        ("enemy-missile", "enemy-missile.png", "projectile", "assets/_source/boss-projectiles-magenta.png"),
        ("friendly-guided-missile", "friendly-guided-missile.png", "projectile", "assets/_source/boss-projectiles-magenta.png"),
        ("boss-debris", "boss-debris.png", "feedback", "assets/_source/boss-projectiles-magenta.png"),
        ("hero-gunship", "hero-gunship.png", "player", "assets/_source/hero-gunship-magenta.png"),
        ("ui-tactical-button", "ui-tactical-button.png", "button", "assets/_source/ui-fx-magenta.png"),
        ("ui-pause", "ui-pause.png", "ui-icon", "assets/_source/ui-fx-magenta.png"),
        ("fx-impact", "fx-impact.png", "feedback", "assets/_source/ui-fx-magenta.png"),
        ("fx-explosion", "fx-explosion.png", "feedback", "assets/_source/ui-fx-magenta.png"),
        ("ui-lock", "ui-lock.png", "ui-icon", "assets/_source/ui-fx-magenta.png"),
        ("fx-support-badge", "fx-support-badge.png", "feedback", "assets/_source/ui-fx-magenta.png"),
    ]

    manifest = {
        "assetsVersion": "2.0.0",
        "qualityTier": "production-demo",
        "gameId": "skybreak-gunship",
        "imagePolicy": {
            "allowedFormats": ["png", "webp"],
            "backgroundRuntimeSize": [1440, 3120],
            "spriteSourceSize": [768, 768],
            "requireAlphaForSprites": True,
            "minTouchUiSize": 44,
        },
        "imagegen": {
            "method": "codex-gpt-imagegen-skill",
            "model": "openai-builtin-image_gen (version opaque)",
            "sourceSkill": "imagegen",
            "toolMode": "built-in",
            "generatedFor": "skybreak-gunship"
        },
        "artboards": [
            image_record(f"{name}-artboard", f"assets/artboards/{name}.png", "artboard", f"assets/_source/{name}-artboard-raw.png")
            for name in ["home", "game", "boss", "pause", "result"]
        ],
        "sceneFirst": {
            "artboards": [f"assets/artboards/{name}.png" for name in ["home", "game", "boss", "pause", "result"]],
            "sliceMap": "assets/slice-map.json",
            "contactSheets": [
                "qa/contact-sheets/core-entities-magenta-processed.png",
                "qa/contact-sheets/boss-projectiles-magenta-processed.png",
                "qa/contact-sheets/ui-fx-magenta-processed.png"
            ]
        },
        "stageBackgrounds": [image_record(i, p, "stage-background", s) for i, p, s in backgrounds],
        "images": [
            image_record(i, f"assets/images/{p}", role, source)
            for i, p, role, source in sprites
        ],
        "audio": [
            {
                "id": path.stem,
                "path": str(path.relative_to(ROOT)),
                "type": "ui" if path.stem == "ui_click" else "bgm" if path.stem in {
                    "game_loop", "home_command_ambient", "gunship_mission_loop", "rotor_interior_loop", "boss_intercept_layer"
                } else "sfx",
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
                "provenance": {
                    "source": "generated-for-game",
                    "generatedFor": "skybreak-gunship",
                    "method": "project-audio-synthesis" if path.stem not in {"collect", "game_loop", "game_over", "hit", "ui_click"} else "foundation-procedural-audio",
                    "replacementRequired": path.stem in {"collect", "game_loop", "game_over", "hit"},
                },
            }
            for path in sorted((ASSETS / "audio").glob("*.wav"))
        ],
        "assetPlan": "asset-plan.json",
        "sliceMap": "assets/slice-map.json",
        "assetIsolation": {
            "mode": "per-game",
            "generatedFor": "skybreak-gunship",
            "noSharedRuntimeAssets": True,
        },
    }
    (ASSETS / "asset-manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(f"wrote {ASSETS / 'asset-manifest.json'}")


if __name__ == "__main__":
    main()
