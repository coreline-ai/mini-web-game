from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/images/production/feedback'
OUT.mkdir(parents=True, exist_ok=True)
S = 4
W = H = 512
SW = SH = W * S

def rgba(c, a=255):
    return (*c, a)

def mix(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))

def ellipse(draw, xy, fill, outline=None, width=1):
    box = tuple(int(v * S) for v in xy)
    draw.ellipse(box, fill=fill, outline=outline, width=width * S if outline else 1)

def rounded(draw, xy, radius, fill, outline=None, width=1):
    box = tuple(int(v * S) for v in xy)
    draw.rounded_rectangle(box, radius=radius * S, fill=fill, outline=outline, width=width * S if outline else 1)

def line(draw, pts, fill, width=1):
    draw.line([(int(x*S), int(y*S)) for x,y in pts], fill=fill, width=width*S, joint='curve')

def add_material_texture(img):
    px = img.load()
    w, h = img.size
    cx, cy = w / 2, h / 2
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 12:
                continue
            radial = 1 - min(1, math.hypot(x - cx, y - cy) / (w * 0.48))
            grain = ((x * 19 + y * 29 + (x ^ y) * 3) % 9) - 4
            shine = int(radial * 10)
            delta = shine + grain
            px[x, y] = (max(0, min(255, r + delta)), max(0, min(255, g + delta)), max(0, min(255, b + delta)), a)
    return img

def make_wrong_stamp():
    img = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))

    # Outer soft shadow with full safe margins.
    shadow = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    ellipse(sd, (78, 90, 434, 446), (0, 0, 0, 112))
    shadow = shadow.filter(ImageFilter.GaussianBlur(15 * S))
    img.alpha_composite(shadow)
    d = ImageDraw.Draw(img)

    # Clean circular badge, no scalloped/cut stamp edges.
    ellipse(d, (70, 64, 442, 436), rgba((102, 0, 0), 255), rgba((55, 0, 0), 235), 8)
    ellipse(d, (82, 74, 430, 422), rgba((225, 22, 18), 255), rgba((255, 112, 92), 245), 7)
    ellipse(d, (104, 96, 408, 400), rgba((186, 0, 0), 255), rgba((88, 0, 0), 220), 6)
    ellipse(d, (122, 114, 390, 382), rgba((235, 31, 27), 255), rgba((255, 150, 118), 180), 4)

    # Glossy top-left highlight.
    highlight = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    ellipse(hd, (128, 98, 358, 220), (255, 255, 255, 42))
    highlight = highlight.filter(ImageFilter.GaussianBlur(9 * S))
    img.alpha_composite(highlight)
    d = ImageDraw.Draw(img)

    # White X with shadow and dark rim; drawn from rounded bars so it remains crisp at 132px.
    x_shadow = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    xs = ImageDraw.Draw(x_shadow)
    rounded(xs, (151, 228, 361, 284), 25, (0, 0, 0, 115))
    rounded(xs, (151, 228, 361, 284), 25, (0, 0, 0, 115))
    x_shadow = x_shadow.rotate(45, resample=Image.Resampling.BICUBIC, center=(SW//2, SH//2))
    bar2 = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    b2 = ImageDraw.Draw(bar2)
    rounded(b2, (151, 228, 361, 284), 25, (0, 0, 0, 115))
    bar2 = bar2.rotate(-45, resample=Image.Resampling.BICUBIC, center=(SW//2, SH//2))
    img.alpha_composite(x_shadow.filter(ImageFilter.GaussianBlur(4*S)), (4*S, 6*S))
    img.alpha_composite(bar2.filter(ImageFilter.GaussianBlur(4*S)), (4*S, 6*S))

    def x_bar(fill, outline=None, width=1):
        layer = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        rounded(ld, (151, 228, 361, 284), 25, fill, outline, width)
        a = layer.rotate(45, resample=Image.Resampling.BICUBIC, center=(SW//2, SH//2))
        b = layer.rotate(-45, resample=Image.Resampling.BICUBIC, center=(SW//2, SH//2))
        return a, b

    # Dark outline bars first.
    for layer in x_bar(rgba((92, 25, 24), 255), None, 1):
        img.alpha_composite(layer)
    # Slightly smaller white bars.
    white_layer = Image.new('RGBA', (SW, SH), (0, 0, 0, 0))
    wd = ImageDraw.Draw(white_layer)
    rounded(wd, (163, 234, 349, 278), 22, rgba((255, 246, 235), 255), rgba((255, 255, 255), 210), 2)
    for rot in (45, -45):
        img.alpha_composite(white_layer.rotate(rot, resample=Image.Resampling.BICUBIC, center=(SW//2, SH//2)))


    img = img.resize((W, H), Image.Resampling.LANCZOS)
    img = add_material_texture(img)
    img.save(OUT / 'stamp_wrong.png')
    print(f'wrote {OUT / "stamp_wrong.png"}')

make_wrong_stamp()
