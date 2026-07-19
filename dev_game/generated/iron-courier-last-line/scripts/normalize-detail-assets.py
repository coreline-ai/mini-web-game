#!/usr/bin/env python3
"""Deterministic detail-polish repack for player grounding/fire and ATLAS.

Idempotent: every frame is measured from alpha and normalized to an explicit
runtime contract.  Physics dimensions are owned by JS; this script changes only
visual packing/baselines and never the source identity artwork.
"""
from pathlib import Path
from collections import deque
import json
from PIL import Image, ImageChops, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
ALPHA_THRESHOLD = 24
PLAYER_CELL = 384
PLAYER_BASELINE = 364
TERRAIN_DIR = Path('assets/runtime/environment/terrain')
PLAYER_DIR = Path('assets/runtime/characters/player')
VEHICLE_DIR = Path('assets/runtime/characters/vehicle')


def threshold_bbox(frame):
    alpha = frame.getchannel('A')
    return alpha.point(lambda a: 255 if a >= ALPHA_THRESHOLD else 0).getbbox()


def shift_frame_to_baseline(frame, baseline):
    box = threshold_bbox(frame)
    if not box:
        return frame.copy()
    dy = int(baseline - box[3])
    out = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    out.alpha_composite(frame, (0, dy))
    return out


def normalize_sheet(path, cols, rows, indices, baseline=PLAYER_BASELINE):
    image = Image.open(path).convert('RGBA')
    fw, fh = image.width // cols, image.height // rows
    assert fw == PLAYER_CELL and fh == PLAYER_CELL, (path, image.size)
    output = Image.new('RGBA', image.size, (0, 0, 0, 0))
    for index in range(cols * rows):
        x, y = (index % cols) * fw, (index // cols) * fh
        frame = image.crop((x, y, x + fw, y + fh))
        if index in indices:
            frame = shift_frame_to_baseline(frame, baseline)
        output.alpha_composite(frame, (x, y))
    return output


def save_pair(relative, image, fmt=None):
    for prefix in (ROOT, PUBLIC):
        target = prefix / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        kwargs = {'optimize': True}
        if fmt == 'WEBP' or target.suffix.lower() == '.webp':
            kwargs = {'format': 'WEBP', 'lossless': True, 'quality': 100, 'method': 6}
        image.save(target, **kwargs)


def split_frames(image, cell_w, cell_h):
    cols, rows = image.width // cell_w, image.height // cell_h
    return [image.crop(((i % cols) * cell_w, (i // cols) * cell_h, (i % cols + 1) * cell_w, (i // cols + 1) * cell_h)) for i in range(cols * rows)], cols, rows


def mask_band(frame, start, end, keep_upper):
    alpha = frame.getchannel('A')
    mask = Image.new('L', frame.size, 0)
    pix = mask.load()
    for y in range(frame.height):
        if keep_upper:
            value = 255 if y <= start else 0 if y >= end else round(255 * (end - y) / max(1, end - start))
        else:
            value = 0 if y <= start else 255 if y >= end else round(255 * (y - start) / max(1, end - start))
        for x in range(frame.width):
            pix[x, y] = value
    out = frame.copy()
    out.putalpha(ImageChops.multiply(alpha, mask))
    return out


def compose_fire_pose(lower, upper):
    # Run/jump cadence owns the hips and legs.  Identity-locked firing art owns
    # the torso, face, hands and barrel.  A narrow alpha crossfade hides the
    # waist seam without blending the face or weapon.
    out = Image.new('RGBA', lower.size, (0, 0, 0, 0))
    out.alpha_composite(mask_band(lower, 201, 219, False))
    out.alpha_composite(mask_band(upper, 207, 225, True))
    return out


def build_player_fire_sheets(run, movement, shoot):
    run_frames, _, _ = split_frames(run, PLAYER_CELL, PLAYER_CELL)
    move_frames, _, _ = split_frames(movement, PLAYER_CELL, PLAYER_CELL)
    shoot_frames, _, _ = split_frames(shoot, PLAYER_CELL, PLAYER_CELL)
    # 4 columns x 6 rows = 24 frames; each aim bucket owns 8 continuous frames.
    run_fire = Image.new('RGBA', (PLAYER_CELL * 4, PLAYER_CELL * 6), (0, 0, 0, 0))
    for bucket in range(3):
        upper = shoot_frames[bucket * 4]
        for phase, lower in enumerate(run_frames):
            frame = compose_fire_pose(lower, upper)
            x, y = (phase % 4) * PLAYER_CELL, (bucket * 2 + phase // 4) * PLAYER_CELL
            run_fire.alpha_composite(frame, (x, y))
    # 2 columns x 3 rows: jump/fall cadence for forward/diagonal/up.
    air_fire = Image.new('RGBA', (PLAYER_CELL * 2, PLAYER_CELL * 3), (0, 0, 0, 0))
    for bucket in range(3):
        upper = shoot_frames[bucket * 4]
        for phase, lower in enumerate((move_frames[2], move_frames[3])):
            air_fire.alpha_composite(compose_fire_pose(lower, upper), (phase * PLAYER_CELL, bucket * PLAYER_CELL))
    return run_fire, air_fire


def shift_terrain_to_surface(path):
    image = Image.open(path).convert('RGBA')
    alpha = image.getchannel('A').point(lambda a: 255 if a >= ALPHA_THRESHOLD else 0)
    bbox = alpha.getbbox()
    if not bbox or bbox[1] <= 0:
        return image
    out = Image.new('RGBA', image.size, (0, 0, 0, 0))
    out.alpha_composite(image, (0, -bbox[1]))
    return out


def repack_vehicle_sheet(path, base=False):
    if base:
        frames = [Image.open(ROOT / f'assets/source/cleaned/characters/vehicle/transport-{index:02d}.png').convert('RGBA') for index in range(8)]
        cols, rows = 4, 2
    else:
        image = Image.open(path).convert('RGBA')
        cols = 4
        source_h = 256 if image.height == 1024 else 512
        rows = image.height // source_h
        frames, _, _ = split_frames(image, 512, source_h)
    output = Image.new('RGBA', (2048, rows * 256), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        box = threshold_bbox(frame)
        if not box:
            continue
        subject = frame.crop(box)
        scale = min(468 / subject.width, 210 / subject.height)
        size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
        subject = subject.resize(size, Image.Resampling.LANCZOS)
        cell = Image.new('RGBA', (512, 256), (0, 0, 0, 0))
        # A common armored underride rail makes every drive/damage phase keep
        # the same full-size APC footprint without stretching the artwork.
        # It sits behind the wheels and remains inside the authored height.
        rail = ImageDraw.Draw(cell)
        rail.rounded_rectangle((40, 224, 472, 234), radius=4, fill=(18, 30, 38, 255), outline=(7, 14, 20, 255), width=2)
        rail.line((47, 225, 465, 225), fill=(190, 111, 39, 210), width=2)
        cell.alpha_composite(subject, ((512 - subject.width) // 2, 244 - subject.height))
        output.alpha_composite(cell, ((index % cols) * 512, (index // cols) * 256))
    return output


def largest_component(mask):
    px = mask.load(); w, h = mask.size; seen = bytearray(w*h); components=[]
    for sy in range(h):
        for sx in range(w):
            idx=sy*w+sx
            if seen[idx] or px[sx,sy] < 64: continue
            q=[(sx,sy)]; seen[idx]=1; pts=[]
            while q:
                x,y=q.pop(); pts.append((x,y))
                for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    ni=ny*w+nx
                    if 0<=nx<w and 0<=ny<h and not seen[ni] and px[nx,ny]>=64:
                        seen[ni]=1; q.append((nx,ny))
            components.append(pts)
    keep=max(components,key=len,default=[]); out=Image.new('L',(w,h),0); op=out.load()
    for x,y in keep: op[x,y]=255
    return out


def extract_weapon_overlay(name, crop):
    source = Image.open(PUBLIC / f'assets/runtime/ui/icons/weapon-{name}.png').convert('RGBA').crop(crop)
    lum = source.convert('L')
    # Weapon highlights are materially brighter than the navy plate.  Expand
    # only the largest connected silhouette to recover its dark outline.
    seed = lum.point(lambda v: 255 if v >= 58 else 0)
    seed = ImageChops.multiply(seed, source.getchannel('A'))
    seed = largest_component(seed.filter(ImageFilter.MaxFilter(5)))
    mask = seed.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(0.65))
    rgba = source.copy(); rgba.putalpha(ImageChops.multiply(source.getchannel('A'), mask))
    bbox = threshold_bbox(rgba)
    return rgba.crop(bbox) if bbox else rgba


def update_manifest():
    path = ROOT / 'assets/asset-manifest.json'
    data = json.loads(path.read_text())
    by_id = {item.get('id'): item for item in data.get('images', [])}
    additions = [
        ('player-run-fire-actions', 'assets/runtime/characters/player/player-run-fire-actions.png', 4, 24, 6, ['run-fire-forward']*8 + ['run-fire-diagonal']*8 + ['run-fire-up']*8),
        ('player-air-fire-actions', 'assets/runtime/characters/player/player-air-fire-actions.png', 2, 6, 3, ['jump-fire-forward','fall-fire-forward','jump-fire-diagonal','fall-fire-diagonal','jump-fire-up','fall-fire-up']),
    ]
    for aid, rel, cols, total, rows, states in additions:
        entry = {'id': aid, 'path': rel, 'type': 'spritesheet', 'role': 'animation-sheet', 'entityRole': 'player', 'family': 'player', 'states': states, 'quality': 'production-demo', 'requiresAlpha': True, 'frames': cols, 'totalFrames': total, 'rows': rows, 'frameWidth':384, 'frameHeight':384, 'baseline': PLAYER_BASELINE, 'rootAnchor':'foot-ground-center', 'renderOwner':'phaser-spritesheet', 'status':'approved', 'provenance': {'source':'derived-from-approved-runtime-assets','method':'identity-locked-upper-lower-composite','postProcessing':['grounded-baseline-normalization','run-phase-preservation','aim-bucket-fire-pose','identity-lock']}}
        if aid in by_id: by_id[aid].update(entry)
        else: data['images'].append(entry)
    for aid in ('player-run','player-movement-actions','player-shoot-polished'):
        item=by_id.get(aid)
        if not item: continue
        item['baseline']=PLAYER_BASELINE
        steps=item.setdefault('provenance',{}).setdefault('postProcessing',[])
        if 'detail-grounded-baseline-y-372' not in steps: steps.append('detail-grounded-baseline-y-372')
    for aid in ('transport-actions','transport-extension-a','transport-extension-b','transport-extension-c'):
        item=by_id.get(aid)
        if not item: continue
        item.update({'frameWidth':512,'frameHeight':256,'baseline':244})
        steps=item.setdefault('provenance',{}).setdefault('postProcessing',[])
        if 'trimmed-2to1-uniform-runtime-cell' not in steps: steps.append('trimmed-2to1-uniform-runtime-cell')
    data['detailPolishContract']={'playerGroundedBaseline':PLAYER_BASELINE,'terrainSurfaceGutterPx':0,'atlasFrame':{'width':512,'height':256,'baseline':244},'atlasRuntimeDisplay':{'width':426.7,'height':213.35},'atlasOpaqueTarget':{'width':[360,400],'height':[155,175]}}
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')


def main():
    pdir = PUBLIC / PLAYER_DIR
    run = normalize_sheet(pdir/'player-run.png', 4, 2, set(range(8)))
    movement = normalize_sheet(pdir/'player-movement-actions.png', 4, 2, {0,1,4})
    shoot = normalize_sheet(pdir/'player-shoot-polished.png', 4, 3, set(range(12)))
    save_pair(PLAYER_DIR/'player-run.png', run)
    save_pair(PLAYER_DIR/'player-movement-actions.png', movement)
    save_pair(PLAYER_DIR/'player-shoot-polished.png', shoot)
    run_fire, air_fire = build_player_fire_sheets(run, movement, shoot)
    save_pair(PLAYER_DIR/'player-run-fire-actions.png', run_fire)
    save_pair(PLAYER_DIR/'player-air-fire-actions.png', air_fire)
    for path in sorted((PUBLIC/TERRAIN_DIR).glob('*.png')):
        save_pair(TERRAIN_DIR/path.name, shift_terrain_to_surface(path))
    for name in ('transport-actions.png','transport-extension-a.webp','transport-extension-b.webp','transport-extension-c.webp'):
        path=PUBLIC/VEHICLE_DIR/name
        save_pair(VEHICLE_DIR/name,repack_vehicle_sheet(path, base=name == 'transport-actions.png'), 'WEBP' if path.suffix=='.webp' else None)
    save_pair(PLAYER_DIR/'weapon-shotgun-overlay.png', extract_weapon_overlay('shotgun',(70,78,686,332)))
    save_pair(PLAYER_DIR/'weapon-rocket-overlay.png', extract_weapon_overlay('rocket',(0,96,734,304)))
    update_manifest()
    print('detail assets normalized: player baseline 364, terrain gutter 0, run/air fire poses, ATLAS 512x256 cells')

if __name__=='__main__': main()
