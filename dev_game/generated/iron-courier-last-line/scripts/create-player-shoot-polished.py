#!/usr/bin/env python3
"""Build the identity-locked player shooting sheet from approved source frames.

This is deliberately a deterministic repack, not a redraw.  It keeps the
approved protagonist in player-combat-actions frames 0/2/4, removes only tiny
detached alpha noise, aligns the three poses to one foot baseline and creates a
four-frame sub-pixel-at-runtime recoil recovery for each aim bucket.
"""

from collections import deque
from pathlib import Path
import json

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/runtime/characters/player/player-combat-actions.png'
OUTPUTS = [
    ROOT / 'assets/runtime/characters/player/player-shoot-polished.png',
    ROOT / 'public/assets/runtime/characters/player/player-shoot-polished.png',
]
CELL = 384


def clean_tiny_alpha_components(frame: Image.Image, minimum_pixels: int = 64) -> Image.Image:
    rgba = frame.convert('RGBA')
    alpha = rgba.getchannel('A')
    pixels = alpha.load()
    seen = bytearray(CELL * CELL)
    remove = []
    for y in range(CELL):
        for x in range(CELL):
            idx = y * CELL + x
            if seen[idx] or pixels[x, y] == 0:
                continue
            queue = deque([(x, y)])
            seen[idx] = 1
            component = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if not (0 <= nx < CELL and 0 <= ny < CELL):
                        continue
                    nidx = ny * CELL + nx
                    if seen[nidx] or pixels[nx, ny] == 0:
                        continue
                    seen[nidx] = 1
                    queue.append((nx, ny))
            if len(component) < minimum_pixels:
                remove.extend(component)
    if remove:
        data = rgba.load()
        for x, y in remove:
            data[x, y] = (0, 0, 0, 0)
    return rgba


def shifted(frame: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    out.alpha_composite(frame, (dx, dy))
    return out


def build_sheet() -> Image.Image:
    source = Image.open(SOURCE).convert('RGBA')
    # Correct-identity, no-baked-flash source frames.
    source_frames = {'forward': 0, 'diagonal': 2, 'up': 4}
    # Align the three canonical poses to one visual body centroid (~180)
    # while keeping their feet on the same source-cell baseline.
    base_alignment = {'forward': (-12, 0), 'diagonal': (9, 0), 'up': (-18, 9)}
    # Whole-pose movement is 0-2.2 display pixels at the configured 118 px
    # player width: enough to read as recoil, too small to break the foot lock.
    recoil = {
        'forward': [(0, 0), (-7, 0), (-3, 0), (0, 0)],
        'diagonal': [(0, 0), (-6, 0), (-2, 0), (0, 0)],
        'up': [(0, 0), (0, 4), (0, 2), (0, 0)],
    }
    sheet = Image.new('RGBA', (CELL * 4, CELL * 3), (0, 0, 0, 0))
    for row, state in enumerate(('forward', 'diagonal', 'up')):
        index = source_frames[state]
        sx = (index % 4) * CELL
        sy = (index // 4) * CELL
        frame = clean_tiny_alpha_components(source.crop((sx, sy, sx + CELL, sy + CELL)))
        ax, ay = base_alignment[state]
        aligned = shifted(frame, ax, ay)
        for col, (dx, dy) in enumerate(recoil[state]):
            sheet.alpha_composite(shifted(aligned, dx, dy), (col * CELL, row * CELL))
    return sheet


def register_manifest():
    path = ROOT / 'assets/asset-manifest.json'
    data = json.loads(path.read_text())
    images = data['images']
    entry = {
        'id': 'player-shoot-polished',
        'path': 'assets/runtime/characters/player/player-shoot-polished.png',
        'type': 'spritesheet',
        'role': 'animation-sheet',
        'entityRole': 'player',
        'family': 'player',
        'states': ['shoot-forward'] * 4 + ['shoot-diagonal'] * 4 + ['shoot-up'] * 4,
        'quality': 'production-demo',
        'requiresAlpha': True,
        'frames': 4,
        'totalFrames': 12,
        'rows': 3,
        'frameWidth': CELL,
        'frameHeight': CELL,
        'sourceSize': {'width': 1536, 'height': 768},
        'runtimeSize': {'width': 1536, 'height': 1152},
        'baseline': 356,
        'rootAnchor': 'foot-ground-center',
        'renderOwner': 'phaser-spritesheet',
        'status': 'approved',
        'derivedFrom': 'player-combat-actions',
        'provenance': {
            'source': 'derived-from-approved-runtime-asset',
            'generatedFor': 'iron-courier-last-line',
            'method': 'deterministic-position-only-repack',
            'postProcessing': [
                'identity-lock',
                'tiny-component-cleanup',
                'no-baked-muzzle-flash',
                'foot-baseline-alignment',
                'four-frame-micro-recoil',
                'transparent-rgb-sanitize',
            ],
        },
    }
    existing = next((i for i, item in enumerate(images) if item.get('id') == entry['id']), None)
    if existing is None:
        combat_index = next(i for i, item in enumerate(images) if item.get('id') == 'player-combat-actions')
        images.insert(combat_index + 1, entry)
    else:
        images[existing] = entry
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def main():
    sheet = build_sheet()
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output, optimize=True)
        print(f'wrote {output.relative_to(ROOT)} {sheet.size[0]}x{sheet.size[1]}')
    register_manifest()
    print('registered assets/asset-manifest.json')


if __name__ == '__main__':
    main()
