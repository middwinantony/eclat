# eclat — Infrastructure Guide
> Reference for testing, pre-launch checklist, and what was added.

---

## What was added (2026-04-04)

### Terraform

| File | What it creates | Test | Staging/Prod |
|------|----------------|------|-------------|
| `infrastructure/terraform/bootstrap/state-backend.tf` | S3 state bucket + DynamoDB lock table | once | — |
| `infrastructure/terraform/environments/test.tfvars` | Test tier variable values | ✓ | — |
| `infrastructure/terraform/variables.tf` (appended) | 7 tier-control flags: `use_waf`, `use_kms`, `use_rds`, `use_cloudfront`, `use_lambda_reserved`, `database_provider`, `hosting_tier` | ✓ | ✓ |
| `infrastructure/terraform/TERRAFORM_README.md` | Four-tier deploy guide with exact commands | ✓ | ✓ |

### GitHub Actions

| Workflow | Trigger | Key jobs |
|----------|---------|---------|
| `.github/workflows/eclat-deploy-test.yml` | push to main | CI → Docker build → App Runner deploy → smoke tests → cost check |
| `.github/workflows/eclat-cost-monitor.yml` | daily 08:00 UTC | Query Cost Explorer → alert if spike >20% or projected >$200/mo |
| `.github/workflows/eclat-security-weekly.yml` | Sunday 02:00 UTC | pnpm audit + CodeQL + Trivy + OWASP ZAP + TruffleHog |

### Tests

| File | What it tests |
|------|--------------|
| `__tests__/api/health.test.ts` | 200 OK, 503 on DB failure, no internal error leakage |
| `__tests__/api/auth/login.test.ts` | Registration: validation, rate limiting, no email enumeration, password hashing, audit log |
| `__tests__/lib/security.test.ts` | Rate limit pass/block/fail-open, KMS encrypt/decrypt roundtrip, audit log writes |
| `__tests__/gdpr/deletion.test.ts` | Soft delete sets deletedAt, login blocked after soft delete, hard delete removes all fields, 30-day grace period |

### Other files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local postgres (persistent volumes) |
| `docker-compose.test.yml` | Ephemeral postgres for local test runs |
| `scripts/setup-local.sh` | One-command local dev setup — starts Docker, migrates, seeds |
| `scripts/mock-services.ts` | Mock clients for Pusher, Daily.co, Stripe, Razorpay, Resend, S3, KMS, Upstash |
| `API_KEYS_GUIDE.md` | All 11 services with exact setup steps for test → staging → prod |
| `eslint.config.mjs` (updated) | Added `eslint-plugin-no-secrets` — detects hardcoded API keys and tokens |
| `.github/CODEOWNERS` (updated) | eclat entries — extra coverage for auth, GDPR, KMS, infra paths |
| `.github/pull_request_template.md` (updated) | eclat checkbox + Article 9 reminders for PRs |
| `.github/SECURITY.md` (updated) | eclat section — highest-priority disclosure, full data inventory |

---

## Implementation order

### Step 1 — Local dev (free, do this first)
- [ ] `chmod +x scripts/setup-local.sh && ./scripts/setup-local.sh`
- [ ] Copy `.env.local.example` → `.env.local`, fill in `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
- [ ] `pnpm dev` → verify app loads at http://localhost:3000

### Step 2 — Install new ESLint plugin
- [ ] `pnpm install` (picks up `eslint-plugin-no-secrets` added to package.json)
- [ ] `pnpm lint` — confirm zero warnings

### Step 3 — Run all tests
- [ ] `pnpm test:coverage`
- [ ] Confirm coverage ≥ 80% across lines, functions, branches
- [ ] All 7 test files pass (3 existing + 4 new)

### Step 4 — Bootstrap Terraform state (one-time, free)
- [ ] Ensure AWS CLI is configured: `aws sts get-caller-identity`
- [ ] `cd infrastructure/terraform/bootstrap`
- [ ] `terraform init`
- [ ] `terraform apply -var="aws_account_id=YOUR_ACCOUNT_ID"`
- [ ] Note the `state_bucket_name` from output
- [ ] Create `infrastructure/terraform/environments/test.backend.hcl`:
  ```hcl
  bucket         = "eclat-terraform-state-YOUR_ACCOUNT_ID"
  key            = "eclat/test/terraform.tfstate"
  region         = "ap-southeast-1"
  dynamodb_table = "eclat-terraform-locks"
  encrypt        = true
  ```
- [ ] Same for `staging.backend.hcl` and `prod.backend.hcl` (different `key` values)

### Step 5 — Test tier AWS deploy (~$55/mo while running)
- [ ] Fill in `infrastructure/terraform/environments/test.tfvars`:
  - `aws_account_id = "YOUR_ACCOUNT_ID"`
  - `alert_email = "your@email.com"`
- [ ] `cd infrastructure/terraform`
- [ ] `terraform init -backend-config=environments/test.backend.hcl`
- [ ] `terraform plan -var-file=environments/test.tfvars` — review output
- [ ] `terraform apply -var-file=environments/test.tfvars`
- [ ] Populate secrets — see `API_KEYS_GUIDE.md` → TEST TIER section
- [ ] Run migrations: `DATABASE_URL=<rds-endpoint> pnpm prisma migrate deploy`

### Step 6 — GitHub Actions setup
- [ ] Add repository secret: `AWS_ACCOUNT_ID`
- [ ] Create GitHub OIDC provider in AWS IAM:
  ```bash
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
  ```
- [ ] Create GitHub environments in repo Settings → Environments:
  - `eclat-test` — no required reviewers, URL: `https://test.eclat.app`
  - `eclat-staging` — no required reviewers, URL: `https://staging.eclat.app`
  - `eclat-production` — required reviewer: your GitHub username, wait timer: 5 min
- [ ] Add per-environment secrets (see `API_KEYS_GUIDE.md` → GitHub Environments section)
- [ ] Add `ECLAT_COST_MONITOR_AWS_ROLE_ARN` as repo-level secret (for daily cost monitor)
- [ ] Push to main → verify `eclat-deploy-test.yml` runs and passes

### Step 7 — Staging deploy
- [ ] Complete Phase 11 checklist: `PHASE_11_CHECKLIST.md`
- [ ] `terraform init -reconfigure -backend-config=environments/staging.backend.hcl`
- [ ] `terraform apply -var-file=environments/staging.tfvars`
- [ ] Populate staging secrets (`/eclat/staging/...` in Secrets Manager)
- [ ] Verify `eclat-deploy-staging.yml` smoke tests all pass
- [ ] Add `ECLAT_STAGING_URL` secret to `eclat-staging` environment (enables OWASP ZAP scans)

---

## Pre-launch checklist

### Security
- [ ] Weekly security scan has run at least once (`eclat-security-weekly.yml`) — zero HIGH findings
- [ ] `pnpm audit` returns no high/critical vulnerabilities
- [ ] All KMS-encrypted fields verified in production DB (messages, IPs, govt IDs)
- [ ] OWASP ZAP scan passed against staging URL
- [ ] TruffleHog shows no secrets in git history
- [ ] Stripe webhook signature verification working in staging
- [ ] Razorpay webhook signature verification working in staging

### GDPR compliance
- [ ] GDPR deletion Lambda (`account_delete`) tested end-to-end in staging
- [ ] Soft-delete → login blocked verified
- [ ] Hard-delete (30-day) Lambda tested with a synthetic old `deletedAt` record
- [ ] GDPR data export tested (if export endpoint exists)
- [ ] Government ID documents confirmed unreachable without signed CloudFront URL
- [ ] Privacy policy live at `eclat.app/privacy`

### Payments
- [ ] Stripe test subscription creates/cancels correctly in staging
- [ ] Razorpay test order creates correctly in staging
- [ ] Stripe webhook processes `customer.subscription.updated` correctly
- [ ] Membership tier upgrades/downgrades reflected in DB after webhook

### Infrastructure
- [ ] `terraform plan` against prod.tfvars shows no unexpected changes
- [ ] RDS automated backups enabled (30-day retention in prod)
- [ ] CloudWatch alarms confirmed sending email to `alerts@eclat.app`
- [ ] App Runner health check passing (`/api/health` → 200)
- [ ] CloudFront signed URLs working for profile photos
- [ ] Verification document S3 bucket confirmed not publicly accessible
- [ ] KMS key rotation enabled (annual)
- [ ] NAT Gateway confirmed required (Lambda functions need VPC internet access)

### Cost
- [ ] `eclat-cost-monitor.yml` has run at least once — projected monthly within budget
- [ ] Test tier destroyed if not actively in use (`terraform destroy -var-file=environments/test.tfvars`)

### Operations
- [ ] Domain pointing to Route 53 nameservers (`terraform output nameservers`)
- [ ] ACM certificate in `ISSUED` state
- [ ] Resend sending domain verified (DKIM records added)
- [ ] `EMAIL_FROM` updated to `noreply@eclat.app`
- [ ] Stripe live mode keys in `/eclat/production/` secrets (not test keys)
- [ ] Razorpay live mode keys in `/eclat/production/` secrets
- [ ] Sentry DSN configured for production project
- [ ] At least one admin account exists in production DB

---

## Cost reference

| Tier | Est. monthly | How to deploy | How to destroy |
|------|-------------|---------------|---------------|
| Local | $0 | `./scripts/setup-local.sh` | `docker compose down -v` |
| Test | ~$55/mo | `terraform apply -var-file=environments/test.tfvars` | `terraform destroy -var-file=environments/test.tfvars` |
| Staging | ~$80-100/mo | `terraform apply -var-file=environments/staging.tfvars` | `terraform destroy -var-file=environments/staging.tfvars` |
| Production | ~$150-250/mo | via `eclat-deploy-production.yml` (manual trigger) | Never destroy — migrate or scale down |

**Biggest cost drivers:**
1. NAT Gateway — ~$32/mo flat (required for Lambda VPC access)
2. RDS db.t3.small — ~$25/mo
3. App Runner — ~$0 at min=0 (test), ~$5-20/mo at min=1 (staging/prod)
4. Secrets Manager — ~$6/mo (15 secrets × $0.40)

---

## Key file locations

| What | Where |
|------|-------|
| API keys setup | `API_KEYS_GUIDE.md` |
| Terraform commands | `infrastructure/terraform/TERRAFORM_README.md` |
| Phase 11 prerequisites | `PHASE_11_CHECKLIST.md` |
| Local dev setup | `scripts/setup-local.sh` |
| Mock external services | `scripts/mock-services.ts` |
| Environment variables | `.env.local.example` |
| Database schema | `prisma/schema.prisma` |
| Security utilities | `lib/security/` |
