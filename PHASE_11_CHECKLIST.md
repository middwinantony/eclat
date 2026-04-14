# eclat — Phase 11 Pre-Deployment Checklist

> Reference for Phase 11 (Staging Deployment).
> Complete all **Required** items before saying "confirmed" to start Phase 11.

---

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

---

## 1. Already Done ✓

- [x] `NEXTAUTH_SECRET` — generated, written to `.env.local`
- [x] Terraform infrastructure code — all modules written (VPC, RDS, App Runner, ECR, S3, KMS, WAF, CloudFront, SQS, Lambda, DNS)
- [x] GitHub Actions CI/CD workflows — ci, deploy-staging, deploy-production, security-scan, terraform-plan
- [x] Dockerfile — multi-stage, non-root user, standalone output
- [x] Prisma schema — 12 models, generated client

---

## 2. Required Before Phase 11

### AWS Account & CLI
- [ ] AWS account exists with billing enabled
- [ ] IAM user or role with the following permissions:
  - `AdministratorAccess` (for initial Terraform bootstrap) **or** scoped policies for: EC2, RDS, S3, KMS, IAM, App Runner, ECR, SQS, Lambda, CloudFront, WAF, Route53, ACM, SecretsManager, CloudWatch, SNS
- [ ] AWS CLI configured locally: `aws configure` (region: `ap-southeast-1`)
- [ ] Verify access: `aws sts get-caller-identity`

### Terraform State Backend (one-time bootstrap)
Run these once before `terraform init`:
```bash
# Create S3 state bucket (replace YOUR_ACCOUNT_ID)
aws s3api create-bucket \
  --bucket eclat-terraform-state-YOUR_ACCOUNT_ID \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-bucket-versioning \
  --bucket eclat-terraform-state-YOUR_ACCOUNT_ID \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket eclat-terraform-state-YOUR_ACCOUNT_ID \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name eclat-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```
- [ ] S3 state bucket created
- [ ] DynamoDB lock table created
- [ ] Update `apps/eclat/infrastructure/terraform/environments/staging.backend.hcl` with your account ID

### Google OAuth
- [ ] Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
- [ ] Application type: **Web application**
- [ ] Authorised redirect URIs:
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://staging.eclat.app/api/auth/callback/google` (staging — add your actual domain)
- [ ] Copy into `.env.local`:
  - `GOOGLE_CLIENT_ID=`
  - `GOOGLE_CLIENT_SECRET=`
- [ ] Populate into AWS Secrets Manager (Terraform does this via placeholder — update after `terraform apply`):
  - Secret name: `eclat/staging/google-client-id`
  - Secret name: `eclat/staging/google-client-secret`

### Resend (Email)
- [ ] Sign up at [resend.com](https://resend.com)
- [ ] Create API key (full access)
- [ ] Copy into `.env.local`: `RESEND_API_KEY=`
- [ ] Populate AWS Secrets Manager: `eclat/staging/resend-api-key`
- [ ] (Optional for staging) Verify sending domain — or use `onboarding@resend.dev` for now

### Upstash Redis (Rate Limiting)
- [ ] Sign up at [console.upstash.com](https://console.upstash.com)
- [ ] Create database: Name `eclat-staging`, Region **ap-southeast-1**, Type **Regional**
- [ ] Copy into `.env.local`:
  - `UPSTASH_REDIS_REST_URL=`
  - `UPSTASH_REDIS_REST_TOKEN=`
- [ ] Populate AWS Secrets Manager: `eclat/staging/upstash-redis`
  - Store as JSON: `{"url":"...","token":"..."}`

### GitHub Repository Secrets (for GitHub Actions OIDC)
- [ ] In GitHub repo → Settings → Secrets and variables → Actions, add:
  - `AWS_ACCOUNT_ID` — your 12-digit AWS account ID
  - `STAGING_APP_RUNNER_SERVICE_ARN` — filled in after first `terraform apply`
- [ ] Create GitHub Actions OIDC provider in AWS IAM:
  ```bash
  # GitHub's OIDC thumbprint (stable)
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
  ```
- [ ] OIDC provider created in AWS IAM
- [ ] GitHub Actions IAM role exists (Terraform creates this — run `terraform apply` first)

---

## 3. Add Before Phase 12 (Production) — Not Blocking Phase 11

### Stripe
- [ ] [dashboard.stripe.com](https://dashboard.stripe.com) → Test mode API keys
- [ ] `STRIPE_SECRET_KEY=sk_test_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...` (from `stripe listen`)
- [ ] AWS Secrets Manager: `eclat/staging/stripe-secret-key`, `eclat/staging/stripe-webhook-secret`

### Razorpay
- [ ] [dashboard.razorpay.com](https://dashboard.razorpay.com) → Test keys
- [ ] `RAZORPAY_KEY_ID=rzp_test_...`
- [ ] `RAZORPAY_KEY_SECRET=...`
- [ ] AWS Secrets Manager: `eclat/staging/razorpay-key-id`, `eclat/staging/razorpay-key-secret`

### Pusher
- [ ] [pusher.com](https://pusher.com) → Create app → Cluster: **ap2**
- [ ] `PUSHER_APP_ID=`, `PUSHER_KEY=`, `PUSHER_SECRET=`, `PUSHER_CLUSTER=ap2`
- [ ] AWS Secrets Manager: `eclat/staging/pusher-keys`

### Daily.co (Video Calls)
- [ ] [daily.co](https://daily.co) → Developers → API keys
- [ ] `DAILY_API_KEY=`, `DAILY_DOMAIN=yoursubdomain.daily.co`
- [ ] AWS Secrets Manager: `eclat/staging/daily-api-key`

### Sentry (Error Tracking)
- [ ] [sentry.io](https://sentry.io) → New Project → Next.js
- [ ] `SENTRY_DSN=`, `NEXT_PUBLIC_SENTRY_DSN=`
- [ ] AWS Secrets Manager: `eclat/staging/sentry-dsn`

---

## 4. Domain (Phase 11 will ask for this)

- [ ] Domain purchased (e.g. `eclat.app` on Namecheap / Google Domains / Cloudflare)
- [ ] Decide: will Terraform manage the hosted zone? (Set `create_hosted_zone = true` in `staging.tfvars`)
- [ ] If domain is at an external registrar, note the nameservers — Terraform will output Route53 NS records to point to

---

## 5. What Phase 11 Will Do (for reference)

1. `terraform init` + `terraform plan` → review infrastructure
2. `terraform apply` → provisions VPC, RDS, ECR, App Runner, S3, KMS, WAF, CloudFront
3. Populate AWS Secrets Manager with the keys from Section 2 above
4. `prisma migrate deploy` against staging RDS
5. Docker build → push to ECR → App Runner picks up new image
6. Smoke tests: `/api/health` 200, `/login` 200, `/api/profile` 401, `/api/admin/dashboard` 401
7. Staging URL posted to commit

---

## Notes

- All secrets go into **AWS Secrets Manager**, not environment variables in App Runner — the Terraform `hosting.tf` grants App Runner permission to read them at runtime.
- `DATABASE_URL` is auto-constructed by Terraform from the RDS outputs — you don't need to set it manually.
- `KMS_KEY_ARN` is output by Terraform — the App Runner instance role already has access.
