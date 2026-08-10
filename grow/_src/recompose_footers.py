# -*- coding: utf-8 -*-
# Recomposite ONLY the navy footer band on the /grow contractor flipbook pages,
# so the baked-in CTA button matches the new clickable destination in index.html.
# Page bodies are left byte-identical; we overwrite just the bottom navy band.
#
# Footer CSS is copied verbatim from grow-franchise/_src/build_pages.py (same layout
# engine the grow pages were built with). We force the band to its measured height and
# rely on flex `align-items:center` so the left headline + right columns overlay exactly;
# only the middle button label (and its width) changes.
import os, subprocess, tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # .../grow
PAGES = os.path.join(ROOT, "pages")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
LOGO_DARK = "file:///Users/jobs/Desktop/sublynk/demo/sublynk-color.png"

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
:root{--navy:#0d142a;--orange:#dd6336;--muted:#726c64}
html,body{width:1403px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--navy);-webkit-font-smoothing:antialiased}
.footer{background:var(--navy);padding:26px 82px;display:flex;align-items:center;justify-content:space-between;gap:24px;width:1403px}
.fcta{font-size:34px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-.5px;flex-shrink:0}
.fright{display:flex;align-items:center;gap:50px;flex-shrink:0}
.fbtn{flex-shrink:0}
.flink strong{display:block;font-size:16px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:3px}
.flink span{font-size:22px;font-weight:700;color:#fff}
.fbtn{background:var(--orange);color:#fff;font-size:24px;font-weight:800;padding:16px 30px;border-radius:10px;white-space:nowrap}
"""

def band_html(fcta, fbtn, h, questions_label="Questions?"):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}
    html,body{{height:{h}px}} .footer{{height:{h}px}}</style></head>
<body><div class="footer"><div class="fcta">{fcta}</div>
  <a class="fbtn">{fbtn}</a>
  <div class="fright">
    <div class="flink"><strong>Platform</strong><span>app.sublynk.com</span></div>
    <div class="flink"><strong>{questions_label}</strong><span>info@sublynk.com</span></div>
  </div>
</div></body></html>"""

def navy(px): r,g,b=px[:3]; return r<40 and g<48 and b<85
GUT=[6,30,60,1340,1370,1396]
def band_top(im):
    w,h=im.size; px=im.load(); top=h
    for y in range(h-1,-1,-1):
        if all(navy(px[x,y]) for x in GUT): top=y
        else: break
    return top

def render_band(html, w, h):
    with tempfile.TemporaryDirectory() as td:
        hp=os.path.join(td,"b.html"); op=os.path.join(td,"b.png")
        open(hp,"w",encoding="utf-8").write(html)
        subprocess.run([CHROME,"--headless=new","--disable-gpu","--hide-scrollbars",
            f"--screenshot={op}",f"--window-size={w},{h}","--force-device-scale-factor=1",
            "--default-background-color=0d142aff","file://"+hp],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return Image.open(op).convert("RGB").copy()

# page file -> (fcta, fbtn)
JOBS = [
 ("02-subcontractor.png", "Ready to get to<br>work?",            "Job Opportunities &rarr;"),
 ("03-submanagement.png", "Ready to limit your<br>liability?",  "Limit your liability &rarr;"),
]

for fname, fcta, fbtn in JOBS:
    fp=os.path.join(PAGES,fname)
    im=Image.open(fp).convert("RGB"); w,h=im.size
    top=band_top(im); H=h-top
    band=render_band(band_html(fcta,fbtn,H), w, H)
    if band.size!=(w,H): band=band.resize((w,H))
    im.paste(band,(0,top))
    im.save(fp)
    print(f"{fname}: recomposited band [{top},{h}] H={H}  btn='{fbtn}'")
print("done")
