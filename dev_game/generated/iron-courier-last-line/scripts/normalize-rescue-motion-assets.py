#!/usr/bin/env python3
"""Recover and normalize the eight rescue poses from the contaminated atlases.

The generated sheets contain exactly eight full connected subjects, but several
subjects cross nominal 384x512 cell boundaries.  Detecting components globally
recovers those clipped pixels before deterministic, position-only repacking.
"""
from pathlib import Path
from collections import deque
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
TYPES=('technician','medic','artillery')
CELL_W=384;CELL_H=512;BASELINE=496


def components(image):
    alpha=image.getchannel('A');w,h=alpha.size;px=alpha.load();seen=bytearray(w*h);found=[]
    for sy in range(h):
        for sx in range(w):
            idx=sy*w+sx
            if seen[idx] or px[sx,sy]<24: continue
            stack=[(sx,sy)];seen[idx]=1;points=[]
            while stack:
                x,y=stack.pop();points.append((x,y))
                for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if 0<=nx<w and 0<=ny<h:
                        ni=ny*w+nx
                        if not seen[ni] and px[nx,ny]>=24:
                            seen[ni]=1;stack.append((nx,ny))
            if len(points)>=5000:
                xs=[p[0] for p in points];ys=[p[1] for p in points]
                found.append({'points':points,'bbox':(min(xs),min(ys),max(xs)+1,max(ys)+1),'cx':sum(xs)/len(xs),'cy':sum(ys)/len(ys)})
    return found


def recover(name):
    source=Image.open(ROOT/f'assets/source/cleaned/characters/rescue/{name}-actions.png').convert('RGBA')
    found=components(source)
    if len(found)!=8: raise RuntimeError(f'{name}: expected 8 subjects, found {len(found)}')
    top=sorted(sorted(found,key=lambda c:c['cy'])[:4],key=lambda c:c['cx'])
    bottom=sorted(sorted(found,key=lambda c:c['cy'])[4:],key=lambda c:c['cx'])
    sheet=Image.new('RGBA',(CELL_W*4,CELL_H*2),(0,0,0,0));metrics=[]
    for index,component in enumerate(top+bottom):
        x0,y0,x1,y1=component['bbox'];subject=source.crop((x0,y0,x1,y1))
        # Component bbox contains no neighboring subject after global recovery.
        x=(CELL_W-subject.width)//2;y=BASELINE-subject.height
        if x<12 or y<4 or x+subject.width>CELL_W-12:
            raise RuntimeError(f'{name} frame {index}: unsafe recovered bounds {subject.size} at {(x,y)}')
        sheet.alpha_composite(subject,((index%4)*CELL_W+x,(index//4)*CELL_H+y))
        metrics.append({'frame':index,'sourceBox':[x0,y0,x1,y1],'runtimeBox':[x,y,x+subject.width,y+subject.height],'baseline':BASELINE})
    for prefix in (ROOT,ROOT/'public'):
        dest=prefix/f'assets/runtime/characters/rescue/{name}-actions.png';dest.parent.mkdir(parents=True,exist_ok=True);sheet.save(dest,optimize=True)
    return metrics


def main():
    reports={name:recover(name) for name in TYPES}
    manifest_path=ROOT/'assets/asset-manifest.json';manifest=json.loads(manifest_path.read_text())
    for name in TYPES:
        item=next(v for v in manifest['images'] if v.get('id')==f'rescue-{name}')
        item['baseline']=BASELINE;item['rootAnchor']='centered-foot-baseline';item['status']='approved'
        processing=item.setdefault('provenance',{}).setdefault('postProcessing',[])
        for step in ('global-component-recovery','cross-cell-overflow-reconstruction','detached-neighbor-removal','visual-center-x-192','baseline-y-496'):
            if step not in processing:processing.append(step)
    for animation in manifest.get('animations',[]):
        if animation.get('family','').startswith('rescue-'):
            animation['baseline']=BASELINE;animation['rootAnchor']='centered-foot-baseline'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    report_path=ROOT/'assets/qa/rescue-motion-normalization.json';report_path.parent.mkdir(parents=True,exist_ok=True);report_path.write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
    print(f'normalized {len(TYPES)*8} rescued-character frames; report {report_path.relative_to(ROOT)}')
if __name__=='__main__':main()
