# eclat Terraform — Four-Tier Infrastructure Guide

> **Data sensitivity:** eclat stores GDPR Article 9 data (gender preferences), government ID documents, biometric liveness video, and KMS-encrypted messages. KMS is **always enabled** across all tiers.

---

## Architecture Overview

| Tier | Purpose | Est. cost | Database | Hosting |
|------|---------|-----------|----------|---------|
| **local** | Developer laptop | $0 | Docker postgres | `pnpm dev` |
| **test** | Shared AWS test env | ~$55/mo | RDS db.t3.micro | App Runner (min=0) |
| **staging** | QA sign-off before prod | ~$80-100/mo | RDS db.t3.small | App Runner (min=1) |
| **production** | Live users | ~$150-250/mo | RDS db.t3.small Multi-AZ | App Runner (min=1, max=5) |

> **Cheapest option during development:** Use local docker-compose + Neon (free tier). Run `./scripts/setup-local.sh`. Zero AWS cost.

> **Cost driver to watch:** NAT Gateway costs ~$32/mo flat regardless of traffic. This is the biggest fixed cost at test tier.

---

## FIRST TIME SETUP (run once per AWS account)

### Step 1 — Bootstrap state backend

Before running `terraform init`, the S3 state bucket and DynamoDB lock table must exist.

```bash
cd apps/eclat/infrastructure/terraform/bootstrap

# Edit bootstrap/state-backend.tf: fill in your aws_account_id
# OR pass it on the command line:

terraform init
terraform apply -var="aws_account_id=YOUR_12_DIGIT_ACCOUNT_ID"
```

After bootstrap completes, note the `state_bucket_name` output.

### Step 2 — Create backend.hcl files

Create `environments/test.backend.hcl` (and staging, prod versions):

```hcl
# environments/test.backend.hcl
bucket         = "eclat-terraform-state-YOUR_ACCOUNT_ID"
key            = "eclat/test/terraform.tfstate"
region         = "ap-southeast-1"
dynamodb_table = "eclat-terraform-locks"
encrypt        = true
```

```hcl
# environments/staging.backend.hcl
bucket         = "eclat-terraform-state-YOUR_ACCOUNT_ID"
key            = "eclat/staging/terraform.tfstate"
region         = "ap-southeast-1"
dynamodb_table = "eclat-terraform-locks"
encrypt        = true
```

```hcl
# environments/prod.backend.hcl
bucket         = "eclat-terraform-state-YOUR_ACCOUNT_ID"
key            = "eclat/production/terraform.tfstate"
region         = "ap-southeast-1"
dynamodb_table = "eclat-terraform-locks"
encrypt        = true
```

### Step 3 — Fill in .tfvars files

In `environments/test.tfvars`, replace:
- `YOUR_AWS_ACCOUNT_ID` → your 12-digit account ID
- `YOUR_EMAIL@example.com` → your alert email

---

## TEST TIER DEPLOY (~$55/mo while running)

```bash
cd apps/eclat/infrastructure/terraform

# Initialise with test backend
terraform init -backend-config=environments/test.backend.hcl

# Preview what will be created (always review before applying)
terraform plan -var-file=environments/test.tfvars

# Review the plan — confirm resources listed match expectations
# Apply (creates ~30-40 AWS resources)
terraform apply -var-file=environments/test.tfvars
```

**Resources created at test tier:**
- VPC + subnets + NAT Gateway (~$32/mo)
- ECR repository
- App Runner service (scales to zero when idle)
- RDS PostgreSQL db.t3.micro (~$15/mo)
- KMS key (always enabled for eclat)
- S3 buckets: profiles + verification docs
- CloudFront distribution
- Secrets Manager secrets (placeholders — populate after apply)
- Lambda functions: daily_queue, match_expire, email_digest, account_delete
- SQS queues + EventBridge rules
- API Gateway WebSocket
- CloudWatch alarms + SNS alerts
- Route 53 + ACM certificate

**After apply — populate secrets:**

```bash
# List all secrets created (fill in your environment)
aws secretsmanager list-secrets \
  --filters Key=name,Values=/eclat/test/ \
  --query "SecretList[].Name" \
  --output table \
  --region ap-southeast-1

# Set a secret (example — nextauth secret)
aws secretsmanager put-secret-value \
  --secret-id /eclat/test/nextauth-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region ap-southeast-1

# See API_KEYS_GUIDE.md for complete list of secrets to populate
```

**After apply — run database migrations:**

```bash
# Get the RDS endpoint from Terraform outputs
terraform output rds_endpoint

# Run migrations against test RDS
DATABASE_URL="postgresql://eclat:<password>@<endpoint>:5432/eclat_test" \
  pnpm prisma migrate deploy
```

---

## STAGING TIER DEPLOY (~$80-100/mo)

```bash
# Switch to staging backend (if re-initialising from test)
terraform init -reconfigure -backend-config=environments/staging.backend.hcl

# OR initialise fresh
terraform init -backend-config=environments/staging.backend.hcl

terraform plan  -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars
```

**Differences from test tier:**
- RDS db.t3.small (more headroom for QA load)
- App Runner min_size=1 (always warm — smoke tests need immediate response)
- Higher backup retention (7 days)

---

## PROMOTING TEST → STAGING

### 1. Migrate data (if needed)

```bash
# Export from test RDS
pg_dump "postgresql://eclat:<pw>@<test-rds-endpoint>:5432/eclat_test" \
  --schema-only > schema.sql

# Import to staging RDS (run migrations instead of restoring data —
# staging should start with fresh data, not test data)
DATABASE_URL="postgresql://eclat:<pw>@<staging-rds-endpoint>:5432/eclat_staging" \
  pnpm prisma migrate deploy
```

### 2. Update environment variables

```bash
# Update Stripe webhook to staging URL
aws secretsmanager put-secret-value \
  --secret-id /eclat/staging/stripe-webhook-secret \
  --secret-string "whsec_staging_xxxx" \
  --region ap-southeast-1
```

### 3. Verify smoke tests pass on staging

The `eclat-deploy-staging.yml` GitHub Action runs smoke tests automatically on push to main.

---

## PRODUCTION DEPLOY (~$150-250/mo, scales with traffic)

```bash
# Always initialise with production backend
terraform init -reconfigure -backend-config=environments/prod.backend.hcl

# Plan first — always review production changes carefully
terraform plan -var-file=environments/prod.tfvars

# Apply — requires manual confirmation ("yes")
terraform apply -var-file=environments/prod.tfvars
```

**Production-only resources:**
- RDS Multi-AZ (automatic failover to standby) — adds ~$30/mo
- App Runner max_size=5 (auto-scales to 5 instances)
- 30-day RDS backup retention
- Government ID documents retained 7 years (Object Lock)

---

## SWITCHING BETWEEN ENVIRONMENTS

Each environment uses a separate Terraform state file (different S3 key in backend.hcl).

```bash
# Switch from test to staging
terraform init -reconfigure -backend-config=environments/staging.backend.hcl
terraform plan -var-file=environments/staging.tfvars

# Switch back to test
terraform init -reconfigure -backend-config=environments/test.backend.hcl
```

---

## DESTROYING TEST TIER (save money when not in use)

```bash
# Ensure you're on test backend
terraform init -reconfigure -backend-config=environments/test.backend.hcl

# Preview what will be destroyed
terraform plan -destroy -var-file=environments/test.tfvars

# Destroy ALL test resources (saves ~$55/mo)
terraform destroy -var-file=environments/test.tfvars
```

**What gets deleted:**
- App Runner service, ECR images, RDS instance, NAT Gateway, VPC, Lambda functions, SQS queues, S3 buckets (unless Object Lock is active), CloudFront, KMS key (30-day recovery window), all Secrets Manager secrets (7-day recovery window)

**What is preserved:**
- Terraform state in S3 (the bootstrap bucket is never destroyed by `terraform destroy`)
- DynamoDB lock table
- Any Route 53 hosted zone if `create_hosted_zone = false`

**To redeploy after destroying:**

```bash
terraform apply -var-file=environments/test.tfvars
# Then re-populate all secrets (they are recreated as empty placeholders)
```

---

## UPDATING A SECRET

```bash
# Update any secret value
aws secretsmanager put-secret-value \
  --secret-id /eclat/ENVIRONMENT/SECRET_NAME \
  --secret-string "new-value-here" \
  --region ap-southeast-1

# Force App Runner to pick up the new secret (triggers a redeployment)
APP_RUNNER_ARN=$(terraform output -raw app_runner_service_arn)
aws apprunner start-deployment \
  --service-arn "${APP_RUNNER_ARN}" \
  --region ap-southeast-1
```

---

## FILE REFERENCE

| File | What it creates | Test | Staging | Prod |
|------|----------------|------|---------|------|
| `main.tf` | AWS provider, S3+DynamoDB backend config | ✓ | ✓ | ✓ |
| `variables.tf` | All input variables incl. tier-control flags | ✓ | ✓ | ✓ |
| `outputs.tf` | Exported values (URLs, ARNs, endpoints) | ✓ | ✓ | ✓ |
| `networking.tf` | VPC, subnets, NAT Gateway, security groups | ✓ | ✓ | ✓ |
| `database.tf` | RDS PostgreSQL 15 | ✓ | ✓ | ✓ (Multi-AZ) |
| `hosting.tf` | ECR, App Runner service, IAM roles | ✓ (min=0) | ✓ (min=1) | ✓ (min=1) |
| `storage.tf` | S3 profiles + S3 verification (Object Lock) | ✓ | ✓ | ✓ |
| `secrets.tf` | Secrets Manager placeholders | ✓ | ✓ | ✓ |
| `security.tf` | KMS CMK, ACM cert, CloudFront, WAF | ✓ | ✓ | ✓ |
| `monitoring.tf` | SNS, CloudWatch alarms, log groups, dashboard | ✓ | ✓ | ✓ |
| `dns.tf` | Route 53, A/AAAA records, SES DNS records | ✓ | ✓ | ✓ |
| `realtime.tf` | API Gateway WebSocket, Lambda authorizer/router | ✓ | ✓ | ✓ |
| `jobs.tf` | SQS queues, Lambda functions, EventBridge rules | ✓ | ✓ | ✓ |
| `bootstrap/state-backend.tf` | S3 state bucket + DynamoDB lock table | once | — | — |
| `environments/test.tfvars` | Test tier variable values | ✓ | — | — |
| `environments/staging.tfvars` | Staging variable values | — | ✓ | — |
| `environments/prod.tfvars` | Production variable values | — | — | ✓ |

---

## COMMON ISSUES

**`Error: S3 bucket already exists`**
Another account has a bucket with that name. The bucket name includes your account ID — ensure `aws_account_id` in `.tfvars` is your actual 12-digit account ID.

**`Error: Error acquiring the state lock`**
Another `terraform apply` is running, or a previous run crashed. Check DynamoDB:
```bash
aws dynamodb scan --table-name eclat-terraform-locks --region ap-southeast-1
# Delete the lock item manually if the run is no longer active:
aws dynamodb delete-item \
  --table-name eclat-terraform-locks \
  --key '{"LockID": {"S": "eclat-terraform-state-ACCOUNT_ID/eclat/test/terraform.tfstate"}}' \
  --region ap-southeast-1
```

**`ACM certificate stuck in PENDING_VALIDATION`**
DNS validation records haven't propagated. Run:
```bash
terraform output nameservers  # Ensure your registrar points here
```
Wait 5-30 minutes. Re-run `terraform apply` — it will complete once validation passes.

**`App Runner can't connect to RDS`**
The App Runner VPC connector's security group must be allowed inbound on port 5432 in the RDS security group. Check `networking.tf` and verify the security group rule `app_runner_to_rds`.

**`KMS decrypt failed`**
The App Runner IAM role must have `kms:Decrypt` permission on the KMS key. Check `hosting.tf` IAM role policy and ensure `kms_key_arn` is correct in the App Runner environment config.

**`Lambda function can't reach RDS`**
Lambda functions are deployed inside the VPC but need the RDS security group to allow inbound from the Lambda security group. Check `jobs.tf` and `networking.tf` security group rules.
