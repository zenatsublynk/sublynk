# -*- coding: utf-8 -*-
import os
OUT = os.path.dirname(os.path.abspath(__file__))
LOGO_DARK  = "file:///Users/jobs/Desktop/sublynk/demo/sublynk-color.png"        # orange+navy, for light headers
LOGO_WHITE = "file:///Users/jobs/Desktop/sublynk/grow/assets/sublynk-logo-white.png"  # for dark hero

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
:root{
  --navy:#0d142a;--navy2:#16203c;--orange:#dd6336;--orange-d:#c25529;
  --ink:#1a1512;--muted:#726c64;--paper:#faf6ef;--card:#ffffff;--line:#ece6db;
  --pain:#fdeee6;--green:#2f9e6b;--soft:#fff3ec;
}
html,body{width:1403px;height:1815px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  background:var(--paper);color:var(--ink);overflow:hidden;-webkit-font-smoothing:antialiased}
.page{width:1403px;height:1815px;display:flex;flex-direction:column;position:relative;justify-content:space-between}
.pad{padding:0 74px}
.tag{font-size:21px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--orange)}
.tag b{color:var(--navy);font-weight:800}
h1.hl{font-size:60px;font-weight:900;line-height:1.03;letter-spacing:-2px;color:var(--navy);margin:12px 0 0}
h1.hl span{color:var(--orange)}
.sub{font-size:27px;font-weight:500;line-height:1.34;color:#4a453f;margin-top:14px;max-width:42ch}
.badge{background:var(--soft);color:var(--orange-d);font-size:18px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  padding:12px 22px;border-radius:30px;white-space:nowrap}
/* pricebox */
.pbox{border:2.5px solid var(--orange);border-radius:22px;padding:26px 28px;background:#fff}
.pbox .p{font-size:74px;font-weight:900;letter-spacing:-2px;color:var(--navy);line-height:.95}
.pbox .p span{font-size:30px;font-weight:700;color:var(--muted);letter-spacing:0}
.pbox .rr{margin-top:14px;font-size:23px;font-weight:800;color:var(--orange-d);line-height:1.25}
.pbox .rr b{color:var(--navy)}
.pbox .fine{margin-top:12px;font-size:19px;font-weight:500;color:var(--muted);line-height:1.4}
.pbox .bullet{margin-top:16px;padding-top:16px;border-top:1px solid var(--line);font-size:21px;font-weight:700;color:var(--navy);display:flex;align-items:center;gap:10px}
.pbox .bullet::before{content:"";width:12px;height:12px;border-radius:50%;background:var(--green);flex:0 0 auto}
/* header layout */
.top{padding-top:46px}
.hrow{display:flex;align-items:center;justify-content:space-between}
.logo{height:50px;width:auto;display:block}
.hbody{display:grid;grid-template-columns:1.55fr 1fr;gap:38px;align-items:start;margin-top:20px}
/* pain */
.pain{margin-top:0;background:var(--pain);border-left:8px solid var(--orange);border-radius:0 14px 14px 0;padding:18px 28px}
.pain .lab{font-size:18px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--orange-d)}
.pain .txt{font-size:24px;font-weight:600;line-height:1.36;color:var(--navy);margin-top:7px}
.pain .txt b{font-weight:800}
/* eyebrow */
.eyebrow{font-size:22px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--navy);opacity:.85}
/* cards */
.mid{margin-top:0}
.cards{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:18px;margin-top:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 26px;box-shadow:0 2px 6px rgba(13,20,42,.05);display:flex;flex-direction:column}
.card .ic{width:50px;height:50px;border-radius:14px;background:var(--soft);color:var(--orange);display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.card .ic svg{width:28px;height:28px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.card h3{font-size:29px;font-weight:800;color:var(--navy);line-height:1.1}
.card .adv{font-size:22px;color:#57524b;line-height:1.36;margin-top:8px;flex:1}
.card .ben{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:22px;font-weight:800;color:var(--orange-d)}
.card .ben .ar{color:var(--orange);font-weight:900;margin-right:8px}
/* steps */
.steps{margin-top:0}
.steps .shead{display:flex;align-items:center;justify-content:space-between}
.pill{background:#e7f5ee;color:var(--green);font-size:22px;font-weight:800;padding:9px 20px;border-radius:30px;display:flex;align-items:center;gap:10px}
.pill::before{content:"✓";font-weight:900}
.srow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:14px}
.step{background:var(--navy);border-radius:18px;padding:22px 24px 24px;color:#fff}
.step .n{width:44px;height:44px;border-radius:11px;background:var(--orange);color:#fff;font-size:24px;font-weight:900;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.step h4{font-size:27px;font-weight:800;line-height:1.1}
.step p{font-size:21px;color:#c7cede;line-height:1.36;margin-top:9px}
/* footer */
.footer{background:var(--navy);padding:26px 74px;display:flex;align-items:center;justify-content:space-between;gap:24px}
.fcta{font-size:34px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-.5px}
.fright{display:flex;align-items:center;gap:34px}
.flink strong{display:block;font-size:15px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:3px}
.flink span{font-size:20px;font-weight:700;color:#fff}
.fbtn{background:var(--orange);color:#fff;font-size:24px;font-weight:800;padding:16px 30px;border-radius:10px;white-space:nowrap}
"""

# --- icon set ---
IC = {
 'bolt':'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 'shield':'<path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
 'reuse':'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 'refresh':'<path d="M20 11a8 8 0 1 0-2.6 5.9"/><path d="M20 4v5h-5"/>',
 'people':'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6"/><path d="M18 20a6 6 0 0 0-3-5"/>',
 'doc':'<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
 'search':'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
 'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'chart':'<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M4 20h16"/>',
}

def icon(k): return f'<div class="ic"><svg viewBox="0 0 24 24">{IC[k]}</svg></div>'

def price_html(cfg):
    p = cfg['price']
    fine = f'<div class="fine">{p["fine"]}</div>' if p.get('fine') else ''
    bullet = f'<div class="bullet">{p["bullet"]}</div>' if p.get('bullet') else ''
    return (f'<div class="pbox"><div class="p">{p["big"]}<span> {p["unit"]}</span></div>'
            f'<div class="rr">{p["rr"]}</div>{fine}{bullet}</div>')

def cards_html(cards):
    out=[]
    for c in cards:
        out.append(f'<div class="card">{icon(c["ic"])}<h3>{c["h"]}</h3>'
                   f'<p class="adv">{c["d"]}</p>'
                   f'<p class="ben"><span class="ar">&rarr;</span>{c["b"]}</p></div>')
    return '<div class="cards">'+''.join(out)+'</div>'

def steps_html(steps):
    out=[]
    for i,s in enumerate(steps,1):
        out.append(f'<div class="step"><div class="n">{i}</div><h4>{s["h"]}</h4><p>{s["d"]}</p></div>')
    return '<div class="srow">'+''.join(out)+'</div>'

def page123(cfg):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head>
<body><div class="page">
  <div class="top pad">
    <div class="hrow"><img class="logo" src="{LOGO_DARK}" alt="Sublynk"><div class="badge">{cfg['badge']}</div></div>
    <div class="hbody">
      <div class="hleft">
        <div class="tag">Get Vetted. Get Connected. <b>Start Growing.</b></div>
        <h1 class="hl">{cfg['h1']}</h1>
        <p class="sub">{cfg['sub']}</p>
      </div>
      <div class="hright">{price_html(cfg)}</div>
    </div>
  </div>
  <div class="pad"><div class="pain"><div class="lab">The Problem Today</div><div class="txt">{cfg['pain']}</div></div></div>
  <div class="mid pad"><div class="eyebrow">{cfg['cards_eyebrow']}</div>{cards_html(cfg['cards'])}</div>
  <div class="steps pad">
    <div class="shead"><div class="eyebrow">{cfg['steps_eyebrow']}</div><div class="pill">{cfg['pill']}</div></div>
    {steps_html(cfg['steps'])}
  </div>
  <div class="footer"><div class="fcta">{cfg['fcta']}</div>
    <a class="fbtn">{cfg['fbtn']}</a>
    <div class="fright">
      <div class="flink"><strong>Platform</strong><span>app.sublynk.com</span></div>
      <div class="flink"><strong>Questions?</strong><span>info@sublynk.com</span></div>
    </div>
  </div>
</div></body></html>"""

# ---------------- PAGE 1: Franchisee Certified ----------------
p1 = dict(
 badge="Get Sublynk Certified",
 h1='Get verified once.<br>Win work <span>forever.</span>',
 sub="Turn the trust your franchise brand has earned into verified proof homeowners and Corporate can see.",
 price=dict(big="$25", unit="/ mo", rr="No lead fees. No cut of your jobs. Ever.",
            fine="Add-ons only if you want them: background checks pay-per-check, +$10/mo per extra location."),
 pain="Homeowners research a franchise location before they ever call. Right now nothing proves this location is licensed, insured, and on-brand, so your credentials aren't working for you.",
 cards_eyebrow="How to grow your location",
 cards=[
  dict(ic='shield',h="Portable trust",d="Your license, insurance, and brand standards verified and bundled into one profile you own.",b="Prove it once, everywhere"),
  dict(ic='people',h="On-brand &amp; verified",d="Show Corporate and customers this location meets every brand and compliance standard.",b="Win local trust"),
  dict(ic='doc',h="Job board",d="See and win jobs shared across the Sublynk ecosystem, open only to vetted locations.",b="Real work, no lead fees"),
  dict(ic='search',h="Leads",d="Homeowners and partners find your verified location and reach out to you directly.",b="Free leads, never gated"),
 ],
 steps_eyebrow="Complete in 5 minutes", pill="Most locations verified the same day",
 steps=[
  dict(h="Pick your trade",d="We load the exact federal, state, and Corporate brand requirements for your location."),
  dict(h="Add credentials",d="We verify each at the source, with your broker and at the state and federal level."),
  dict(h="Link &amp; grow",d="Share your profile to win customers and connect across the franchise network."),
 ],
 fcta="Ready to be the<br>obvious choice?", fbtn="Get Sublynk Certified &rarr;",
)

# ---------------- PAGE 2: Franchisee program ----------------
p2 = dict(
 badge="For Franchisees",
 h1='Turn compliance into<br>your <span>growth engine.</span>',
 sub="The franchisor (Corporate) who brought you on runs compliance on Sublynk. Here is what it means for you.",
 price=dict(big="$25–$35", unit="/ mo", rr="Billed as a contractor in your network. <b>No cut of your jobs.</b>",
            fine="Franchisees are credentialed as contractors inside your corporate network — verification, brand agreements, and renewals included. Background checks pay-per-check."),
 pain="Corporate needs proof you are licensed, insured, and on-brand, and the old way drags on for weeks. You lose revenue while you wait, and one expired document can pause your location.",
 cards_eyebrow="Why it's a no-brainer",
 cards=[
  dict(ic='bolt',h="Cleared in minutes",d="Get fully credentialed with Corporate in one sitting, not weeks stuck in the old tool.",b="Start earning sooner"),
  dict(ic='shield',h="Verified at the source",d="Insurance, license, and background confirmed with your broker and the board, not a PDF.",b="Corporate approves you first"),
  dict(ic='reuse',h="One profile, every brand",d="No re-credentialing each renewal or when you open another location.",b="Reuse it everywhere"),
  dict(ic='refresh',h="Never miss a renewal",d="We remind you and re-verify before anything expires, so you stay open for business.",b="Never pause a location"),
 ],
 steps_eyebrow="Complete in 5 minutes", pill="Most franchisees cleared the same business day",
 steps=[
  dict(h="Accept your invite",d="Corporate sent an invite. One click creates your account."),
  dict(h="Add credentials",d="Add insurance, license &amp; background, plus your franchise agreement and W-9, in one workflow."),
  dict(h="Get compliant",d="Corporate is notified the moment you pass. We keep you current so you never fall off-brand."),
 ],
 fcta="Ready to grow<br>your location?", fbtn="Get verified today &rarr;",
)

# ---------------- PAGE 3: Franchisor / Corporate management ----------------
p3 = dict(
 badge="Franchisee Management",
 h1='Grow your franchise.<br>Not your <span>liability.</span>',
 sub="Vet and monitor every franchisee at scale, so the locations that carry your brand never become your liability.",
 price=dict(big="Free", unit="for franchisors",
            rr="Onboard unlimited locations and let AI keep every franchisee compliant, so your brand grows without adding risk.",
            bullet="SOC 2 Type II verified"),
 pain="<b>Every franchisee who opens under your name carries your brand, and your liability.</b> If one operates uninsured or out of compliance, the claim, the lawsuit, and the reputation hit land on Corporate, not them.",
 cards_eyebrow="Grow a franchise your customers trust",
 cards=[
  dict(ic='doc',h="Protect your brand",d="Every location is vetted before it opens, so one operator's mistake never becomes your claim.",b="Risk, mitigated"),
  dict(ic='shield',h="Credential at scale",d="One bespoke package: COIs, license, background, and business verification, across every location.",b="The whole network, done for you"),
  dict(ic='clock',h="Never carry hidden risk",d="We monitor every credential and flag expirations 30 days out, before they lapse.",b="No lapsed location, ever"),
  dict(ic='chart',h="Grow with confidence",d="Onboard and expand a compliant franchise network you can stand behind.",b="Scale without the risk"),
 ],
 steps_eyebrow="Complete setup in less than 30 minutes", pill="Most franchisors go live in a week",
 steps=[
  dict(h="Set your standards",d="Tell us the trades, coverage, and brand rules you require; we build your bespoke compliance ruleset."),
  dict(h="Invite your franchisees",d="One link. They credential themselves, verified at the source."),
  dict(h="Grow your network",d="Add locations, monitor compliance, and expand a brand you can dispatch on demand."),
 ],
 fcta="Ready to credential<br>your franchise?", fbtn="Book a demo &rarr;",
)

# ---------------- PAGE 4: Mutual Success Plan (distinct layout) ----------------
CSS4 = CSS + """
.page4{background:var(--paper)}
.hero{background:var(--navy);padding:40px 74px 32px;position:relative}
.hero::before{content:"";position:absolute;top:0;left:0;right:0;height:6px;background:var(--orange)}
.hero .hrow{display:flex;align-items:center;justify-content:space-between}
.hero .logo{height:50px}
.hero .msp{font-size:20px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--orange)}
.hero .tag{margin-top:22px}
.hero .tag b{color:#fff}
.hero h1{font-size:66px;font-weight:900;line-height:1;letter-spacing:-2.5px;color:#fff;margin-top:14px}
.hero h1 span{color:var(--orange)}
.hero .sub{font-size:25px;color:#c3cbe0;font-weight:500;line-height:1.36;margin-top:16px;max-width:72ch}
.sec{padding:0 74px}
.k{margin-top:22px}
.stat3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:12px}
.statc{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px 24px;box-shadow:0 2px 6px rgba(13,20,42,.05)}
.statc .big{font-size:50px;font-weight:900;color:var(--orange);letter-spacing:-1.5px;line-height:1}
.statc .t{font-size:25px;font-weight:800;color:var(--navy);margin-top:7px}
.statc .d{font-size:21px;color:#57524b;line-height:1.36;margin-top:7px}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}
.oldw{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px 28px}
.oldw .h{font-size:20px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.oldw ul{list-style:none;margin:12px 0 0}
.oldw li{display:flex;align-items:center;gap:14px;font-size:23px;color:#57524b;margin:9px 0}
.oldw li .x{width:26px;height:26px;border-radius:50%;border:2px solid #cfc9bf;color:#a49c8f;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.oldw .foot{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:20px;font-weight:800;color:var(--muted)}
.subw{background:var(--navy);border-radius:18px;padding:22px 28px;color:#fff}
.subw .top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0}
.subw .h{font-size:20px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--orange)}
.subw .free{background:#1f7a4d;color:#fff;font-size:16px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:8px 14px;border-radius:20px;white-space:nowrap}
.subw ul{list-style:none;margin:12px 0 0}
.subw li{display:flex;align-items:center;gap:14px;font-size:23px;font-weight:700;margin:9px 0}
.subw li .c{width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.subw .foot{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.14);font-size:21px;font-weight:800;color:var(--orange)}
.lrow{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:12px}
.lstep{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 16px}
.lstep .n{width:40px;height:40px;border-radius:10px;background:var(--orange);color:#fff;font-size:22px;font-weight:900;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.lstep h4{font-size:22px;font-weight:800;color:var(--navy);line-height:1.1}
.lstep p{font-size:19px;color:#57524b;line-height:1.32;margin-top:7px}
.band{margin-top:18px;background:var(--soft);border-radius:18px;padding:22px 28px}
.band .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center}
.band .num{font-size:44px;font-weight:900;color:var(--navy);letter-spacing:-1px}
.band .cap{font-size:19px;font-weight:800;color:var(--orange-d);margin-top:6px;line-height:1.3}
.band .fine{text-align:center;margin-top:18px;padding-top:16px;border-top:1px solid #f0dccf;font-size:20px;color:#6a655d;line-height:1.4}
.band .fine b{color:var(--navy)}
"""

def page4():
    old=["Track and chase COIs","Run background checks","Verify licenses at the state boards","Screen the business","Track locations and renewals","Collect and file franchise agreements"]
    new=["Insurance, confirmed with the broker","Licenses, checked at state and federal level","Background, screened via Checkr","Business, verified with IRS and state","Renewals watched automatically"]
    steps=[("Set your standards","Your rules for insurance, licenses, background, and brand."),
           ("We build your bespoke network","You approve the workflow."),
           ("Send invites","A single workflow completed in 5 minutes."),
           ("Franchisees self-clear","Sublynk verifies at the source, plus continuous monitoring."),
           ("Free workshop","Hop on a 20-minute Google Meet and we complete your compliance flow together, click by click.")]
    stats=[("Say yes","Open the next location","A verified network means new locations launch faster while others scramble to comply."),
           ("Zero","Locations paused by paperwork","One lapsed COI stalls a location. We watch every renewal for you."),
           ("100 hrs","Given back to Corporate","Stop chasing PDFs. Your team grows the brand instead.")]
    stat_html=''.join(f'<div class="statc"><div class="big">{a}</div><div class="t">{b}</div><div class="d">{c}</div></div>' for a,b,c in stats)
    old_html=''.join(f'<li><span class="x">&times;</span>{o}</li>' for o in old)
    new_html=''.join(f'<li><span class="c">&#10003;</span>{n}</li>' for n in new)
    steps_html=''.join(f'<div class="lstep"><div class="n">{i}</div><h4>{h}</h4><p>{d}</p></div>' for i,(h,d) in enumerate(steps,1))
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS4}</style></head>
<body><div class="page page4">
  <div class="hero">
    <div class="hrow"><img class="logo" src="{LOGO_WHITE}" alt="Sublynk"><div class="msp">Mutual Success Plan</div></div>
    <div class="tag">Get Vetted. Get Connected. <b>Start Growing.</b></div>
    <h1>Onboard &amp; Grow.<br><span>A franchise that wins you work.</span></h1>
    <p class="sub">Send invites. Every franchisee clears your brand standards, verified at the source, and your network goes live, always current. Free with your Sublynk franchise.</p>
  </div>
  <div class="sec k"><div class="eyebrow">What it means for you</div><div class="stat3">{stat_html}</div></div>
  <div class="sec"><div class="cmp">
    <div class="oldw"><div class="h">The old way</div><ul>{old_html}</ul><div class="foot">6+ tools &middot; weeks to clear</div></div>
    <div class="subw"><div class="top"><div class="h">The Sublynk way</div><div class="free">Free with your franchise</div></div><ul>{new_html}</ul><div class="foot">Bespoke workflow &middot; verified at the source &middot; ready in days</div></div>
  </div></div>
  <div class="sec k"><div class="eyebrow">The launch plan</div><div class="lrow">{steps_html}</div></div>
  <div class="sec"><div class="band">
    <div class="row3">
      <div><div class="num">6+ &rarr; 1</div><div class="cap">tools replaced by one platform</div></div>
      <div><div class="num">90&ndash;120 &rarr; &lt;9</div><div class="cap">days to onboard a location</div></div>
      <div><div class="num">hours &rarr; 0</div><div class="cap">spent chasing paperwork per location</div></div>
    </div>
    <div class="fine">50 locations at ~2 hours each to chase and verify is roughly <b>100 coordinator hours a month</b>, handed back to growth. No lead fees. No cut of your jobs.</div>
  </div></div>
  <div class="footer"><div class="fcta">Ready to launch<br>your franchise?</div>
    <a class="fbtn">Start the launch &rarr;</a>
    <div class="fright">
      <div class="flink"><strong>Platform</strong><span>app.sublynk.com</span></div>
      <div class="flink"><strong>Your GTM contact</strong><span>info@sublynk.com</span></div>
    </div>
  </div>
</div></body></html>"""

files={'01-franchisee-certified.html':page123(p1),
       '02-franchisee.html':page123(p2),
       '03-franchisor-management.html':page123(p3),
       '04-mutual-success.html':page4()}
for name,html in files.items():
    open(os.path.join(OUT,name),'w',encoding='utf-8').write(html)
    print("wrote",name,len(html),"chars")
