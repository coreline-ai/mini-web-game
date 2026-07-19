from pathlib import Path
import hashlib
import json


ROOT = Path(__file__).resolve().parents[1]
GAME = "last-light-zero-hour"


def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def prompt_hash(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def image_provenance(prompt):
    return {
        "source": "generated-for-game", "generatedFor": GAME,
        "method": "codex-gpt-imagegen-skill", "model": "openai-builtin-image_gen (version opaque)", "sourceSkill": "imagegen",
        "promptHash": prompt_hash(prompt),
    }


def audio_provenance(name):
    return {
        "source": "generated-for-game", "generatedFor": GAME,
        "method": "procedural-audio-synthesis", "model": "python-wave-synth-v1", "sourceSkill": "game-audio",
        "promptHash": prompt_hash(name),
    }


backgrounds = []
for index, name in enumerate(["dawn", "day", "dusk", "night", "bloodmoon"], 1):
    path = f"assets/backgrounds/bg-{name}.jpg"
    backgrounds.append({
        "id": f"phase-{index}-{name}", "stage": index, "path": path, "role": "stage-background", "delivery": "runtime",
        "quality": "production-demo", "minWidth": 1440, "minHeight": 2560,
        "sourceWidth": 1440, "sourceHeight": 2560,
        "display": {"fit": "cover", "logicalWidth": 1440, "logicalHeight": 2560},
        "provenance": image_provenance(f"LAST LIGHT fixed top-down boulevard lighting phase {name}"), "sha256": sha(path),
    })


image_specs = [
    ("player-gunner-motion", "assets/sprites/player/player-gunner-motion.png", "response-unit-motion-sheet", "sprite-sheet", 1024, 1024),
    ("player-gunner-preview", "assets/sprites/player/player-gunner-preview.png", "player", "sprite", 512, 512),
    ("weapon-models", "assets/sprites/player/weapon-models.png", "weapon", "sprite-sheet", 1280, 384),
    ("zombie-walker-motion", "assets/sprites/enemies/zombie-walker-motion.png", "enemy-motion-sheet", "sprite-sheet", 1024, 1024),
    ("zombie-walker-preview", "assets/sprites/enemies/zombie-walker-preview.png", "enemy", "sprite", 512, 512),
    ("zombie-runner-motion", "assets/sprites/enemies/zombie-runner-motion.png", "enemy-motion-sheet", "sprite-sheet", 1024, 1024),
    ("zombie-brute-motion", "assets/sprites/enemies/zombie-brute-motion.png", "elite-enemy", "sprite-sheet", 1024, 1024),
    ("titan-motion", "assets/sprites/boss/titan-motion.png", "boss-motion-sheet", "sprite-sheet", 1024, 1024),
    ("titan-preview", "assets/sprites/boss/titan-preview.png", "boss", "sprite", 512, 512),
    ("ui-pause", "assets/ui/ui-pause.png", "pause-button", "ui", 1024, 1024),
    ("ui-weapon-card", "assets/ui/ui-weapon-card.png", "button", "ui", 1024, 1024),
    ("fx-infected-burst", "assets/fx/fx-infected-burst.png", "feedback", "fx", 1024, 1024),
]
images = []
for id_, path, role, type_, w, h in image_specs:
    images.append({
        "id": id_, "path": path, "role": role, "type": type_, "quality": "production-demo", "delivery": "runtime",
        "minWidth": w, "minHeight": h, "requiresAlpha": True,
        "provenance": image_provenance(f"LAST LIGHT technical sprite sheet {id_} fixed root anchor equal cells"),
        "sha256": sha(path),
        "transparentPadding": {"targetPercent": 8, "allowedRangePercent": [2, 18], "kind": "motion-sheet"},
    })


audio_specs = [
    ("ui-start", "ui-start.wav", "ui"), ("gatling", "gatling.wav", "sfx"),
    ("scatter", "scatter.wav", "sfx"), ("arc", "arc.wav", "sfx"),
    ("rocket", "rocket.wav", "sfx"), ("rail", "rail.wav", "sfx"),
    ("impact", "impact.wav", "sfx"), ("explosion", "explosion.wav", "sfx"),
    ("core-pickup", "core-pickup.wav", "sfx"), ("overheat", "overheat.wav", "sfx"),
    ("zombie", "zombie.wav", "sfx"), ("last-stand", "last-stand.wav", "sfx"),
    ("survival-loop", "survival-loop.wav", "bgm"),
]
audio = []
for id_, filename, type_ in audio_specs:
    path = f"assets/audio/{filename}"
    audio.append({
        "id": id_, "path": path, "type": type_, "quality": "production-demo", "delivery": "runtime", "required": True,
        "loopable": type_ == "bgm", "provenance": audio_provenance(id_), "sha256": sha(path),
    })


manifest = {
    "assetsVersion": "1.0.0", "qualityTier": "production-demo",
    "assetLayout": {"version": "runtime-assets-v1", "runtimeRoot": "assets"},
    "assetIsolation": {"mode": "per-game", "generatedFor": GAME, "noSharedRuntimeAssets": True},
    "assetFidelity": {"logicalCanvas": {"width": 1440, "height": 2560}, "maxTargetDpr": 2, "physicalCanvasTarget": {"width": 1440, "height": 2560}},
    "runtimeBudgetBytes": 20971520,
    "imagePolicy": {"allowedFormats": ["png", "jpg", "jpeg"], "maxSpriteKB": 4096, "requireAlphaForSprites": True, "minTouchUiSize": 44, "transparentPadding": {"standardPercent": [4, 14], "rotationOrStrongFxMaxPercent": 18}},
    "audioPolicy": {"allowedFormats": ["wav"], "maxSfxKB": 300, "maxBgmKB": 4096, "maxPeakDb": -1, "maxTrimSilenceMs": 350},
    "imagegen": {"method": "codex-gpt-imagegen-skill", "model": "openai-builtin-image_gen (version opaque)", "sourceSkill": "imagegen", "toolMode": "built-in", "generatedFor": GAME},
    "stageBackgrounds": backgrounds, "images": images, "audio": audio, "files": [],
}

(ROOT / "assets" / "asset-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Wrote production asset manifest")
