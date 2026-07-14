# Cloudflare Turnstile + Worker Setup Guide

This guide walks through setting up Cloudflare Turnstile CAPTCHA protection on the job alerts consent form and deploying the verification Worker.

## Prerequisites

- Cloudflare account with API token
- Node.js 16+ and npm
- `wrangler` CLI installed (`npm install -g wrangler` or use `npx`)

## Step 1: Create Turnstile Widget

Create a Turnstile widget using Wrangler or the Cloudflare dashboard.

### Option A: Using Wrangler CLI

```bash
cd /Users/jobs/Desktop/sublynk/consent
npx wrangler turnstile widget create "Sublynk Job Alerts Consent" \
  --domain localhost \
  --domain 127.0.0.1 \
  --domain job-alerts.sublynk.com \
  --mode managed
```

Wrangler will output:
- **Sitekey**: Copy this to the form HTML (replace `YOUR_SITEKEY` in index.html)
- **Secret**: Save this for the Worker environment variables

### Option B: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard > Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Click **Add widget**
3. Enter name: "Sublynk Job Alerts Consent"
4. Mode: **Managed**
5. Domains: Add `localhost`, `127.0.0.1`, and `job-alerts.sublynk.com`
6. Click **Create**
7. Copy the **Sitekey** and **Secret**

## Step 2: Configure Worker Environment Variables

Edit `wrangler.toml` and add environment variables section, or create `wrangler.toml.local` (git-ignored) with secrets:

```toml
[env.production]
vars = { TURNSTILE_SECRET = "YOUR_SECRET_HERE" }
vars = { SUPABASE_URL = "https://nbxipq.supabase.co" }
vars = { SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE" }
```

**OR** use Cloudflare dashboard:
1. Go to Workers > Your Worker > Settings > Environment Variables
2. Add:
   - `TURNSTILE_SECRET`: The secret from step 1
   - `SUPABASE_URL`: `https://nbxipq.supabase.co`
   - `SUPABASE_ANON_KEY`: From your Supabase project settings

## Step 3: Update Form HTML with Sitekey

In `index.html`, find the Turnstile widget div:

```html
<div class="cf-turnstile" data-sitekey="YOUR_SITEKEY" data-theme="light"></div>
```

Replace `YOUR_SITEKEY` with the sitekey from step 1.

## Step 4: Deploy Worker

```bash
cd /Users/jobs/Desktop/sublynk/consent
npm install
npx wrangler deploy
```

The Worker will be deployed to your Cloudflare account.

## Step 5: Configure Route

The `wrangler.toml` specifies the production route. If you need to change it:

1. Go to Cloudflare Dashboard > Workers > Routes
2. Add route: `https://job-alerts.sublynk.com/api/consent` → `sublynk-consent-worker`

**For local development:**

```bash
npx wrangler dev
```

This starts a local server at `http://localhost:8787`. The form HTML automatically detects localhost and uses `http://localhost:8787/api/consent`.

## Step 6: Test

1. Navigate to `consent/index.html` (or its deployed URL)
2. Fill out the form with test data
3. You should see the Turnstile widget
4. Submit the form
5. The Worker should verify the Turnstile token and insert the consent record into Supabase

## Testing Turnstile Locally

For local testing without real CAPTCHA challenges, use test keys:

- **Test Sitekey (always passes)**: `1x00000000000000000000AA`
- **Test Secret (always passes)**: `1x0000000000000000000000000000000000000000`

Update `index.html` and `wrangler.toml` with test keys during development, then switch to production keys before deploying.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `TURNSTILE_SECRET` | Secret key from Turnstile widget | `0x4AAF00AAAABn0R22HWm098HVBjhdsYUc` |
| `SUPABASE_URL` | Supabase project URL | `https://nbxipq.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGc...` |

## Troubleshooting

### "Turnstile token missing"
- Ensure Turnstile script is loaded: `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>`
- Check that the widget div has `data-sitekey` set correctly
- Verify the Turnstile widget is rendering on the page

### "CAPTCHA verification failed"
- Confirm the `TURNSTILE_SECRET` in the Worker matches the widget's secret
- Check that the token was sent correctly in the form submission
- Verify Cloudflare's Turnstile service is accessible (check status.cloudflare.com)

### Worker returns 500 error
- Check Worker logs: `npx wrangler tail`
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Ensure Supabase RLS policy allows anon inserts with `Prefer: return=minimal`

### Form submission fails with CORS error
- The Worker includes CORS headers for all origins
- Check browser console for specific error messages
- Verify API endpoint URL in JavaScript matches actual Worker URL

## API Reference

### POST `/api/consent`

Accepts the consent form submission.

**Request body:**
```json
{
  "full_name": "John Doe",
  "company": "Acme Corp",
  "email": "john@example.com",
  "phone": "(303) 555-0123",
  "phone_raw": "(303) 555-0123",
  "consent": true,
  "cf-turnstile-response": "TOKEN_FROM_TURNSTILE",
  "contact_ref": null
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Consent recorded successfully"
}
```

**Error response (400/500):**
```json
{
  "error": "Error message describing the issue"
}
```

## Security Notes

- Client IP is captured server-side from Cloudflare headers (`CF-Connecting-IP`)
- Turnstile verification happens server-side with the secret key
- Form submission uses HTTPS in production
- Honeypot field filters obvious bot submissions
- Retry logic with exponential backoff handles transient failures
- Email and phone are validated both client and server-side

## Maintenance

- Monitor Worker logs for errors: `npx wrangler tail`
- Periodically review Turnstile widget settings in Cloudflare dashboard
- Keep Worker code up-to-date with Supabase schema changes
- Test submissions regularly to ensure the flow works end-to-end
