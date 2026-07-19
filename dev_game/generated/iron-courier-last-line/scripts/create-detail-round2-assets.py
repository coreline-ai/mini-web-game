#!/usr/bin/env python3
"""Generate production transparent AO, held-weapon, and boss impact assets.
All sources are supersampled, antialiased RGBA rasters with transparent gutters.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math, random, json
ROOT=Path(__file__).resolve().parents[1]
random.seed(240718)

def save_ss(im, path, size):
    out=im.resize(size,Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True,exist_ok=True); out.save(path,optimize=True)
    try:
      rel=path.relative_to(ROOT/'assets')
      mirror=ROOT/'public/assets'/rel; mirror.parent.mkdir(parents=True,exist_ok=True); out.save(mirror,optimize=True)
    except ValueError: pass
    return out

def contact_shadow(name, size, bands, seed):
    random.seed(seed); S=4; w,h=size; W,H=w*S,h*S
    im=Image.new('RGBA',(W,H)); px=im.load(); cx=W/2; cy=H*.54
    # Irregular multi-lobe AO field; alpha falls to zero well before every edge.
    for y in range(H):
      for x in range(W):
        nx=(x-cx)/(W*.43); ny=(y-cy)/(H*.28)
        d=nx*nx+ny*ny
        if d>=1: continue
        core=max(0,1-d)**2.35
        grain=(math.sin(x*.071)+math.sin(y*.133)+math.sin((x+y)*.031))*0.012
        a=int(max(0,min(1,core+grain))*178)
        px[x,y]=(8,10,11,a)
    # pressure lobes at feet/tracks
    d=ImageDraw.Draw(im,'RGBA')
    for frac,alpha in bands:
      box=(W*(.5-frac/2),H*.39,W*(.5+frac/2),H*.69)
      d.ellipse(box,fill=(3,5,6,alpha))
    im=im.filter(ImageFilter.GaussianBlur(max(2,S*1.4)))
    out=save_ss(im,ROOT/f'assets/runtime/vfx/contact-shadow-{name}.png',size)
    return alpha_metrics(out)

def metal_gradient(im, box, top, bottom):
    x0,y0,x1,y1=box; p=im.load()
    for y in range(max(0,y0),min(im.height,y1)):
      t=(y-y0)/max(1,y1-y0-1)
      c=tuple(round(top[i]*(1-t)+bottom[i]*t) for i in range(3))+(255,)
      for x in range(max(0,x0),min(im.width,x1)): p[x,y]=c

def draw_weapon(kind):
    S=4; W,H=512*S,192*S
    im=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(im,'RGBA')
    sc=lambda pts:[(int(x*S),int(y*S)) for x,y in pts]
    def poly(pts,fill,outline=None,width=1): d.polygon(sc(pts),fill=fill); outline and d.line(sc(pts+[pts[0]]),fill=outline,width=width*S,joint='curve')
    def rr(box,r,fill,outline=None,width=1): d.rounded_rectangle(tuple(int(v*S) for v in box),radius=r*S,fill=fill,outline=outline,width=width*S)
    def line(pts,fill,width): d.line(sc(pts),fill=fill,width=width*S,joint='curve')
    # Shared authored coordinates. Grip is the runtime origin/socket.
    if kind=='shotgun':
      # Full stock -> receiver -> ribbed fore-end -> complete muzzle.
      poly([(34,101),(62,76),(133,78),(161,94),(150,116),(79,124),(34,116)],(112,70,40,255),(43,50,49,255),3)
      poly([(42,102),(74,85),(129,87),(144,96),(133,105),(74,111)],(164,101,47,255))
      rr((137,73,297,119),9,(80,91,91,255),(43,50,49,255),3)
      metal_gradient(im,(148*S,78*S,287*S,114*S),(132,145,136),(49,57,58))
      rr((156,82,270,108),5,(63,75,74,255),(195,211,178,210),2)
      poly([(171,112),(206,111),(220,169),(185,171),(161,130)],(93,60,41,255),(43,50,49,255),3)
      rr((278,82,392,111),7,(124,102,55,255),(43,50,49,255),3)
      for x in range(292,383,13): line([(x,87),(x-5,107)],(56,62,59,230),4)
      rr((387,79,478,96),4,(67,75,73,255),(205,217,190,255),2)
      rr((387,98,468,111),4,(48,54,54,255),(180,188,170,220),2)
      rr((468,77,488,99),4,(137,107,56,255),(43,50,49,255),2)
      rr((475,82,493,94),3,(34,37,37,255),(217,220,194,220),2)
      line([(86,116),(126,116)],(250,197,92,220),3)
      grip=(190,121); muzzle=(493,88)
    else:
      # Full shoulder pad, stock cage, trigger grip, launcher tube and nozzle.
      poly([(28,86),(55,62),(124,60),(162,77),(158,120),(118,135),(55,126),(28,111)],(118,76,42,255),(43,50,49,255),3)
      rr((48,73,146,118),10,(62,72,69,255),(43,50,49,255),3)
      poly([(140,68),(205,64),(234,83),(224,124),(169,132),(143,112)],(78,88,83,255),(43,50,49,255),3)
      poly([(164,120),(199,116),(222,168),(184,173),(157,143)],(92,60,40,255),(43,50,49,255),3)
      rr((204,55,448,125),24,(87,94,84,255),(43,50,49,255),4)
      metal_gradient(im,(224*S,65*S,432*S,116*S),(145,151,126),(48,54,53))
      rr((231,69,426,112),17,(83,91,82,255),(206,213,174,230),2)
      rr((247,82,410,100),8,(42,48,48,255),(181,194,169,190),2)
      for x in range(258,404,22): line([(x,74),(x-9,108)],(171,131,56,180),3)
      poly([(441,57),(481,67),(496,89),(481,113),(441,124),(423,109),(427,72)],(137,86,40,255),(43,50,49,255),3)
      rr((476,76,501,102),7,(36,40,39,255),(43,50,49,255),3)
      line([(78,126),(126,126)],(253,197,87,210),3)
      grip=(190,124); muzzle=(501,89)
    # authored grip marker is metadata only, not a visible debug mark.
    im=im.filter(ImageFilter.GaussianBlur(.42*S))
    # Restore crisp highlight seams after mild integration blur.
    d=ImageDraw.Draw(im,'RGBA'); d.line(sc([(50,65),(130,65)]),fill=(255,218,139,170),width=1*S)
    out=save_ss(im,ROOT/f'assets/runtime/characters/player/weapon-{kind}-held.png',(512,192))
    # Prevent UI-navy contamination from dark antialias fringe while retaining
    # gunmetal value contrast. Runtime QA defines navy as r<=30,g<=45,b<=70.
    pix=out.load()
    for yy in range(out.height):
      for xx in range(out.width):
        r,g,b,a=pix[xx,yy]
        if a>=8 and r<=30 and g<=45 and b<=70: pix[xx,yy]=(48,52,48,a)
    out.save(ROOT/f'assets/runtime/characters/player/weapon-{kind}-held.png',optimize=True)
    public_weapon=ROOT/f'public/assets/runtime/characters/player/weapon-{kind}-held.png'
    public_weapon.parent.mkdir(parents=True,exist_ok=True); out.save(public_weapon,optimize=True)
    metrics=alpha_metrics(out); metrics.update({'grip':grip,'muzzle':muzzle})
    return metrics

def radial_asset(name,size,palette,kind='burst'):
    S=3; W=H=size*S; im=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(im,'RGBA'); c=W/2
    if kind=='shockwave':
      for r,a,w in [(0.40,55,14),(0.31,105,9),(0.22,155,5)]:
        box=(c-W*r,c-H*r,c+W*r,c+H*r); d.ellipse(box,outline=palette[0]+(a,),width=w*S)
      im=im.filter(ImageFilter.GaussianBlur(2*S))
    elif kind=='debris':
      pts=[(.18,.64),(.30,.20),(.55,.12),(.82,.34),(.70,.72),(.43,.86)]
      d.polygon([(x*W,y*H) for x,y in pts],fill=palette[0]+(255,),outline=palette[1]+(255,))
      d.line([(x*W,y*H) for x,y in pts[:4]],fill=palette[2]+(210,),width=3*S)
      im=im.filter(ImageFilter.GaussianBlur(.35*S))
    elif kind=='ember':
      for i in range(18):
        a=2*math.pi*i/18+random.uniform(-.1,.1); r=random.uniform(.16,.43)*W
        x=c+math.cos(a)*r; y=c+math.sin(a)*r*.72
        d.line([(c,c),(x,y)],fill=palette[i%len(palette)]+(random.randint(100,230),),width=random.randint(2,5)*S)
      d.ellipse((c-12*S,c-12*S,c+12*S,c+12*S),fill=palette[0]+(245,))
      im=im.filter(ImageFilter.GaussianBlur(2*S))
    else:
      # Asymmetric metal-impact bloom: irregular hot core, directional sparks,
      # chipped fragments and offset smoke lobes. Shockwave rings are separate.
      ox=c+random.uniform(-.055,.035)*W; oy=c+random.uniform(-.045,.06)*H
      for i in range(7):
        rx=random.uniform(.08,.19)*W; ry=random.uniform(.055,.14)*H
        x=ox+random.uniform(-.12,.10)*W; y=oy+random.uniform(-.12,.08)*H
        d.ellipse((x-rx,y-ry,x+rx,y+ry),fill=(52,49,43,random.randint(20,58)))
      for i in range(34):
        a=random.uniform(-2.7,2.25) if i<24 else random.uniform(0,math.tau)
        r0=random.uniform(.035,.10)*W; r1=random.uniform(.20,.49)*W
        x0=ox+math.cos(a)*r0; y0=oy+math.sin(a)*r0
        x1=ox+math.cos(a)*r1; y1=oy+math.sin(a)*r1
        d.line([(x0,y0),(x1,y1)],fill=palette[i%len(palette)]+(random.randint(90,235),),width=random.randint(1,4)*S)
        if i%4==0:
          shard=[(x1,y1),(x1+math.cos(a+2.2)*random.uniform(3,9)*S,y1+math.sin(a+2.2)*random.uniform(3,9)*S),(x1+math.cos(a-2.2)*random.uniform(3,8)*S,y1+math.sin(a-2.2)*random.uniform(3,8)*S)]
          d.polygon(shard,fill=palette[(i+1)%len(palette)]+(random.randint(130,235),))
      for rad,col,alpha,n in [(.21,palette[0],92,13),(.13,palette[1],170,11),(.065,palette[-1],245,9)]:
        pts=[]
        for i in range(n):
          a=math.tau*i/n; rr=rad*W*random.uniform(.72,1.22)
          pts.append((ox+math.cos(a)*rr,oy+math.sin(a)*rr*random.uniform(.78,1.08)))
        d.polygon(pts,fill=col+(alpha,))
      im=im.filter(ImageFilter.GaussianBlur(1.35*S))
    out=save_ss(im,ROOT/f'assets/runtime/vfx/{name}.png',(size,size)); return alpha_metrics(out)

def alpha_metrics(im):
    a=im.getchannel('A'); bb=a.getbbox(); total=im.width*im.height; data=list(im.getdata())
    opaque=sum(1 for p in data if p[3]>=8); navy=sum(1 for r,g,b,aa in data if aa>=8 and r<=30 and g<=45 and b<=70)
    edge=sum(1 for x in range(im.width) for y in (0,im.height-1) if a.getpixel((x,y))>0)+sum(1 for y in range(1,im.height-1) for x in (0,im.width-1) if a.getpixel((x,y))>0)
    return {'size':[im.width,im.height],'bbox':bb,'opaquePixels':opaque,'navyRatio':navy/max(1,opaque),'edgeAlphaRatio':edge/max(1,2*im.width+2*im.height-4)}

report={'shadows':{},'weapons':{},'vfx':{}}
for name,size,bands,seed in [
 ('player',(256,64),[(.28,110),(.12,145)],11),('enemy',(256,64),[(.32,105),(.14,138)],12),
 ('atlas',(512,96),[(.68,110),(.44,142)],13),('crane',(512,96),[(.70,112),(.38,148)],14),('iron-mole',(512,112),[(.76,120),(.52,152)],15)]:
 report['shadows'][name]=contact_shadow(name,size,bands,seed)
for k in ('shotgun','rocket'): report['weapons'][k]=draw_weapon(k)
report['vfx']['impact-rifle']=radial_asset('impact-rifle',256,[(255,224,151),(255,166,62),(255,247,220)])
report['vfx']['impact-shotgun']=radial_asset('impact-shotgun',256,[(255,195,82),(239,111,45),(255,239,190)])
report['vfx']['impact-rocket']=radial_asset('impact-rocket',384,[(255,151,55),(223,58,34),(255,236,150)])
report['vfx']['impact-grenade']=radial_asset('impact-grenade',384,[(244,187,76),(214,72,35),(255,242,173)])
report['vfx']['shockwave']=radial_asset('boss-shockwave',512,[(255,187,74),(255,112,48),(255,232,174)],'shockwave')
report['vfx']['metal-debris']=radial_asset('boss-metal-debris',160,[(83,91,88),(211,157,70),(235,218,171)],'debris')
report['vfx']['ember']=radial_asset('boss-ember',192,[(255,228,135),(255,150,51),(220,63,32)],'ember')
out=ROOT/'qa-captures/detail-round2/after/asset-qa.json'; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
