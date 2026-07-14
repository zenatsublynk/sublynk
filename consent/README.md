# Sublynk Job Alerts - Consent Form with Turnstile

This directory contains the job alerts opt-in form with Cloudflare Turnstile CAPTCHA protection and a Cloudflare Worker backend.

## Quick Start

See **TURNSTILE_QUICKSTART.md** for the fastest way to get running (5 minutes).

## Full Setup

See **SETUP.md** for detailed step-by-step instructions with troubleshooting.

## What's Here

```
consent/
├── index.html                    # Consent form with Turnstile widget
├── src/
│   └── index.js                 # Cloudflare Worker backend
├── wrangler.toml                # Worker configuration
├── package.json                 # Node dependencies
├── .gitignore                   # Git ignore file
├── .env.example                 # Environment variables template
├── IMPLEMENTATION_SUMMARY.md    # What was built and why
├── TURNSTILE_QUICKSTART.md      # 5-minute setup guide
├── SETUP.md                     # Detailed setup instructions
└── README.md                    # This file
```

## How It Works

1. **User fills form** → Turnstile widget loads automatically
2. **User submits** → JavaScript sends data + Turnstile token to Worker
3. **Worker receives** → Verifies Turnstile token with Cloudflare servers
4. **Worker validates** → Email, phone, required fields
5. **Worker saves** → Inserts consent record into Supabase
6. **Worker responds** → Success or error message
7. **Form shows** → Confirmation screen or error

## Files Changed

### Modified
- **consent/index.html** - Added Turnstile and Worker integration

### Created
- **consent/src/index.js** - Worker code
- **consent/wrangler.toml** - Worker config
- **consent/package.json** - Dependencies
- **consent/.gitignore** - Git ignore
- **consent/.env.example** - Environment template
- **consent/SETUP.md** - Setup guide
- **consent/TURNSTILE_QUICKSTART.md** - Quick start
- **consent/IMPLEMENTATION_SUMMARY.md** - Technical summary
- **consent/README.md** - This file

## Environment Variables

You'll need three environment variables:

| Variable | Purpose | Where to find |
|----------|---------|---------------|
| `TURNSTILE_SECRET` | Server-side token verification | Wrangler or Cloudflare dashboard |
| `SUPABASE_URL` | Database connection | `https://nbxipq.supabase.co` |
| `SUPABASE_ANON_KEY` | Database auth | Supabase dashboard |

## Commands

```bash
cd /Users/jobs/Desktop/sublynk/consent

# Install dependencies
npm install

# Create Turnstile widget
npx wrangler turnstile widget create "Sublynk Job Alerts Consent" \
  --domain localhost --domain 127.0.0.1 --domain job-alerts.sublynk.com --mode managed

# Local development
npx wrangler dev

# Deploy to production
npx wrangler deploy

# View logs
npx wrangler tail
```

## Testing

### Local
```bash
# Terminal 1: Start Worker
npx wrangler dev

# Terminal 2: Serve form
cd /Users/jobs/Desktop/sublynk
python3 -m http.server 8000

# Browser: http://localhost:8000/consent/
```

### Production
```
https://job-alerts.sublynk.com/consent/index.html
```

## Key Features

✅ **Turnstile CAPTCHA** - Cloudflare's bot-proof alternative to reCAPTCHA
✅ **Server-side Verification** - Token verified with Cloudflare (can't be spoofed)
✅ **Client IP Logging** - Captured on server for audit trail
✅ **Retry Logic** - 3 attempts with exponential backoff
✅ **Input Validation** - Email, phone, required fields
✅ **Error Handling** - User-friendly error messages
✅ **CORS Enabled** - Works from any origin
✅ **Honeypot** - Silent bot filtering

## Architecture

```
┌─────────────────────────────────┐
│   consent/index.html            │
│   (Browser)                     │
├─────────────────────────────────┤
│ • Turnstile widget loads        │
│ • User fills form               │
│ • Turnstile validates (optional)│
│ • Form posts to Worker          │
└──────────┬──────────────────────┘
           │ POST /api/consent
           │ + Turnstile token
           ▼
┌─────────────────────────────────┐
│   Cloudflare Worker             │
│   (src/index.js)                │
├─────────────────────────────────┤
│ • Verify Turnstile token        │
│ • Validate form data            │
│ • Capture client IP             │
│ • Insert into Supabase          │
└──────────┬──────────────────────┘
           │ INSERT into consent_events
           ▼
┌─────────────────────────────────┐
│   Supabase                      │
│   (nbxipq.supabase.co)          │
├─────────────────────────────────┤
│ • consent_events table          │
│ • Audit trail                   │
└─────────────────────────────────┘
```

## Security

- **CAPTCHA**: Prevents automated submissions
- **Server-side verification**: Turnstile token verified by Cloudflare
- **IP logging**: Track submission source
- **HTTPS**: Production endpoint uses HTTPS
- **Input validation**: Both client and server
- **Honeypot**: Hidden field catches obvious bots

## Monitoring

View Worker logs:
```bash
npx wrangler tail
```

Monitor Turnstile:
1. Cloudflare Dashboard > Turnstile
2. Select widget
3. View analytics (pass rate, challenges, etc.)

## Support

- **Setup issues**: See SETUP.md → Troubleshooting
- **Deployment issues**: Check `npx wrangler tail` logs
- **Form issues**: Check browser console (F12)
- **Turnstile issues**: https://developers.cloudflare.com/turnstile/

## Next Steps

1. Read **TURNSTILE_QUICKSTART.md** (5 min)
2. Create Turnstile widget
3. Update sitekey in HTML
4. Deploy Worker
5. Test the form
6. Monitor logs

Good luck! 🚀
