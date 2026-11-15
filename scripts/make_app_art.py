"""Generates app icons + iOS splash screens from public/brand/crest.png.
Run: python3 scripts/make_app_art.py  (needs Pillow)"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREST = Image.open(os.path.join(ROOT, "public/brand/crest.png")).convert("RGBA")
OUT_ICONS = os.path.join(ROOT, "public/icons")
OUT_SPLASH = os.path.join(ROOT, "public/splash")
os.makedirs(OUT_SPLASH, exist_ok=True)
FONT = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"

BG = (5, 5, 8)
GLOW = (64, 72, 210)  # the site's ambient blue


def backdrop(w, h, glow_strength=0.55, cy=0.5, radius=0.55):
    """Near-black canvas with a soft blue radial glow (matches the web app's ambient light)."""
    img = Image.new("RGB", (w, h), BG)
    glow = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(glow)
    r = int(min(w, h) * radius)
    cx, cyy = w // 2, int(h * cy)
    d.ellipse([cx - r, cyy - r, cx + r, cyy + r], fill=int(255 * glow_strength))
    glow = glow.filter(ImageFilter.GaussianBlur(r * 0.45))
    color = Image.new("RGB", (w, h), GLOW)
    img.paste(color, (0, 0), glow)
    return img


def place_crest(img, width_ratio, cy=0.5, shadow=True):
    w, h = img.size
    cw = int(w * width_ratio)
    ch = int(CREST.height * cw / CREST.width)
    crest = CREST.resize((cw, ch), Image.LANCZOS)
    x, y = (w - cw) // 2, int(h * cy - ch / 2)
    if shadow:
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        alpha = crest.split()[3].point(lambda a: int(a * 0.55))
        sh.paste((0, 0, 0, 255), (x, y + int(ch * 0.03)), alpha)
        sh = sh.filter(ImageFilter.GaussianBlur(max(2, cw // 40)))
        img.paste(sh, (0, 0), sh)
    img.paste(crest, (x, y), crest)
    return y + ch


# ---------- icons ----------
def icon(size, ratio):
    im = backdrop(size, size, glow_strength=0.45, radius=0.36)
    place_crest(im, ratio, cy=0.51)
    return im

icon(512, 0.70).save(os.path.join(OUT_ICONS, "icon-512.png"), optimize=True)
icon(192, 0.70).save(os.path.join(OUT_ICONS, "icon-192.png"), optimize=True)
icon(180, 0.70).save(os.path.join(OUT_ICONS, "apple-touch-icon.png"), optimize=True)
# Android "maskable": the launcher may crop to a circle, keep the crest inside the 80% safe zone
icon(512, 0.56).save(os.path.join(OUT_ICONS, "icon-maskable-512.png"), optimize=True)

# ---------- iOS splash screens (portrait) ----------
# (device css width, css height, pixel ratio)
DEVICES = [
    (440, 956, 3), (402, 874, 3), (420, 912, 3), (430, 932, 3), (393, 852, 3),
    (428, 926, 3), (390, 844, 3), (375, 812, 3), (414, 896, 3), (414, 896, 2),
    (375, 667, 2), (414, 736, 3),
]

for (cw, chh, dpr) in DEVICES:
    W, H = cw * dpr, chh * dpr
    im = backdrop(W, H, glow_strength=0.32, cy=0.44, radius=0.34)
    bottom = place_crest(im, 0.34, cy=0.44)
    d = ImageDraw.Draw(im)
    f1 = ImageFont.truetype(FONT, int(W * 0.052))
    word = "R E V O R F E S T"
    tw = d.textlength(word, font=f1)
    d.text(((W - tw) / 2, bottom + int(W * 0.07)), word, font=f1, fill=(245, 245, 247))
    f2 = ImageFont.truetype(FONT, int(W * 0.03))
    tag = "PRO CLUBS  ·  PS5 & PC"
    tw2 = d.textlength(tag, font=f2)
    d.text(((W - tw2) / 2, bottom + int(W * 0.07) + int(W * 0.085)), tag, font=f2, fill=(139, 139, 245))
    im.save(os.path.join(OUT_SPLASH, f"splash-{W}x{H}.png"), optimize=True)
    print("splash", W, H)
