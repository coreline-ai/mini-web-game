#!/usr/bin/env python3
"""Build Round 3 single-sprite player/weapon composites.

Each 384px frame is one production render unit:
  clean character pose -> detailed held weapon -> tiny authored foreground-hand ROI.
No independent runtime overlay, color-classified body erasure, or alpha equip fade is used.
"""
from __future__ import annotations
from pathlib import Path
from collections import deque
import json, math
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/runtime/characters/player'
PUB = ROOT / 'public/assets/runtime/characters/player'
QA = ROOT / 'qa-captures/detail-round3/generated-assets'
CELL = 384

WEAPONS = {
    'shotgun': {'file': 'weapon-shotgun-held-r3.png', 'crop': (480, 180, 1960, 660), 'size': (180, 58), 'grip': (720, 415), 'muzzle': (1880, 345)},
    'rocket': {'file': 'weapon-rocket-held-r3.png', 'crop': (540, 180, 1720, 680), 'size': (165, 70), 'grip': (715, 460), 'muzzle': (1665, 360)},
}
GRIPS = {'forward': (211, 159), 'diagonal': (217, 108), 'up': (195, 84), 'crouch': (218, 251)}
ANGLES = {'forward': 0.0, 'diagonal': -45.0, 'up': -90.0}
SHOOT_X = {0: 0, 1: -7, 2: -3, 3: 0, 4: 0, 5: -6, 6: -2, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0}

# These are hand-drawn old-rifle silhouette masks, not material/color guesses.
# They intentionally clear only the weapon/hand interaction zone; the final
# detailed weapon immediately fills it in the same baked frame.
CLEAR_POLYGONS = {
    'forward': [(197, 116), (294, 116), (296, 182), (197, 182)],
    'diagonal': [(193, 24), (282, 24), (284, 112), (226, 164), (192, 146)],
    'up': [(154, 8), (218, 8), (231, 105), (202, 150), (166, 126)],
    'crouch': [(204, 207), (301, 207), (303, 274), (203, 274)],
}

# Minimal visible-hand ROIs measured directly from the original raster. Copying
# the ROI after the weapon makes real fingers/outline wrap the grip. These boxes
# deliberately exclude orange stock/receiver areas.
HAND_ROIS = {
    'forward': [(207, 157, 216, 161), (240, 156, 256, 166)],
    'diagonal': [(214, 107, 220, 111), (244, 87, 261, 99)],
    'up': [(193, 79, 198, 88), (196, 48, 207, 59)],
    'crouch': [(210, 242, 224, 260), (248, 248, 263, 260)],
}


def crop_frame(sheet: Image.Image, index: int) -> Image.Image:
    cols = sheet.width // CELL
    return sheet.crop(((index % cols) * CELL, (index // cols) * CELL,
                       (index % cols + 1) * CELL, (index // cols + 1) * CELL))


def significant_components(image: Image.Image, alpha_threshold=16, min_area=8):
    alpha = image.getchannel('A')
    pixels = alpha.load(); remaining = set()
    for y in range(CELL):
        for x in range(CELL):
            if pixels[x, y] >= alpha_threshold:
                remaining.add((x, y))
    comps = []
    while remaining:
        seed = remaining.pop(); stack = [seed]; pts = []
        while stack:
            x, y = stack.pop(); pts.append((x, y))
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if (nx, ny) in remaining:
                    remaining.remove((nx, ny)); stack.append((nx, ny))
        if len(pts) >= min_area:
            xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
            comps.append({'area':len(pts),'bbox':[min(xs),min(ys),max(xs)+1,max(ys)+1],'points':pts})
    return sorted(comps, key=lambda c:c['area'], reverse=True)


def keep_main_character(image: Image.Image, exhaustive=False):
    # `exhaustive=True` is the production boundary: every alpha>0 island, even
    # a 1px chroma/antialias speck, must belong to the single main composite.
    comps = significant_components(image, alpha_threshold=1 if exhaustive else 16, min_area=1 if exhaustive else 8)
    if not comps:
        return image.copy(), 0, []
    keep = set(comps[0]['points'])
    out = image.copy(); p = out.load(); removed = 0
    for comp in comps[1:]:
        for x,y in comp['points']:
            p[x,y]=(0,0,0,0); removed += 1
    return out, removed, [c['area'] for c in comps[1:]]


def run_pose(bucket: str, run_index: int):
    # Rebuild from clean source sheets. Upper pose comes from the canonical aim
    # frame; lower locomotion comes only from player-run below the pelvis. This
    # avoids the legacy run-fire sheet's detached gun/arm components.
    special = Image.open(SRC/'player-special-shoot-polished.png').convert('RGBA')
    original = Image.open(SRC/'player-shoot-polished.png').convert('RGBA')
    run = Image.open(SRC/'player-run.png').convert('RGBA')
    aim_index = {'forward':0,'diagonal':4,'up':8}[bucket]
    upper = crop_frame(special, aim_index)
    upper_original = crop_frame(original, aim_index)
    lower = crop_frame(run, run_index % 8)
    # A narrow feather at the belt joins locomotion to the aim torso. The run
    # source's lowered right forearm occupies x188..252/y170..224, so that small
    # zone stays on the canonical aim base instead of creating a third arm.
    mask = Image.new('L',(CELL,CELL),0); d=ImageDraw.Draw(mask)
    d.rectangle((0,182,CELL,CELL),fill=255)
    for y, value in ((176,32),(177,64),(178,96),(179,128),(180,176),(181,224)):
        d.line((0,y,CELL,y),fill=value)
    d.polygon([(188,170),(252,170),(252,216),(232,225),(190,211)],fill=0)
    base=upper.copy();base.paste(lower,(0,0),mask)
    authored=upper_original.copy();authored.paste(lower,(0,0),mask)
    return base, authored


def pose_frames(kind: str, index: int, aim_bucket: str):
    if kind == 'run-fire-actions':
        return run_pose(aim_bucket, index % 8), aim_bucket
    if kind == 'crouch-actions':
        base_sheet=Image.open(SRC/'player-special-movement-actions.png').convert('RGBA')
        original_sheet=Image.open(SRC/'player-movement-actions.png').convert('RGBA')
        return (crop_frame(base_sheet,4),crop_frame(original_sheet,4)), 'crouch'
    if kind == 'shoot-polished':
        base=Image.open(SRC/'player-special-shoot-polished.png').convert('RGBA')
        original=Image.open(SRC/'player-shoot-polished.png').convert('RGBA')
    else:
        base=Image.open(SRC/'player-special-air-fire-actions.png').convert('RGBA')
        original=Image.open(SRC/'player-air-fire-actions.png').convert('RGBA')
    return (crop_frame(base,index),crop_frame(original,index)), aim_bucket


def clean_character(base: Image.Image, pose_bucket: str):
    # The special source sheets already remove the old receiver material while
    # preserving both authored arms. Strip only disconnected legacy fragments;
    # broad rectangle/polygon erasure would punch holes through wrists/torso.
    return keep_main_character(base, exhaustive=True)


def hand_mask(original: Image.Image, pose_bucket: str, aim_bucket: str):
    mask=Image.new('L',(CELL,CELL),0); mp=mask.load(); op=original.load()
    rois=HAND_ROIS[pose_bucket]
    # Crouch diagonal/up keeps only the trigger hand at the fixed grip; the
    # forward support-hand location would otherwise become a floating hand.
    if pose_bucket=='crouch' and aim_bucket!='forward': rois=rois[:1]
    for roi_index,(left,top,right,bottom) in enumerate(rois):
        # The diagonal source support hand was authored for the old short rifle.
        # Move just that tiny raster patch onto the new long-gun fore-end; this
        # is an authored hand placement, not a material/color reconstruction.
        dx,dy=(-12,-8) if pose_bucket=='diagonal' and roi_index==1 else (0,0)
        for y in range(top,bottom+1):
            for x in range(left,right+1):
                if op[x,y][3]>=16 and 0<=x+dx<CELL and 0<=y+dy<CELL:
                    mp[x+dx,y+dy]=255
    return mask


def foreground_hands(original: Image.Image, pose_bucket: str, aim_bucket: str):
    """Return the moved hand pixels paired with the exact authored mask."""
    layer=Image.new('RGBA',(CELL,CELL),(0,0,0,0)); mask=hand_mask(original,pose_bucket,aim_bucket)
    rois=HAND_ROIS[pose_bucket]
    if pose_bucket=='crouch' and aim_bucket!='forward': rois=rois[:1]
    for roi_index,(left,top,right,bottom) in enumerate(rois):
        dx,dy=(-12,-8) if pose_bucket=='diagonal' and roi_index==1 else (0,0)
        patch=original.crop((left,top,right+1,bottom+1))
        layer.alpha_composite(patch,(left+dx,top+dy))
    return layer,mask


def grip_for(kind: str, index: int, pose_bucket: str):
    x,y=GRIPS[pose_bucket]
    if kind=='shoot-polished': x += SHOOT_X.get(index,0)
    return x,y


def weapon_layer(asset: Image.Image, profile: dict, grip, angle):
    # Crop transparent margins plus most of the rear stock. This keeps the
    # receiver outboard of the torso while retaining the detailed barrel/front.
    cl,ct,cr,cb=profile['crop']; asset=asset.crop((cl,ct,cr,cb))
    # Straight-up standing/run/air aims are perspective-foreshortened to keep
    # 15+ px top padding at the fixed raised-hand grip. Crouch has room for 0.70.
    factor=(0.70 if grip[1]>200 else 0.50) if angle==-90.0 else (0.78 if angle==-45.0 else 1.0)
    render_size=(round(profile['size'][0]*factor),round(profile['size'][1]*factor))
    resized=asset.resize(render_size,Image.Resampling.LANCZOS)
    sx=render_size[0]/asset.width; sy=render_size[1]/asset.height
    lg=((profile['grip'][0]-cl)*sx,(profile['grip'][1]-ct)*sy)
    lm=((profile['muzzle'][0]-cl)*sx,(profile['muzzle'][1]-ct)*sy)
    pivot=(CELL,CELL);stage=Image.new('RGBA',(CELL*2,CELL*2),(0,0,0,0))
    stage.alpha_composite(resized,(round(pivot[0]-lg[0]),round(pivot[1]-lg[1])))
    rotated=stage.rotate(-angle,resample=Image.Resampling.BICUBIC,center=pivot)
    left=round(pivot[0]-grip[0]);top=round(pivot[1]-grip[1])
    layer=rotated.crop((left,top,left+CELL,top+CELL))
    dx=lm[0]-lg[0];dy=lm[1]-lg[1];rad=math.radians(angle)
    muzzle=(grip[0]+dx*math.cos(rad)-dy*math.sin(rad),grip[1]+dx*math.sin(rad)+dy*math.cos(rad))
    return layer,muzzle


def render(weapon_id, kind, index, aim_bucket):
    (base,original),pose_bucket=pose_frames(kind,index,aim_bucket)
    cleaned,removed,detached=clean_character(base,pose_bucket)
    # There is no authored crouch diagonal/up arm pose. The gameplay contract
    # is forward-only while crouched, so all three compatibility cells bake the
    # same forward weapon/arms/muzzle instead of rotating through head/face.
    if pose_bucket=='crouch': aim_bucket='forward'
    grip=grip_for(kind,index,pose_bucket); angle=ANGLES[aim_bucket]
    asset=Image.open(SRC/WEAPONS[weapon_id]['file']).convert('RGBA')
    layer,muzzle=weapon_layer(asset,WEAPONS[weapon_id],grip,angle)
    result=Image.alpha_composite(cleaned,layer)
    hand_layer,hm=foreground_hands(original,pose_bucket,aim_bucket)
    result.alpha_composite(hand_layer)
    # Final output is non-destructive. Only rotation-resampling halo at alpha<=3
    # is normalized; no alpha>=16 detail/hand/body pixel may be deleted here.
    rp=result.load(); normalized_halo=0
    for yy in range(CELL):
        for xx in range(CELL):
            if 0 < rp[xx,yy][3] <= 3:
                rp[xx,yy]=(0,0,0,0); normalized_halo += 1
    post_removed=0; post_detached=[]; post_removed_opaque=0
    wp=layer.getchannel('A').load();hp=hm.load();overlap=0;hands=0
    for y in range(CELL):
        for x in range(CELL):
            if hp[x,y]>=16:
                hands+=1
                if wp[x,y]>=16:overlap+=1
    raw_comps=significant_components(result,alpha_threshold=1,min_area=1)
    comps=significant_components(result,alpha_threshold=16,min_area=8)
    weapon_bbox=layer.getchannel('A').getbbox()
    clipped=not weapon_bbox or weapon_bbox[0]<=0 or weapon_bbox[1]<=0 or weapon_bbox[2]>=CELL or weapon_bbox[3]>=CELL
    return result,{
        'aimBucket':aim_bucket,'poseBucket':pose_bucket,'gripSourcePx':list(grip),
        'muzzleSourcePx':[round(muzzle[0],3),round(muzzle[1],3)],'angleDeg':angle,
        'foregroundHandPixels':hands,'handOverWeaponPixels':overlap,
        'preCleanDetachedPixels':removed,'preCleanDetachedComponents':detached,
        'postCompositeDetachedPixels':post_removed,'postCompositeDetachedComponents':post_detached,
        'postRemovedOpaquePx':post_removed_opaque,'normalizedHaloAlphaLe3Px':normalized_halo,
        'finalAlphaComponents':len(raw_comps),'finalSignificantComponents':len(comps),'componentAreas':[c['area'] for c in comps],
        'weaponBbox':list(weapon_bbox) if weapon_bbox else None,'weaponClipped':clipped,
    }


def build_sheet(weapon_id,kind,count,buckets,size):
    out=Image.new('RGBA',size,(0,0,0,0));cols=size[0]//CELL;records={}
    for i in range(count):
        bucket=buckets(i);img,rec=render(weapon_id,kind,i,bucket)
        out.alpha_composite(img,((i%cols)*CELL,(i//cols)*CELL));records[i]=rec
    name=f'player-{weapon_id}-{kind}.png';out.save(SRC/name,optimize=True);out.save(PUB/name,optimize=True)
    return records


def main():
    PUB.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
    manifest={'contract':'single-sprite character+weapon+foreground-visible-hand','runtimeOverlay':False,'equipAlphaFade':False,'cell':[384,384],'profiles':WEAPONS,'frames':{}}
    for wid in WEAPONS:
        defs=[
          ('shoot-polished',12,lambda i:'forward' if i<4 else 'diagonal' if i<8 else 'up',(1536,1152)),
          ('run-fire-actions',24,lambda i:'forward' if i<8 else 'diagonal' if i<16 else 'up',(1536,2304)),
          ('air-fire-actions',6,lambda i:'forward' if i<2 else 'diagonal' if i<4 else 'up',(768,1152)),
          ('crouch-actions',3,lambda i:('forward','diagonal','up')[i],(1152,384)),
        ]
        for kind,count,buckets,size in defs:
            recs=build_sheet(wid,kind,count,buckets,size)
            for i,rec in recs.items():manifest['frames'][f'{wid}:{kind}:{i}']=rec
    (SRC/'player-special-composite-contract.json').write_text(json.dumps(manifest,indent=2))
    (PUB/'player-special-composite-contract.json').write_text(json.dumps(manifest,indent=2))
    # Cell-by-cell visual audit sheet: all 90 production frames, never a stale subset.
    frames=[]
    for key,rec in manifest['frames'].items():
        wid,kind,idx=key.split(':'); sheet=Image.open(SRC/f'player-{wid}-{kind}.png').convert('RGBA'); frames.append((key,crop_frame(sheet,int(idx))))
    thumb=192;cols=10;rows=math.ceil(len(frames)/cols);sheet=Image.new('RGBA',(cols*thumb,rows*(thumb+24)),(4,10,15,255));d=ImageDraw.Draw(sheet)
    for n,(key,img) in enumerate(frames):
        x=(n%cols)*thumb;y=(n//cols)*(thumb+24);sheet.alpha_composite(img.resize((thumb,thumb),Image.Resampling.LANCZOS),(x,y));d.text((x+3,y+194),key.replace('actions','a')[:30],fill=(220,235,240,255))
    sheet.save(QA/'all-single-sprite-frames-contact-sheet.png',optimize=True)
    overlaps=[r['handOverWeaponPixels'] for r in manifest['frames'].values()];bad=[k for k,r in manifest['frames'].items() if r['handOverWeaponPixels']<8 or r['handOverWeaponPixels']/max(1,r['foregroundHandPixels'])>.80 or r['finalSignificantComponents']!=1 or r['postRemovedOpaquePx']!=0 or r['weaponClipped'] or (r['angleDeg'] in (-45.0,-90.0) and r['weaponBbox'][1]<8)]
    report={'ok':not bad,'frames':len(manifest['frames']),'rawAlphaComponentsRecordedOnly':True,'postRemovedOpaquePx':0,'handOverWeaponPixels':[min(overlaps),max(overlaps)],'badFrames':bad,'contactSheet':'qa-captures/detail-round3/generated-assets/all-single-sprite-frames-contact-sheet.png'}
    (QA/'asset-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
    if bad: raise SystemExit(1)

if __name__=='__main__':main()
