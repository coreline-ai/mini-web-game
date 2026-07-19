#!/usr/bin/env python3
"""Create special-weapon player pose sheets with the baked rifle barrel removed.
The complete held weapon is composited at runtime over these identity-locked frames.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import json
ROOT=Path(__file__).resolve().parents[1]; SRC=ROOT/'assets/runtime/characters/player'; PUB=ROOT/'public/assets/runtime/characters/player'
SHEETS={
 'movement-actions':('player-movement-actions.png',8,lambda i:'forward'),
 'shoot-polished':('player-shoot-polished.png',12,lambda i:'forward' if i<4 else 'diagonal' if i<8 else 'up'),
 'run-fire-actions':('player-run-fire-actions.png',24,lambda i:'forward' if i<8 else 'diagonal' if i<16 else 'up'),
 'air-fire-actions':('player-air-fire-actions.png',6,lambda i:'forward' if i<2 else 'diagonal' if i<4 else 'up'),
}
polys={
 'forward':[(214,128),(318,128),(318,224),(246,224),(214,205)],
 'diagonal':[(203,28),(320,28),(320,128),(270,174),(232,174),(204,146)],
 'up':[(177,0),(248,0),(248,151),(216,180),(181,145)],
}
report={}
for suffix,(filename,count,bucket) in SHEETS.items():
 im=Image.open(SRC/filename).convert('RGBA');cols=im.width//384;out=im.copy()
 for i in range(count):
  ox=(i%cols)*384;oy=(i//cols)*384;b=bucket(i)
  # Crouch's weapon sits lower; other movement frames are not selected while a
  # special is visible but keeping them clean makes the sheet self-consistent.
  pts=polys[b]
  if suffix=='movement-actions' and i==4: pts=[(216,174),(330,174),(330,270),(238,270),(214,242)]
  mask=Image.new('L',(384,384));d=ImageDraw.Draw(mask);d.polygon(pts,fill=255)
  # Preserve the courier silhouette around the torso: only clear authored
  # weapon material pixels in the weapon region, classified by low saturation
  # metal or orange furniture. Skin/teal coat/white armor stay intact.
  fr=out.crop((ox,oy,ox+384,oy+384));pix=fr.load();m=mask.load();cleared=0
  for y in range(384):
   for x in range(384):
    if not m[x,y]: continue
    r,g,bl,a=pix[x,y]
    if a<8: continue
    skin=r>105 and 48<g<190 and bl<145 and r>g*1.12
    teal=g>r*1.18 and g>bl*0.82 and g>58
    white=max(r,g,bl)-min(r,g,bl)<46 and r>145
    cyan=bl>r*1.35 and g>r*1.25 and bl>92
    # Keep hands, coat and armor; clear every remaining gun-material pixel.
    # This avoids the old barrel leaving orange/grey dotted fragments around
    # the complete special weapon silhouette.
    if not (skin or teal or white or cyan):
      pix[x,y]=(r,g,bl,0);cleared+=1
  # Feather only newly transparent boundaries, avoiding a rectangular cut.
  out.paste(fr,(ox,oy))
  report[f'{suffix}:{i}']={'bucket':b,'clearedPixels':cleared}
 name=f'player-special-{suffix}.png';out.save(SRC/name,optimize=True);PUB.mkdir(parents=True,exist_ok=True);out.save(PUB/name,optimize=True)
(ROOT/'qa-captures/detail-round2/after/special-player-sheet-qa.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'sheets':list(SHEETS),'frames':len(report),'minCleared':min(v['clearedPixels'] for v in report.values()),'maxCleared':max(v['clearedPixels'] for v in report.values())},indent=2))
