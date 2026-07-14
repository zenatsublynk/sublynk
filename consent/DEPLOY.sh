#!/bin/bash
# Deployment script for Sublynk Consent Worker with Turnstile

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Working directory: $SCRIPT_DIR"

# Step 1: Create Turnstile Widget
echo ""
echo "🎯 Step 1: Create Turnstile Widget"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run this command to create the Turnstile widget:"
echo ""
echo "  npx wrangler turnstile widget create 'Sublynk Job Alerts Consent' \\"
echo "    --domain localhost \\"
echo "    --domain 127.0.0.1 \\"
echo "    --domain zenatsublynk.github.io \\"
echo "    --mode managed"
echo ""
echo "After running, save:"
echo "  • Sitekey -> Copy to SITEKEY below"
echo "  • Secret -> Copy to TURNSTILE_SECRET below"
echo ""
read -p "Press Enter once you have the Sitekey and Secret..."

# Step 2: Get Sitekey
echo ""
read -p "Enter your Turnstile SITEKEY: " SITEKEY
if [ -z "$SITEKEY" ]; then
  echo "❌ Sitekey required"
  exit 1
fi

# Step 3: Update HTML
echo ""
echo "🔧 Step 2: Update index.html with Sitekey"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sed -i '' "s/data-sitekey=\"YOUR_SITEKEY\"/data-sitekey=\"$SITEKEY\"/g" "$SCRIPT_DIR/index.html"
echo "✅ Updated: index.html"

# Step 4: Get credentials
echo ""
echo "🔐 Step 3: Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Enter TURNSTILE_SECRET: " TURNSTILE_SECRET
read -p "Enter SUPABASE_URL (default: https://nbxipq.supabase.co): " SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-https://nbxipq.supabase.co}
read -p "Enter SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

# Step 5: Install dependencies
echo ""
echo "📦 Step 4: Install Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$SCRIPT_DIR"
npm install
echo "✅ Dependencies installed"

# Step 6: Register the secrets with Cloudflare (encrypted). A plaintext .env file is NOT
# read by `wrangler deploy` in production -- only `wrangler secret put` (or --secrets-file)
# actually makes these available to the Worker. Without this step the Worker deploys but
# every request 500s with "Server configuration error".
echo ""
echo "🔐 Step 5: Upload Secrets to Cloudflare"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf '%s' "$TURNSTILE_SECRET" | npx wrangler secret put TURNSTILE_SECRET
printf '%s' "$SUPABASE_URL" | npx wrangler secret put SUPABASE_URL
printf '%s' "$SUPABASE_ANON_KEY" | npx wrangler secret put SUPABASE_ANON_KEY
echo "✅ Secrets uploaded"

# Step 7: Deploy
echo ""
echo "🚀 Step 6: Deploy Worker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "About to deploy the Worker. Make sure:"
echo "  ✓ Sitekey is updated in index.html"
echo "  ✓ You are logged into the correct Cloudflare account (npx wrangler whoami)"
echo ""
read -p "Deploy now? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled"
  exit 1
fi

npx wrangler deploy
echo "✅ Worker deployed! Copy the *.workers.dev URL above into index.html's API_ENDPOINT."

# Step 8: Test
echo ""
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Copy the Worker URL wrangler just printed above (ends in .workers.dev)"
echo "  2. Paste it into consent/index.html's API_ENDPOINT (replace REPLACE_WITH_DEPLOYED_WORKER_URL)"
echo "  3. Visit https://zenatsublynk.github.io/sublynk/consent/ and test submission"
echo "  4. Check Worker logs: npx wrangler tail"
echo ""
echo "Local testing:"
echo "  npx wrangler dev"
echo "  (then visit http://localhost:8000/consent/ in another terminal)"
