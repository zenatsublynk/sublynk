# Turnstile Setup Quick Start

## TL;DR - Get it running in 5 minutes

### 1. Create the Turnstile widget (one-time)

```bash
cd /Users/jobs/Desktop/sublynk/consent
export CLOUDFLARE_API_TOKEN="your-api-token-here"
npx wrangler turnstile widget create "Sublynk Job Alerts Consent" \
  --domain localhost \
  --domain 127.0.0.1 \
  --domain job-alerts.sublynk.com \
  --mode managed
```

Save the output:
- **Sitekey**: You'll need this for the form
- **Secret**: You'll need this for the Worker

### 2. Update form with Sitekey

Edit `consent/index.html` and replace `YOUR_SITEKEY`:

```html
<div class="cf-turnstile" data-sitekey="PASTE_SITEKEY_HERE" data-theme="light"></div>
```

### 3. Deploy the Worker

```bash
cd /Users/jobs/Desktop/sublynk/consent

# Set environment variables (choose one method)

# Method A: Create .env.production file (git-ignored)
cat > .env.production << EOF
TURNSTILE_SECRET=PASTE_SECRET_HERE
SUPABASE_URL=https://nbxipq.supabase.co
SUPABASE_ANON_KEY=your-anon-key-from-supabase
EOF

# Method B: Use Cloudflare dashboard to set environment variables
# Dashboard > Workers > sublynk-consent-worker > Settings > Environment Variables

# Deploy
npm install
npx wrangler deploy
```

### 4. Test locally first (optional)

```bash
# Terminal 1: Start local Worker
cd /Users/jobs/Desktop/sublynk/consent
npx wrangler dev

# Terminal 2: Serve the form
cd /Users/jobs/Desktop/sublynk
python3 -m http.server 8000
```

Then visit `http://localhost:8000/consent/` and test the form.

## Environment Variables Explained

| Variable | Where to find it | Why it's needed |
|----------|------------------|-----------------|
| `TURNSTILE_SECRET` | Wrangler output or Cloudflare dashboard | Verifies Turnstile tokens from the form |
| `SUPABASE_URL` | Supabase dashboard > Project Settings | Send consent data to Supabase |
| `SUPABASE_ANON_KEY` | Supabase dashboard > Project Settings > API | Authenticate with Supabase |

## What got updated?

1. **consent/index.html**
   - Added Turnstile script tag
   - Added Turnstile widget div
   - Changed form to POST to Worker instead of direct Supabase

2. **consent/src/index.js** (new Worker)
   - Verifies Turnstile token
   - Validates form data
   - Inserts into Supabase
   - Returns success/error

3. **consent/wrangler.toml** (new config)
   - Configures Worker deployment
   - Sets up production route

4. **consent/package.json** (new manifest)
   - Defines dependencies and build script

## Next Steps

1. Get your API token from Cloudflare dashboard
2. Run the widget creation command (step 1 above)
3. Update the form HTML with your sitekey
4. Deploy the Worker
5. Test by submitting the form

See `SETUP.md` for detailed instructions and troubleshooting.
