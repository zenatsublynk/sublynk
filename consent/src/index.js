// Sublynk consent/agreement Worker.
// Handles two public form endpoints and, on each successful save, pings the #gtm Slack channel:
//   POST /api/consent    -> job-alert opt-in  -> Supabase public.consent_events   (Turnstile-gated)
//   POST /api/agreement  -> network-setup $500 -> Supabase public.consulting_agreements (honeypot-gated)
// Slack posting is fire-and-forget: a Slack outage never blocks or fails a save.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

// Per-alert Slack identities. Icons are hosted on the GitHub Pages repo so Slack can render them.
const ICON_BASE = 'https://zenatsublynk.github.io/sublynk/assets/slack';
const ICON_V = '?v=2'; // bump when the icon art changes, to force Slack to refetch (it caches by URL)
// Each alert carries a color for its Slack rail so the channel triages at a glance:
// orange = new inbound lead, green = revenue ($500), purple = onboarding, blue = website message.
const ALERTS = {
  jobAlert:   { username: 'AI Job Alerts',     icon_url: `${ICON_BASE}/emoji-ai-job-alert.png${ICON_V}`,   color: '#DD6336' },
  subNetwork: { username: 'Sub Network Setup', icon_url: `${ICON_BASE}/emoji-sub-network.png${ICON_V}`,     color: '#2EB67D' },
  intake:     { username: 'Onboarding Intake', icon_url: `${ICON_BASE}/emoji-bench-ready.png${ICON_V}`,     color: '#7C5CFC' },
  contact:    { username: 'Website Contact',   icon_url: `${ICON_BASE}/emoji-contact-inbound.png${ICON_V}`, color: '#1D9BD1' },
  // red rail = a paying account is trying to cancel -> CS save opportunity. No dedicated icon yet
  // (notifySlack renders fine without one), so it stays icon-less until art is added.
  cancelSave: { username: 'Cancellation / Save', icon_url: '', color: '#CF4A3C' },
  // gold rail = self-reported "how did you hear about us?" signup attribution. We can't instrument the
  // app (email CTAs redirect into the app, which swallows UTMs), so we capture the source on a page we
  // own. Icon-less until art exists; notifySlack renders fine without one.
  heardAbout: { username: 'How They Heard', icon_url: '', color: '#E0A500' },
};

// Fire-and-forget Slack notification to the #gtm incoming webhook. Never throws.
// `alert` is one of the ALERTS entries; `text` is Slack mrkdwn for the body.
// We set the webhook username/icon override (renders as the avatar where the workspace allows it)
// AND embed the icon inline via a Block Kit context row, so each alert type stays visually distinct
// even if the workspace blocks per-message avatar overrides. `text` doubles as the notification
// fallback that Slack requires whenever `blocks` are present.
// Post one #gtm alert as a single color-railed Slack attachment: our per-type emoji + a bold
// headline, the lead/company as the subject line, structured key/value fields, an optional quote,
// and a dim context footnote. `spec` is { title, subject, fields:[{k,v}], quote, context, color };
// a bare string still works as a title-only body. The color rail makes the channel scannable.
async function notifySlack(env, alert, spec) {
  if (!env.SLACK_WEBHOOK_URL) return; // not configured -> silently skip
  const s = typeof spec === 'string' ? { title: spec } : (spec || {});
  // Our GTM emoji (when the alert has one) + the alert name, so each type stays visually branded
  // even where Slack suppresses the per-message avatar override on incoming webhooks.
  const ctxEls = [];
  if (alert.icon_url) ctxEls.push({ type: 'image', image_url: alert.icon_url, alt_text: alert.username });
  ctxEls.push({ type: 'mrkdwn', text: `*${alert.username}*` });
  const blocks = [
    { type: 'context', elements: ctxEls },
    { type: 'section', text: { type: 'mrkdwn', text: s.subject ? `*${s.title}*\n${s.subject}` : `*${s.title}*` } },
  ];
  const fields = (s.fields || []).filter((f) => f && f.v != null && String(f.v).trim() !== '');
  if (fields.length) blocks.push({ type: 'section', fields: fields.map((f) => ({ type: 'mrkdwn', text: `*${f.k}*\n${f.v}` })) });
  if (s.quote && String(s.quote).trim()) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '> ' + String(s.quote).trim().replace(/\n/g, '\n> ') } });
  if (s.context) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: s.context }] });
  try {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: alert.username,
        icon_url: alert.icon_url,
        text: `${alert.username}: ${s.title}${s.subject ? ' — ' + s.subject.replace(/\*/g, '') : ''}`, // notification fallback (required with blocks/attachments)
        attachments: [{ color: s.color || alert.color || '#DD6336', blocks }],
      }),
    });
  } catch (e) {
    console.warn('Slack notify failed:', e && e.message);
  }
}

// Capture a website-contact submission into Customer.io via the Forms API (data-in). Uses the
// CIO_SITE_ID / CIO_TRACK_KEY secrets -- set them from WORKSPACE 223140 ONLY (Sublynk hard rule).
// No-ops until both secrets exist, so deploying this never breaks the Slack alert. Fire-and-forget.
async function sendToCustomerIO(env, allFields, norm) {
  if (!env.CIO_SITE_ID || !env.CIO_TRACK_KEY) return;
  try {
    const data = {};
    // 1) EVERY field the form sent (Gravity Forms "All Fields") -> 100% capture, nothing dropped.
    //    Skip empties, non-primitives, and the honeypot.
    for (const k in allFields) {
      if (k === 'website') continue;
      const v = allFields[k];
      if (v == null || typeof v === 'object' || String(v).trim() === '') continue;
      // Gravity Forms "All Fields" includes the entry's own `id` (and sometimes `cio_id`). CIO's
      // Forms API treats `id`/`cio_id` as PERSON identifiers, so sending either alongside `email`
      // makes CIO see multiple identifiers and split the profile (the form's multiple_identifiers
      // warning). Keep the value under a non-identifier name so `email` is the sole identifier.
      if (k === 'id' || k === 'cio_id') { data['gf_entry_' + k] = v; continue; }
      data[k] = v;
    }
    // 2) Overlay clean, normalized attribute names for the fields we recognize.
    const clean = { email: norm.email, name: norm.name, phone: norm.phone, company: norm.company,
                    role: norm.role, interest: norm.interest, network_size: norm.networkSize,
                    subject: norm.subject, message: norm.message, page_url: norm.pageUrl, source: 'website-contact' };
    for (const k in clean) if (clean[k]) data[k] = clean[k];
    if (!data.email) return;                       // Forms API needs an email/id identifier
    // Retry up to 3x with backoff. A transient CIO hiccup was silently dropping the odd submission
    // (Slack still fired via its own path, so the lead landed there but not in CIO). Retrying closes
    // that gap; Slack is a separate call, so this never affects the alert.
    const body = JSON.stringify({ data });
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 700 * attempt));
      try {
        const res = await fetch('https://track.customer.io/api/v1/forms/sublynk-contact/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(env.CIO_SITE_ID + ':' + env.CIO_TRACK_KEY) },
          body,
        });
        if (res.ok) return;
        console.warn(`CIO forms submit attempt ${attempt + 1} ->`, res.status, (await res.text()).slice(0, 300));
      } catch (e) { console.warn(`CIO forms attempt ${attempt + 1} error:`, e && e.message); }
    }
  } catch (e) { console.warn('CIO forms error:', e && e.message); }
}

// Fire a job-alert opt-in into Customer.io (223140) as a DISTINCT custom event (jobalert_optin),
// NOT a form submit. The "Website Contact · Auto-Reply" automation (campaign 5) triggers on ANY
// form_submit with no form filter, so routing opt-ins through a CIO form would ALSO fire the contact
// auto-reply (wrong email). Instead: (1) identify the person so the confirmation email's Liquid has
// first_name/company, then (2) emit the jobalert_optin event, which the "Job Alerts · Opt-In
// Confirmation" automation (campaign 6) triggers on. Reuses the same Track creds as the contact push.
// Fire-and-forget; a CIO hiccup never affects the opt-in save or Slack.
async function sendOptinToCIO(env, d) {
  if (!env.CIO_SITE_ID || !env.CIO_TRACK_KEY || !d.email) return;
  const auth = 'Basic ' + btoa(env.CIO_SITE_ID + ':' + env.CIO_TRACK_KEY);
  const id = encodeURIComponent(d.email);                 // email is the workspace identifier
  const attrs = { email: d.email, first_name: d.first_name || '', name: d.name || '', company: d.company || '',
                  trade: d.trade || '', zip: d.zip || '', source: 'job-alert-optin', job_alert_optin: true };
  const evt = { name: 'jobalert_optin', data: { first_name: d.first_name || '', company: d.company || '',
                trade: d.trade || '', zip: d.zip || '' } };
  const post = async (url, payload) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 700 * attempt));
      try {
        const res = await fetch(url, {
          method: payload.method,
          headers: { 'Content-Type': 'application/json', Authorization: auth },
          body: JSON.stringify(payload.body),
        });
        if (res.ok) return true;
        console.warn(`CIO optin ${payload.label} attempt ${attempt + 1} ->`, res.status, (await res.text()).slice(0, 200));
      } catch (e) { console.warn(`CIO optin ${payload.label} attempt ${attempt + 1} error:`, e && e.message); }
    }
    return false;
  };
  // 1) Identify (set attributes) BEFORE the event so the email's {{customer.first_name}} resolves.
  await post(`https://track.customer.io/api/v1/customers/${id}`, { method: 'PUT', body: attrs, label: 'identify' });
  // 2) Fire jobalert_optin -> triggers the Opt-In Confirmation automation (campaign 6).
  await post(`https://track.customer.io/api/v1/customers/${id}/events`, { method: 'POST', body: evt, label: 'event' });
}

// Insert a row into a Supabase table via PostgREST (anon key + RLS insert). 3 retries.
// ---- Meta Conversions API (server-side) ---------------------------------------------------
// Send a CompleteRegistration event after a job-alert opt-in saves, so Meta can attribute the
// signup to the ad that drove the click (per Chris's CAPI spec). No browser pixel: CAPI only.
// PII (email/phone/name) is SHA-256 hashed for Meta advanced matching; IP, user agent, and the
// _fbp/_fbc click cookies are passed through unhashed. Fire-and-forget via ctx.waitUntil so a Meta
// outage never blocks or fails the opt-in. Never logs the access token or raw personal data.
async function sha256Hex(value) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendMetaRegistrationEvent(env, d) {
  if (!env.META_ACCESS_TOKEN) return;                 // not configured -> skip silently (like Slack/CIO)
  try {
    const datasetId = env.META_DATASET_ID || '931609069346666';
    const version = env.META_GRAPH_VERSION || 'v21.0';

    const email = (d.email || '').trim().toLowerCase();
    const digits = (d.phone || '').replace(/\D/g, '');
    const phone = digits ? (digits.length === 10 ? '1' + digits : digits) : '';   // country code, digits only
    const parts = (d.fullName || '').trim().split(/\s+/).filter(Boolean);
    const first = (parts[0] || '').toLowerCase();
    const last = parts.slice(1).join(' ').toLowerCase();

    // Deterministic event_id: same person -> same id, so Meta dedupes retries AND rapid double submits
    // to a single conversion (a per-DB-row id would let two submits double-count).
    const seed = await sha256Hex(`${email}|${phone}`);
    const eventId = `sublynk_registration_${seed.slice(0, 32)}`;

    const user_data = {};
    if (email) user_data.em = [await sha256Hex(email)];
    if (phone) user_data.ph = [await sha256Hex(phone)];
    if (first) user_data.fn = [await sha256Hex(first)];
    if (last)  user_data.ln = [await sha256Hex(last)];
    if (d.clientIp && d.clientIp !== 'unknown') user_data.client_ip_address = d.clientIp;
    if (d.userAgent) user_data.client_user_agent = d.userAgent;
    if (d.fbp) user_data.fbp = d.fbp;
    if (d.fbc) user_data.fbc = d.fbc;

    // Trades as non-PII snake_case tokens (matches the spec's water_mitigation / mold_remediation shape).
    const contractor_trades = (d.trades || [])
      .map((t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
      .filter(Boolean);

    const payload = {
      data: [{
        event_name: 'CompleteRegistration',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: d.sourceUrl || 'https://joinsublynk.com/consent/',
        user_data,
        custom_data: {
          content_name: 'SubLynk Contractor Registration',
          registration_method: 'contractor_signup',
          contractor_trades,
        },
      }],
    };
    if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

    const endpoint = `https://graph.facebook.com/${version}/${datasetId}/events`;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 800 * attempt));
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.META_ACCESS_TOKEN}` },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) { console.log('Meta CAPI ok:', eventId, 'received', body.events_received ?? '', body.fbtrace_id || ''); return; }
        // 4xx (bad token/permission/payload) will not fix on retry -> log once and stop. 5xx/network -> retry.
        console.warn(`Meta CAPI HTTP ${res.status} (attempt ${attempt + 1}):`, JSON.stringify(body).slice(0, 300));
        if (res.status >= 400 && res.status < 500) return;
      } catch (e) {
        console.warn(`Meta CAPI attempt ${attempt + 1} error:`, e.message || String(e));
      }
    }
  } catch (e) {
    console.warn('Meta CAPI unexpected error:', e.message || String(e));
  }
}

async function insertRow(env, table, row) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 800 * attempt));
    // Abort a wedged/slow save (e.g. PostgREST returning PGRST002 503s, or the DB warming up after a
    // compute upgrade) rather than hanging, then retry. 15s per attempt gives headroom for a slow-but-
    // succeeding write so we don't fail a real opt-in during warm-up or a transient load spike.
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(row),
        signal: ctrl.signal,
      });
      if (res.ok) return { ok: true };
      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
      console.warn(`insert ${table} attempt ${attempt + 1} -> ${lastError}`);
    } catch (e) {
      lastError = e.name === 'AbortError' ? 'timed out after 8s (PostgREST/DB slow or reloading schema cache)' : (e.message || String(e));
      console.warn(`insert ${table} attempt ${attempt + 1} error: ${lastError}`);
    } finally {
      clearTimeout(to);
    }
  }
  return { ok: false, error: lastError };
}

// ---- Email open/click tracking ------------------------------------------------------------
const PIXEL_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent GIF
function pixelResponse() {
  const bytes = Uint8Array.from(atob(PIXEL_B64), (c) => c.charCodeAt(0));
  return new Response(bytes, { status: 200, headers: {
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private', Pragma: 'no-cache', Expires: '0',
  } });
}
// GET /track/open/:enrollmentId/:token           -> log an open, return a 1x1 gif
// GET /track/click/:enrollmentId/:token?target=  -> log a click, 302 to the target URL
// Inserts into public.email_tracking via the anon key (insert-only RLS). Fire-and-forget so the
// pixel/redirect returns instantly even if the DB write is slow.
async function handleTracking(u, request, env, ctx) {
  const parts = u.pathname.split('/').filter(Boolean); // ['track','open'|'click', id, token]
  const kind = parts[1], enrollmentId = parts[2] || null, token = parts[3] || null;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('user-agent') || '';
  const now = new Date().toISOString();
  if (kind === 'open') {
    ctx.waitUntil(insertRow(env, 'email_tracking', {
      event_type: 'open', enrollment_id: enrollmentId, token, timestamp: now, ip_address: ip, user_agent: ua,
    }));
    return pixelResponse();
  }
  if (kind === 'click') {
    const target = u.searchParams.get('target') || '';
    ctx.waitUntil(insertRow(env, 'email_tracking', {
      event_type: 'click', enrollment_id: enrollmentId, token, timestamp: now,
      ip_address: ip, user_agent: ua, target_url: target,
    }));
    return Response.redirect(/^https?:\/\//i.test(target) ? target : 'https://app.sublynk.com', 302);
  }
  // CTA click on a Sublynk page (e.g. the consent confirmation page's Create Account / Find Jobs).
  // Distinct event_type so it never mixes into the email open/click metrics. Logs, then 302s to the
  // UTM-tagged destination so the click is captured AND the user still lands where they intended.
  if (kind === 'cta') {
    const target = u.searchParams.get('target') || '';
    ctx.waitUntil(insertRow(env, 'email_tracking', {
      event_type: 'cta_click', enrollment_id: 'cta:' + (enrollmentId || 'unknown'), token, timestamp: now,
      ip_address: ip, user_agent: ua, target_url: target,
    }));
    return Response.redirect(/^https?:\/\//i.test(target) ? target : 'https://app.sublynk.com', 302);
  }
  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request, env, ctx) {
    // CORS preflight must be answered before the method/path guards, or the browser silently
    // blocks the POST with "Failed to fetch".
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // Email open/click tracking is GET (recipients' mail clients load these), so it must be
    // handled before the POST-only guard below.
    const trackUrl = new URL(request.url);
    if (trackUrl.pathname.startsWith('/track/')) return handleTracking(trackUrl, request, env, ctx);

    if (request.method !== 'POST') return new Response('Not found', { status: 404 });
    const url = request.url;

    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0] || 'unknown';
    const pageUrl = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';

    // ---------------------------------------------------------------- /api/consent (job alerts)
    if (url.includes('/api/consent')) {
      try {
        const data = await request.json();
        const { full_name, company, email, phone, phone_raw, consent, zip, trades, trade, trade_other, 'cf-turnstile-response': turnstileToken } = data;

        if (!full_name?.trim() || !company?.trim() || !email?.trim() || !phone?.trim()) return json({ error: 'Missing required fields' }, 400);
        if (!consent) return json({ error: 'Consent not provided' }, 400);
        if (!turnstileToken) return json({ error: 'Turnstile token missing' }, 400);
        if (!env.TURNSTILE_SECRET) { console.error('TURNSTILE_SECRET not configured'); return json({ error: 'Server configuration error' }, 500); }

        const tv = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: turnstileToken, remoteip: clientIp }),
        });
        const tr = await tv.json();
        if (!tr.success) { console.warn('Turnstile failed:', tr); return json({ error: 'CAPTCHA verification failed' }, 400); }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return json({ error: 'Invalid email address' }, 400);

        const d = phone.replace(/\D/g, '');
        const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
        if (ten.length !== 10 || /^(\d)\1{9}$/.test(ten) || ten[0] === '0' || ten[0] === '1') return json({ error: 'Invalid US mobile number' }, 400);
        const phoneFormatted = `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;

        // Zip: captured to power local job-matching. Lenient — store a clean 5-digit or null,
        // never reject a valid consent over a bad zip.
        const zipDigits = (zip || '').replace(/\D/g, '').slice(0, 5);
        const zip5 = zipDigits.length === 5 ? zipDigits : null;

        // Trade: self-reported at opt-in so we alert the right jobs (beats inferring it later). Store one
        // of our known verticals, lowercased, or null if missing/unknown -- never reject a consent over it.
        // Trades: self-reported at opt-in as a multi-select of canonical Network-Setup categories, so we
        // alert only matching jobs. Keep known categories, store a comma-joined list, keep the first as a
        // primary for legacy single-trade readers, and preserve any free-text "Other". Never reject over it.
        const TRADE_SET = new Set(['Board Up & Tarping','Commercial Mitigation','Fire Mitigation','Tree Removal','Water Mitigation','Asbestos Abatement','Lead Abatement','Mold Remediation','Trauma & Biohazard','Cleaning','Labor','Contents Off-site','Contents On-site','General Contracting','Reconstruction','Commercial Reconstruction','Remodeling','Demolition','Electrical','HVAC','Plumbing','Cabinetry','Carpentry (Finish)','Carpentry (Rough)','Drywalling','Insulation','Painting','Flooring','Residential Roofing','Commercial Roofing','Masonry (Veneer)','Masonry (Structural)','Stucco & Plaster','Window Install & Repair']);
        const tradeList = Array.isArray(trades) ? trades : String(trades || '').split(',');
        const tradesClean = [...new Set(tradeList.map((t) => String(t).trim()).filter((t) => TRADE_SET.has(t)))];
        const tradesStr = tradesClean.length ? tradesClean.join(', ') : null;
        const tradeOtherClean = String(trade_other || '').trim().slice(0, 80) || null;
        const tradePrimary = tradesClean[0] || (String(trade || '').trim() || null) || (tradeOtherClean ? 'other' : null);
        const tradeLabel = [tradesStr, tradeOtherClean ? `Other: ${tradeOtherClean}` : ''].filter(Boolean).join(' · ');

        const DISCLOSURE_VERSION = 'v1.2-2026-07-11';
        const DISCLOSURE_TEXT =
          'By checking this box and entering my mobile number, I give my express written consent for Sublynk to contact me at ' +
          'that number with recurring job-alert calls and text messages about job opportunities matched to me. These calls and ' +
          'texts may be made using an automatic telephone dialing system, autodialer, and an artificial, prerecorded, or ' +
          'AI-generated voice. Consent is not a condition of using Sublynk or receiving any job. Message and data rates may apply ' +
          'and message frequency varies. I can opt out anytime by replying STOP to a text, pressing 9 on a call, or clicking ' +
          'unsubscribe, and reply HELP for help. I have read and agree to the Sublynk Privacy Policy and Terms of Service, and by checking this box I am signing electronically.';

        // Traffic source: prefer the front-end's computed label, else derive from the Meta click id
        // (fbc) / our personalized outreach link (contact_ref), else Direct. Stored on the row so we can
        // query Meta vs Outbound vs Direct directly instead of reading #gtm one message at a time.
        const SOURCES = ['Meta Ads', 'Outbound', 'Direct'];
        const trafficSource = SOURCES.includes(String(data.source || '').trim())
          ? String(data.source).trim()
          : (data.fbc ? 'Meta Ads' : (data.contact_ref ? 'Outbound' : 'Direct'));
        const clip = (v, n) => (v == null ? null : (String(v).slice(0, n) || null));

        const saved = await insertRow(env, 'consent_events', {
          full_name: full_name.trim(), company: company.trim(), email: email.trim(),
          phone: phoneFormatted, phone_raw: phone_raw?.trim() || phone.trim(), zip: zip5,
          trade: tradePrimary, trades: tradesStr, trade_other: tradeOtherClean,
          consent_calls: true, consent_sms: true, channels: 'calls+sms',
          disclosure_version: DISCLOSURE_VERSION, disclosure_text: DISCLOSURE_TEXT, networks_shown: '',
          page_url: pageUrl, user_agent: userAgent, source: 'job-alerts-optin', status: 'active',
          contact_ref: data.contact_ref || null, ip: clientIp,
          traffic_source: trafficSource,
          fbc: clip(data.fbc, 255), fbp: clip(data.fbp, 255),
          utm_source: clip(data.utm_source, 200), utm_medium: clip(data.utm_medium, 200),
          utm_campaign: clip(data.utm_campaign, 200), utm_content: clip(data.utm_content, 200),
          utm_term: clip(data.utm_term, 200),
          landing_url: clip(data.landing_url, 500), referrer: clip(data.referrer, 500),
        });
        if (!saved.ok) {
          console.error('consent save failed:', saved.error);
          // Never silently lose a real opt-in: alert #gtm with the full details so CS can record the
          // TCPA consent by hand even when the DB insert fails (this is exactly what dropped Jesse
          // McEachern's opt-in on 2026-08-10, when PostgREST was returning PGRST002 on its schema cache).
          ctx.waitUntil(notifySlack(env, ALERTS.cancelSave, {
            title: '⚠️ Job-alert opt-in FAILED to save — capture by hand',
            subject: `*${full_name.trim()}*  ·  ${company.trim()}`,
            fields: [
              { k: 'Phone', v: phoneFormatted },
              { k: 'Email', v: email.trim() },
              ...(zip5 ? [{ k: 'Zip', v: zip5 }] : []),
              ...(tradeLabel ? [{ k: 'Trades', v: tradeLabel }] : []),
              { k: 'DB error', v: String(saved.error || '').slice(0, 140) },
            ],
            context: '❗ TCPA consent NOT recorded in the database — record it manually and follow up now',
          }));
          return json({ error: 'Could not save your consent. Please try again.' }, 500);
        }

        ctx.waitUntil(notifySlack(env, ALERTS.jobAlert, {
          title: 'New AI job-alert opt-in',
          subject: `*${full_name.trim()}*  ·  ${company.trim()}`,
          fields: [
            { k: 'Source', v: trafficSource },
            { k: 'Phone', v: phoneFormatted },
            { k: 'Email', v: email.trim() },
            ...(zip5 ? [{ k: 'Zip', v: zip5 }] : []),
            ...(tradeLabel ? [{ k: 'Trades', v: tradeLabel }] : []),
          ],
          context: '📞 TCPA consent captured · calls + SMS',
        }));
        // Fire the opt-in into CIO so the confirmation email goes out (catches tab-closers).
        ctx.waitUntil(sendOptinToCIO(env, {
          email: email.trim(), first_name: (full_name.trim().split(/\s+/)[0] || ''),
          name: full_name.trim(), company: company.trim(), trade: tradePrimary, zip: zip5,
        }));
        // Server-side Meta CompleteRegistration so ad spend can be attributed to this signup. Only the
        // successfully-saved opt-in reaches here, matching the spec's "fire only after success" rule.
        ctx.waitUntil(sendMetaRegistrationEvent(env, {
          email: email.trim(), phone: ten, fullName: full_name.trim(), trades: tradesClean,
          clientIp, userAgent, sourceUrl: pageUrl || 'https://joinsublynk.com/consent/',
          fbp: (data.fbp || '').toString().trim() || null,
          fbc: (data.fbc || '').toString().trim() || null,
        }));
        return json({ success: true, message: 'Consent recorded successfully' });
      } catch (e) {
        console.error('consent error:', e);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    // ------------------------------------------------------------ /api/agreement (network setup $500)
    if (url.includes('/api/agreement')) {
      try {
        const data = await request.json();
        if (data.website) return json({ success: true }); // honeypot -> pretend success, drop bot
        const { full_name, company, email, phone, agreed } = data;

        if (!full_name?.trim() || !company?.trim() || !email?.trim()) return json({ error: 'Missing required fields' }, 400);
        if (!agreed) return json({ error: 'Agreement not confirmed' }, 400);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return json({ error: 'Invalid email address' }, 400);

        // Billing method the client selected. Default is charging the card on file (per Chris); invoice is the fallback.
        const billing = data.billing_method === 'invoice' ? 'invoice' : 'card';
        const billingText = billing === 'card'
          ? 'charge the one-time $500 consulting fee to the card Sublynk has on file'
          : 'send me an invoice for the one-time $500 consulting fee';

        const AGREEMENT_VERSION = 'v2-2026-07-20';
        const AGREEMENT_TEXT =
          'I would like to move forward with the Sublynk subcontractor network setup and evaluation (audit of my contracts and ' +
          'subcontractor requirements, a plan to bridge the gaps, and setup of my network and bench in Sublynk), and I authorize ' +
          'Sublynk to ' + billingText + '. No card details are entered on this page, and full terms are provided with the receipt ' +
          'or invoice. By checking this box I am agreeing electronically.';

        const saved = await insertRow(env, 'consulting_agreements', {
          full_name: full_name.trim(), company: company.trim(), email: email.trim(),
          phone: phone?.trim() || null, agreed: true, fee_usd: 500,
          agreement_version: AGREEMENT_VERSION, agreement_text: AGREEMENT_TEXT,
          source: 'network-setup', contact_ref: data.contact_ref || null,
        });
        if (!saved.ok) {
          console.error('agreement save failed:', saved.error);
          // Never silently lose a $500 setup agreement on a DB hiccup: alert #gtm with the full details
          // (incl. billing choice) so it can be recorded + billed by hand even though the insert failed.
          ctx.waitUntil(notifySlack(env, ALERTS.cancelSave, {
            title: '⚠️ $500 setup agreement FAILED to save — record + bill by hand',
            subject: `*${full_name.trim()}*  ·  ${company.trim()}`,
            fields: [
              { k: 'Email', v: email.trim() },
              ...(phone?.trim() ? [{ k: 'Phone', v: phone.trim() }] : []),
              { k: 'Billing', v: billing === 'card' ? '💳 Charge card on file' : '📧 Send invoice' },
              { k: 'DB error', v: String(saved.error || '').slice(0, 140) },
            ],
            context: '❗ $500 consulting agreement NOT recorded in the DB — follow up now',
          }));
          return json({ error: 'Could not save that. Please try again.' }, 500);
        }

        const billingLabel = billing === 'card' ? '💳 Charge card on file' : '📧 Send invoice';
        ctx.waitUntil(notifySlack(env, ALERTS.subNetwork, {
          title: 'Sub-network setup agreement · $500',
          subject: `*${full_name.trim()}*  ·  ${company.trim()}`,
          fields: [
            { k: 'Email', v: email.trim() },
            { k: 'Billing', v: billingLabel },
          ],
          context: '🖊️ signed electronically · one-time $500 setup + evaluation',
        }));
        return json({ success: true, message: 'Agreement recorded successfully' });
      } catch (e) {
        console.error('agreement error:', e);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    // --------------------------------------------------- /api/intake (onboarding intake -> #gtm only)
    // The intake form persists through Google Apps Script (Sheets/Drive/Notion); this endpoint does
    // NOT write to the DB. It only relays a heads-up to #gtm so nothing else in that pipeline changes.
    if (url.includes('/api/intake')) {
      try {
        const data = await request.json();
        const company = (data.company || '').trim();
        if (!company) return json({ error: 'Missing company' }, 400);
        const contact = (data.contact_name || '').trim();
        const email = (data.email || '').trim();
        const loc = [data.city, data.state].map((s) => (s || '').trim()).filter(Boolean).join(', ');
        const programs = (data.programs || '').toString().trim();
        const folderUrl = (data.folder_url || '').trim();
        const sheetUrl = (data.sheet_url || '').trim();
        // Links to what the intake created (sent by the Apps Script backend when available).
        const files = [
          folderUrl && `<${folderUrl}|Drive folder>`,
          sheetUrl && `<${sheetUrl}|Submissions sheet>`,
        ].filter(Boolean).join('  ·  ');
        // Required next-step links to send the new contractor (static, always shown).
        const NEXT_STEPS = '<https://zenatsublynk.github.io/sublynk/consent/|AI job alerts>  ·  '
          + '<https://zenatsublynk.github.io/sublynk/setup/|$500 bench setup>  ·  '
          + '<https://calendar.app.google/BeExg667hGvdtqZQ8|Book intake>';

        ctx.waitUntil(notifySlack(env, ALERTS.intake, {
          title: 'New onboarding intake',
          subject: `*${company}*`,
          fields: [
            ...(contact  ? [{ k: 'Contact',  v: contact  }] : []),
            ...(email    ? [{ k: 'Email',    v: email    }] : []),
            ...(loc      ? [{ k: 'Location', v: loc      }] : []),
            ...(programs ? [{ k: 'Programs', v: programs }] : []),
            ...(files    ? [{ k: 'Files',    v: files    }] : []),
            { k: 'Required next steps', v: NEXT_STEPS },
          ],
        }));
        return json({ success: true });
      } catch (e) {
        console.error('intake alert error:', e);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    // -------------------------------------------------- /api/contact (WordPress contact form -> #gtm)
    // Built for Psyche's WordPress build. Accepts JSON, url-encoded, OR multipart bodies, and reads the
    // field names CF7 / WPForms / Gravity / Fluent commonly send. Alert only -- no DB write. The form
    // plugin still stores + emails the entry as usual; this just relays a heads-up to #gtm.
    if (url.includes('/api/contact')) {
      try {
        const ct = request.headers.get('content-type') || '';
        let data = {};
        if (ct.includes('application/json')) {
          data = await request.json();
        } else if (ct.includes('form-urlencoded') || ct.includes('multipart/form-data')) {
          const fd = await request.formData();
          for (const [k, v] of fd.entries()) data[k] = typeof v === 'string' ? v : (v && v.name) || '';
        } else {
          const raw = await request.text();
          try { data = JSON.parse(raw); } catch { data = Object.fromEntries(new URLSearchParams(raw)); }
        }

        const pick = (keys) => {
          for (const k of keys) {
            const v = data[k];
            if (v != null && String(v).trim()) return String(v).trim();
          }
          return '';
        };

        // Join the selected choices of a Gravity Forms checkbox group. GF sends each choice under
        // `<id>.<n>` (entry payload) or `input_<id>.<n>` (raw form post); unchecked arrive as ''.
        const gather = (id) => Object.entries(data)
          .filter(([k, v]) => (k.startsWith(`${id}.`) || k.startsWith(`input_${id}.`)) && v != null && String(v).trim())
          .map(([, v]) => String(v).trim()).join(', ');

        // Aliases cover friendly names (recommended custom mapping) AND the raw Gravity Forms field IDs
        // of the staging contact form: 1.3/1.6 name, 3 phone, 4 email, 6 role, 7 network size, 8 message, 10 interest.
        let name = pick(['name', 'full_name', 'fullname', 'your-name', 'contact_name']);
        if (!name) {
          const fn = pick(['first_name', 'fname', 'first', 'your-first-name', 'names[first_name]', '1.3', 'input_1.3']);
          const ln = pick(['last_name', 'lname', 'last', 'your-last-name', 'names[last_name]', '1.6', 'input_1.6']);
          name = `${fn} ${ln}`.trim();
        }
        const email = pick(['email', 'your-email', 'email_address', 'your-email-address', '4', 'input_4']);
        const phone = pick(['phone', 'your-phone', 'tel', 'telephone', 'phone_number', '3', 'input_3']);
        const company = pick(['company', 'organization', 'business', 'company_name']);
        const role = pick(['role', 'i_am', 'iam', 'type', 'contact_type']) || gather('6');
        const interest = pick(['interest', 'interested_in', 'interests', 'goal']) || gather('10');
        const networkSize = pick(['network_size', 'members', 'network_members', 'members_count', '7', 'input_7']);
        const subject = pick(['subject', 'your-subject', 'topic']);
        const message = pick(['message', 'your-message', 'msg', 'comments', 'comment', 'body', '8', 'input_8']);

        // Require at least one meaningful field so empty/garbage POSTs never spam the channel.
        if (!name && !email && !phone && !message) return json({ success: true, skipped: true });

        const primary = name || company;
        const contactFields = [];
        if (email)       contactFields.push({ k: 'Email',         v: email });
        if (phone)       contactFields.push({ k: 'Phone',         v: phone });
        if (role)        contactFields.push({ k: 'Type',          v: role });
        if (interest)    contactFields.push({ k: 'Interested in', v: interest });
        if (networkSize) contactFields.push({ k: 'Network size',  v: networkSize });

        ctx.waitUntil(sendToCustomerIO(env, data, { email, name, phone, company, role, interest, networkSize, subject, message, pageUrl }));
        ctx.waitUntil(notifySlack(env, ALERTS.contact, {
          title: subject ? `New website contact · ${subject}` : 'New website contact',
          subject: primary ? `*${primary}*${name && company ? '  ·  ' + company : ''}` : '',
          fields: contactFields,
          quote: message,
          context: pageUrl ? `🔗 ${pageUrl}` : '',
        }));
        return json({ success: true });
      } catch (e) {
        console.error('contact alert error:', e);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    // ------------------------------------------------ /api/cancel (cancel-reason survey -> save alert)
    // Fired by the in-app cancel-reason survey when a subscriber starts to cancel. Stores the reason
    // for churn analytics AND pings #gtm with everything CS needs to try to save the account (who,
    // plan, MRR, tenure, reason, whether the in-app save offer was shown/accepted, and their comment).
    // A single required field (reason_code) keeps a malformed post from spamming the channel.
    if (url.includes('/api/cancel')) {
      try {
        const data = await request.json();
        const str = (v, n) => { const s = (v == null ? '' : String(v)).trim(); return s ? s.slice(0, n) : null; };
        const reason_code = str(data.reason_code, 60);
        if (!reason_code) return json({ error: 'Missing reason_code' }, 400);

        const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
        const tenure_days = data.tenure_days == null ? null : (num(data.tenure_days) == null ? null : Math.trunc(num(data.tenure_days)));
        const mrr = num(data.mrr);
        const offer_accepted = typeof data.offer_accepted === 'boolean' ? data.offer_accepted : null;
        const row = {
          org_id: str(data.org_id, 120), org: str(data.org, 200),
          email: str(data.email, 200), phone: str(data.phone, 40),
          plan: str(data.plan, 120), tenure_days, mrr,
          reason_code, reason_label: str(data.reason_label, 200), detail: str(data.detail, 500),
          offer_shown: str(data.offer_shown, 200), offer_accepted, comment: str(data.comment, 1000),
          page_url: pageUrl, user_agent: userAgent, ip: clientIp,
        };
        // Churn analytics is best-effort: even if the DB write fails, we still fire the save alert so
        // CS never misses a cancellation. Fire-and-forget so the survey UI returns instantly.
        ctx.waitUntil(insertRow(env, 'cancel_survey', row));

        const saved = offer_accepted === true;
        ctx.waitUntil(notifySlack(env, ALERTS.cancelSave, {
          title: saved ? 'Save-offer accepted · account kept' : 'Cancellation · save opportunity',
          subject: row.org ? `*${row.org}*${row.plan ? '  ·  ' + row.plan : ''}` : (row.plan ? `*${row.plan}*` : ''),
          fields: [
            { k: 'Reason', v: row.reason_label || row.reason_code },
            { k: 'MRR', v: row.mrr != null ? '$' + row.mrr : null },
            { k: 'Tenure', v: row.tenure_days != null ? row.tenure_days + ' days' : null },
            { k: 'Email', v: row.email },
            { k: 'Phone', v: row.phone },
            { k: 'Save-offer shown', v: row.offer_shown },
            { k: 'Offer accepted', v: offer_accepted == null ? null : (offer_accepted ? 'yes' : 'no') },
            { k: 'Detail', v: row.detail },
          ],
          quote: row.comment,
          context: saved ? '✅ retained by the in-app offer' : '',
        }));
        return json({ success: true });
      } catch (e) {
        console.error('cancel survey error:', e);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    // ---------------------------------------------- /api/hear (How did you hear about us? -> #gtm)
    // Self-reported signup attribution. Our email CTAs redirect into the app, which swallows UTMs, so
    // we can't trace a signup to its source from inside the app. This captures it from a page we own.
    // Alert-only, like /api/contact and /api/intake -- no DB write, so it stays off the PGRST schema-
    // reload path. `ref` carries the campaign/UTM that drove them here, so the self-reported source and
    // the actual referring link can be cross-checked. Honeypot-gated.
    if (url.includes('/api/hear')) {
      try {
        const data = await request.json();
        if (data.website) return json({ success: true }); // honeypot -> pretend success, drop bot
        const str = (v, n) => { const s = (v == null ? '' : String(v)).trim(); return s ? s.slice(0, n) : ''; };
        const source = str(data.source, 80);
        if (!source) return json({ error: 'Missing source' }, 400);
        const company = str(data.company, 160), email = str(data.email, 160), name = str(data.name, 120);
        const detail = str(data.detail, 500), ref = str(data.ref, 200);
        ctx.waitUntil(notifySlack(env, ALERTS.heardAbout, {
          title: 'How they heard about us',
          subject: `*${source}*`,
          fields: [
            ...(company ? [{ k: 'Company', v: company }] : []),
            ...(name ? [{ k: 'Name', v: name }] : []),
            ...(email ? [{ k: 'Email', v: email }] : []),
            ...(detail ? [{ k: 'Detail', v: detail }] : []),
            ...(ref ? [{ k: 'Came from', v: ref }] : []),
          ],
          context: '📊 self-reported signup attribution',
        }));
        return json({ success: true });
      } catch (e) {
        console.error('hear error:', e);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
