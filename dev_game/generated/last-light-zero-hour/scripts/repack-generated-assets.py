from pathlib import Path
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]


def repack_grid(src_name: str, dst: Path, cols: int = 2, rows: int = 2) -> None:
    src = Image.open(ROOT / "tmp" / "imagegen" / src_name).convert("RGBA")
    sw, sh = src.size
    cw, ch = sw // cols, sh // rows
    crops = []
    for row in range(rows):
        for col in range(cols):
            frame = src.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            alpha = frame.getchannel("A")
            bbox = alpha.point(lambda p: 255 if p > 18 else 0).getbbox()
            if not bbox:
                raise RuntimeError(f"empty frame {src_name} {col},{row}")
            crops.append(frame.crop(bbox))

    max_w = max(im.width for im in crops)
    max_h = max(im.height for im in crops)
    scale = min(420 / max_w, 456 / max_h)
    out = Image.new("RGBA", (cols * 512, rows * 512), (0, 0, 0, 0))
    for index, frame in enumerate(crops):
        w = max(1, round(frame.width * scale))
        h = max(1, round(frame.height * scale))
        frame = frame.resize((w, h), Image.Resampling.LANCZOS)
        x = (index % cols) * 512 + (512 - w) // 2
        y = (index // cols) * 512 + 482 - h
        out.alpha_composite(frame, (x, y))
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, optimize=True)


def repack_weapons() -> None:
    src = Image.open(ROOT / "tmp" / "imagegen" / "weapons-alpha.png").convert("RGBA")
    cols = 5
    cw = src.width // cols
    crops = []
    for col in range(cols):
        frame = src.crop((col * cw, 0, (col + 1) * cw, src.height))
        bbox = frame.getchannel("A").point(lambda p: 255 if p > 18 else 0).getbbox()
        if not bbox:
            raise RuntimeError(f"empty weapon frame {col}")
        crops.append(frame.crop(bbox))
    max_w = max(im.width for im in crops)
    max_h = max(im.height for im in crops)
    scale = min(188 / max_w, 322 / max_h)
    out = Image.new("RGBA", (5 * 256, 384), (0, 0, 0, 0))
    for index, frame in enumerate(crops):
        w = max(1, round(frame.width * scale))
        h = max(1, round(frame.height * scale))
        frame = frame.resize((w, h), Image.Resampling.LANCZOS)
        out.alpha_composite(frame, (index * 256 + (256 - w) // 2, (384 - h) // 2))
    dst = ROOT / "assets" / "sprites" / "player" / "weapon-models.png"
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, optimize=True)


if __name__ == "__main__":
    repack_grid("player-up-rear-unarmed-alpha.png", ROOT / "assets/sprites/player/player-gunner-motion.png")
    repack_grid("walker-alpha.png", ROOT / "assets/sprites/enemies/zombie-walker-motion.png")
    repack_grid("runner-alpha.png", ROOT / "assets/sprites/enemies/zombie-runner-motion.png")
    repack_grid("brute-alpha.png", ROOT / "assets/sprites/enemies/zombie-brute-motion.png")
    repack_grid("titan-alpha.png", ROOT / "assets/sprites/boss/titan-motion.png")
    repack_weapons()
    previews = [
        (ROOT / "assets/sprites/player/player-gunner-motion.png", ROOT / "assets/sprites/player/player-gunner-preview.png"),
        (ROOT / "assets/sprites/enemies/zombie-walker-motion.png", ROOT / "assets/sprites/enemies/zombie-walker-preview.png"),
        (ROOT / "assets/sprites/boss/titan-motion.png", ROOT / "assets/sprites/boss/titan-preview.png"),
    ]
    for source, destination in previews:
        preview = Image.open(source).convert("RGBA").crop((0, 0, 512, 512))
        if "titan" in destination.name:
            preview = preview.filter(ImageFilter.GaussianBlur(radius=0.35))
        preview.save(destination, optimize=True)
