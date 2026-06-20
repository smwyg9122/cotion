"""AYUTA 로고로 Capacitor 앱 아이콘/스플래시 소스를 생성한다.
- 아이콘: 연꽃+기둥 심볼만 (텍스트 제외)
- 스플래시: 전체 로고 (텍스트 포함)
@capacitor/assets가 이 소스들로 안드로이드+iOS 전 해상도를 생성한다.
"""
import os
from PIL import Image

try:
    RESAMPLE = Image.Resampling.LANCZOS
except AttributeError:
    RESAMPLE = Image.LANCZOS

SRC = "/Users/maesterong/cotion/아유타 누끼.png"
ASSETS = "/Users/maesterong/cotion/.claude/worktrees/stupefied-lalande-70ea82/packages/frontend/assets"
os.makedirs(ASSETS, exist_ok=True)

WHITE = (255, 255, 255, 255)
# 심볼 영역: 콘텐츠 상단 비율 (AYUTA 텍스트 직전까지). 로고 분석상 ~74%
SYMBOL_RATIO = 0.73

img = Image.open(SRC).convert("RGBA")
bbox = img.getbbox()  # 투명 아닌 콘텐츠 영역 (left, top, right, bottom)
left, top, right, bottom = bbox
content_h = bottom - top
print(f"원본 {img.size}, 콘텐츠 bbox={bbox} (h={content_h})")

# 심볼만 크롭 (텍스트 제외)
symbol_bottom = top + int(content_h * SYMBOL_RATIO)
symbol = img.crop((left, top, right, symbol_bottom))
full = img.crop(bbox)


def square_canvas(im, size, bg, padding_ratio):
    """im을 비율 유지로 정사각형 캔버스 중앙에 여백 두고 배치."""
    canvas = Image.new("RGBA", (size, size), bg)
    max_content = int(size * (1 - 2 * padding_ratio))
    w, h = im.size
    scale = min(max_content / w, max_content / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = im.resize((nw, nh), RESAMPLE)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


# --- 아이콘 (심볼) ---
# iOS/기본: 흰 배경 + 심볼 (여백 14%)
square_canvas(symbol, 1024, WHITE, 0.14).convert("RGB").save(f"{ASSETS}/icon-only.png")
# 안드로이드 적응형 전경: 투명 + 심볼 (안전영역 위해 여백 26%)
square_canvas(symbol, 1024, (0, 0, 0, 0), 0.26).save(f"{ASSETS}/icon-foreground.png")
# 안드로이드 적응형 배경: 흰색 단색
Image.new("RGB", (1024, 1024), (255, 255, 255)).save(f"{ASSETS}/icon-background.png")

# --- 스플래시 (전체 로고) ---
splash = square_canvas(full, 2732, WHITE, 0.32).convert("RGB")
splash.save(f"{ASSETS}/splash.png")
splash.save(f"{ASSETS}/splash-dark.png")

print("생성 완료:")
for f in ["icon-only.png", "icon-foreground.png", "icon-background.png", "splash.png", "splash-dark.png"]:
    print(f"  {f}: {Image.open(os.path.join(ASSETS, f)).size}")
