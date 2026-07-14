#!/usr/bin/env python3
from pathlib import Path
import subprocess
from collections import deque

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "assets" / "_source" / "response-objects-sheet.png"
CROPS = ROOT / "assets" / "_source" / "crops"
OUT = ROOT / "assets" / "images" / "production"
HELPER = Path.home() / ".codex" / "skills" / ".system" / "imagegen" / "scripts" / "remove_chroma_key.py"
CROPS.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

SPECS = [
    ("response-helicopter", 0, 0, (1536, 1024)),
    ("fire-engine", 1, 0, (1024, 1024)),
    ("firebreak-dozer", 2, 0, (1024, 1024)),
    ("pine-ridge-village", 0, 1, (1024, 1024)),
    ("power-substation", 1, 1, (1024, 1024)),
    ("wildlife-refuge", 2, 1, (1024, 1024)),
]


def keep_largest_component(image: Image.Image, threshold: int = 24) -> tuple[Image.Image, int]:
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index] or pixels[x, y] <= threshold:
                visited[index] = 1
                continue
            queue = deque([(x, y)])
            visited[index] = 1
            component = []
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for oy in (-1, 0, 1):
                    for ox in (-1, 0, 1):
                        if not ox and not oy:
                            continue
                        nx, ny = cx + ox, cy + oy
                        if nx < 0 or ny < 0 or nx >= width or ny >= height:
                            continue
                        ni = ny * width + nx
                        if visited[ni]:
                            continue
                        visited[ni] = 1
                        if pixels[nx, ny] > threshold:
                            queue.append((nx, ny))
            if len(component) > 6:
                components.append(component)
    if not components:
        return image, 0
    largest = max(components, key=len)
    keep = set(largest)
    cleaned = image.copy()
    cleaned_alpha = cleaned.getchannel("A")
    cleaned_pixels = cleaned_alpha.load()
    for y in range(height):
        for x in range(width):
            if (x, y) not in keep:
                cleaned_pixels[x, y] = 0
    cleaned.putalpha(cleaned_alpha)
    return cleaned, len(components)


def bounds(index: int, count: int, size: int) -> tuple[int, int]:
    return round(index * size / count), round((index + 1) * size / count)


with Image.open(SHEET).convert("RGB") as sheet:
    for name, column, row, canvas_size in SPECS:
        x0, x1 = bounds(column, 3, sheet.width)
        y0, y1 = bounds(row, 2, sheet.height)
        keyed = CROPS / f"{name}-keyed.png"
        alpha_crop = CROPS / f"{name}-alpha.png"
        sheet.crop((x0, y0, x1, y1)).save(keyed)
        subprocess.run([
            "python3", str(HELPER), "--input", str(keyed), "--out", str(alpha_crop),
            "--auto-key", "border", "--soft-matte", "--transparent-threshold", "14",
            "--opaque-threshold", "210", "--despill", "--edge-contract", "1", "--force",
        ], check=True)
        with Image.open(alpha_crop).convert("RGBA") as transparent:
            transparent, component_count = keep_largest_component(transparent)
            bbox = transparent.getchannel("A").getbbox()
            if not bbox:
                raise RuntimeError(f"empty alpha crop: {name}")
            subject = transparent.crop(bbox)
            target_w, target_h = canvas_size
            # Common asset contract: standard sprites reserve 6-10% authored
            # transparent padding per virtual-cell edge. 80% subject extent = 10%.
            max_w, max_h = int(target_w * 0.80), int(target_h * 0.80)
            scale = min(max_w / subject.width, max_h / subject.height)
            resized = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
            x = (target_w - resized.width) // 2
            y = (target_h - resized.height) // 2
            if name in {"pine-ridge-village", "power-substation", "wildlife-refuge"}:
                platform_colors = {
                    "pine-ridge-village": ((62, 91, 55, 255), (143, 166, 102, 255)),
                    "power-substation": ((55, 70, 75, 255), (121, 151, 158, 255)),
                    "wildlife-refuge": ((48, 92, 55, 255), (124, 171, 96, 255)),
                }
                fill, outline = platform_colors[name]
                draw = ImageDraw.Draw(canvas)
                box = (145, 560, 879, 885)
                draw.rounded_rectangle(box, radius=62, fill=fill, outline=outline, width=12)
            canvas.alpha_composite(resized, (x, y))
            output = OUT / f"{name}.png"
            canvas.save(output, optimize=True)
            final_bbox = canvas.getchannel("A").getbbox()
            print(name, "source", (x0, y0, x1, y1), "components", component_count, "bbox", bbox, "output", canvas_size, "alpha", final_bbox)
