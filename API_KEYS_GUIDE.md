# eclat — API Keys Guide

> **Data sensitivity notice:** eclat stores GDPR Article 9 special category data (gender preferences), government ID documents, and biometric data. Handle all API keys for this app with the highest level of care. Never log, share, or commit any keys.

---

## TEST TIER
*Minimum keys to get the app running. All external services in test/sandbox mode.*

### 1. NextAuth Secret
**What it unlocks:** JWT session signing. App will not start without this.

```bash
# Generate a secure secret:
openssl rand -base64 32
```

- Add to `.env.local`: `NEXTAUTH_SECRET=<generated-value>`
- Add to AWS Secrets Manager after `terraform apply`: `/eclat/test/nextauth-secret`

---

### 2. Database (PostgreSQL)
**What it unlocks:** All data persistence.

**Option A — Local Docker (free, no AWS required):**
```bash
./scripts/setup-local.sh
```
- `DATABASE_URL=postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev`

**Option B — Neon (free tier, no RDS cost):**
1. Sign up at neon.tech
2. Create project → copy connection string
3. `DATABASE_URL=postgresql://...@ep-xxx.neon.tech/eclat_test?sslmode=require`

**Option C — AWS RDS** (via Terraform, ~$15/mo):
- Auto-provisioned by `terraform apply -var-file=environments/test.tfvars`
- `DATABASE_URL` is constructed by Terraform from RDS outputs

---

### 3. Google OAuth
**What it unlocks:** Sign-in with Google.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Authorised redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Test tier: `https://test.eclat.app/api/auth/callback/google`

- `GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET=GOCSPX-xxxx`
- AWS Secrets Manager: `/eclat/test/google-client-id`, `/eclat/test/google-client-secret`

**Sandbox available:** Yes — Google OAuth works in test mode with a real Google account.

---

### 4. Resend (Email)
**What it unlocks:** Verification emails, match notifications, daily digest.

1. Sign up at [resend.com](https://resend.com)
2. Create API key (full access) → copy

- `RESEND_API_KEY=re_xxxx`
- `EMAIL_FROM=onboarding@resend.dev`  ← use this while domain isn't verified
- AWS Secrets Manager: `/eclat/test/resend-api-key`

**Sandbox available:** Yes — use `onboarding@resend.dev` as sender without domain verification. Emails delivered to real addresses.

---

### 5. Upstash Redis (Rate Limiting)
**What it unlocks:** Prevents brute-force attacks on login and signup.

1. Sign up at [console.upstash.com](https://console.upstash.com)
2. Create Redis database → Region: **ap-southeast-1** → Type: **Regional**
3. Copy REST URL and REST Token from dashboard

- `UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io`
- `UPSTASH_REDIS_REST_TOKEN=AXxxxx`
- AWS Secrets Manager: `/eclat/test/upstash-redis-url`, `/eclat/test/upstash-redis-token`

**Without this key:** Rate limiting fails open (requests pass through). Safe for local dev with `MOCK_EXTERNAL_SERVICES=true`.

---

### 6. AWS (KMS + S3)
**What it unlocks:** KMS-encrypted message storage, KYC document upload, profile photos.

**⚠️ Required in ALL tiers** — eclat always encrypts govt IDs and messages, even in test.

1. Create IAM user (or use OIDC role) with permissions: `kms:Encrypt`, `kms:Decrypt`, `s3:PutObject`, `s3:GetObject`
2. Run `terraform apply` — this creates the KMS key and S3 buckets automatically
3. Copy the KMS key ARN from Terraform outputs: `terraform output kms_key_arn`

- `AWS_REGION=ap-southeast-1`
- `AWS_ACCESS_KEY_ID=AKIA...` (local dev only — use OIDC in CI)
- `AWS_SECRET_ACCESS_KEY=...` (local dev only)
- `AWS_KMS_KEY_ARN=arn:aws:kms:ap-southeast-1:123456789:key/xxxx` (from Terraform output)
- `AWS_S3_BUCKET_PROFILES=eclat-profiles-test-123456789`
- `AWS_S3_BUCKET_VERIFICATION=eclat-verification-test-123456789`

**Without this:** KMS falls back to base64 encoding in `NODE_ENV !== production` (not secure — dev only).

---

### 7. Sentry (Error Tracking) — Optional for Test Tier
**What it unlocks:** Error monitoring, performance tracking.

1. Sign up at [sentry.io](https://sentry.io) → New Project → Next.js
2. Copy DSN from Project Settings → Client Keys

- `SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0`
- `NEXT_PUBLIC_SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0`

**Without this:** Errors still appear in CloudWatch logs. Sentry adds stack traces and user context.

---

### 8. Stripe (Payments) — Required if Testing Subscription Flow
**What it unlocks:** SELECT / RESERVE / NOIR membership subscriptions (international).

1. Go to [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Use TEST keys (sk_test_... and pk_test_...)

- `STRIPE_SECRET_KEY=sk_test_51xxxx`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxx`
- `STRIPE_WEBHOOK_SECRET=whsec_xxxx` (from `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- AWS Secrets Manager: `/eclat/test/stripe-secret-key`, `/eclat/test/stripe-webhook-secret`

**Sandbox available:** Yes — Stripe test mode with test card numbers.

---

### 9. Razorpay (India Payments) — Required if Testing India Subscription Flow
**What it unlocks:** Subscriptions for India-based users.

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys → Test mode
2. Generate Test Key ID and Secret

- `RAZORPAY_KEY_ID=rzp_test_xxxx`
- `RAZORPAY_KEY_SECRET=xxxx`
- `RAZORPAY_WEBHOOK_SECRET=xxxx`
- AWS Secrets Manager: `/eclat/test/razorpay-key-id`, `/eclat/test/razorpay-key-secret`

**Sandbox available:** Yes — Razorpay test mode with test UPI/card flows.

---

### 10. Pusher (Real-time Messaging) — Required if Testing Chat
**What it unlocks:** Real-time message delivery between matched users.

1. Sign up at [pusher.com](https://pusher.com) → Create App
2. Cluster: **ap2** (Singapore)
3. Copy credentials from App Keys tab

- `PUSHER_APP_ID=xxxx`
- `PUSHER_KEY=xxxx`
- `NEXT_PUBLIC_PUSHER_KEY=xxxx`
- `PUSHER_SECRET=xxxx`
- `PUSHER_CLUSTER=ap2`
- `NEXT_PUBLIC_PUSHER_CLUSTER=ap2`
- AWS Secrets Manager: `/eclat/test/pusher-app-id`, `/eclat/test/pusher-key`, `/eclat/test/pusher-secret`

**Without this:** Messaging UI won't receive real-time updates. Mock mode available with `MOCK_EXTERNAL_SERVICES=true`.

---

### 11. Daily.co (Video Calls) — Required if Testing Video Calls
**What it unlocks:** Encrypted video call rooms for matched users.

1. Sign up at [daily.co](https://daily.co) → Developers → API Keys
2. Create an API key

- `DAILY_API_KEY=xxxx`
- `DAILY_DOMAIN=yoursubdomain.daily.co`
- AWS Secrets Manager: `/eclat/test/daily-api-key`

**Without this:** Video call rooms can't be created. Mock mode available.

---

## STAGING TIER
*Same keys as test tier, but scoped to staging environment in AWS Secrets Manager.*

All AWS Secrets Manager paths change from `/eclat/test/` to `/eclat/staging/`:

```bash
# After terraform apply -var-file=environments/staging.tfvars,
# populate each secret:
aws secretsmanager put-secret-value \
  --secret-id /eclat/staging/nextauth-secret \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager put-secret-value \
  --secret-id /eclat/staging/google-client-id \
  --secret-string "your-client-id.apps.googleusercontent.com"

# ...repeat for all secrets listed in the test tier above
```

**Staging-specific changes:**
- `NEXTAUTH_URL` must point to staging domain: `https://staging.eclat.app`
- Google OAuth redirect URI: add `https://staging.eclat.app/api/auth/callback/google`
- Stripe webhook: create a new endpoint in Stripe dashboard pointing to `https://staging.eclat.app/api/webhooks/stripe`
- Razorpay webhook: add `https://staging.eclat.app/api/webhooks/razorpay`
- Daily.co: same API key works across environments (no sandbox/prod split)
- Pusher: same app key works (different channel names won't interfere)

---

## PRODUCTION TIER
*Switch all sandbox/test keys to live/production keys.*

### Switching test → live keys

| Service | Test key prefix | Live key prefix | Where to update |
|---------|----------------|-----------------|-----------------|
| Stripe secret | `sk_test_` | `sk_live_` | `/eclat/production/stripe-secret-key` |
| Stripe publishable | `pk_test_` | `pk_live_` | `/eclat/production/stripe-publishable-key` |
| Razorpay key ID | `rzp_test_` | `rzp_live_` | `/eclat/production/razorpay-key-id` |
| Google OAuth | Same key | Same key | Add `https://eclat.app/api/auth/callback/google` as redirect URI |
| Resend | Same key | Same key | Verify sending domain `eclat.app` in Resend dashboard |

### How to update a production secret

```bash
# Update Stripe to live mode (example)
aws secretsmanager put-secret-value \
  --secret-id /eclat/production/stripe-secret-key \
  --secret-string "sk_live_51xxxx..." \
  --region ap-southeast-1

# App Runner will pick up the new secret on next deployment.
# Force a redeployment:
aws apprunner start-deployment \
  --service-arn $PROD_APP_RUNNER_ARN \
  --region ap-southeast-1
```

### Production-only requirements

**Stripe live mode checklist:**
- [ ] Business details complete in Stripe dashboard
- [ ] Bank account connected for payouts
- [ ] Tax settings configured for India (GST) and international
- [ ] Webhooks endpoint `https://eclat.app/api/webhooks/stripe` created with live webhook secret

**Razorpay live mode checklist:**
- [ ] KYC completed in Razorpay dashboard
- [ ] Bank account verified
- [ ] Webhooks endpoint `https://eclat.app/api/webhooks/razorpay` created

**Resend domain verification:**
- [ ] Add DKIM records to `eclat.app` DNS
- [ ] Verify domain in Resend dashboard
- [ ] Update `EMAIL_FROM` to `noreply@eclat.app`

**Domain + SSL:**
- Terraform provisions ACM certificate automatically
- Route 53 nameservers from `terraform output nameservers` → update at domain registrar

### GitHub Environments (setup instructions)

Create these in GitHub repo → Settings → Environments:

**eclat-test:**
- No required reviewers
- URL: `https://test.eclat.app`
- Add secrets: `ECLAT_TEST_APP_RUNNER_ARN`, `ECLAT_TEST_AWS_ROLE_ARN`, `ECLAT_TEST_PUSHER_KEY`, `ECLAT_TEST_STRIPE_PK`, `ECLAT_TEST_SENTRY_DSN`

**eclat-staging:**
- No required reviewers
- URL: `https://staging.eclat.app`
- Add secrets: `ECLAT_STAGING_APP_RUNNER_ARN`, `ECLAT_STAGING_AWS_ROLE_ARN`, `ECLAT_STAGING_PUSHER_KEY`, `ECLAT_STAGING_STRIPE_PK`, `ECLAT_STAGING_SENTRY_DSN`, `ECLAT_STAGING_URL`

**eclat-production:**
- Required reviewer: your GitHub username
- Wait timer: 5 minutes
- URL: `https://eclat.app`
- Add secrets: `ECLAT_PROD_APP_RUNNER_ARN`, `ECLAT_PROD_AWS_ROLE_ARN`, `ECLAT_PROD_PUSHER_KEY`, `ECLAT_PROD_STRIPE_PK`, `ECLAT_PROD_SENTRY_DSN`

### Repository-level GitHub secrets (all environments)

```
AWS_ACCOUNT_ID              — 12-digit AWS account ID
ECLAT_COST_MONITOR_AWS_ROLE_ARN — IAM role for cost monitoring (read-only Cost Explorer)
```
