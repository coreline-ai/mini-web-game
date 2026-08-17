#!/usr/bin/env python3
"""Normalize generated Skybreak Gunship art into runtime-ready assets."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "_source"
BACKGROUNDS = ROOT / "assets" / "backgrounds"
IMAGES = ROOT / "assets" / "images"
QA = ROOT / "qa" / "contact-sheets"

TARGET_BG = (1440, 3120)


def cover_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    src_w, src_h = image.size
    scale = max(target_w / src_w, target_h / src_h)
    resized = image.resize(
        (round(src_w * scale), round(src_h * scale)), Image.Resampling.LANCZOS
    )
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def save_background(src: Path, dst: Path) -> dict:
    image = Image.open(src).convert("RGB")
    runtime = cover_resize(image, TARGET_BG)
    # The raw imagegen render carries sub-pixel facade grain that aliases after
    # mobile downscaling. A restrained optical low-pass preserves silhouettes
    # while keeping the runtime background behind the target layer.
    runtime = runtime.filter(ImageFilter.GaussianBlur(1.28))
    runtime.save(dst, "WEBP", quality=91, method=6)
    return {
        "source": str(src.relative_to(ROOT)),
        "runtime": str(dst.relative_to(ROOT)),
        "source_size": image.size,
        "runtime_size": runtime.size,
    }


def chroma_alpha(image: Image.Image) -> Image.Image:
    """Remove saturated magenta while preserving dark and neutral subject pixels."""
    rgb = image.convert("RGB")
    px = rgb.load()
    alpha = Image.new("L", rgb.size, 255)
    apx = alpha.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = px[x, y]
            # Generated key varies slightly around FF00FF. Distance-like matte
            # avoids a hard fringe while leaving red armor and blue lights opaque.
            magenta_strength = min(r, b) - g
            magenta_balance = abs(r - b)
            channel_peak = max(r, b)
            # The generator also produces dark magenta contact shadows. Treat
            # those as key spill rather than as sprite pixels.
            magenta_like = (
                r >= g * 1.28 + 7
                and b >= g * 1.28 + 7
                and magenta_balance <= max(48, channel_peak * 0.42)
            )
            if magenta_like and magenta_strength >= 30:
                apx[x, y] = 0
            elif magenta_like and magenta_strength >= 12:
                apx[x, y] = round(255 * (30 - magenta_strength) / 18)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.55))
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba


def trim_and_square(image: Image.Image, canvas: int = 768, inset: int = 54) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("Sprite cell became fully transparent")
    item = image.crop(bbox)
    max_dim = canvas - inset * 2
    scale = min(max_dim / item.width, max_dim / item.height)
    item = item.resize(
        (max(1, round(item.width * scale)), max(1, round(item.height * scale))),
        Image.Resampling.LANCZOS,
    )
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    # Center horizontally and use a stable lower anchor for in-world placement.
    x = (canvas - item.width) // 2
    y = canvas - inset - item.height
    out.alpha_composite(item, (x, y))
    return out


def split_sheet(
    src: Path,
    names: list[str],
    crop_overrides: dict[str, tuple[int, int, int, int]] | None = None,
) -> list[dict]:
    sheet = chroma_alpha(Image.open(src))
    cols, rows = 3, 2
    cell_w, cell_h = sheet.width // cols, sheet.height // rows
    records = []
    thumbs = []
    for index, name in enumerate(names):
        col, row = index % cols, index // cols
        default_crop = (
            col * cell_w,
            row * cell_h,
            (col + 1) * cell_w,
            (row + 1) * cell_h,
        )
        cell = sheet.crop((crop_overrides or {}).get(name, default_crop))
        sprite = trim_and_square(cell)
        dst = IMAGES / f"{name}.png"
        sprite.save(dst, optimize=True)
        alpha = sprite.getchannel("A")
        opaque_ratio = sum(v > 8 for v in alpha.getdata()) / (sprite.width * sprite.height)
        records.append(
            {
                "id": name,
                "path": str(dst.relative_to(ROOT)),
                "size": sprite.size,
                "opaque_ratio": round(opaque_ratio, 4),
                "alpha_bbox": alpha.getbbox(),
            }
        )
        thumb = sprite.resize((256, 256), Image.Resampling.LANCZOS)
        checker = Image.new("RGBA", thumb.size, (18, 30, 42, 255))
        tile = 16
        for y in range(0, 256, tile):
            for x in range(0, 256, tile):
                if (x // tile + y // tile) % 2:
                    checker.paste((30, 49, 64, 255), (x, y, x + tile, y + tile))
        checker.alpha_composite(thumb)
        thumbs.append(checker)

    contact = Image.new("RGBA", (256 * cols, 256 * rows), (8, 15, 24, 255))
    for index, thumb in enumerate(thumbs):
        contact.alpha_composite(thumb, ((index % cols) * 256, (index // cols) * 256))
    QA.mkdir(parents=True, exist_ok=True)
    contact.save(QA / f"{src.stem}-processed.png", optimize=True)
    return records


def process_hero_cutout(src: Path, dst: Path) -> dict:
    keyed = chroma_alpha(Image.open(src))
    bbox = keyed.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("Hero cutout became fully transparent")
    item = keyed.crop(bbox).filter(ImageFilter.GaussianBlur(0.32))
    max_size = (1408, 896)
    scale = min(max_size[0] / item.width, max_size[1] / item.height, 1.0)
    item = item.resize(
        (round(item.width * scale), round(item.height * scale)), Image.Resampling.LANCZOS
    )
    canvas = Image.new("RGBA", (item.width + 96, item.height + 96), (0, 0, 0, 0))
    canvas.alpha_composite(item, (48, 48))
    canvas.save(dst, optimize=True)
    return {
        "id": "hero-gunship",
        "path": str(dst.relative_to(ROOT)),
        "size": canvas.size,
        "alpha_bbox": canvas.getchannel("A").getbbox(),
    }


def main() -> None:
    BACKGROUNDS.mkdir(parents=True, exist_ok=True)
    IMAGES.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)

    backgrounds = [
        save_background(SOURCE / "city-approach-raw.png", BACKGROUNDS / "city-approach.webp"),
        save_background(SOURCE / "city-conflict-raw.png", BACKGROUNDS / "city-conflict.webp"),
        save_background(
            SOURCE / "bridge-extraction-raw.png", BACKGROUNDS / "bridge-extraction.webp"
        ),
    ]

    sprites = []
    sprites.extend(
        split_sheet(
            SOURCE / "core-entities-magenta.png",
            [
                "enemy-rifleman",
                "enemy-rocketman",
                "enemy-drone",
                "enemy-apc",
                "friendly-rescue-truck",
                "friendly-civilians",
            ],
            {
                "enemy-rocketman": (512, 0, 930, 512),
                "enemy-drone": (900, 0, 1536, 512),
            },
        )
    )
    sprites.append(
        process_hero_cutout(
            SOURCE / "hero-gunship-magenta.png", IMAGES / "hero-gunship.png"
        )
    )
    sprites.extend(
        split_sheet(
            SOURCE / "boss-projectiles-magenta.png",
            [
                "boss-helicopter",
                "boss-helicopter-damaged",
                "boss-missile-pod",
                "enemy-missile",
                "friendly-guided-missile",
                "boss-debris",
            ],
            {
                "friendly-guided-missile": (512, 512, 940, 1024),
                "boss-debris": (940, 512, 1536, 1024),
            },
        )
    )
    sprites.extend(
        split_sheet(
            SOURCE / "ui-fx-magenta.png",
            [
                "ui-tactical-button",
                "ui-pause",
                "fx-impact",
                "fx-explosion",
                "ui-lock",
                "fx-support-badge",
            ],
            {
                "ui-tactical-button": (0, 0, 620, 512),
                "ui-pause": (620, 0, 1024, 512),
                "ui-lock": (512, 512, 960, 1024),
                "fx-support-badge": (960, 512, 1536, 1024),
            },
        )
    )

    report = {"backgrounds": backgrounds, "sprites": sprites}
    (QA / "asset-processing-report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
