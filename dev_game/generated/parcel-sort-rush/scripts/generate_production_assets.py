#!/usr/bin/env python3
from __future__ import annotations
import math, wave, struct, subprocess, shutil, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
IMG = ASSETS / 'images' / 'production'
AUD = ASSETS / 'audio' / 'production'
GAME_ID = 'parcel-sort-rush'

FONT_CANDIDATES = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
]

def font(size: int):
    for f in FONT_CANDIDATES:
        if Path(f).exists():
            try:
                return ImageFont.truetype(f, size=size)
            except Exception:
                pass
    return ImageFont.load_default()

F_BIG = font(70); F_MED = font(38); F_SMALL = font(24); F_TINY = font(18)

def ensure():
    for p in [IMG/'backgrounds', IMG/'parcels', IMG/'chutes', IMG/'machines', IMG/'feedback', IMG/'ui', AUD/'music', AUD/'sfx', AUD/'ui']:
        p.mkdir(parents=True, exist_ok=True)

def lerp(a,b,t): return int(a + (b-a)*t)
def mix(c1,c2,t): return tuple(lerp(c1[i], c2[i], t) for i in range(3))

def vertical_gradient(w,h,top,bottom):
    im = Image.new('RGB',(w,h),top)
    px = im.load()
    for y in range(h):
        t = y/(h-1)
        c = mix(top,bottom,t)
        for x in range(w): px[x,y]=c
    return im

def rr(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def shadow_layer(size, box, r, blur=18, alpha=100):
    sh = Image.new('RGBA', size, (0,0,0,0))
    d = ImageDraw.Draw(sh)
    d.rounded_rectangle(box, radius=r, fill=(0,0,0,alpha))
    return sh.filter(ImageFilter.GaussianBlur(blur))

def draw_text_center(draw, xy, text, fnt, fill, stroke=(0,0,0), sw=3):
    draw.text(xy, text, font=fnt, fill=fill, anchor='mm', stroke_width=sw, stroke_fill=stroke)

def save_png(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)

# Backgrounds ----------------------------------------------------------------
def draw_warehouse(path, mode='day'):
    w,h=1080,1920
    if mode=='day':
        bg=vertical_gradient(w,h,(57,151,198),(9,18,31)); accent=(80,220,255); lamp=(255,232,128)
    elif mode=='rush':
        bg=vertical_gradient(w,h,(74,33,48),(15,16,28)); accent=(255,107,61); lamp=(255,80,52)
    else:
        bg=vertical_gradient(w,h,(21,44,82),(5,8,18)); accent=(119,220,255); lamp=(108,220,255)
    im=bg.convert('RGBA'); d=ImageDraw.Draw(im)
    # ceiling trusses
    for i in range(-2,9):
        x=i*180
        d.polygon([(x,0),(x+70,0),(x+620,560),(x+550,560)], fill=(3,9,18,82))
    # back glow and far door
    d.rounded_rectangle((340,320,740,780), radius=50, fill=(20,42,58,120), outline=accent+(160,), width=4)
    for x in [395,505,615]:
        d.rounded_rectangle((x,385,x+70,650), radius=18, fill=accent+(65,))
    # shelves left/right
    for side in [0,1]:
        x0=42 if side==0 else 760
        for row in range(5):
            y=420+row*210
            d.rounded_rectangle((x0,y,x0+270,y+135), radius=18, fill=(22,31,42,190), outline=(98,122,142,160), width=5)
            for col in range(3):
                bx=x0+24+col*78; by=y+22
                color=[(196,132,58),(219,155,74),(156,105,60),(230,180,90)][(row+col+side)%4]
                d.rounded_rectangle((bx,by,bx+54,by+74), radius=8, fill=color+(230,), outline=(76,43,20,170), width=3)
    # conveyor perspective
    d.polygon([(355,760),(725,760),(960,1900),(120,1900)], fill=(31,39,48,245), outline=(104,125,142,210))
    for y in range(820,1820,130):
        t=(y-760)/(1900-760); left=355+(120-355)*t; right=725+(960-725)*t
        d.line((left,y,right,y), fill=(125,145,160,100), width=max(2,int(7*(1-t)+2)))
    d.line((540,760,540,1900), fill=accent+(110,), width=5)
    # foreground platform
    d.rounded_rectangle((0,1510,1080,1920), radius=0, fill=(9,14,22,230))
    d.rounded_rectangle((250,1505,830,1540), radius=16, fill=accent+(170,))
    # warning lamps
    for x in [165,915]:
        d.ellipse((x-34,230,x+34,298), fill=lamp+(230,), outline=(255,255,255,120), width=3)
        d.rectangle((x-12,298,x+12,398), fill=(26,34,46,220))
    # no baked title: scene text owns title hierarchy and prevents HUD/background text collisions
    save_png(im, IMG/'backgrounds'/path)

def draw_parcel(path, base, accent, label, icon):
    w,h=320,230
    im=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(im)
    im.alpha_composite(shadow_layer((w,h),(35,55,292,205),28,16,105))
    d.rounded_rectangle((42,38,282,188), radius=26, fill=base, outline=(74,43,20,255), width=8)
    d.polygon([(50,42),(160,12),(274,42),(160,76)], fill=tuple(min(255,c+35) for c in base[:3])+(255,), outline=(74,43,20,255))
    d.rounded_rectangle((145,35,176,190), radius=8, fill=(132,82,36,230))
    d.rounded_rectangle((52,97,272,122), radius=7, fill=(132,82,36,120))
    d.rounded_rectangle((178,73,260,150), radius=12, fill=(248,244,220,255), outline=accent, width=5)
    draw_text_center(d,(219,104),icon,font(42),accent,(255,255,255),2)
    # no baked Korean destination text: Phaser runtime text renders localized labels crisply
    for x in [70,82,97,117,127]: d.line((x,72,x,103), fill=(50,35,25,180), width=4)
    d.rounded_rectangle((63,55,122,78), radius=6, fill=accent)
    save_png(im, IMG/'parcels'/path)

def draw_chute(path, color, label, sub):
    w,h=300,360
    im=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(im)
    im.alpha_composite(shadow_layer((w,h),(28,58,272,330),42,16,120))
    d.rounded_rectangle((48,42,252,320), radius=40, fill=(23,33,47,255), outline=color, width=9)
    d.polygon([(65,90),(235,90),(205,230),(95,230)], fill=(12,19,29,255), outline=(210,230,250,160))
    d.rounded_rectangle((65,44,235,92), radius=24, fill=color, outline=(255,255,255,150), width=3)
    d.rounded_rectangle((80,248,220,310), radius=24, fill=(8,13,20,255), outline=color, width=5)
    draw_text_center(d,(150,68),label,font(40),(255,255,255),(0,0,0),4)
    # no baked Korean chute sub-label: runtime text owns localization
    save_png(im, IMG/'chutes'/path)

def draw_scanner():
    w,h=680,180
    im=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(im)
    im.alpha_composite(shadow_layer((w,h),(34,38,646,164),30,16,110))
    d.rounded_rectangle((44,32,636,150), radius=30, fill=(15,28,42,255), outline=(104,220,255,230), width=8)
    d.rounded_rectangle((82,58,598,94), radius=18, fill=(6,13,23,255), outline=(67,140,180,180), width=3)
    for x in range(116,570,56):
        d.rectangle((x,64,x+20,88), fill=(108,235,255,160))
    d.rounded_rectangle((166,113,514,144), radius=15, fill=(42,255,151,220))
    draw_text_center(d,(340,113),'SCAN / SORT',font(30),(255,255,255),(0,0,0),3)
    save_png(im, IMG/'machines'/'scanner_gate.png')

def draw_conveyor_tile():
    w,h=512,256
    im=Image.new('RGBA',(w,h),(31,41,50,255)); d=ImageDraw.Draw(im)
    for y in range(0,h,64):
        d.rectangle((0,y,w,y+18), fill=(98,116,132,150))
        d.line((0,y+20,w,y+20), fill=(9,14,22,160), width=3)
    for x in range(-80,w,128):
        d.line((x,0,x+150,h), fill=(8,12,18,85), width=7)
    d.rounded_rectangle((8,8,w-8,h-8), radius=12, outline=(122,150,170,120), width=4)
    save_png(im, IMG/'machines'/'conveyor_tile.png')

def draw_stamp(path, text, color):
    w,h=360,160
    im=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(im)
    im.alpha_composite(shadow_layer((w,h),(22,30,338,132),24,12,90))
    d.rounded_rectangle((28,28,332,124), radius=24, fill=(255,255,255,235), outline=color, width=9)
    draw_text_center(d,(180,78),text,font(42),color,(0,0,0),3)
    save_png(im, IMG/'feedback'/path)

def _hires(size, scale=3):
    return Image.new('RGBA', (size[0] * scale, size[1] * scale), (0, 0, 0, 0)), scale

def _scaled_draw(im):
    return ImageDraw.Draw(im)

def _S(v, scale):
    if isinstance(v, tuple):
        return tuple(int(x * scale) for x in v)
    return int(v * scale)

def _downsample(im, scale):
    return im.resize((im.width // scale, im.height // scale), Image.Resampling.LANCZOS)

def draw_gloss_panel(path, w, h, radius, accent=(88, 224, 255, 255), fill_top=(20, 42, 64, 245), fill_bottom=(7, 15, 28, 245)):
    im, scale = _hires((w, h)); d = ImageDraw.Draw(im)
    W, H = w * scale, h * scale; R = radius * scale
    # soft shadow
    sh = Image.new('RGBA', (W, H), (0,0,0,0)); sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((18*scale, 22*scale, W-18*scale, H-16*scale), radius=R, fill=(0,0,0,120))
    sh = sh.filter(ImageFilter.GaussianBlur(12*scale)); im.alpha_composite(sh)
    # vertical glass gradient clipped by rounded mask
    mask = Image.new('L', (W,H), 0); md = ImageDraw.Draw(mask)
    md.rounded_rectangle((20*scale, 12*scale, W-20*scale, H-24*scale), radius=R, fill=255)
    grad = Image.new('RGBA', (W,H), (0,0,0,0)); gp = grad.load()
    for y in range(H):
        t = y / max(1, H - 1)
        c = mix(fill_top[:3], fill_bottom[:3], t)
        a = lerp(fill_top[3], fill_bottom[3], t)
        for x in range(W): gp[x,y] = c + (a,)
    im.alpha_composite(Image.composite(grad, Image.new('RGBA',(W,H),(0,0,0,0)), mask))
    # borders and inner highlights
    d.rounded_rectangle((20*scale, 12*scale, W-20*scale, H-24*scale), radius=R, outline=accent, width=5*scale)
    d.rounded_rectangle((31*scale, 24*scale, W-31*scale, H-36*scale), radius=max(8*scale, R-12*scale), outline=(255,255,255,95), width=2*scale)
    d.rounded_rectangle((44*scale, 34*scale, W-44*scale, 60*scale), radius=13*scale, fill=(255,255,255,42))
    # subtle arcade dot grid at bottom
    for x in range(48*scale, W-48*scale, 18*scale):
        for y in range(max(70*scale,H-62*scale), H-44*scale, 16*scale):
            d.ellipse((x-1*scale,y-1*scale,x+1*scale,y+1*scale), fill=(255,255,255,38))
    save_png(_downsample(im, scale), IMG/'ui'/path)

def draw_button_bg(path, w, h, color, radius=None):
    radius = radius or max(22, min(w, h)//4)
    top = tuple(min(255, c+45) for c in color[:3]) + (255,)
    bottom = tuple(max(0, c-38) for c in color[:3]) + (255,)
    im, scale = _hires((w,h)); d = ImageDraw.Draw(im)
    W,H=w*scale,h*scale; R=radius*scale
    sh = Image.new('RGBA',(W,H),(0,0,0,0)); sd=ImageDraw.Draw(sh)
    sd.rounded_rectangle((15*scale,24*scale,W-15*scale,H-10*scale), radius=R, fill=(0,0,0,130))
    sh=sh.filter(ImageFilter.GaussianBlur(9*scale)); im.alpha_composite(sh)
    mask=Image.new('L',(W,H),0); md=ImageDraw.Draw(mask)
    md.rounded_rectangle((18*scale,14*scale,W-18*scale,H-18*scale), radius=R, fill=255)
    grad=Image.new('RGBA',(W,H),(0,0,0,0)); gp=grad.load()
    for y in range(H):
        t=y/max(1,H-1); c=mix(top[:3],bottom[:3],t)
        for x in range(W): gp[x,y]=c+(255,)
    im.alpha_composite(Image.composite(grad,Image.new('RGBA',(W,H),(0,0,0,0)),mask))
    d.rounded_rectangle((18*scale,14*scale,W-18*scale,H-18*scale), radius=R, outline=(255,255,255,230), width=5*scale)
    d.rounded_rectangle((25*scale,21*scale,W-25*scale,H-26*scale), radius=max(8*scale,R-8*scale), outline=tuple(min(255,c+70) for c in color[:3])+(255,), width=4*scale)
    d.rounded_rectangle((46*scale,30*scale,W-46*scale,48*scale), radius=9*scale, fill=(255,255,255,82))
    d.rounded_rectangle((48*scale,H-34*scale,W-48*scale,H-27*scale), radius=5*scale, fill=(0,0,0,45))
    for x in range(62*scale,W-62*scale,16*scale):
        y=H-48*scale
        d.ellipse((x-1*scale,y-1*scale,x+1*scale,y+1*scale), fill=(0,0,0,45))
    save_png(_downsample(im,scale), IMG/'ui'/path)

def draw_ui_pack():
    draw_gloss_panel('hud_panel.png', 620, 190, 34, accent=(92,226,255,255))
    draw_gloss_panel('hud_panel_compact.png', 380, 168, 32, accent=(92,226,255,255))
    draw_gloss_panel('panel_card.png', 470, 282, 34, accent=(92,226,255,255), fill_top=(18,35,55,238), fill_bottom=(8,16,29,238))
    draw_gloss_panel('panel_modal.png', 900, 820, 52, accent=(105,221,255,255), fill_top=(18,37,60,248), fill_bottom=(6,13,25,248))
    draw_gloss_panel('panel_gameover.png', 900, 1080, 54, accent=(255,105,128,255), fill_top=(42,20,35,248), fill_bottom=(10,13,25,248))
    draw_button_bg('button_play.png', 620, 144, (37,207,98,255), 38)
    draw_button_bg('button_resume.png', 560, 132, (37,207,98,255), 36)
    draw_button_bg('button_home.png', 560, 132, (24,123,217,255), 36)
    draw_button_bg('button_sound.png', 480, 108, (23,188,196,255), 30)
    draw_button_bg('button_pause.png', 180, 180, (24,123,217,255), 42)

# Audio -----------------------------------------------------------------------
def write_wav(path, duration, gen, sr=44100):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path),'w') as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sr)
        for i in range(int(duration*sr)):
            t=i/sr
            v=max(-1,min(1,gen(t,duration)))
            sample=int(v*32767)
            wv.writeframes(struct.pack('<hh',sample,sample))

def encode_ogg(wav_path, ogg_path):
    ff=shutil.which('ffmpeg')
    if not ff:
        wav_path.rename(ogg_path.with_suffix('.wav'))
        return
    subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(wav_path),'-c:a','vorbis','-strict','-2','-q:a','5',str(ogg_path)],check=True)
    wav_path.unlink(missing_ok=True)

def env(t,d,attack=0.02,release=0.08):
    a=min(1,t/max(attack,1e-4)); r=min(1,(d-t)/max(release,1e-4)); return max(0,min(a,r,1))

def make_sfx(name, duration, gen):
    wav=AUD/'_tmp.wav'; ogg=AUD/name
    write_wav(wav,duration,gen); encode_ogg(wav,ogg)

def make_audio():
    make_sfx('ui/button_click.ogg',0.10,lambda t,d: 0.28*env(t,d,0.005,0.04)*math.sin(2*math.pi*(520+1800*t)*t))
    make_sfx('sfx/sort_success_ding.ogg',0.46,lambda t,d: 0.36*env(t,d,0.01,0.18)*(math.sin(2*math.pi*880*t)+0.45*math.sin(2*math.pi*1320*t)))
    make_sfx('sfx/sort_wrong_buzz.ogg',0.42,lambda t,d: 0.28*env(t,d,0.01,0.14)*(math.sin(2*math.pi*110*t)+0.55*math.sin(2*math.pi*92*t)))
    make_sfx('sfx/parcel_miss_thud.ogg',0.38,lambda t,d: 0.42*env(t,d,0.003,0.2)*math.sin(2*math.pi*(92-30*t)*t))
    make_sfx('sfx/rush_warning_alarm.ogg',0.82,lambda t,d: 0.33*env(t,d,0.01,0.08)*math.sin(2*math.pi*(660 if int(t*8)%2==0 else 420)*t))
    make_sfx('sfx/shift_over_jingle.ogg',1.12,lambda t,d: 0.30*env(t,d,0.02,0.28)*(math.sin(2*math.pi*(440 if t<.35 else 330 if t<.72 else 220)*t)))
    # 24s loopable factory groove
    notes=[220,277,330,415,330,277,220,185]
    def music(t,d):
        beat=int(t*3.2)%len(notes); base=notes[beat]
        pulse=(1 if (t*6.4)%1 < .42 else .25)
        lead=math.sin(2*math.pi*base*t)+0.35*math.sin(2*math.pi*base*2*t)
        bass=0.45*math.sin(2*math.pi*(base/2)*t)
        hat=0.12*math.sin(2*math.pi*3600*t)*(1 if (t*12.8)%1<.16 else 0)
        return 0.20*(lead*pulse+bass+hat)*env(t,d,0.05,0.05)
    make_sfx('music/parcel_factory_loop.ogg',24.0,music)


def write_manifest():
    prov={"source":"generated-for-game","generatedFor":GAME_ID,"generator":"scripts/generate_production_assets.py","method":"procedural-local-fallback","generatedAt":"2026-07-05"}
    def rel(p): return str(p.relative_to(ROOT))
    def image_entry(p, role, typ='sprite', alpha=True):
        with Image.open(p) as im: w,h=im.size
        return {"id":p.stem,"path":rel(p),"type":typ,"role":role,"quality":"production-demo","minWidth":w,"minHeight":h,"requiresAlpha":alpha,"provenance":prov.copy()}
    stage=[]; images=[]
    for p in sorted((IMG/'backgrounds').glob('*.png')):
        with Image.open(p) as im: w,h=im.size
        stage.append({"id":p.stem,"label":p.stem.replace('_',' '),"path":rel(p),"type":"stage-background","role":"stage-background","quality":"production-demo","minWidth":1080,"minHeight":1920,"provenance":prov.copy()})
        images.append(image_entry(p,'stage-background','background',False))
    role_by_dir={"parcels":"parcel","chutes":"sort-bin","machines":"machine","feedback":"feedback","ui":"ui-icon"}
    for folder, role in role_by_dir.items():
        for p in sorted((IMG/folder).glob('*.png')):
            r=role
            typ='sprite'
            if folder=='machines' and 'conveyor' in p.stem: r='conveyor'
            elif folder=='machines' and 'scanner' in p.stem: r='scanner'
            elif folder=='ui' and p.stem.startswith('panel') or p.stem.startswith('hud_panel'): r='ui-panel'
            images.append(image_entry(p,r,typ,True))
    def audio_entry(p, typ, loop=False, max_ms=None):
        e={"id":p.stem,"path":rel(p),"type":typ,"required":True,"provenance":prov.copy()}
        if loop: e['loopable']=True
        if max_ms: e['maxDurationMs']=max_ms
        return e
    audio=[]
    for p in sorted((AUD/'ui').glob('*.ogg')): audio.append(audio_entry(p,'ui',False,1000))
    for p in sorted((AUD/'sfx').glob('*.ogg')): audio.append(audio_entry(p,'sfx',False,3000))
    for p in sorted((AUD/'music').glob('*.ogg')): audio.append(audio_entry(p,'bgm',True))
    manifest={
      "assetsVersion":"2.1.0",
      "qualityTier":"production-demo",
      "assetIsolation":{"mode":"per-game","generatedFor":GAME_ID,"noSharedRuntimeAssets":True,"runtimeRoot":"assets/","forbidden":["root-project-assets","shared-assets","symlinks","copied-from-other-game"]},
      "imagePolicy":{"allowedFormats":["png","webp","jpg","jpeg"],"maxSpriteKB":8192,"requireAlphaForSprites":True,"minTouchUiSize":44},
      "audioPolicy":{"allowedFormats":["ogg","wav","mp3"],"maxSfxKB":600,"maxBgmKB":4096,"maxPeakDb":-1,"maxTrimSilenceMs":300},
      "stageBackgrounds":stage,
      "images":images,
      "audio":audio,
    }
    (ASSETS/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

def main():
    ensure()
    draw_warehouse('warehouse_day.png','day')
    draw_warehouse('warehouse_rush.png','rush')
    draw_warehouse('warehouse_night.png','night')
    draw_parcel('parcel_standard.png',(206,143,73,255),(60,154,255,255),'A권역','A')
    draw_parcel('parcel_heavy.png',(182,126,72,255),(57,217,138,255),'B권역','B')
    draw_parcel('parcel_cold.png',(199,154,95,255),(68,230,255,255),'냉장','❄')
    draw_parcel('parcel_fragile.png',(220,157,82,255),(255,139,66,255),'주의','!')
    draw_chute('chute_a.png',(60,167,255,255),'A','A권역')
    draw_chute('chute_b.png',(57,217,138,255),'B','B권역')
    draw_chute('chute_cold.png',(68,230,255,255),'COLD','냉장')
    draw_chute('chute_fragile.png',(255,139,66,255),'FRAG','취급주의')
    draw_scanner(); draw_conveyor_tile()
    draw_stamp('stamp_correct.png','SORT OK',(42,210,105,255))
    draw_stamp('stamp_wrong.png','WRONG',(245,79,95,255))
    draw_stamp('combo_perfect.png','PERFECT',(255,211,90,255))
    draw_ui_pack()
    make_audio()
    write_manifest()
    print('Generated production assets for', GAME_ID, 'under', ASSETS)

if __name__ == '__main__':
    main()
