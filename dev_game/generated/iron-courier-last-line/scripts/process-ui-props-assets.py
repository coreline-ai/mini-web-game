#!/usr/bin/env python3
"""Repack approved chroma-cleaned UI, VFX, and environment atlases.

The image generator is not guaranteed to return the requested pixel dimensions.
This script therefore derives proportional cell bounds, then writes deterministic
runtime files and mirrors them into Vite's public asset tree.
"""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[1]


def proportional_cell(image: Image.Image, col: int, row: int, cols: int = 4, rows: int = 2, inset: int = 0) -> Image.Image:
    x0 = round(image.width * col / cols)
    x1 = round(image.width * (col + 1) / cols)
    y0 = round(image.height * row / rows)
    y1 = round(image.height * (row + 1) / rows)
    return image.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))


def _runs(indices: list[int]) -> list[tuple[int, int]]:
    if not indices:
        return []
    result: list[tuple[int, int]] = []
    start = previous = indices[0]
    for value in indices[1:]:
        if value != previous + 1:
            result.append((start, previous + 1))
            start = value
        previous = value
    result.append((start, previous + 1))
    return result


def detected_grid_cells(image: Image.Image, cols: int = 4, rows: int = 2) -> list[Image.Image]:
    """Split an image-generated grid even when columns are not mathematically equal.

    The UI source contains fully opaque cream separator rules. Detecting those
    rules avoids leaking them into runtime buttons and panels.
    """
    alpha = image.getchannel("A")
    vertical = _runs([
        x for x in range(image.width)
        if sum(alpha.getpixel((x, y)) > 250 for y in range(image.height)) > image.height * 0.9
    ])
    horizontal = _runs([
        y for y in range(image.height)
        if sum(alpha.getpixel((x, y)) > 250 for x in range(image.width)) > image.width * 0.9
    ])
    if len(vertical) != cols + 1 or len(horizontal) != rows + 1:
        raise ValueError(f"Expected {cols + 1}x{rows + 1} grid rules, found {vertical} / {horizontal}")
    x_ranges = [(vertical[index][1], vertical[index + 1][0]) for index in range(cols)]
    y_ranges = [(horizontal[index][1], horizontal[index + 1][0]) for index in range(rows)]
    return [
        image.crop((x_ranges[col][0], y_ranges[row][0], x_ranges[col][1], y_ranges[row][1]))
        for row in range(rows)
        for col in range(cols)
    ]


def trim_alpha(image: Image.Image, padding: int = 8) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 0 if value < 32 else value)
    rgba.putalpha(alpha)
    alpha = rgba.getchannel("A")
    occupied_x = [
        x for x in range(rgba.width)
        if sum(alpha.getpixel((x, y)) > 32 for y in range(rgba.height)) >= 3
    ]
    occupied_y = [
        y for y in range(rgba.height)
        if sum(alpha.getpixel((x, y)) > 32 for x in range(rgba.width)) >= 3
    ]
    if not occupied_x or not occupied_y:
        return rgba
    left, top, right, bottom = min(occupied_x), min(occupied_y), max(occupied_x) + 1, max(occupied_y) + 1
    return rgba.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(rgba.width, right + padding),
        min(rgba.height, bottom + padding),
    ))


def sanitize_transparent_rgb(image: Image.Image) -> Image.Image:
    """Set fully transparent pixels to transparent black for stable GPU sampling/QA."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def save_mirrored(image: Image.Image, relative: str) -> None:
    for prefix in (ROOT, ROOT / "public"):
        destination = prefix / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, optimize=True)


def split_trimmed(source: str, names: list[str], destination: str, inset: int = 0, detect_grid: bool = False, scale: int = 1) -> None:
    image = Image.open(ROOT / source).convert("RGBA")
    detected = detected_grid_cells(image) if detect_grid else None
    for index, name in enumerate(names):
        cell = detected[index] if detected else proportional_cell(image, index % 4, index // 4, inset=inset)
        asset = trim_alpha(cell)
        if scale > 1:
            asset = asset.resize((asset.width * scale, asset.height * scale), Image.Resampling.LANCZOS)
        save_mirrored(sanitize_transparent_rgb(asset), f"{destination}/{name}.png")


def repack_spark_sequence() -> None:
    source = Image.open(ROOT / "assets/source/cleaned/vfx/hit-spark-sequence.png").convert("RGBA")
    sheet = Image.new("RGBA", (2048, 1024), (0, 0, 0, 0))
    for index in range(8):
        cell = proportional_cell(source, index % 4, index // 4)
        cell = cell.resize((512, 512), Image.Resampling.LANCZOS)
        sheet.alpha_composite(cell, ((index % 4) * 512, (index // 4) * 512))
    save_mirrored(sheet, "assets/runtime/vfx/hit-spark-sequence.png")


def create_button_state_variants() -> None:
    for name in ["action-fire", "action-jump", "action-grenade"]:
        base = Image.open(ROOT / f"assets/runtime/ui/{name}.png").convert("RGBA")
        alpha = base.getchannel("A")
        pressed_rgb = ImageEnhance.Contrast(ImageEnhance.Brightness(base.convert("RGB")).enhance(0.72)).enhance(1.12)
        pressed = pressed_rgb.convert("RGBA"); pressed.putalpha(alpha)
        disabled_rgb = ImageOps.grayscale(base.convert("RGB")).convert("RGB")
        disabled_rgb = ImageEnhance.Brightness(disabled_rgb).enhance(0.48)
        disabled = disabled_rgb.convert("RGBA"); disabled.putalpha(alpha.point(lambda value: round(value * 0.72)))
        save_mirrored(sanitize_transparent_rgb(pressed), f"assets/runtime/ui/{name}-pressed.png")
        save_mirrored(sanitize_transparent_rgb(disabled), f"assets/runtime/ui/{name}-disabled.png")


def main() -> None:
    split_trimmed(
        "assets/source/cleaned/ui/controls-ui-atlas.png",
        [
            "joystick-base",
            "joystick-knob",
            "action-fire",
            "action-jump",
            "action-grenade",
            "action-pause",
            "hud-frame",
            "menu-button-base",
        ],
        "assets/runtime/ui",
        detect_grid=True,
        scale=2,
    )
    split_trimmed(
        "assets/source/cleaned/environment/props/harbor-props-atlas.png",
        [
            "prop-shipping-crate",
            "prop-barricade",
            "prop-chain-fence",
            "prop-flood-lamp",
            "prop-pipe-cluster",
            "prop-warning-plate",
            "prop-cable-hook",
            "prop-debris",
        ],
        "assets/runtime/environment/props",
    )
    repack_spark_sequence()
    create_button_state_variants()
    print("UI, harbor props, and hit-spark assets repacked successfully.")


if __name__ == "__main__":
    main()
