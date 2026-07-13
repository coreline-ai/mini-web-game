#!/usr/bin/env python3
"""Verify Parcel Sort Rush image assets generated through the Codex imagegen skill path."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from integrate_gpt_imagegen_skill_sheets import (  # noqa: E402
    GAME_ID,
    MANIFEST,
    METHOD,
    MODEL,
    QUALITY,
    ROOT,
    TASKS,
    Task,
)

SOURCE_SKILL = "imagegen"


def require_pillow():
    try:
        from PIL import Image  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("Pillow is required for image verification: python3 -m pip install pillow") from exc
    return Image


def load_manifest() -> dict:
    if not MANIFEST.exists():
        raise RuntimeError(f"manifest not found: {MANIFEST}")
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def index_by_id(entries: list[dict]) -> dict[str, dict]:
    return {entry.get("id"): entry for entry in entries if entry.get("id")}


def select_tasks(only: str | None) -> list[Task]:
    if not only:
        return list(TASKS)
    wanted = {part.strip() for chunk in only.split(",") for part in chunk.split() if part.strip()}
    tasks = [task for task in TASKS if task.id in wanted]
    missing = sorted(wanted - {task.id for task in tasks})
    if missing:
        raise RuntimeError(f"unknown required image id(s): {', '.join(missing)}")
    return tasks


def check_provenance(task: Task, entry: dict, errors: list[str], prefix: str) -> None:
    if entry.get("path") != f"assets/images/production/{task.output}":
        errors.append(f"{prefix}: path mismatch: {entry.get('path')} != assets/images/production/{task.output}")
    if entry.get("quality") != QUALITY:
        errors.append(f"{prefix}: quality must be {QUALITY}, got {entry.get('quality')}")
    prov = entry.get("provenance") or {}
    required = {
        "source": "generated-for-game",
        "generatedFor": GAME_ID,
        "method": METHOD,
        "model": MODEL,
        "sourceSkill": SOURCE_SKILL,
        "quality": "high",
    }
    for key, expected in required.items():
        actual = prov.get(key)
        if actual != expected:
            errors.append(f"{prefix}: provenance.{key} must be {expected!r}, got {actual!r}")
    if prov.get("source" + "Api"):
        errors.append(f"{prefix}: external image service provenance is forbidden; use the Codex imagegen skill path")
    if not isinstance(prov.get("rawPath"), str) or not prov.get("rawPath"):
        errors.append(f"{prefix}: provenance.rawPath is required")
    if not isinstance(prov.get("sourceSheet"), str) or not prov.get("sourceSheet"):
        errors.append(f"{prefix}: provenance.sourceSheet is required")
    if not isinstance(prov.get("promptHash"), str) or not prov.get("promptHash"):
        errors.append(f"{prefix}: provenance.promptHash is required")


def check_file(task: Task, entry: dict, errors: list[str]) -> None:
    Image = require_pillow()
    out_path = ROOT / entry.get("path", "")
    if not out_path.exists():
        errors.append(f"{task.id}: output file missing: {entry.get('path')}")
        return
    try:
        with Image.open(out_path) as im:
            if im.size != task.canvas:
                errors.append(f"{task.id}: output size must be {task.canvas[0]}x{task.canvas[1]}, got {im.width}x{im.height}")
            if task.requires_alpha:
                if im.mode not in {"RGBA", "LA"} and "transparency" not in im.info:
                    errors.append(f"{task.id}: output must preserve alpha-capable PNG mode, got {im.mode}")
                else:
                    alpha = im.convert("RGBA").getchannel("A")
                    lo, hi = alpha.getextrema()
                    if lo >= 250:
                        errors.append(f"{task.id}: transparent background pixels not detected")
                    if hi <= 0:
                        errors.append(f"{task.id}: alpha channel is fully transparent")
                    check_alpha_quality(task, im.convert("RGBA"), alpha, errors)
    except Exception as exc:
        errors.append(f"{task.id}: cannot inspect output PNG: {exc}")

    prov = entry.get("provenance") or {}
    for key in ("rawPath", "sourceSheet"):
        rel = prov.get(key)
        if not rel or not (ROOT / rel).exists():
            errors.append(f"{task.id}: provenance.{key} file missing: {rel}")


def alpha_stats(alpha) -> tuple[float, float, float, tuple[int, int, int, int] | None, tuple[int, int, int, int] | None]:
    total = alpha.width * alpha.height
    hist = alpha.histogram()
    transparent = hist[0] / total
    opaque = sum(hist[250:]) / total
    semi = max(0.0, 1.0 - transparent - opaque)
    bbox = alpha.getbbox()
    edge = None
    if bbox:
        edge = (bbox[0], bbox[1], alpha.width - bbox[2], alpha.height - bbox[3])
    return transparent, opaque, semi, bbox, edge


def check_alpha_quality(task: Task, im, alpha, errors: list[str]) -> None:
    transparent, opaque, semi, bbox, edge = alpha_stats(alpha)
    prefix = f"{task.id}: alpha quality"
    role = task.role

    if role in {"parcel", "sort-bin", "scanner", "conveyor"}:
      min_opaque = {"parcel": 0.38, "sort-bin": 0.34, "scanner": 0.18, "conveyor": 0.42}[role]
      max_trans = {"parcel": 0.58, "sort-bin": 0.62, "scanner": 0.86, "conveyor": 0.58}[role]
      # The clean chute art intentionally keeps anti-aliased highlights and a soft base shadow.
      # A 27% limit still catches eroded background removal while accepting the production chutes.
      max_semi = {"parcel": 0.26, "sort-bin": 0.27, "scanner": 0.24, "conveyor": 0.24}[role]
      if opaque < min_opaque:
          errors.append(f"{prefix}: {role} must not be hollow/mostly transparent (opaque {opaque:.1%} < {min_opaque:.0%})")
      if transparent > max_trans:
          errors.append(f"{prefix}: {role} transparent area too high ({transparent:.1%} > {max_trans:.0%})")
      if semi > max_semi:
          errors.append(f"{prefix}: {role} has too many semi-transparent pixels ({semi:.1%} > {max_semi:.0%}); likely eroded by background removal")

    if task.id.startswith("stamp_"):
        if im.width != im.height:
            errors.append(f"{prefix}: feedback stamps must be square, got {im.width}x{im.height}")
        if bbox:
            content_aspect = (bbox[2] - bbox[0]) / max(1, (bbox[3] - bbox[1]))
            if not 0.78 <= content_aspect <= 1.28:
                errors.append(f"{prefix}: stamp content must read as a badge, not a banner (content aspect {content_aspect:.2f})")
        if edge and min(edge) < max(8, round(min(im.size) * 0.04)):
            errors.append(f"{prefix}: stamp content too close to edge {edge}; regenerate with generous padding")

    if task.id.startswith("button_") and task.id != "button_pause":
        if edge and min(edge) < max(6, round(min(im.size) * 0.035)):
            errors.append(f"{prefix}: button glow/bevel touches canvas edge {edge}; regenerate or integrate with more padding")


def verify(tasks: Sequence[Task], manifest_only: bool = False) -> list[str]:
    manifest = load_manifest()
    images = index_by_id(manifest.get("images", []))
    stages = index_by_id(manifest.get("stageBackgrounds", []))
    errors: list[str] = []

    meta = manifest.get("imagegen") or {}
    if meta.get("method") != METHOD:
        errors.append(f"asset-manifest.imagegen.method must be {METHOD!r}, got {meta.get('method')!r}")
    if meta.get("model") != MODEL:
        errors.append(f"asset-manifest.imagegen.model must be {MODEL!r}, got {meta.get('model')!r}")
    if meta.get("sourceSkill") != SOURCE_SKILL:
        errors.append(f"asset-manifest.imagegen.sourceSkill must be {SOURCE_SKILL!r}, got {meta.get('sourceSkill')!r}")

    for task in tasks:
        entry = images.get(task.id)
        if not entry:
            errors.append(f"{task.id}: missing manifest images entry")
            continue
        check_provenance(task, entry, errors, task.id)
        if task.role == "stage-background":
            stage_entry = stages.get(task.id)
            if not stage_entry:
                errors.append(f"{task.id}: missing manifest stageBackgrounds entry")
            else:
                check_provenance(task, stage_entry, errors, f"stageBackgrounds.{task.id}")
        if not manifest_only:
            check_file(task, entry, errors)
    return errors


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify required Parcel Sort Rush image assets are from the Codex imagegen skill.")
    parser.add_argument("--only", help="Verify only selected task ids, comma or space separated.")
    parser.add_argument("--manifest-only", action="store_true", help="Skip PNG/raw file checks; provenance still required.")
    parser.add_argument("--list-required", action="store_true", help="List required image ids and exit.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        tasks = select_tasks(args.only)
        if args.list_required:
            for task in tasks:
                print(task.id)
            return 0
        errors = verify(tasks, manifest_only=args.manifest_only)
    except Exception as exc:
        print(f"[!] Imagegen asset verification failed: {exc}", file=sys.stderr)
        return 1

    if errors:
        print(f"[FAIL] {len(errors)} imagegen asset verification issue(s):", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print(f"[OK] verified {len(tasks)} imagegen skill assets in {MANIFEST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
