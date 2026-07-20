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
const ALERTS = {
  jobAlert:   { username: 'AI Job Alerts',     icon_url: `${ICON_BASE}/emoji-ai-job-alert.png${ICON_V}` },
  subNetwork: { username: 'Sub Network Setup', icon_url: `${ICON_BASE}/emoji-sub-network.png${ICON_V}` },
  intake:     { username: 'Onboarding Intake', icon_url: `${ICON_BASE}/emoji-bench-ready.png${ICON_V}` },
  contact:    { username: 'Website Contact',   icon_url: `${ICON_BASE}/emoji-contact-inbound.png${ICON_V}` },
};

// Fire-and-forget Slack notification to the #gtm incoming webhook. Never throws.
// `alert` is one of the ALERTS entries; `text` is Slack mrkdwn for the body.
// We set the webhook username/icon override (renders as the avatar where the workspace allows it)
// AND embed the icon inline via a Block Kit context row, so each alert type stays visually distinct
// even if the workspace blocks per-message avatar overrides. `text` doubles as the notification
// fallback that Slack requires whenever `blocks` are present.
async function notifySlack(env, alert, text) {
  if (!env.SLACK_WEBHOOK_URL) return; // not configured -> silently skip
  try {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...alert,
        text: `${alert.username}: ${text}`,
        blocks: [
          // Leading divider so back-to-back alerts from the same app read as separate alerts,
          // not one grouped block, when Slack stacks them under a single sender header.
          { type: 'divider' },
          { type: 'context', elements: [
            { type: 'image', image_url: alert.icon_url, alt_text: alert.username },
            { type: 'mrkdwn', text: `*${alert.username}*` },
          ] },
          { type: 'section', text: { type: 'mrkdwn', text } },
        ],
      }),
    });
  } catch (e) {
    console.warn('Slack notify failed:', e && e.message);
  }
}

// Insert a row into a Supabase table via PostgREST (anon key + RLS insert). 3 retries.
async function insertRow(env, table, row) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 800 * attempt));
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      if (res.ok) return { ok: true };
      lastError = await res.text();
      console.warn(`insert ${table} attempt ${attempt + 1} -> ${res.status}: ${lastError}`);
    } catch (e) {
      lastError = e.message;
      console.warn(`insert ${table} attempt ${attempt + 1} network error: ${e.message}`);
    }
  }
  return { ok: false, error: lastError };
}

export default {
  async fetch(request, env, ctx) {
    // CORS preflight must be answered before the method/path guards, or the browser silently
    // blocks the POST with "Failed to fetch".
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (request.method !== 'POST') return new Response('Not found', { status: 404 });
    const url = request.url;

    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0] || 'unknown';
    const pageUrl = request.headers.get('referer') || '';
    const userAgent = request.headers.get('user-agent') || '';

    // ---------------------------------------------------------------- /api/consent (job alerts)
    if (url.includes('/api/consent')) {
      try {
        const data = await request.json();
        const { full_name, company, email, phone, phone_raw, consent, 'cf-turnstile-response': turnstileToken } = data;

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

        const DISCLOSURE_VERSION = 'v1.2-2026-07-11';
        const DISCLOSURE_TEXT =
          'By checking this box and entering my mobile number, I give my express written consent for Sublynk to contact me at ' +
          'that number with recurring job-alert calls and text messages about job opportunities matched to me. These calls and ' +
          'texts may be made using an automatic telephone dialing system, autodialer, and an artificial, prerecorded, or ' +
          'AI-generated voice. Consent is not a condition of using Sublynk or receiving any job. Message and data rates may apply ' +
          'and message frequency varies. I can opt out anytime by replying STOP to a text, pressing 9 on a call, or clicking ' +
          'unsubscribe, and reply HELP for help. I have read and agree to the Sublynk Privacy Policy and Terms of Service, and by checking this box I am signing electronically.';

        const saved = await insertRow(env, 'consent_events', {
          full_name: full_name.trim(), company: company.trim(), email: email.trim(),
          phone: phoneFormatted, phone_raw: phone_raw?.trim() || phone.trim(),
          consent_calls: true, consent_sms: true, channels: 'calls+sms',
          disclosure_version: DISCLOSURE_VERSION, disclosure_text: DISCLOSURE_TEXT, networks_shown: '',
          page_url: pageUrl, user_agent: userAgent, source: 'job-alerts-optin', status: 'active',
          contact_ref: data.contact_ref || null, ip: clientIp,
        });
        if (!saved.ok) { console.error('consent save failed:', saved.error); return json({ error: 'Could not save your consent. Please try again.' }, 500); }

        ctx.waitUntil(notifySlack(env, ALERTS.jobAlert,
          `*New AI job-alert opt-in*\n${full_name.trim()} · ${company.trim()}\n${phoneFormatted} · ${email.trim()}`));
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
        if (!saved.ok) { console.error('agreement save failed:', saved.error); return json({ error: 'Could not save that. Please try again.' }, 500); }

        const billingLine = billing === 'card' ? ':credit_card: Charge the $500 to the card on file' : ':email: Send a $500 invoice';
        ctx.waitUntil(notifySlack(env, ALERTS.subNetwork,
          `*New sub-network setup agreement ($500)*\n${full_name.trim()} · ${company.trim()}\n${email.trim()}\n${billingLine}`));
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

        let text = `*New onboarding intake submitted*\n${company}`;
        if (contact) text += ` · ${contact}`;
        if (email) text += ` · ${email}`;
        if (loc) text += `\n${loc}`;
        if (programs) text += `\nPrograms: ${programs}`;

        ctx.waitUntil(notifySlack(env, ALERTS.intake, text));
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

        let text = '*New website contact*';
        const line1 = [name, company, email, phone].filter(Boolean).join(' · ');
        if (line1) text += `\n${line1}`;
        if (role) text += `\n*Type:* ${role}`;
        if (interest) text += `\n*Interested in:* ${interest}`;
        if (networkSize) text += `\n*Network size:* ${networkSize}`;
        if (subject) text += `\n*Subject:* ${subject}`;
        if (message) text += `\n> ${message.replace(/\n/g, '\n> ')}`;

        ctx.waitUntil(notifySlack(env, ALERTS.contact, text));
        return json({ success: true });
      } catch (e) {
        console.error('contact alert error:', e);
        return json({ error: 'Internal server error' }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
