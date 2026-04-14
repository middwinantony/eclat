# AWS Deployment Guide — Eclat

> Written for a first-time AWS user deploying for the first time.
> Follow every step in order. Do not skip — each step depends on the previous one.
>
> **Three parts:**
> - **Part 1 — Test Tier Setup** (Steps 1–11): Get the app running on AWS for testing
> - **Part 2 — External API Keys**: Services you need to connect (Google, Resend, Stripe, etc.)
> - **Part 3 — Before Launch**: What to do before real users can sign up

---

## Estimated Costs

| Phase | Monthly Cost | What's Running |
|-------|-------------|----------------|
| Test tier | ~$7–8/mo | App Runner + KMS + CloudFront + Route 53. No RDS, no VPC, no WAF. |
| Production | ~$150–250/mo | RDS, WAF, VPC + NAT Gateway, Secrets Manager, larger App Runner |

> **Save money:** Run `terraform destroy -var-file=environments/test.tfvars` when you are done testing for the day. State is saved in S3 — just re-run `terraform apply` next time.

---

## What Gets Created in the Test Tier

**Created (~$7–8/mo):**
- **ECR** — Docker image registry (stores your built app images)
- **App Runner** — runs your Next.js app (1 instance, 256 vCPU / 512 MB)
- **S3** — two buckets: profile photos and verification documents
- **KMS** — encryption key (eclat handles government IDs — always required)
- **CloudFront** — CDN for serving profile photos
- **Route 53** — DNS records for `test.eclat.social`
- **ACM** — TLS certificate (free)
- **CloudWatch** — logs and alarms (free tier)

**Not created in test tier (saves ~$58/mo vs production):**
- ~~VPC + NAT Gateway~~ — saves $32/mo; App Runner connects to Neon directly over internet
- ~~RDS PostgreSQL~~ — saves $15/mo; use Neon free tier instead
- ~~Secrets Manager~~ — saves $6/mo; env vars set directly in App Runner console
- ~~WAF~~ — saves $5/mo; not needed for test traffic
- ~~Lambda + SQS + EventBridge~~ — trigger background jobs via API routes during testing

---

## Prerequisites — Install These First

### 1. AWS CLI

```bash
# macOS
brew install awscli

# Verify
aws --version
# Should show: aws-cli/2.x.x
```

### 2. Terraform

```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify
terraform -version
# Should show: Terraform v1.6.x or higher
```

### 3. Docker Desktop

Download from docker.com/products/docker-desktop and install it.

```bash
# Verify
docker --version
```

### 4. pnpm

```bash
# Verify
pnpm --version
```

---

## Part 1 — Test Tier Setup

---

### Step 1: Create an AWS Account

1. Go to aws.amazon.com → click **Create an AWS Account**
2. Enter your email and set a root account password
3. Choose **Personal** account type
4. Enter a credit card (you are only charged for what you use)
5. Complete phone verification
6. Select **Basic support** (free)
7. Sign in to the AWS Console

> Do not use your root account for day-to-day work. The next step creates a safer user.

---

### Step 2: Create an IAM User

This gives you CLI credentials that Terraform will use.

1. In the AWS Console search bar, type **IAM** and open it
2. Left sidebar → **Users** → **Create user**
3. Username: `eclat-admin`
4. Uncheck "Provide user access to the AWS Management Console" — you only need CLI access
5. Click **Next**
6. Select **Attach policies directly**
7. Search for and check `AdministratorAccess`
8. Click **Next** → **Create user**

**Create access keys:**

1. Click the user `eclat-admin` you just created
2. Go to the **Security credentials** tab
3. Scroll to **Access keys** → **Create access key**
4. Use case: **Command Line Interface (CLI)**
5. Check the confirmation box → **Next** → **Create access key**
6. **Save both values now — you cannot see the secret key again:**
   - Access key ID: `AKIA...`
   - Secret access key: `xxxx...`

---

### Step 3: Configure the AWS CLI

Open your terminal and run:

```bash
aws configure
```

Enter when prompted:

```
AWS Access Key ID:     AKIA... (from Step 2)
AWS Secret Access Key: xxxx... (from Step 2)
Default region name:   ap-southeast-1
Default output format: json
```

Verify it works:

```bash
aws sts get-caller-identity
```

You should see your account ID, user ID, and ARN. If you see an error, double-check the keys.

**Save your Account ID** — you will need it in every command below:

```bash
aws sts get-caller-identity --query Account --output text
# Outputs something like: 524419234223
```

---

### Step 4: Set Up Neon (Free PostgreSQL Database)

The test tier uses Neon instead of RDS — it is free and does not require a VPC.

1. Go to **neon.tech** → sign up (free, no credit card)
2. Click **Create Project**
   - Name: `eclat-test`
   - Region: **AWS Singapore (ap-southeast-1)**
   - PostgreSQL version: **15**
3. Once created, click **Connection Details**
4. Set the format to **Connection string**
5. Copy the full string — it looks like:
   ```
   postgresql://eclat_owner:xxxxxxxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Save it — you need it in the next step.

---

### Step 5: Fill In Your Configuration Files

Open `infrastructure/terraform/environments/test.tfvars` and fill in these three values:

```hcl
aws_account_id    = "524419234223"         # your AWS account ID from Step 3
alert_email       = "you@youremail.com"    # where CloudWatch alarms are sent
neon_database_url = "postgresql://..."     # your Neon connection string from Step 4
```

Leave all other settings as-is — they are already configured correctly for the test tier.

> **Security note:** This file contains your Neon database URL. Do not commit it to a public repository. Add `*.tfvars` to your `.gitignore` or keep the file out of git entirely.

---

### Step 6: Bootstrap Terraform State (One-Time Setup)

Terraform stores a record of what it has created in an S3 bucket. Run these commands once — you never need to run them again.

```bash
# Replace 524419234223 with YOUR account ID in every command below

# Create the S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket eclat-terraform-state-524419234223 \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

# Enable versioning so you can recover from mistakes
aws s3api put-bucket-versioning \
  --bucket eclat-terraform-state-524419234223 \
  --versioning-configuration Status=Enabled

# Enable encryption on the bucket
aws s3api put-bucket-encryption \
  --bucket eclat-terraform-state-524419234223 \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Block all public access
aws s3api put-public-access-block \
  --bucket eclat-terraform-state-524419234223 \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB table for state locking (prevents conflicts if two people run Terraform at the same time)
aws dynamodb create-table \
  --table-name eclat-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

**Update the backend config** with your actual bucket name.

Open `infrastructure/terraform/environments/test.backend.hcl` and set:

```hcl
bucket = "eclat-terraform-state-524419234223"   # your account ID here
key    = "eclat/test/terraform.tfstate"
region = "ap-southeast-1"
```

---

### Step 7: First Terraform Apply (Everything Except App Runner)

Navigate to the Terraform directory:

```bash
cd infrastructure/terraform
```

**Initialize Terraform:**

```bash
terraform init -backend-config=environments/test.backend.hcl
```

You should see: `Terraform has been successfully initialized!`

**Preview what will be created:**

```bash
terraform plan -var-file=environments/test.tfvars
```

Read through the output. Fix any errors before continuing. Warnings are fine.

**Apply — create all the AWS resources:**

```bash
terraform apply -var-file=environments/test.tfvars
```

Terraform asks: `Do you want to perform these actions?` — type `yes` and press Enter.

This takes **5–10 minutes**. It creates S3 buckets, KMS key, CloudFront, ACM certificate, ECR, DNS records, and CloudWatch alarms.

> **Why is there no App Runner service yet?**
> `create_app_runner_service` is set to `false` in `test.tfvars`. App Runner requires a working Docker image with an HTTP server. The placeholder image (`node:20-alpine`) has no web server, so the health check would fail and the service would enter `CREATE_FAILED`. You need to build and push your real app image first — that is Step 10. App Runner gets created in Step 11.

**Save the ECR repository URL from the output:**

```bash
terraform output ecr_repository_url
# Outputs something like: 524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-test
```

---

### Step 8: Get All External API Keys

You need four services before the app can work. Get all of them now before proceeding.

---

#### 8A — Google OAuth (Sign in with Google)

1. Go to console.cloud.google.com
2. Top-left dropdown → **New Project** → name it `eclat-test` → **Create**
3. Left sidebar: **APIs & Services** → **OAuth consent screen**
   - User type: **External** → **Create**
   - App name: `Eclat Test`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all remaining steps
4. Left sidebar: **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `Eclat Test Web`
   - **Authorized JavaScript origins** — add both:
     ```
     http://localhost:3000
     https://test.eclat.social
     ```
   - **Authorized redirect URIs** — add both:
     ```
     http://localhost:3000/api/auth/callback/google
     https://test.eclat.social/api/auth/callback/google
     ```
   - Click **Create**
5. Copy the **Client ID** and **Client Secret** — save them somewhere safe

> **Common mistake:** Do not paste any AWS URL into the Google Cloud Console. The redirect URI must be your app domain (e.g. `https://test.eclat.social`) followed by exactly `/api/auth/callback/google`. Nothing else.

---

#### 8B — Resend (Email Sending)

1. Go to resend.com → **Get Started** → sign up with your email
2. Left sidebar: **API Keys** → **Create API Key**
   - Name: `eclat-test`
   - Permission: **Full access**
3. Copy the key (starts with `re_`) — it is shown only once

> **For testing:** Use `onboarding@resend.dev` as the `EMAIL_FROM` address. This is a built-in Resend test sender — it requires no domain verification. The limitation is it can only send emails to the email address you used to sign up to Resend. This is fine for testing your own account. When you go to production, you will replace this with `noreply@eclat.social` after verifying your domain.

---

#### 8C — Upstash Redis (Rate Limiting)

1. Go to console.upstash.com → sign up (free)
2. Click **Create Database**
   - Name: `eclat-test`
   - Type: **Regional**
   - Region: **ap-southeast-1** (Singapore)
   - Click **Create**
3. From the database dashboard, copy:
   - **REST URL** (e.g. `https://xxxxxxxx.upstash.io`)
   - **REST Token** (long string starting with `AX...`)

---

#### 8D — Generate NextAuth Secret

Run this in your terminal:

```bash
openssl rand -base64 32
```

Save the output — this is your `NEXTAUTH_SECRET`. Keep it secret. Never commit it to git.

---

### Step 9: Run Database Migrations

Since Neon is publicly accessible (unlike RDS), you can run migrations directly from your laptop — no VPN or tunnel needed.

Add the Neon connection string to your local `.env.local`:

```bash
# In apps/eclat/.env.local — add this line:
DATABASE_URL="postgresql://YOUR_NEON_CONNECTION_STRING"
```

Run migrations from the eclat app directory:

```bash
cd /path/to/my-saas-factory/apps/eclat

pnpm prisma migrate deploy
```

You should see each migration applied successfully.

> If you get an error saying no migrations exist, run this instead to create the initial migration:
> ```bash
> pnpm prisma migrate dev --name init
> ```
> Then commit the generated `prisma/migrations/` folder to git — it must be in the repo for production to work.

---

### Step 10: Build and Push the Docker Image to ECR

This packages your Next.js app into a Docker image and uploads it to AWS.

**Log Docker into your ECR registry:**

```bash
# Replace 524419234223 with your account ID
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin \
  524419234223.dkr.ecr.ap-southeast-1.amazonaws.com
```

You should see: `Login Succeeded`

**Build the Docker image** (run from the `apps/eclat` directory):

```bash
cd /path/to/my-saas-factory/apps/eclat

docker build \
  --build-arg SKIP_ENV_VALIDATION=1 \
  -t eclat-test \
  -f Dockerfile .
```

This takes 3–5 minutes on first build (downloads Node.js, installs dependencies, builds Next.js). Subsequent builds are faster due to Docker layer caching.

**Tag and push to ECR:**

```bash
# Replace 524419234223 with your account ID
docker tag eclat-test:latest \
  524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-test:latest

docker push \
  524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-test:latest
```

You should see the layers uploading. When it finishes, the image is in ECR.

---

### Step 11: Second Terraform Apply (Enable App Runner)

Now that a real image is in ECR, enable App Runner.

Open `infrastructure/terraform/environments/test.tfvars` and change **two lines**:

```hcl
# Change from:
create_app_runner_service = false
ecr_image_uri = "public.ecr.aws/docker/library/node:20-alpine"

# Change to:
create_app_runner_service = true
ecr_image_uri = "524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-test:latest"
```

Apply:

```bash
cd infrastructure/terraform
terraform apply -var-file=environments/test.tfvars
```

Type `yes`. This creates the App Runner service pointing at your real image. Takes 3–5 minutes.

When it finishes, save these outputs — you need them in the next step:

```bash
terraform output app_runner_service_url
terraform output app_runner_service_arn
```

---

### Step 12: Set Environment Variables in App Runner

In the test tier, secrets are set directly in App Runner (not Secrets Manager — that is for production).

1. Go to **AWS Console** → search **App Runner** → open `eclat-test`
2. Click **Configuration** → **Edit**
3. Scroll to **Environment variables** → add the following:

| Variable | Value | Where to get it |
|---|---|---|
| `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` | Step 8D |
| `NEXTAUTH_URL` | `https://YOUR_APP_RUNNER_URL` | Step 11 terraform output |
| `GOOGLE_CLIENT_ID` | `YOUR_CLIENT_ID.apps.googleusercontent.com` | Step 8A |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-YOUR_SECRET` | Step 8A |
| `RESEND_API_KEY` | `re_YOUR_KEY` | Step 8B |
| `EMAIL_FROM` | `onboarding@resend.dev` | Use this for testing — no domain verification needed |
| `UPSTASH_REDIS_REST_URL` | `https://...upstash.io` | Step 8C |
| `UPSTASH_REDIS_REST_TOKEN` | `AX...` | Step 8C |

> **Do not add `DATABASE_URL`** — Terraform already injects it automatically from your `neon_database_url` in `test.tfvars`.

4. Click **Save and deploy** — App Runner restarts with the new variables. Takes 2–3 minutes.

---

### Step 13: Update Google OAuth Redirect URIs

Now that App Runner is live, go back to Google Cloud Console and add your real App Runner URL.

Google Cloud Console → **APIs & Services** → **Credentials** → click your OAuth client → **Edit**:

**Authorized JavaScript origins** — should have both:
```
http://localhost:3000
https://YOUR_APP_RUNNER_URL
```

**Authorized redirect URIs** — should have both:
```
http://localhost:3000/api/auth/callback/google
https://YOUR_APP_RUNNER_URL/api/auth/callback/google
```

Replace `YOUR_APP_RUNNER_URL` with the exact URL from `terraform output app_runner_service_url` (e.g. `https://xxxxxxxxxx.ap-southeast-1.awsapprunner.com`).

Click **Save**.

---

### Step 14: Verify the App Is Working

```bash
BASE_URL="https://YOUR_APP_RUNNER_URL"

# Health check — must return {"status":"ok"}
curl "$BASE_URL/api/health"

# Homepage — must return 200
curl -o /dev/null -s -w "%{http_code}" "$BASE_URL/"

# Protected route without auth — must return 401, not 404 or 500
curl -o /dev/null -s -w "%{http_code}" "$BASE_URL/api/profile"

# Admin route without auth — must return 401
curl -o /dev/null -s -w "%{http_code}" "$BASE_URL/api/admin/dashboard"
```

Then open the URL in a browser and test manually:

- [ ] Homepage loads without error
- [ ] `/login` shows the login page
- [ ] `/signup` shows the signup page
- [ ] Create an account with email + password — welcome email arrives in your inbox
- [ ] Sign in with Google — redirects back to the app
- [ ] Check the Neon dashboard — confirm user rows appear in the database

**If something is wrong, view logs:**

```bash
aws logs tail /aws/apprunner/eclat-test/application \
  --follow \
  --region ap-southeast-1
```

---

### Step 15: Shut Down When Not Testing (Save Money)

Run this when you are done for the day:

```bash
cd infrastructure/terraform
terraform destroy -var-file=environments/test.tfvars
```

Type `yes`. This tears down everything. Your Terraform state is saved in S3 so you can bring it back up any time with `terraform apply`.

> The S3 state bucket and DynamoDB lock table are NOT destroyed — they need to persist so Terraform can remember what it created.

---

## Part 2 — External API Keys

All services below have free test/sandbox modes. The ones under **Required for Testing** must be set up before the app works. The rest can be added as you build each feature.

---

### Required for Testing (Already Covered in Part 1)

| # | Service | Purpose | Notes |
|---|---------|---------|-------|
| 1 | Google OAuth | Sign in with Google | Set up in Step 8A |
| 2 | Resend | Send emails (welcome, match alerts) | Set up in Step 8B — use `onboarding@resend.dev` for testing |
| 3 | Upstash Redis | Rate limiting (brute-force protection) | Set up in Step 8C |
| 4 | AWS KMS + S3 | Encrypt messages and KYC documents, store profile photos | Auto-created by Terraform |

---

### Required for Payment Testing

| # | Service | Purpose | Cost |
|---|---------|---------|------|
| 5 | Stripe | International subscriptions (cards) | Free test mode |
| 6 | Razorpay | India subscriptions (UPI, net banking, cards) | Free test mode |

**Stripe setup:**

1. Sign up at dashboard.stripe.com
2. Make sure you are in **Test mode** (toggle top-right)
3. Go to **Developers** → **API Keys** → copy:
   - Secret key: `sk_test_...`
   - Publishable key: `pk_test_...`
4. Go to **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://YOUR_APP_RUNNER_URL/api/webhooks/stripe`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy the **Signing secret**: `whsec_...`
5. Add to App Runner environment variables:
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`

**Razorpay setup:**

1. Sign up at dashboard.razorpay.com
2. Go to **Settings** → **API Keys** → **Generate Test Key**
3. Copy the Key ID (`rzp_test_...`) and Key Secret
4. Add to App Runner environment variables:
   - `RAZORPAY_KEY_ID` = `rzp_test_...`
   - `RAZORPAY_KEY_SECRET` = your key secret
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` = `rzp_test_...`

---

### Required for Chat and Video

| # | Service | Purpose | Cost |
|---|---------|---------|------|
| 7 | Pusher | Real-time messaging between matched users | Free up to 200k messages/day |
| 8 | Daily.co | Encrypted video calls for virtual dates | Free up to 2000 mins/month |

**Pusher setup:**

1. Sign up at pusher.com
2. **Create App**:
   - Name: `eclat-test`
   - Cluster: **ap2** (Singapore — closest to India)
   - Click **Create App**
3. Go to **App Keys** tab and copy: App ID, Key, Secret, Cluster
4. Add to App Runner environment variables:
   - `PUSHER_APP_ID` = your App ID
   - `PUSHER_KEY` = your Key
   - `PUSHER_SECRET` = your Secret
   - `PUSHER_CLUSTER` = `ap2`
   - `NEXT_PUBLIC_PUSHER_KEY` = your Key (same as above — safe for client)
   - `NEXT_PUBLIC_PUSHER_CLUSTER` = `ap2`

**Daily.co setup:**

1. Sign up at daily.co
2. Go to **Developers** → **API Keys** → **Create API Key**
3. Copy the key
4. Add to App Runner environment variables:
   - `DAILY_API_KEY` = your key

---

### Optional (Recommended Before Launch)

| # | Service | Purpose |
|---|---------|---------|
| 9 | Sentry | Error tracking with stack traces and user context |

**Sentry setup:**

1. Sign up at sentry.io
2. Create a new project → select **Next.js**
3. Copy the **DSN** (looks like `https://xxx@o0.ingest.sentry.io/0`)
4. Add to App Runner environment variables:
   - `NEXT_PUBLIC_SENTRY_DSN` = your DSN

---

### Complete List of App Runner Environment Variables

After setting up all services, your App Runner environment variables should include:

```
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RESEND_API_KEY
EMAIL_FROM
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
NEXT_PUBLIC_PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER
DAILY_API_KEY
NEXT_PUBLIC_SENTRY_DSN     (optional)
```

> `DATABASE_URL` is auto-injected by Terraform. `AWS_REGION` and `ENVIRONMENT` are also auto-injected.

---

## Part 3 — Before Launch

Complete Part 1 and Part 2 first. Then do these in order before real users sign up.

---

### 3.1 Finish Building the App

The infrastructure is complete. These features still need to be built:

| Feature | What it needs |
|---------|--------------|
| Onboarding flow | Post-signup pages: profile completion, preferences, photo upload |
| KYC upload | Document + liveness video UI, admin review queue |
| Discovery / Browse | Discovery card UI, like/pass actions (`POST /api/discover/[id]`) |
| Matches page | List of mutual matches, conversation starters |
| Messaging | Full real-time chat UI (Pusher) |
| Video calls | Daily.co room creation + call UI |
| Payments | Stripe + Razorpay checkout pages, webhook handlers, subscription gating |
| Admin dashboard | User management, KYC verification review, manual curation |
| Settings | Account settings, privacy controls, notification preferences |
| Account deletion UI | Wired to the existing deletion Lambda |

---

### 3.2 Set Up a Custom Domain

1. Buy your domain (e.g. `eclat.social`) at Namecheap, Cloudflare, or Google Domains
2. The prod Terraform config is already set up for your domain
3. When you run `terraform apply` with the prod config, it creates a Route 53 hosted zone
4. After apply, get the nameservers:
   ```bash
   terraform output nameservers
   ```
5. At your domain registrar, replace the default nameservers with the four Route 53 nameservers from the output
6. DNS propagation takes up to 48 hours but is usually 30 minutes
7. SSL certificate is automatically provisioned by Terraform via ACM — no action needed

---

### 3.3 Switch All API Keys to Production / Live Mode

| Service | Test key prefix | Live key prefix | How to switch |
|---------|----------------|-----------------|--------------|
| Stripe secret | `sk_test_` | `sk_live_` | Stripe Dashboard → toggle to Live mode → Developers → API Keys |
| Stripe publishable | `pk_test_` | `pk_live_` | Same location |
| Razorpay | `rzp_test_` | `rzp_live_` | Complete KYC in Razorpay dashboard first, then Settings → API Keys → Generate Live Key |
| Google OAuth | Same key | Same key | Just add `https://eclat.social/api/auth/callback/google` as a new authorized redirect URI |
| Resend | Same key | Same key | Verify `eclat.social` domain in Resend dashboard (they give you DNS records to add) — then change `EMAIL_FROM` to `noreply@eclat.social` |
| Upstash | Same key | Same key | No change needed |

**After switching Stripe and Razorpay to live mode**, create new production webhooks:
- Stripe: `https://eclat.social/api/webhooks/stripe`
- Razorpay: `https://eclat.social/api/webhooks/razorpay`

---

### 3.4 Complete Stripe and Razorpay Business Setup

**Stripe live mode requirements:**
1. Stripe Dashboard → **Settings** → fill in your business details
2. Connect your bank account for payouts (Settings → Payouts)
3. Set up GST under **Settings** → **Tax**
4. Create the new production webhook endpoint

**Razorpay live mode requirements:**
1. Complete KYC in the Razorpay dashboard (requires business PAN and bank account)
2. After approval (takes 1–2 business days), generate live API keys
3. Create the production webhook endpoint

---

### 3.5 Enable Production Security

These were disabled in the test tier to save cost. They are already configured in `prod.tfvars` — you just need to apply the prod config.

**WAF (Web Application Firewall)** — ~$5/mo:
- Blocks SQL injection, XSS, bot traffic, and requests from outside your target countries
- Already configured in the Terraform WAF rules (India, UAE, UK, US, SG, AU, CA)
- Enabled automatically when you apply `prod.tfvars`

**Multi-AZ RDS** — already set in `prod.tfvars` (`db_multi_az = true`):
- Creates a hot standby database in a second availability zone
- Your app survives an AWS availability zone failure without downtime

**30-day database backups** — already set in `prod.tfvars` (`db_backup_retention_days = 30`):
- Allows point-in-time recovery for any moment in the past 30 days
- Test tier uses 1-day backups to save cost

---

### 3.6 Legal and Compliance Pages

**Required by law.** Eclat stores government ID documents and dating preferences — this is GDPR Article 9 special category data and is subject to India's DPDPA.

- [ ] **Privacy Policy page** — explain what data is collected, why, and how long it is kept
- [ ] **Terms of Service page** — user agreement covering matching, payments, and conduct
- [ ] **Cookie consent banner** — required under GDPR and DPDPA; must appear before any analytics or tracking
- [ ] **Account deletion flow** — users must be able to request deletion (the Lambda function exists in the infrastructure — wire up the UI to call it)
- [ ] **Data export endpoint** — users must be able to download all data about themselves (GDPR Article 20)
- [ ] **Age gate enforcement** — users must confirm they are 18+ before creating an account; currently Google OAuth users have a hardcoded `dateOfBirth: new Date("2000-01-01")` placeholder — this must be replaced with a real DOB collection step

---

### 3.7 Set Up CI/CD (Automated Deployments)

Currently every deployment is manual (build → push → App Runner update). GitHub Actions automates this on every push.

**Step 1 — Create OIDC trust** (run once — lets GitHub Actions talk to AWS without storing credentials):

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

**Step 2 — Add secrets to GitHub:**

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Value |
|--------|-------|
| `AWS_ACCOUNT_ID` | Your 12-digit account ID |
| `ECLAT_TEST_APP_RUNNER_ARN` | App Runner ARN from `terraform output app_runner_service_arn` |
| `ECLAT_PROD_APP_RUNNER_ARN` | Prod App Runner ARN (after prod terraform apply) |

**Step 3 — Create GitHub Environments:**

In your GitHub repo → **Settings** → **Environments** → **New environment**:

- Name: `eclat-test` — no required reviewers — URL: `https://test.eclat.social`
- Name: `eclat-production` — **Required reviewer: your GitHub username** — Wait timer: 5 minutes — URL: `https://eclat.social`

The workflow files themselves still need to be created in `.github/workflows/`.

---

### 3.8 Production Terraform Apply

When everything above is ready:

```bash
cd infrastructure/terraform

# Initialize with the production backend
terraform init -backend-config=environments/prod.backend.hcl

# Preview production changes
terraform plan -var-file=environments/prod.tfvars

# Apply
terraform apply -var-file=environments/prod.tfvars
```

Production creates: RDS PostgreSQL Multi-AZ, VPC with private subnets, NAT Gateway, WAF, Secrets Manager secrets, Lambda functions for background jobs, SQS queues, EventBridge schedules, and a larger App Runner instance.

After apply, populate all secrets in AWS Secrets Manager under `/eclat/production/...`:

```bash
# Example — repeat for each secret
aws secretsmanager put-secret-value \
  --secret-id /eclat/production/nextauth-secret \
  --secret-string "YOUR_VALUE" \
  --region ap-southeast-1
```

Complete list of secrets needed under `/eclat/production/`:
```
nextauth-secret
google-client-id
google-client-secret
resend-api-key
upstash-redis-rest-url
upstash-redis-rest-token
stripe-secret-key
stripe-webhook-secret
razorpay-key-id
razorpay-key-secret
pusher-app-id
pusher-key
pusher-secret
daily-api-key
sentry-dsn              (if using Sentry)
```

---

### 3.9 Final Launch Checks

Run these manually before announcing to users:

```bash
BASE_URL="https://eclat.social"

# Health check — must return {"status":"ok"}
curl "$BASE_URL/api/health"

# Homepage — must return 200
curl -o /dev/null -s -w "%{http_code}" "$BASE_URL/"

# Protected routes — must return 401, not 404 or 500
curl -o /dev/null -s -w "%{http_code}" "$BASE_URL/api/profile"
curl -o /dev/null -s -w "%{http_code}" "$BASE_URL/api/matches"
curl -o /dev/null -s -w "%{http_code}" "$BASE_URL/api/admin/dashboard"
```

Manual test checklist:

- [ ] Sign up with email + password → welcome email arrives within 30 seconds
- [ ] Sign in with Google → session works, user created in database
- [ ] Complete onboarding → profile saved, redirected correctly
- [ ] Upload KYC document → appears in admin review queue
- [ ] Subscribe to a membership tier → Stripe/Razorpay payment completes, subscription active
- [ ] Match with another user → match notification sent
- [ ] Send a message → delivered in real time (Pusher)
- [ ] Start a video call → Daily.co room opens, audio/video works
- [ ] Request account deletion → 30-day grace period starts, confirmation email sent
- [ ] Check CloudWatch logs → no errors or warnings during the above flows
- [ ] Check CloudWatch dashboard → metrics appearing for App Runner and RDS

---

## Quick Reference

### Test Tier — Full Step Order

| Step | What | Time |
|------|------|------|
| 1 | Create AWS account | 10 min |
| 2 | Create IAM user + access keys | 5 min |
| 3 | Configure AWS CLI | 2 min |
| 4 | Set up Neon (free database) | 5 min |
| 5 | Fill in `test.tfvars` | 2 min |
| 6 | Bootstrap Terraform state (S3 + DynamoDB) | 5 min |
| 7 | First `terraform apply` — creates ECR, S3, KMS, CloudFront, DNS | 8 min |
| 8 | Get API keys: Google OAuth, Resend, Upstash, NextAuth secret | 20 min |
| 9 | Run database migrations (`pnpm prisma migrate deploy`) | 2 min |
| 10 | Build and push Docker image to ECR | 8 min |
| 11 | Second `terraform apply` — creates App Runner service | 5 min |
| 12 | Set environment variables in App Runner console | 5 min |
| 13 | Update Google OAuth redirect URIs with App Runner URL | 2 min |
| 14 | Verify the app is working | 5 min |

**Total: ~1.5 hours on first run.**

### Cost Reference

| Environment | Monthly Cost | When to Use |
|-------------|-------------|-------------|
| Local (pnpm dev) | $0 | Day-to-day development |
| Test (AWS) | ~$7–8/mo | Testing AWS integrations |
| Production | ~$150–250/mo | Real users |

> Run `terraform destroy -var-file=environments/test.tfvars` when done testing for the day.
