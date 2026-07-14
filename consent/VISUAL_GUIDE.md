# Visual Setup Guide

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR USERS                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Visit job-alerts.sublynk.com/consent/                       │
│  ▼                                                              │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Browser: consent/index.html                      │          │
│  ├──────────────────────────────────────────────────┤          │
│  │  • Loads Turnstile widget script                 │          │
│  │  • Renders form (name, company, email, phone)    │          │
│  │  • Renders Turnstile widget                      │          │
│  │  • Renders consent checkbox                      │          │
│  └──────────────┬───────────────────────────────────┘          │
│                 │                                               │
│  2. User fills form and clicks "Turn on job alerts"             │
│                 │                                               │
│  3. Turnstile challenges user (or auto-clears)                  │
│                 │ User completes CAPTCHA (if shown)             │
│  4. JavaScript collects:                                        │
│     • form data (name, company, email, phone)                   │
│     • Turnstile token from hidden form field                    │
│                 │                                               │
│  5. Form submits to Worker                                      │
│                 ▼                                               │
└─────────────────────────────────────────────────────────────────┘
                  │
                  │ HTTPS POST /api/consent
                  │ {form_data, cf-turnstile-response, ...}
                  │
┌─────────────────────────────────────────────────────────────────┐
│  CLOUDFLARE WORKER: src/index.js                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Receives request from browser                                  │
│  ▼                                                              │
│  ✓ Validate form fields present                                 │
│    └─ name, company, email, phone required                      │
│  ✓ Validate Turnstile token present                             │
│    └─ token must be provided                                    │
│  ▼                                                              │
│  POST to Cloudflare Turnstile API                               │
│  ├─ secret: TURNSTILE_SECRET (from env)                         │
│  ├─ response: token from form                                   │
│  ├─ remoteip: Client IP from CF headers                         │
│  └─ Returns: {success: true/false}                              │
│  ▼                                                              │
│  ✗ FAIL? Send error to browser                                  │
│  ✓ PASS? Continue                                               │
│  ▼                                                              │
│  Validate email format                                          │
│  Validate phone format and normalize                            │
│  ▼                                                              │
│  Prepare Supabase insert:                                       │
│  ├─ form fields (name, company, email, phone_normalized)        │
│  ├─ metadata (user_agent, page_url, client_ip)                  │
│  ├─ consent fields (consent_calls, consent_sms, channels)       │
│  ├─ versioning (disclosure_version, disclosure_text)           │
│  └─ status (status: 'active')                                   │
│  ▼                                                              │
│  Try up to 3 times (retry logic):                               │
│  │                                                              │
│  ├─ Attempt 1: POST to Supabase                                 │
│  │  └─ If fails, wait 800ms                                     │
│  │                                                              │
│  ├─ Attempt 2: POST to Supabase                                 │
│  │  └─ If fails, wait 1600ms                                    │
│  │                                                              │
│  └─ Attempt 3: POST to Supabase                                 │
│     └─ If fails, error → return to browser                      │
│  ▼                                                              │
│  ✓ Success? Return {success: true} to browser                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                  │
                  │ Response: {success: true} or {error: "..."}
                  │
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER: index.html (continued)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  If success:                                                    │
│  • Hide form                                                    │
│  • Show "You are on the list" success screen                    │
│  • Scroll to top                                                │
│                                                                 │
│  If error:                                                      │
│  • Show error message to user                                   │
│  • Re-enable submit button                                      │
│  • Allow retry                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                  │
                  │ Every consent record includes:
                  │
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE: consent_events table                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  id           | UUID (auto)                                     │
│  created_at   | Timestamp                                       │
│  full_name    | "John Doe"                                      │
│  company      | "Acme Corp"                                     │
│  email        | "john@acme.com"                                 │
│  phone        | "(303) 555-0123"                                │
│  phone_raw    | User's input format                             │
│  consent_calls| true                                            │
│  consent_sms  | true                                            │
│  channels     | "calls+sms"                                     │
│  status       | "active"                                        │
│  client_ip    | "203.0.113.45"                                  │
│  user_agent   | Browser identifier                              │
│  page_url     | Page they submitted from                        │
│  source       | "job-alerts-optin"                              │
│  ...          | (and 5+ more metadata fields)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Setup Steps Flowchart

```
START
  │
  ├─ Create Turnstile Widget
  │  ├─ Run: npx wrangler turnstile widget create ...
  │  └─ Get: sitekey, secret
  │
  ├─ Update index.html
  │  └─ Replace YOUR_SITEKEY with actual sitekey
  │
  ├─ Get Supabase Credentials
  │  ├─ URL: https://nbxipq.supabase.co
  │  └─ Anon Key: from Supabase dashboard
  │
  ├─ Set Environment Variables
  │  ├─ Create .env.production file OR
  │  └─ Set in Cloudflare dashboard
  │     ├─ TURNSTILE_SECRET=<secret>
  │     ├─ SUPABASE_URL=https://nbxipq.supabase.co
  │     └─ SUPABASE_ANON_KEY=<key>
  │
  ├─ Install Dependencies
  │  └─ Run: npm install
  │
  ├─ Deploy Worker
  │  └─ Run: npx wrangler deploy
  │
  ├─ Test
  │  ├─ Visit: https://job-alerts.sublynk.com/consent/
  │  └─ Submit test form
  │
  └─ Monitor
     └─ Run: npx wrangler tail
```

## File Structure

```
/Users/jobs/Desktop/sublynk/consent/
│
├─ 📄 index.html                  [Modified]
│  └─ Turnstile form (frontend)
│
├─ 📦 src/
│  └─ index.js                    [New] Worker code (backend)
│
├─ ⚙️  wrangler.toml              [New] Worker config
├─ 📦 package.json                [New] Dependencies
├─ .gitignore                      [New] Git config
├─ .env.example                    [New] Env template
│
├─ 📚 README.md                    [New] Overview
├─ 📚 SETUP.md                     [New] Detailed setup
├─ 📚 TURNSTILE_QUICKSTART.md      [New] Quick start
├─ 📚 IMPLEMENTATION_SUMMARY.md    [New] Technical details
├─ 📚 VISUAL_GUIDE.md              [New] This file
│
└─ 🚀 DEPLOY.sh                    [New] Deployment script
```

## Environment Variable Sources

```
TURNSTILE_SECRET
├─ From: wrangler turnstile widget get <sitekey>
├─ Or: Cloudflare Dashboard > Turnstile > Select widget
└─ Example: 0x4AAF00AAAABn0R22HWm098HVBjhdsYUc

SUPABASE_URL
├─ From: Hardcoded (same for everyone)
└─ Value: https://nbxipq.supabase.co

SUPABASE_ANON_KEY
├─ From: Supabase Dashboard
├─ Path: Project Settings > API > "anon" key
└─ Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Security Checks

```
FORM SUBMISSION SECURITY
├─ ✅ Honeypot field catches bots
├─ ✅ Turnstile CAPTCHA prevents automated submissions
├─ ✅ Server-side Turnstile verification (can't be spoofed)
├─ ✅ Client IP logging for audit trail
├─ ✅ Email + phone validated on both sides
├─ ✅ HTTPS in production (required by Turnstile)
└─ ✅ Retry logic with exponential backoff

DATA FLOW
├─ ✅ Secrets never exposed in frontend
├─ ✅ Turnstile secret never sent to browser
├─ ✅ API key scoped to anon (minimal permissions)
├─ ✅ Client IP captured server-side (not from browser)
└─ ✅ All validation happens server-side
```

## Monitoring & Logs

```
LOCAL DEVELOPMENT
├─ Worker Logs: npx wrangler tail
├─ Test form: http://localhost:8000/consent/
└─ Test Worker: http://localhost:8787/api/consent

PRODUCTION
├─ Worker Logs: npx wrangler tail
├─ Live form: https://job-alerts.sublynk.com/consent/
├─ Turnstile dashboard: Cloudflare > Turnstile
├─ Supabase records: Supabase > consent_events table
└─ Monitor logs: Google Cloud Logs (if enabled)

COMMON ISSUES
├─ "Turnstile token missing" → Widget not loading
├─ "CAPTCHA verification failed" → Secret mismatch
├─ "Could not save that" → Supabase credentials issue
└─ CORS errors → Check Worker CORS headers
```

## Quick Command Reference

```bash
# Create widget
npx wrangler turnstile widget create "Sublynk Job Alerts Consent" \
  --domain localhost --domain 127.0.0.1 --domain job-alerts.sublynk.com \
  --mode managed

# List widgets
npx wrangler turnstile widget list

# Get widget details
npx wrangler turnstile widget get <sitekey>

# Local development
cd /Users/jobs/Desktop/sublynk/consent
npx wrangler dev

# Deploy
npx wrangler deploy

# View logs
npx wrangler tail

# Run deploy script
./DEPLOY.sh
```

## What Happens When...

```
USER FILLS FORM
└─ JavaScript validates form locally
   ├─ Name: required, non-empty
   ├─ Company: required, non-empty
   ├─ Email: must match /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   ├─ Phone: must be valid US number
   └─ Consent: must check checkbox

USER CLICKS SUBMIT
└─ JavaScript prepares payload
   ├─ Collects form data
   ├─ Gets Turnstile token from hidden field
   └─ Sends to Worker with retry logic

WORKER RECEIVES REQUEST
├─ Validates form data present
├─ Validates Turnstile token present
├─ Verifies token with Cloudflare
│  └─ If fails: return error
├─ Validates email + phone format
├─ Inserts into Supabase with retry (up to 3x)
│  ├─ Attempt 1: immediate
│  ├─ Attempt 2: after 800ms
│  └─ Attempt 3: after 1600ms
└─ Returns success or error

BROWSER RECEIVES RESPONSE
├─ If success:
│  ├─ Hide form
│  ├─ Show success screen
│  └─ Scroll to top
└─ If error:
   ├─ Show error message
   ├─ Keep form visible
   └─ Allow user to retry
```

## Timeline

```
Week 1: Setup & Testing
├─ Create Turnstile widget
├─ Deploy Worker
├─ Test locally
└─ Test in production

Week 2+: Monitoring
├─ Monitor form submissions
├─ Check Turnstile pass rate
├─ Review Supabase records
└─ Troubleshoot issues

Ongoing: Maintenance
├─ Monitor Worker logs
├─ Update code if needed
├─ Rotate Turnstile secret annually
└─ Keep dependencies updated
```

## Success Criteria

- ✅ Form renders with Turnstile widget visible
- ✅ User can fill out form fields
- ✅ Turnstile challenges or auto-clears
- ✅ Form submission succeeds (returns success)
- ✅ Success screen shows ("You are on the list")
- ✅ Consent record appears in Supabase
- ✅ Worker logs show no errors
- ✅ IP address captured server-side

---

Need help? See **SETUP.md** for troubleshooting.
