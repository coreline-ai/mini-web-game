#!/usr/bin/env python3
"""Validate a game-feel spritesheet/VFX manifest.

Checks layout math, required fields, pivot/baseline bounds, and optional image
dimensions when Pillow is installed and --image is provided.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    raise SystemExit(1)


def warn(message: str) -> None:
    print(f"[WARN] {message}")


def ok(message: str) -> None:
    print(f"[OK] {message}")


def require_number(value, name: str, *, integer: bool = False, minimum: float | None = None):
    # Python에서 bool은 int의 서브클래스라 isinstance(True, int)가 참이다. 배제하지 않으면
    # `"frames": true`가 정수 1로 통과한다 — 실측으로 그렇게 승인됐다.
    if isinstance(value, bool):
        fail(f"{name} must be a number, not a boolean")
    if integer and not isinstance(value, int):
        fail(f"{name} must be an integer")
    if not integer and not isinstance(value, (int, float)):
        fail(f"{name} must be a number")
    if minimum is not None and value < minimum:
        fail(f"{name} must be >= {minimum}")
    return value


# 스키마의 type/const/enum을 그대로 적용한다. 스키마가 없거나 읽히지 않으면 조용히 넘어가지
# 않고 알린다 — 계약이 사라진 채로 통과하는 것이 가장 나쁘다.
_JSON_TYPES = {
    "string": str, "boolean": bool, "object": dict, "array": list,
    "integer": int, "number": (int, float),
}


def _type_ok(value, expected: str) -> bool:
    if expected in ("integer", "number") and isinstance(value, bool):
        return False   # bool은 숫자가 아니다
    py = _JSON_TYPES.get(expected)
    return py is not None and isinstance(value, py)


def _check_against_schema(data: dict) -> None:
    schema_path = Path(__file__).resolve().parent.parent / "assets" / "templates" / "spritesheet-manifest.schema.json"
    if not schema_path.exists():
        warn(f"schema not found at {schema_path}; type checks skipped")
        return
    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"schema is unreadable ({exc}) — cannot verify manifest types")
        return

    for name, spec in (schema.get("properties") or {}).items():
        if name not in data:
            continue
        value = data[name]
        if "const" in spec and value != spec["const"]:
            fail(f"{name} must be {spec['const']!r} (got {value!r})")
        if "enum" in spec and value not in spec["enum"]:
            fail(f"{name} must be one of {spec['enum']} (got {value!r})")
        expected = spec.get("type")
        if expected and not _type_ok(value, expected):
            fail(f"{name} must be {expected} (got {type(value).__name__}: {value!r})")


def load_image_size(path: Path) -> tuple[int, int] | None:
    try:
        from PIL import Image  # type: ignore
    except Exception:
        warn("Pillow is not installed; skipping image dimension check")
        return None

    with Image.open(path) as img:
        return img.size


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--image", type=Path, help="Optional spritesheet image to check dimensions")
    args = parser.parse_args()

    data = json.loads(args.manifest.read_text(encoding="utf-8"))

    for field in ["id", "type", "motion", "frames", "fps", "layout", "pivot", "loop"]:
        if field not in data:
            fail(f"missing required field: {field}")

    # 필드의 **존재**만 보고 타입을 안 보면 계약이 반쪽이 된다. 동봉된 스키마
    # (assets/templates/spritesheet-manifest.schema.json)는 타입과 const를 정하는데
    # 검증기는 그것을 읽지 않았다 — 실측으로 id:123 · type:"banana" · motion:false ·
    # frames:true · loop:"yes"인 manifest가 [OK]로 승인됐다.
    #
    # jsonschema 패키지에 의존하지 않고 스키마와 동등한 검사를 직접 한다. 이 스크립트는
    # 의존성 없이 도는 것이 요구사항이라, 스키마 파일을 읽어 type/const/enum만 적용한다.
    _check_against_schema(data)

    frames = require_number(data["frames"], "frames", integer=True, minimum=1)
    fps = require_number(data["fps"], "fps", minimum=0.001)

    layout = data["layout"]
    for field in ["columns", "rows", "frameWidth", "frameHeight", "margin", "gap", "paddingInsideFrame"]:
        if field not in layout:
            fail(f"missing layout field: {field}")

    columns = require_number(layout["columns"], "layout.columns", integer=True, minimum=1)
    rows = require_number(layout["rows"], "layout.rows", integer=True, minimum=1)
    frame_width = require_number(layout["frameWidth"], "layout.frameWidth", integer=True, minimum=1)
    frame_height = require_number(layout["frameHeight"], "layout.frameHeight", integer=True, minimum=1)
    margin = require_number(layout["margin"], "layout.margin", integer=True, minimum=0)
    gap = require_number(layout["gap"], "layout.gap", integer=True, minimum=0)
    padding = require_number(layout["paddingInsideFrame"], "layout.paddingInsideFrame", integer=True, minimum=0)

    if frames > columns * rows:
        fail(f"frames ({frames}) exceeds grid capacity ({columns * rows})")

    if padding * 2 >= frame_width or padding * 2 >= frame_height:
        fail("paddingInsideFrame is too large for the frame size")

    expected_width = margin * 2 + columns * frame_width + (columns - 1) * gap
    expected_height = margin * 2 + rows * frame_height + (rows - 1) * gap

    pivot = data["pivot"]
    if not isinstance(pivot, list) or len(pivot) != 2:
        fail("pivot must be [x, y]")
    px = require_number(pivot[0], "pivot[0]")
    py = require_number(pivot[1], "pivot[1]")
    if not (0 <= px <= frame_width and 0 <= py <= frame_height):
        fail("pivot must be inside one frame cell")

    if "baselineY" in data:
        baseline_y = require_number(data["baselineY"], "baselineY")
        if not (0 <= baseline_y <= frame_height):
            fail("baselineY must be inside one frame cell")

    if args.image:
        actual_size = load_image_size(args.image)
        if actual_size is not None and actual_size != (expected_width, expected_height):
            fail(
                f"image size {actual_size[0]}x{actual_size[1]} does not match "
                f"expected {expected_width}x{expected_height}"
            )

    duration_ms = frames / fps * 1000
    ok(f"manifest: {data['id']}")
    ok(f"grid capacity: {columns * rows}, frames: {frames}")
    ok(f"expected sheet size: {expected_width}x{expected_height}")
    ok(f"duration: {duration_ms:.1f}ms at {fps}fps")
    ok("spritesheet manifest passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
