#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GAME_ID = "firebreak-commander"
PROMPTS = (ROOT / "art-prompts.md").read_text()


def prompt_hash(key: str) -> str:
    return hashlib.sha256(f"{key}\n{PROMPTS}".encode()).hexdigest()[:16]


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def image_provenance(prompt_key: str, raw_path: str, source_sheet: str | None = None, crop_box: dict | None = None, postprocess: str | None = None) -> dict:
    raw = ROOT / raw_path
    width, height = image_size(raw)
    out = {
        "source": "generated-for-game",
        "generatedFor": GAME_ID,
        "method": "codex-gpt-imagegen-skill",
        "model": "openai-builtin-image_gen (version opaque)",
        "sourceSkill": "imagegen",
        "promptHash": prompt_hash(prompt_key),
        "quality": "high",
        "rawPath": raw_path,
        "rawWidth": width,
        "rawHeight": height,
    }
    if source_sheet:
        out["sourceSheet"] = source_sheet
    if crop_box:
        out["cropBox"] = crop_box
    if postprocess:
        out["postprocess"] = postprocess
    return out


background_specs = [
    ("dry-front", 1, "assets/backgrounds/stage-1-dry-front.webp", "assets/_source/stage-1-dry-front-raw.png"),
    ("wind-shift", 2, "assets/backgrounds/stage-2-wind-shift.webp", "assets/_source/stage-2-wind-shift-raw.png"),
    ("ember-night", 3, "assets/backgrounds/stage-3-ember-night.webp", "assets/_source/stage-3-ember-night-raw.png"),
]

stage_backgrounds = []
for asset_id, stage, path, raw_path in background_specs:
    width, height = image_size(ROOT / path)
    stage_backgrounds.append({
        "id": asset_id,
        "stage": stage,
        "path": path,
        "role": "stage-background",
        "quality": "production-demo",
        "minWidth": 1290,
        "minHeight": 2796,
        "sourceWidth": width,
        "sourceHeight": height,
        "display": {"fit": "cover", "logicalWidth": 390, "logicalHeight": 844},
        "provenance": image_provenance(asset_id, raw_path, postprocess="Lanczos fit to 2160x3840 WebP; restrained Gaussian cleanup; broad-edge contrast preservation; native raw dimensions preserved separately"),
    })

OBJECT_SHEET = "assets/_source/response-objects-sheet.png"
FX_SHEET = "assets/_source/fire-ui-fx-sheet.png"
image_specs = [
    ("response-helicopter", "assets/images/production/response-helicopter.png", "sprite", "feedback", 112, 74, OBJECT_SHEET, {"x": 0, "y": 0, "width": 341, "height": 768}, "object-sheet"),
    ("fire-engine", "assets/images/production/fire-engine.png", "sprite", "vehicle", 34, 34, OBJECT_SHEET, {"x": 341, "y": 0, "width": 342, "height": 768}, "object-sheet"),
    ("firebreak-dozer", "assets/images/production/firebreak-dozer.png", "sprite", "player", 54, 54, OBJECT_SHEET, {"x": 683, "y": 0, "width": 341, "height": 768}, "object-sheet"),
    ("pine-ridge-village", "assets/images/production/pine-ridge-village.png", "sprite", "goal", 66, 66, OBJECT_SHEET, {"x": 0, "y": 768, "width": 341, "height": 768}, "object-sheet"),
    ("power-substation", "assets/images/production/power-substation.png", "sprite", "goal", 66, 66, OBJECT_SHEET, {"x": 341, "y": 768, "width": 342, "height": 768}, "object-sheet"),
    ("wildlife-refuge", "assets/images/production/wildlife-refuge.png", "sprite", "goal", 66, 66, OBJECT_SHEET, {"x": 683, "y": 768, "width": 341, "height": 768}, "object-sheet"),
    ("fx-fire", "assets/images/production/fx-fire.png", "fx", "hazard", 31, 31, FX_SHEET, {"x": 0, "y": 0, "width": 341, "height": 768}, "fx-sheet"),
    ("fx-water", "assets/images/production/fx-water.png", "fx", "collectible", 34, 34, FX_SHEET, {"x": 341, "y": 0, "width": 342, "height": 768}, "fx-sheet"),
    ("fx-smoke", "assets/images/production/fx-smoke.png", "fx", "feedback", 21, 21, FX_SHEET, {"x": 683, "y": 0, "width": 341, "height": 768}, "fx-sheet"),
    ("ui-wind", "assets/images/production/ui-wind.png", "ui", "ui-icon", 27, 27, FX_SHEET, {"x": 0, "y": 768, "width": 341, "height": 768}, "fx-sheet"),
    ("ui-pause", "assets/images/production/ui-pause.png", "ui", "ui-icon", 52, 52, FX_SHEET, {"x": 341, "y": 768, "width": 342, "height": 768}, "fx-sheet"),
    ("ui-containment", "assets/images/production/ui-containment.png", "ui", "reward", 92, 92, FX_SHEET, {"x": 683, "y": 768, "width": 341, "height": 768}, "fx-sheet"),
]

images = []
for asset_id, path, asset_type, role, display_w, display_h, source_sheet, crop_box, prompt_key in image_specs:
    width, height = image_size(ROOT / path)
    images.append({
        "id": asset_id,
        "path": path,
        "type": asset_type,
        "role": role,
        "quality": "production-demo",
        "minWidth": 256 if asset_type != "ui" else 128,
        "minHeight": 256 if asset_type != "ui" else 128,
        "requiresAlpha": True,
        "sourceWidth": width,
        "sourceHeight": height,
        "display": {"logicalWidth": display_w, "logicalHeight": display_h},
        "provenance": image_provenance(prompt_key, source_sheet, source_sheet=source_sheet, crop_box=crop_box, postprocess="auto border chroma removal, despill, alpha padding normalization"),
    })

audio_specs = [
    ("ui_click", "ui", "assets/audio/production/ui_click.wav"),
    ("draw_firebreak", "sfx", "assets/audio/production/draw_firebreak.wav"),
    ("water_drop", "sfx", "assets/audio/production/water_drop.wav"),
    ("truck_deploy", "sfx", "assets/audio/production/truck_deploy.wav"),
    ("fire_ignite", "sfx", "assets/audio/production/fire_ignite.wav"),
    ("fire_extinguish", "sfx", "assets/audio/production/fire_extinguish.wav"),
    ("wind_shift", "sfx", "assets/audio/production/wind_shift.wav"),
    ("objective_warning", "sfx", "assets/audio/production/objective_warning.wav"),
    ("stage_clear", "sfx", "assets/audio/production/stage_clear.wav"),
    ("game_over", "sfx", "assets/audio/production/game_over.wav"),
    ("home_ambient", "bgm", "assets/audio/production/home_ambient.wav"),
    ("fireline_loop", "bgm", "assets/audio/production/fireline_loop.wav"),
]

audio = []
for asset_id, asset_type, path in audio_specs:
    file = ROOT / path
    audio.append({
        "id": asset_id,
        "path": path,
        "type": asset_type,
        "quality": "production-demo",
        "sha256": file_hash(file),
        "provenance": {
            "source": "generated-for-game",
            "generatedFor": GAME_ID,
            "method": "project-local-synthesis",
            "generator": "scripts/generate_audio.py",
        },
    })

manifest = {
    "assetsVersion": "1.0.0",
    "qualityTier": "production-demo",
    "assetIsolation": {"mode": "per-game", "generatedFor": GAME_ID, "noSharedRuntimeAssets": True},
    "assetFidelity": {
        "logicalCanvas": {"width": 390, "height": 844},
        "maxTargetDpr": 3,
        "physicalCanvasTarget": {"width": 1170, "height": 2532},
        "widePhysicalCanvasTarget": {"width": 1290, "height": 2796},
    },
    "imagePolicy": {"allowedFormats": ["png", "webp"], "maxSpriteKB": 4096, "requireAlphaForSprites": True, "minTouchUiSize": 44},
    "audioPolicy": {"allowedFormats": ["wav"], "maxSfxKB": 300, "maxBgmKB": 3072, "maxPeakDb": -1, "maxTrimSilenceMs": 300},
    "imagegen": {
        "method": "codex-gpt-imagegen-skill",
        "model": "openai-builtin-image_gen (version opaque)",
        "sourceSkill": "imagegen",
        "toolMode": "built-in",
        "generatedFor": GAME_ID,
    },
    "sceneFirst": {
        "artboards": ["assets/artboards/home.png", "assets/artboards/game.png", "assets/artboards/pause.png", "assets/artboards/gameover.png"],
        "sliceMap": "assets/artboards/slice-map.json",
        "contactSheets": ["assets/qa/contact-sheets/response-objects.png", "assets/qa/contact-sheets/fire-ui-fx.png", "assets/qa/contact-sheets/game-comparison.png", "assets/qa/contact-sheets/all-production-assets.png", "assets/qa/contact-sheets/final-runtime-captures.png"],
    },
    "stageBackgrounds": stage_backgrounds,
    "images": images,
    "audio": audio,
}

(ROOT / "assets" / "asset-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("wrote", ROOT / "assets" / "asset-manifest.json", "backgrounds", len(stage_backgrounds), "images", len(images), "audio", len(audio))
