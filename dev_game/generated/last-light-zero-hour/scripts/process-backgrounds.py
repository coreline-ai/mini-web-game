from pathlib import Path
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tmp" / "imagegen" / "backgrounds"
OUT = ROOT / "assets" / "backgrounds"


for name in ["dawn", "day", "dusk", "night", "bloodmoon"]:
    image = Image.open(SRC / f"bg-{name}-source.png").convert("RGB")
    target_ratio = 1440 / 2560
    w, h = image.size
    ratio = w / h
    if ratio > target_ratio:
        new_w = round(h * target_ratio)
        left = (w - new_w) // 2
        image = image.crop((left, 0, left + new_w, h))
    elif ratio < target_ratio:
        new_h = round(w / target_ratio)
        top = (h - new_h) // 2
        image = image.crop((0, top, w, top + new_h))
    image = image.resize((1440, 2560), Image.Resampling.LANCZOS)
    # Imagegen's painterly microtexture needs a small reconstruction filter after upscale;
    # avoid sharpening because it creates high-frequency shimmer during day/night crossfade.
    radii = {"dawn": 1.05, "day": 1.35, "dusk": 1.05, "night": 0.0, "bloodmoon": 0.72}
    if radii[name] > 0:
        image = image.filter(ImageFilter.GaussianBlur(radius=radii[name]))
    image.save(OUT / f"bg-{name}.jpg", quality=92, subsampling=0, optimize=True)
    print(name, image.size)
