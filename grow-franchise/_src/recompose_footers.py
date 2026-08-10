# -*- coding: utf-8 -*-
# Recomposite ONLY the navy footer band on the /grow-franchise flipbook pages,
# so the baked-in CTA button matches the new clickable destination in index.html.
# Page bodies are left byte-identical; we overwrite just the bottom navy band.
#
# Footer CSS/HTML is copied verbatim from build_pages.py (the same layout engine
# these pages were built with; note franchise footer uses 74px padding, 34px right
# gap, and 15/20px link text, which differ from the contractor book). space-between
# pins the left headline and the right columns to the page edges, so only the middle
# button label (and its width) changes.
import os, subprocess, tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # .../grow-franchise
PAGES = os.path.join(ROOT, "pages")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
:root{--navy:#0d142a;--orange:#dd6336;--muted:#726c64}
html,body{width:1403px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--navy);-webkit-font-smoothing:antialiased}
.footer{background:var(--navy);padding:26px 74px;display:flex;align-items:center;justify-content:space-between;gap:24px;width:1403px}
.fcta{font-size:34px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-.5px;flex-shrink:0}
.fright{display:flex;align-items:center;gap:34px;flex-shrink:0}
.flink strong{display:block;font-size:15px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:3px}
.flink span{font-size:20px;font-weight:700;color:#fff}
.fbtn{background:var(--orange);color:#fff;font-size:24px;font-weight:800;padding:16px 30px;border-radius:10px;white-space:nowrap;flex-shrink:0}
"""

DESIGN_W = 1403  # logical (CSS) page width the pages were designed at

def band_html(fcta, fbtn, h_css):
    # h_css is the LOGICAL (CSS px) band height, not device px
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}
    html,body{{height:{h_css}px}} .footer{{height:{h_css}px}}</style></head>
<body><div class="footer"><div class="fcta">{fcta}</div>
  <a class="fbtn">{fbtn}</a>
  <div class="fright">
    <div class="flink"><strong>Platform</strong><span>app.sublynk.com</span></div>
    <div class="flink"><strong>Questions?</strong><span>info@sublynk.com</span></div>
  </div>
</div></body></html>"""

def navy(px): r,g,b=px[:3]; return r<40 and g<48 and b<85
def gutters(w):
    # sample near the left and right edges regardless of 1x/2x scale
    return [round(w*f) for f in (0.004,0.02,0.04,0.955,0.977,0.995)]
def band_top(im):
    w,h=im.size; px=im.load(); gut=gutters(w); top=h
    for y in range(h-1,-1,-1):
        if all(navy(px[x,y]) for x in gut): top=y
        else: break
    return top

def render_band(html, w_dev, h_dev, scale):
    # render at logical size DESIGN_W x (h_dev/scale) with device-scale-factor=scale
    lw = DESIGN_W; lh = round(h_dev/scale)
    with tempfile.TemporaryDirectory() as td:
        hp=os.path.join(td,"b.html"); op=os.path.join(td,"b.png")
        open(hp,"w",encoding="utf-8").write(html)
        subprocess.run([CHROME,"--headless=new","--disable-gpu","--hide-scrollbars",
            f"--screenshot={op}",f"--window-size={lw},{lh}",f"--force-device-scale-factor={scale}",
            "--default-background-color=0d142aff","file://"+hp],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return Image.open(op).convert("RGB").copy()

# page file -> (fcta, fbtn)   (only the franchisor page 4/6 changes)
JOBS = [
 ("03-franchisor.png", "Ready to limit your<br>liability?", "Limit your liability &rarr;"),
]

for fname, fcta, fbtn in JOBS:
    fp=os.path.join(PAGES,fname)
    im=Image.open(fp).convert("RGB"); w,h=im.size
    scale=max(1, round(w/DESIGN_W))            # 1 for contractor pages, 2 for franchise (retina)
    top=band_top(im); H=h-top                  # band height in device px
    band=render_band(band_html(fcta,fbtn,round(H/scale)), w, H, scale)
    if band.size!=(w,H): band=band.resize((w,H))
    im.paste(band,(0,top))
    im.save(fp)
    print(f"{fname}: {w}x{h} scale={scale} recomposited band top={top} H={H}  btn='{fbtn}'")
print("done")
