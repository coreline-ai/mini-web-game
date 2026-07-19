#!/usr/bin/env python3
"""Restore canonical player movement colors without redrawing the artwork."""
from collections import deque
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'assets/source/raw/characters/player/player-movement-actions-chromakey.png'
CLEAN = ROOT / 'assets/source/cleaned/characters/player/player-movement-actions.png'


def restore_rgb():
    raw = Image.open(RAW).convert('RGB')
    cleaned = Image.open(CLEAN).convert('RGBA')
    # Rebuild alpha from the canonical raw chroma source. The prior cleaned
    # matte made opaque face pixels translucent, so it cannot be reused as an
    # upper bound. Non-magenta pixels are fully preserved; only key-colored
    # pixels receive a soft reconstructed edge alpha.
    alpha = Image.new('L', cleaned.size, 0)
    width, height = cleaned.size
    raw_px = raw.load(); alpha_px = alpha.load()
    for y in range(height):
        for x in range(width):
            r, g, b = raw_px[x, y]
            low = min(r, b); high = max(r, b)
            dominance = low - g
            balanced = low / max(1, high)
            if dominance > 14 and low > 28 and balanced > 0.52:
                screen_alpha = max(0.0, min(1.0, (1.0 - low / 255.0) ** 1.65))
                value = round(255 * screen_alpha)
                alpha_px[x, y] = 0 if value < 18 else value
            else:
                alpha_px[x, y] = 255
    nearest = [None] * (width * height)
    queue = deque()
    for y in range(height):
        for x in range(width):
            if alpha_px[x, y] >= 200:
                nearest[y * width + x] = raw_px[x, y]
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        color = nearest[y * width + x]
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if not (0 <= nx < width and 0 <= ny < height):
                continue
            index = ny * width + nx
            if nearest[index] is not None or alpha_px[nx, ny] == 0:
                continue
            nearest[index] = color
            queue.append((nx, ny))
    repaired = Image.new('RGBA', cleaned.size, (0,0,0,0)); out = repaired.load()
    for y in range(height):
        for x in range(width):
            a = alpha_px[x, y]
            if not a:
                continue
            # Preserve opaque canonical source colors. Only the soft matte edge
            # borrows the nearest opaque subject color, eliminating magenta.
            color = raw_px[x, y] if a >= 200 else nearest[y * width + x] or raw_px[x, y]
            out[x, y] = (*color, a)
    repaired.save(CLEAN, optimize=True)
    return repaired


def build_runtime(repaired):
    virtual = Image.new('RGBA', (2048, 1024), (0,0,0,0))
    for index in range(8):
        col, row = index % 4, index // 4
        frame = repaired.crop((col*384, row*512, (col+1)*384, (row+1)*512))
        offset_y = 0
        if index == 4:
            bounds = frame.getchannel('A').getbbox()
            if bounds:
                offset_y = 480 - bounds[3]
        virtual.alpha_composite(frame, (col*512 + 64, row*512 + offset_y))
    runtime = virtual.resize((1536, 768), Image.Resampling.LANCZOS)
    normalized = Image.new('RGBA', runtime.size, (0,0,0,0))
    for index in range(8):
        col, row = index % 4, index // 4
        frame = runtime.crop((col*384, row*384, (col+1)*384, (row+1)*384))
        alpha = frame.getchannel('A'); bounds = alpha.getbbox()
        dx = 0; dy = 0
        if bounds:
            pixels = alpha.load(); weighted = total = 0
            for y in range(384):
                for x in range(384):
                    weight = pixels[x, y]
                    if weight >= 24:
                        weighted += x * weight; total += weight
            if total:
                dx = round(192 - weighted / total)
            if index in (0, 1, 4):
                pixels = alpha.load(); solid_bottom = 0
                for py in range(384):
                    if any(pixels[px, py] >= 24 for px in range(384)):
                        solid_bottom = py + 1
                dy = 360 - solid_bottom
        normalized.alpha_composite(frame, (col*384 + dx, row*384 + dy))
    runtime = normalized
    for prefix in (ROOT, ROOT / 'public'):
        destination = prefix / 'assets/runtime/characters/player/player-movement-actions.png'
        destination.parent.mkdir(parents=True, exist_ok=True)
        runtime.save(destination, optimize=True)
    return runtime


def update_manifest():
    path = ROOT / 'assets/asset-manifest.json'
    manifest = json.loads(path.read_text())
    item = next(value for value in manifest['images'] if value.get('id') == 'player-movement-actions')
    processing = item.setdefault('provenance', {}).setdefault('postProcessing', [])
    for step in ('raw-rgb-restoration', 'opaque-color-preservation', 'edge-only-despill', 'identity-lock', 'visual-centroid-x-192', 'grounded-baseline-y-360'):
        if step not in processing:
            processing.append(step)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


def main():
    runtime = build_runtime(restore_rgb())
    update_manifest()
    print(f'restored player movement identity: {runtime.size[0]}x{runtime.size[1]}')


if __name__ == '__main__':
    main()
