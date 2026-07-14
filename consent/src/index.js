export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // The browser's CORS preflight for a JSON POST arrives as OPTIONS -- it must be answered
    // BEFORE the method/path guard below, or every real submission gets silently blocked by
    // the browser with "Failed to fetch" (confirmed live: this was broken until this fix).
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only handle POST to /api/consent
    if (request.method !== 'POST' || !request.url.includes('/api/consent')) {
      return new Response('Not found', { status: 404 });
    }

    try {
      const data = await request.json();

      // Validate required fields
      const { full_name, company, email, phone, phone_raw, consent, 'cf-turnstile-response': turnstileToken } = data;

      if (!full_name?.trim() || !company?.trim() || !email?.trim() || !phone?.trim()) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!consent) {
        return new Response(JSON.stringify({ error: 'Consent not provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify Turnstile token
      if (!turnstileToken) {
        return new Response(JSON.stringify({ error: 'Turnstile token missing' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const turnstileSecret = env.TURNSTILE_SECRET;
      if (!turnstileSecret) {
        console.error('TURNSTILE_SECRET not configured');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify Turnstile token with Cloudflare
      const turnstileVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0] || '0.0.0.0',
        }),
      });

      const turnstileResult = await turnstileVerify.json();

      if (!turnstileResult.success) {
        console.warn('Turnstile verification failed:', turnstileResult);
        return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Email validation (simple regex)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return new Response(JSON.stringify({ error: 'Invalid email address' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Phone validation and normalization
      const phoneDigits = phone.replace(/\D/g, '');
      const phoneNormalized = phoneDigits.length === 11 && phoneDigits[0] === '1' ? phoneDigits.slice(1) : phoneDigits;

      if (phoneNormalized.length !== 10 || /^(\d)\1{9}$/.test(phoneNormalized) || phoneNormalized[0] === '0' || phoneNormalized[0] === '1') {
        return new Response(JSON.stringify({ error: 'Invalid US mobile number' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const phoneFormatted = `(${phoneNormalized.slice(0, 3)}) ${phoneNormalized.slice(3, 6)}-${phoneNormalized.slice(6)}`;

      // Get client IP from Cloudflare headers
      const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0] || 'unknown';

      // Prepare data for Supabase
      const DISCLOSURE_VERSION = 'v1.2-2026-07-11';
      const DISCLOSURE_TEXT =
        'By checking this box and entering my mobile number, I give my express written consent for Sublynk to contact me at ' +
        'that number with recurring job-alert calls and text messages about job opportunities matched to me. These calls and ' +
        'texts may be made using an automatic telephone dialing system, autodialer, and an artificial, prerecorded, or ' +
        'AI-generated voice. Consent is not a condition of using Sublynk or receiving any job. Message and data rates may apply ' +
        'and message frequency varies. I can opt out anytime by replying STOP to a text, pressing 9 on a call, or clicking ' +
        'unsubscribe, and reply HELP for help. I have read and agree to the Sublynk Privacy Policy and Terms of Service, and by checking this box I am signing electronically.';

      const row = {
        full_name: full_name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phoneFormatted,
        phone_raw: phone_raw?.trim() || phone.trim(),
        consent_calls: true,
        consent_sms: true,
        channels: 'calls+sms',
        disclosure_version: DISCLOSURE_VERSION,
        disclosure_text: DISCLOSURE_TEXT,
        networks_shown: '',
        page_url: request.headers.get('referer') || '',
        user_agent: request.headers.get('user-agent') || '',
        source: 'job-alerts-optin',
        status: 'active',
        contact_ref: data.contact_ref || null,
        ip: clientIp,
      };

      // Insert into Supabase
      const supabaseUrl = env.SUPABASE_URL;
      const supabaseAnonKey = env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase credentials not configured');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Retry logic for Supabase insert
      let saved = false;
      let lastError = null;

      for (let attempt = 0; attempt < 3 && !saved; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }

        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/consent_events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(row),
          });

          if (response.ok) {
            saved = true;
          } else {
            lastError = await response.text();
            console.warn(`Attempt ${attempt + 1} failed:`, response.status, lastError);
          }
        } catch (e) {
          lastError = e.message;
          console.warn(`Attempt ${attempt + 1} network error:`, e.message);
        }
      }

      if (!saved) {
        console.error('Failed to save consent after 3 attempts:', lastError);
        return new Response(JSON.stringify({ error: 'Could not save your consent. Please try again.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Success response
      return new Response(JSON.stringify({ success: true, message: 'Consent recorded successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error processing request:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
