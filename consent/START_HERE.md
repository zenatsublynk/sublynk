# ⭐ START HERE

## What Was Built

Your job alerts consent form now has **Cloudflare Turnstile CAPTCHA protection** and a **Cloudflare Worker backend** that verifies submissions server-side.

**Before:** Form submitted directly to Supabase (vulnerable to bots, no CAPTCHA)
**After:** Form submits to Worker → Worker verifies Turnstile → Worker saves to Supabase

## What You Need To Do

### Option A: Quick Setup (5 minutes)

1. **Create Turnstile Widget**
   ```bash
   npx wrangler turnstile widget create "Sublynk Job Alerts Consent" \
     --domain localhost --domain 127.0.0.1 --domain job-alerts.sublynk.com --mode managed
   ```
   Save the **Sitekey** and **Secret**

2. **Update HTML**
   Open `consent/index.html` and replace `YOUR_SITEKEY` with your sitekey

3. **Configure Environment**
   Create `consent/.env.production`:
   ```
   TURNSTILE_SECRET=<paste secret here>
   SUPABASE_URL=https://nbxipq.supabase.co
   SUPABASE_ANON_KEY=<paste from Supabase dashboard>
   ```

4. **Deploy**
   ```bash
   cd /Users/jobs/Desktop/sublynk/consent
   npm install
   npx wrangler deploy
   ```

5. **Test**
   Visit `https://job-alerts.sublynk.com/consent/` and submit a test form

**Time: 5 minutes** ⏱️

### Option B: Guided Setup (10 minutes)

Run the interactive deployment script:
```bash
/Users/jobs/Desktop/sublynk/consent/DEPLOY.sh
```

This walks you through each step with prompts.

### Option C: Detailed Setup

Read **TURNSTILE_QUICKSTART.md** for the quick version or **SETUP.md** for complete details.

## Files You Need To Know About

| File | Purpose |
|------|---------|
| **index.html** | Job alerts form (updated with Turnstile) |
| **src/index.js** | Worker code (new - handles form submission) |
| **wrangler.toml** | Worker configuration (new) |
| **README.md** | Overview of what's here |
| **TURNSTILE_QUICKSTART.md** | Quick setup guide |
| **SETUP.md** | Complete setup with troubleshooting |
| **VISUAL_GUIDE.md** | Diagrams and flowcharts |

## What The System Does

```
User's Browser
    ↓
    ├─ Fills form
    ├─ Completes Turnstile CAPTCHA
    ├─ Clicks "Turn on job alerts"
    ↓
Cloudflare Worker (new)
    ├─ Verifies Turnstile token
    ├─ Validates form data
    ├─ Captures client IP
    ↓
Supabase
    └─ Saves consent record with full audit trail
```

## Environment Variables Needed

You need three pieces of information to deploy:

1. **TURNSTILE_SECRET** ← From `npx wrangler turnstile widget create`
2. **SUPABASE_URL** ← `https://nbxipq.supabase.co` (same for everyone)
3. **SUPABASE_ANON_KEY** ← From Supabase dashboard > Project Settings > API

## Key Features Added

✅ **Turnstile CAPTCHA** - Prevents bots from submitting fake consents
✅ **Server-side Verification** - Turnstile token verified with Cloudflare (can't be spoofed)
✅ **Client IP Logging** - Audit trail of where submissions came from
✅ **Retry Logic** - 3 attempts with backoff, so transient network issues don't fail submissions
✅ **Error Handling** - Clear user-facing error messages
✅ **Input Validation** - Email, phone, required fields validated both client and server
✅ **CORS Enabled** - Works from any domain
✅ **Honeypot** - Silent bot filtering with hidden field

## Local Testing

Before deploying to production, test locally:

```bash
# Terminal 1: Start the Worker
cd /Users/jobs/Desktop/sublynk/consent
npx wrangler dev

# Terminal 2: Serve the form
cd /Users/jobs/Desktop/sublynk
python3 -m http.server 8000

# Browser: http://localhost:8000/consent/
```

## Next Steps (In Order)

1. **Do one of:**
   - Run `/Users/jobs/Desktop/sublynk/consent/DEPLOY.sh` (easiest)
   - OR follow Option A above (fastest)
   - OR read TURNSTILE_QUICKSTART.md and do it manually

2. **Test locally** (optional but recommended)

3. **Deploy to production**

4. **Monitor** with `npx wrangler tail`

## Commands You'll Need

```bash
# Create Turnstile widget (one-time)
npx wrangler turnstile widget create "Sublynk Job Alerts Consent" \
  --domain localhost --domain 127.0.0.1 --domain job-alerts.sublynk.com --mode managed

# Deploy the Worker
npx wrangler deploy

# Test locally
npx wrangler dev

# View logs
npx wrangler tail

# List Turnstile widgets
npx wrangler turnstile widget list

# Get widget secret
npx wrangler turnstile widget get <sitekey>
```

## Troubleshooting Quick Links

- **"Turnstile token missing"** → See SETUP.md > Widget not loading
- **"CAPTCHA verification failed"** → Secret mismatch, see SETUP.md
- **"Could not save that"** → Supabase credentials issue, see SETUP.md
- **Worker logs have errors** → Run `npx wrangler tail` to debug

## Who Changed What

- **You**: Set up Turnstile widget and deploy Worker (next 5-10 minutes)
- **Claude**: Built the form updates, Worker code, and documentation
- **Cloudflare**: Provides Turnstile CAPTCHA service and Worker hosting
- **Supabase**: Stores consent records

## Questions?

1. **Quick questions** → See VISUAL_GUIDE.md or README.md
2. **Setup questions** → See SETUP.md or TURNSTILE_QUICKSTART.md
3. **Architecture questions** → See IMPLEMENTATION_SUMMARY.md
4. **Everything at once** → See VISUAL_GUIDE.md

## Ready? Let's Go

```bash
# Option 1: Automated
/Users/jobs/Desktop/sublynk/consent/DEPLOY.sh

# Option 2: Manual Quick Start
# Read TURNSTILE_QUICKSTART.md and follow the 5 steps

# Option 3: Detailed
# Read SETUP.md step by step
```

---

**Estimated time to deploy: 5-15 minutes**

All the hard work is done. You just need to:
1. Get your Turnstile secret
2. Get your Supabase anon key
3. Run the deployment script

That's it! 🚀
