/* Sublynk first-touch attribution — loaded on every joinsublynk.com page.
 *
 * Why: the consent form is the only place we record a conversion, but visitors
 * rarely land there first. They hit the root, the flipbook, or /grow/ and click
 * through. This script runs everywhere so the traffic signal survives that hop:
 *   1. The Meta Pixel sets the _fbc cookie the instant a Meta ad click lands on
 *      ANY page (the cookie is readable later on /consent/, same domain).
 *   2. We also persist the raw fbclid, our outbound link id (?c=), and any UTMs
 *      into localStorage as a backup, so /consent/ can attribute the opt-in even
 *      if cookies are blocked or the pixel is slow.
 * The consent page reads _fbc / slk_* and computes Meta Ads vs Outbound vs Direct.
 */
(function () {
  // --- Meta Pixel (PageView only; CompleteRegistration stays server-side via CAPI) ---
  try {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", "931609069346666");
    window.fbq("track", "PageView");
  } catch (e) {}

  // --- Cross-page persistence of the raw attribution signals ---
  try {
    var p = new URLSearchParams(location.search);
    var get = function (k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
    var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

    // Meta click id -> _fbc format. A fresh fbclid always wins (latest ad click).
    var fbclid = p.get("fbclid");
    if (fbclid) set("slk_fbc", "fb.1." + Date.now() + "." + fbclid);

    // Our outbound personalized link id (?c=...). First outbound touch wins.
    var ref = p.get("c") || p.get("contact_ref") || p.get("ref");
    if (ref && !get("slk_ref")) set("slk_ref", ref);

    // UTMs — first touch wins.
    ["source", "medium", "campaign", "content", "term"].forEach(function (k) {
      var v = p.get("utm_" + k);
      if (v && !get("slk_utm_" + k)) set("slk_utm_" + k, v);
    });

    // First landing URL + referrer (set once, for debugging where "Direct" came from).
    if (!get("slk_landing")) set("slk_landing", location.href.slice(0, 500));
    if (!get("slk_referrer")) set("slk_referrer", (document.referrer || "").slice(0, 500));
  } catch (e) {}
})();
