# Eclat — Updated Launch Plan (Apr 27 → May 19, 2026)

**New Launch Date: Monday, May 19, 2026**
**Original Launch Date: May 5** — pushed 14 days to build missing features + catch up on missed Week 2 work
**Test environment:** `https://test.eclat.social` (App Runner, ap-southeast-1)
**Production domain:** `https://eclat.social`
**AWS Account:** `524419234223`
**ECR image:** `524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-test:latest`

---

## Why the date changed

A thorough review of the codebase was done on Apr 27. The infrastructure from Week 1 is solid
(App Runner, Neon database, Terraform, CloudWatch monitoring all working). But there are five
critical features that are **not built yet** without which the app cannot function as a real
product: messaging, the daily queue (who gets shown to whom), subscription activation via Stripe
webhooks, settings (change password / delete account), and a way for you to approve new members.
None of these were in the original plan — they were discovered in the code audit.

The good news: the foundation is very strong. Auth, sign-up, sign-in, the browse/swipe UI,
the matches page, and billing page are all working. We are building on top of something solid,
not starting over.

---

## What Was Already Completed (Week 1 — Apr 12-18)

- App Runner service running at `https://test.eclat.social`
- Neon database connected and Prisma schema migrated
- CloudWatch monitoring and alarms configured
- S3 buckets and KMS encryption key provisioned
- Docker image built and pushed to ECR

---

## What Was NOT Completed from Week 2 (Apr 19-25) — Carrying Forward

The following tasks from the original Week 2 plan were NOT done and are now scheduled into the
new plan below. Do not try to go back and do them in order — just follow the new daily schedule.

- ❌ Load testing
- ❌ Fix Google OAuth sign-in (rescheduled to Apr 27)
- ❌ Fix health check test (rescheduled to Apr 27)
- ❌ CI/CD pipeline setup (rescheduled to Apr 27)
- ❌ Security headers verification (rescheduled to May 3)
- ❌ End-to-end regression testing (rescheduled to May 8)
- ❌ Internal UAT (rescheduled to May 9)

---

## What Needs to Be BUILT This Week (New Work — Not in Original Plan)

These are gaps discovered in the code review. The app cannot launch without them.

| Feature | Why it's needed | Day scheduled |
|---|---|---|
| Messaging API + UI | Users with matches cannot send or read messages | Apr 28 |
| Daily queue seeder | Browse page is empty — no one is shown to anyone | Apr 29 |
| Stripe webhook | Subscriptions never activate after payment | Apr 30 |
| Password change API + UI | Settings page is a blank stub | May 1 |
| Account deletion API + UI | Settings page is a blank stub | May 1 |
| Admin verification shortcut | No way to approve new members | May 1 |
| End-to-end test | Verify all features work together | May 2 |

---

## How to Use This Plan

Each day has:
- **What you're doing** — plain English summary of the goal
- **Why this matters** — what breaks if you skip it
- **How to do it** — exact steps. Steps marked 🤖 mean you type it into Claude Code.
  Steps marked 🖱️ mean you click in a browser/console.
- **How to know it worked** — the exact confirmation signal

**Claude Code is your coding assistant.** For every task marked 🤖, open this project in
your terminal, type `claude` to start Claude Code, and paste the exact prompt shown.
Claude will write the code for you. You then run the tests and deploy.

**Your terminal is always in:** `/Users/middwin/code/challenges/eclat-standalone`
Every command in this plan assumes you are in that directory.

---

## Week 2 — Apr 27 - May 3 — Build the Missing Features

### Mon Apr 27 (TODAY) — Fix Tests + Set Up CI/CD + Fix Google OAuth

**What you're doing:** Three quick tasks that unblock everything else.
Task 1 stops your test suite from failing. Task 2 sets up automatic deployment so every
code change you push goes live automatically. Task 3 fixes sign-in with Google.

**Why this matters:** Without the CI/CD pipeline, every code change requires 15 minutes
of manual steps to deploy. After today, you just push code and it deploys automatically.

---

#### TASK 1 — Fix the failing health check test (30 min)

**Why this exists:** Your test file expects the server to return an error (503) when the
database is down, but the real code always returns 200 so App Runner health checks pass.
The test is wrong. You need to fix the test.

🤖 **Tell Claude Code:**
```
Fix the failing tests in __tests__/api/health.test.ts

The issue is that the tests expect HTTP 503 when the database is unavailable, but the
actual code in app/api/health/route.ts always returns HTTP 200 (this is intentional, so
App Runner health checks don't fail). Update the tests so they expect:
- res.status to be 200 (not 503)
- body.status to be "ok"
- body.db to be "unavailable" when the database fails
- body.timestamp to be defined
- No error internals in the response body

Also run pnpm test:run to confirm all tests pass after the fix.
```

After Claude finishes, run this to confirm:
```bash
pnpm test:run
```
You should see: all tests passing (green checkmarks). If any test fails, paste the error
back into Claude Code and ask it to fix it.

---

#### TASK 2 — Check what's in .github/ and finish CI/CD setup (1-2 hours)

**What CI/CD means:** Right now, to get code changes onto your test server you have to
manually run Docker commands. CI/CD (Continuous Integration / Continuous Deployment) means
every time you push code to GitHub, a robot automatically runs your tests, builds the app,
and deploys it. This saves you hours every week.

**Step 1 — Check if the workflow already exists:**
```bash
ls .github/workflows/
```
If you see `deploy.yml`, the pipeline was already created. Skip to Step 3.
If the folder is empty or doesn't exist, continue to Step 2.

**Step 2 — Create the GitHub Actions IAM role (30 min):**

🖱️ Go to the AWS Console → IAM (search for it in the top bar).

**Create the OIDC trust between AWS and GitHub:**
1. Left menu → **Identity providers** → **Add provider**
2. Select **OpenID Connect**
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Click **Get thumbprint** (button appears after you enter the URL)
5. Audience: `sts.amazonaws.com`
6. Click **Add provider**

**Create the IAM role:**
1. Left menu → **Roles** → **Create role**
2. Select **Web identity**
3. Identity provider: `token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. Click **Next** → **Next** (skip permissions for now)
6. Role name: `github-actions-eclat-deploy`
7. Click **Create role**

**Add the trust policy (scope it to your repo only):**
1. Click on the role you just created
2. Click **Trust relationships** tab → **Edit trust policy**
3. Replace the entire policy with (replace `YOUR_GITHUB_USERNAME` with your actual GitHub username):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::524419234223:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/eclat-standalone:*"
        }
      }
    }
  ]
}
```
4. Click **Update policy**

**Add permissions to the role:**
1. **Permissions** tab → **Add permissions** → **Create inline policy**
2. Click **JSON** tab and paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAuth",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "ECRPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": [
        "arn:aws:ecr:ap-southeast-1:524419234223:repository/eclat-test",
        "arn:aws:ecr:ap-southeast-1:524419234223:repository/eclat-prod"
      ]
    },
    {
      "Sid": "AppRunnerDeploy",
      "Effect": "Allow",
      "Action": [
        "apprunner:StartDeployment",
        "apprunner:ListServices",
        "apprunner:DescribeService"
      ],
      "Resource": "*"
    }
  ]
}
```
3. Policy name: `github-actions-ecr-apprunner`
4. Click **Create policy**

Copy the role ARN from the role summary page — it looks like:
`arn:aws:iam::524419234223:role/github-actions-eclat-deploy`

**Step 3 — Create or verify the workflow file:**

🤖 **Tell Claude Code:**
```
Create the GitHub Actions CI/CD workflow file at .github/workflows/deploy.yml
It should:
- Trigger on every push to the main branch
- Run pnpm test:run first (fail the deploy if tests fail)
- Build a Docker image for linux/amd64 platform (IMPORTANT: must be amd64 for AWS App Runner)
- Push to ECR: 524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-test
- Use OIDC role: arn:aws:iam::524419234223:role/github-actions-eclat-deploy
- AWS region: ap-southeast-1
- After push, trigger App Runner deployment for service named eclat-test
- After deployment, wait 90 seconds then run a smoke test against https://test.eclat.social/api/health

Build args to pass (from GitHub secrets):
  NEXT_PUBLIC_PUSHER_KEY=${{ secrets.NEXT_PUBLIC_PUSHER_KEY }}
  NEXT_PUBLIC_PUSHER_CLUSTER=ap2
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}
  SKIP_ENV_VALIDATION=1
```

**Step 4 — Add GitHub secrets:**

🖱️ Go to GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets (they're build-time keys that go into the Docker image — runtime secrets stay in App Runner):

| Secret name | Where to get it |
|---|---|
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher dashboard (if you have a Pusher app; if not, use any placeholder for now) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → API keys → Publishable key (starts with `pk_test_`) |

**Step 5 — Test the pipeline:**
```bash
git add -A
git commit -m "ci: add GitHub Actions deploy pipeline and fix health test"
git push origin main
```

🖱️ Go to GitHub → your repo → **Actions** tab. Watch the run. All steps should go green.

**How to know it worked:** After about 5-8 minutes you see green checkmarks, and
`curl https://test.eclat.social/api/health` still returns `{"status":"ok",...}`.

---

#### TASK 3 — Fix Google OAuth sign-in (30 min)

**Why this matters:** "Sign in with Google" currently does nothing or shows an error.
Users expect this to work.

🖱️ **Step 1 — Verify Google credentials are set in App Runner:**
1. AWS Console → App Runner → `eclat-test` → Configuration tab → Environment variables
2. Check `GOOGLE_CLIENT_ID` ends with `.apps.googleusercontent.com`
3. Check `GOOGLE_CLIENT_SECRET` starts with `GOCSPX-`
4. Check `NEXTAUTH_URL` is exactly `https://test.eclat.social`

If any are wrong, get the correct values from Google Cloud Console:
🖱️ console.cloud.google.com → APIs & Services → Credentials → your OAuth 2.0 Client

🖱️ **Step 2 — Add test domain to Google's allowed list:**
1. Google Cloud Console → APIs & Services → Credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorised JavaScript origins**, add:
   ```
   https://test.eclat.social
   ```
4. Under **Authorised redirect URIs**, add:
   ```
   https://test.eclat.social/api/auth/callback/google
   ```
5. Click **Save**

**How to know it worked:** Go to `https://test.eclat.social/login` → click "Sign in with
Google" → Google login page appears → after signing in, you land back on the app logged in.

---

### Tue Apr 28 — Build Messaging (Most Important Feature)

**What you're doing:** Building the core messaging feature. Right now, when two users
match they can see each other in the Matches page, but clicking "Message" leads to a
completely blank page. You're building both the backend (how messages are stored in the
database) and the frontend (the chat interface).

**Why this matters:** Messaging IS the product for verified members. Without it, having
a match is pointless and users will churn immediately.

**What messaging looks like when done:**
- Two matched users can exchange text messages
- Messages show oldest first (like WhatsApp)
- Messages refresh every 30 seconds (simple polling — no need for realtime yet)
- Each message shows who sent it and at what time
- Send button submits the message and clears the input

---

#### TASK 1 — Build the message send/read API (2-3 hours)

🤖 **Tell Claude Code:**
```
Build a messages API for the eclat app. I need two things:

1. Create app/api/messages/route.ts with:
   - GET ?conversationId=xxx — fetch all messages in a conversation (oldest first)
     - Must verify the current user is part of the conversation's match
     - Return array of { id, content, senderId, senderName, createdAt, isMe }
     where isMe is true if senderId === current user's id
   - POST — send a message { conversationId, content }
     - Validate content is 1-2000 characters
     - Must verify the current user is part of the conversation's match
     - Create a Message record in the database (use contentEnc field, store the content
       as-is for now — we will add encryption later)
     - Return the created message

2. The Prisma schema has: Message (id, conversationId, senderId, contentEnc, status, createdAt)
   Conversation has a match relation. Match has user1Id and user2Id.
   Use db from @/lib/db, auth from @/lib/auth, NextResponse from next/server, z from zod.

Make sure the API:
- Returns 401 if not logged in
- Returns 403 if user is not part of the conversation
- Returns 400 if content is invalid
- Logs errors but doesn't expose internal error details to the client
```

After Claude writes the code, test it:
```bash
pnpm dev
```
Open a new terminal tab and test (you'll need to log in first and get a conversationId from the database):
```bash
# Get a conversationId from Neon SQL Editor:
# SELECT id FROM "Conversation" LIMIT 5;
curl -b cookies.txt http://localhost:3000/api/messages?conversationId=YOUR_ID
```

---

#### TASK 2 — Build the message conversation UI (2-3 hours)

🤖 **Tell Claude Code:**
```
Build the conversation/messaging UI for app/(dashboard)/messages/[conversationId]/page.tsx

The page currently exists but is completely empty. Build a full chat interface:

1. On page load, fetch messages from /api/messages?conversationId=[id]
2. Show messages in a scrollable list, oldest at top, newest at bottom
3. Each message should show:
   - The message text
   - Who sent it (show "You" for the current user's messages, the other person's name otherwise)
   - The time (format: "2:30 PM")
   - My messages on the RIGHT side with a gold/amber background
   - Their messages on the LEFT side with a dark gray background
4. At the bottom: a text input and Send button
5. Pressing Send or hitting Enter:
   - POST to /api/messages with { conversationId, content }
   - On success: add the new message to the list and clear the input
   - On error: show a small red error message
6. Auto-refresh messages every 30 seconds (simple polling)
7. Auto-scroll to the bottom when new messages arrive

For the header, show the other person's name (you need to fetch the conversation details
to get who the other person is — use the match's user1/user2 relations and the current
user's session to determine which one is "the other person").

Use the existing dark theme (background #0a0a0a, text white, gold accent #D4AF37).
Use TypeScript. Mark the page as a client component ("use client") since it needs
state and polling.

Also add a "← Back to Messages" link at the top that goes to /messages.
```

**How to know it worked:**
1. Run `pnpm dev`
2. Go to `http://localhost:3000` and log in
3. Navigate to `/messages` — if you have a match with a conversation, click it
4. You should see the chat interface
5. Type a message and click Send — it should appear in the list
6. Wait 30 seconds — if the other user sent something, it appears

---

#### TASK 3 — Commit and deploy

```bash
git add -A
git commit -m "feat: add messaging API and conversation UI"
git push origin main
```

Watch the GitHub Actions pipeline. When it goes green, test messaging on `https://test.eclat.social`.

---

### Wed Apr 29 — Build the Daily Queue (Who Gets Shown to Whom)

**What you're doing:** Right now, the Browse page (`/browse`) is empty for all users
because no one is putting candidates into users' daily queues. The queue needs to be
populated — for each verified user, you need to create a list of other verified users
they should see today. You're building both the logic to create queues and a simple
admin endpoint to trigger it.

**Why this matters:** Without the queue, no one can browse, no one can match, the entire
discovery feature is non-functional.

**How it works:** The database has a `DailyQueue` table. Each row says "User A should
see User B today." When User A opens Browse, the app reads their rows from DailyQueue.
When they swipe, the row gets updated with "INTERESTED" or "PASSED."

---

#### TASK 1 — Build the queue generation function (1-2 hours)

🤖 **Tell Claude Code:**
```
Build a daily queue generation system for the eclat app.

The DailyQueue model in Prisma schema has: userId, candidateId, action (UNSEEN/INTERESTED/PASSED/EXPIRED), date, actedAt.

Create a function in lib/queue/generate-daily-queue.ts that:
1. Takes no arguments
2. Finds all users where: verificationStatus = 'VERIFIED' AND deletedAt IS NULL AND profile.isVisible = true
3. For each verified user (call them "user A"):
   a. Find candidates who are also VERIFIED, isVisible, deletedAt IS NULL, and NOT user A
   b. Exclude candidates that user A has already seen in the last 30 days
      (check DailyQueue where userId = userA.id AND candidateId = candidate.id AND date >= 30 days ago)
   c. Also exclude candidates that user A has already matched with
      (check Match table where (user1Id = userA OR user2Id = userA) AND (user1Id = candidate OR user2Id = candidate))
   d. Shuffle the remaining candidates randomly
   e. Take the first N candidates based on their tier:
      - membershipTier = null or 'NONE': 3 candidates
      - membershipTier = 'SELECT': 3 candidates
      - membershipTier = 'RESERVE': 15 candidates
      - membershipTier = 'NOIR': 50 candidates
   f. Create DailyQueue rows for today (use new Date() with time set to midnight UTC)
      with action = 'UNSEEN'
   g. Skip if the user already has rows for today (don't double-create)
4. Return a summary: { usersProcessed, queuesCreated }

Also create an API endpoint at app/api/admin/generate-queue/route.ts:
- POST only
- Protected by an admin secret header: X-Admin-Key must match process.env.ADMIN_SECRET_KEY
  (this is not a user-facing endpoint — it's for you to trigger manually or via a cron job)
- Call the generateDailyQueue function
- Return the summary

Also update the /api/discover GET endpoint to make sure it's fetching today's queue correctly
(it should filter by date = today and action = 'UNSEEN', ordered by createdAt).
```

**Step 2 — Set ADMIN_SECRET_KEY in App Runner:**

1. Generate a secret key in your terminal:
   ```bash
   openssl rand -hex 32
   ```
   Copy the output — it'll look like: `a3f9b2c1d4e5f6...`

2. 🖱️ AWS Console → App Runner → `eclat-test` → Configuration → Environment variables
3. Add: `ADMIN_SECRET_KEY` = the value you just generated
4. Save and let App Runner restart

**Step 3 — Add ADMIN_SECRET_KEY to your local .env.local:**
```bash
# Open .env.local in your code editor and add:
ADMIN_SECRET_KEY=the-same-value-you-added-to-app-runner
```

**Step 4 — Seed some verified users in the test database for testing:**

🖱️ Go to neon.tech → your test project → SQL Editor, run:
```sql
-- First, see what users exist
SELECT id, email, name, "verificationStatus" FROM "User" ORDER BY "createdAt" DESC LIMIT 10;

-- Verify your two test users (replace the emails with your actual test emails)
UPDATE "User"
SET "verificationStatus" = 'VERIFIED'
WHERE email IN ('your-account-a@example.com', 'your-account-b@example.com');

-- Create profile records if they don't have one (should already exist from signup)
-- Check profiles:
SELECT u.email, p.bio, p."isVisible" FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u.id;

-- Make profiles visible
UPDATE "Profile"
SET "isVisible" = true
WHERE "userId" IN (
  SELECT id FROM "User" WHERE "verificationStatus" = 'VERIFIED'
);
```

**Step 5 — Generate the queue:**
```bash
# After deploying, trigger queue generation for your test environment
curl -X POST https://test.eclat.social/api/admin/generate-queue \
  -H "X-Admin-Key: YOUR_ADMIN_SECRET_KEY"
```

You should get back: `{"usersProcessed":2,"queuesCreated":2}` (or similar numbers)

**Step 6 — Verify the queue was created:**
🖱️ Neon SQL Editor:
```sql
SELECT dq.*, u.email as "candidateEmail"
FROM "DailyQueue" dq
JOIN "User" u ON u.id = dq."candidateId"
ORDER BY dq."createdAt" DESC
LIMIT 10;
```
You should see rows for today.

**Step 7 — Commit and deploy:**
```bash
git add -A
git commit -m "feat: add daily queue generation and admin endpoint"
git push origin main
```

**How to know it worked:**
Log in as your test user → go to Browse → you should see profile cards of other users.
Click "Interested" on one → if the other user also clicks "Interested" on you → you'll see a match.

---

### Thu Apr 30 — Make Subscriptions Work (Stripe Webhook)

**What you're doing:** Right now, if someone clicks "Subscribe to SELECT" they're taken
to a Stripe payment page. They pay. But nothing happens — the app never finds out that
the payment succeeded, so the user's account stays on the free tier. You're fixing this
by building a webhook: an endpoint Stripe calls after a successful payment to tell your
app "hey, this person just paid."

**Why this matters:** Revenue. Without this, users pay but get nothing.

---

#### TASK 1 — Build the Stripe webhook endpoint (2 hours)

🤖 **Tell Claude Code:**
```
Build a Stripe webhook handler at app/api/webhooks/stripe/route.ts

What it needs to do:
1. Accept POST requests from Stripe
2. Verify the Stripe webhook signature using process.env.STRIPE_WEBHOOK_SECRET
   (use stripe.webhooks.constructEvent — if signature is invalid, return 400)
3. Handle these Stripe events:
   - checkout.session.completed: A user completed the checkout
     - Get the session from Stripe to get metadata (userId, tier) that we'll attach
     - Upsert a Subscription record in the database
     - Update the User's membershipTier field
   - customer.subscription.updated: Subscription changed (upgraded, downgraded, renewed)
     - Update the Subscription record's status and period dates
     - Update the User's membershipTier based on the new plan
   - customer.subscription.deleted: User canceled or payment failed
     - Set Subscription status to 'CANCELED'
     - Set User's membershipTier back to null
4. Return { received: true } with 200 on success
5. IMPORTANT: Do NOT use bodyParser — Stripe needs the raw request body to verify signatures.
   Use `req.text()` to get the raw body.

For mapping Stripe price IDs to tiers, read from env vars:
- process.env.STRIPE_PRICE_SELECT_MONTHLY → 'SELECT'
- process.env.STRIPE_PRICE_RESERVE_MONTHLY → 'RESERVE'
- process.env.STRIPE_PRICE_NOIR_MONTHLY → 'NOIR'

Also update app/api/billing/checkout/route.ts to attach metadata to the Stripe session:
  metadata: { userId: session.user.id, tier: tier }
This metadata is how you know which user paid when the webhook fires.

Use the stripe package (already in package.json), db from @/lib/db, auth is NOT needed
(webhooks come from Stripe, not from users).
```

#### TASK 2 — Set up Stripe webhook in the Stripe dashboard (20 min)

🖱️ Go to stripe.com → Developers → Webhooks → Add endpoint

1. Endpoint URL: `https://test.eclat.social/api/webhooks/stripe`
2. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Click **Add endpoint**
4. Click on the endpoint you just created → click **Reveal** under Signing secret
5. Copy the signing secret (starts with `whsec_`)

🖱️ AWS Console → App Runner → `eclat-test` → Configuration → Environment variables
Add: `STRIPE_WEBHOOK_SECRET` = the `whsec_` value you just copied

Also make sure these price ID env vars are set in App Runner (get them from Stripe → Products):
- `STRIPE_PRICE_SELECT_MONTHLY`
- `STRIPE_PRICE_RESERVE_MONTHLY`
- `STRIPE_PRICE_NOIR_MONTHLY`

#### TASK 3 — Test the subscription flow

1. Log in at `https://test.eclat.social` as a test user
2. Go to Billing page → click Subscribe on SELECT tier
3. Complete payment using Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. You should be redirected back to the billing page
5. Wait 30 seconds, refresh — the user's tier should show as SELECT

🖱️ Check in Neon SQL Editor:
```sql
SELECT email, "membershipTier" FROM "User" WHERE email = 'your-test@email.com';
```
Should show `membershipTier = 'SELECT'`.

#### TASK 4 — Commit and deploy
```bash
git add -A
git commit -m "feat: add Stripe webhook handler and subscription activation"
git push origin main
```

---

### Fri May 1 — Settings + Admin Verification Shortcut

**What you're doing:** Three things today:
1. Building the settings page (change password and delete account)
2. Creating a simple way for you (the app owner) to verify new member applications
3. Making sure the admin queue endpoint is secured

**Why settings matters:** Users will want to change their password and may want to delete
their account. Both are required by app store guidelines and privacy laws.

**Why admin verification matters:** Every new user signs up in "PENDING" status — they
can't do anything until you approve them. Without a way to verify users, no one can ever
use the app.

---

#### TASK 1 — Build settings API endpoints (1.5 hours)

🤖 **Tell Claude Code:**
```
Implement the two settings API endpoints that are currently stubs:

1. app/api/settings/password/route.ts — POST — Change password
   - Requires login (auth check)
   - Request body: { currentPassword, newPassword }
   - Validate: currentPassword and newPassword both present
   - Validate: newPassword is at least 8 characters, has uppercase, number, and special char
   - Fetch user from DB, verify currentPassword against their passwordHash using bcrypt.compare
   - If wrong: return 400 with "Current password is incorrect"
   - If correct: hash newPassword with bcrypt cost 12, update User.passwordHash
   - Audit log the password change (action: "password_changed")
   - Return 200 { message: "Password updated" }

2. app/api/settings/delete/route.ts — POST — Delete account
   - Requires login (auth check)
   - Request body: { password, confirmation } where confirmation must be the string "DELETE"
   - Verify password against passwordHash
   - If both are valid: set User.deletedAt = new Date() (soft delete, don't actually delete the row)
   - Also set Profile.isVisible = false
   - Audit log the deletion (action: "account_deleted")
   - Return 200 { message: "Account deleted" }
   - Note: Users with OAuth (Google login) don't have a passwordHash — for them, only require
     confirmation = "DELETE" (skip password check if passwordHash is null)
```

#### TASK 2 — Build the settings UI (1.5 hours)

🤖 **Tell Claude Code:**
```
Build the settings page UI. The page is at app/(dashboard)/settings/ and there's a
settings-client.tsx component there that is currently empty/stubbed.

Build a settings page with two sections:

Section 1 — Change Password
- Fields: "Current password" (text input, type=password), "New password" (type=password),
  "Confirm new password" (type=password)
- Validate that new password matches confirm password before submitting
- Show password strength indicator (same 4 criteria as the signup page)
- Submit button: POST to /api/settings/password
- Show success message on success, error message on failure
- Note: If the user signed up with Google (no password set), show a message saying
  "Your account uses Google sign-in. Password change is not available."

Section 2 — Delete Account
- A danger zone section with a red/warning border
- Text explaining: "This permanently deactivates your account. Your data is retained for
  compliance purposes but your profile will be hidden and you will not be able to log in."
- A text input asking the user to type "DELETE" to confirm
- A red "Delete Account" button
- Submit button: POST to /api/settings/delete
- On success: sign the user out and redirect to the homepage

Use the existing dark theme (background #0a0a0a, text white, danger color red).
```

#### TASK 3 — Create the admin member verification endpoint (1 hour)

🤖 **Tell Claude Code:**
```
Create an admin API endpoint to manage member verification at app/api/admin/verify-member/route.ts

POST — Verify or reject a member application
- Protected by X-Admin-Key header matching ADMIN_SECRET_KEY env var
- Request body: { userId, action } where action is 'APPROVE' or 'REJECT'
- If APPROVE: set User.verificationStatus = 'VERIFIED'
- If REJECT: set User.verificationStatus = 'REJECTED'
- Audit log the action
- Return { success: true, userId, action }

GET — List pending applications
- Protected by X-Admin-Key header
- Returns all users where verificationStatus = 'PENDING'
- Include: id, email, name, createdAt, and their profile bio/profession/location
- Order by createdAt asc (oldest first)
```

**How to use the admin endpoint (this is how you approve new members):**

After deploying, you can check for pending members and approve them:
```bash
# See who's waiting for verification
curl https://test.eclat.social/api/admin/verify-member \
  -H "X-Admin-Key: YOUR_ADMIN_SECRET_KEY"

# Approve a user (replace USER_ID with their actual id from the list above)
curl -X POST https://test.eclat.social/api/admin/verify-member \
  -H "X-Admin-Key: YOUR_ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","action":"APPROVE"}'
```

Save these commands somewhere — this is how you'll approve members at launch.

#### TASK 4 — Commit and deploy
```bash
git add -A
git commit -m "feat: settings (change password, delete account) and admin verification endpoint"
git push origin main
```

---

### Sat May 2 — Full End-to-End Test

**What you're doing:** Testing the entire app from a new user's perspective, documenting
what works and what still needs fixing. This is a structured test day — not a coding day.

**Why this matters:** You need to know what's broken BEFORE production setup. Bugs found
now take 5 minutes to fix. Bugs found after production launch cause user churn.

---

#### Before you start — generate a new daily queue
```bash
curl -X POST https://test.eclat.social/api/admin/generate-queue \
  -H "X-Admin-Key: YOUR_ADMIN_SECRET_KEY"
```

#### Test Flow 1 — New user signs up

| Step | What to do | What you should see |
|---|---|---|
| 1 | Open an incognito window, go to `https://test.eclat.social/signup` | Sign-up form loads |
| 2 | Fill in name, email, date of birth, password → click Sign Up | "Application submitted" confirmation page |
| 3 | Check Neon SQL: `SELECT email, "verificationStatus" FROM "User" ORDER BY "createdAt" DESC LIMIT 3` | New user exists with status PENDING |
| 4 | Try to go to `/browse` | Should redirect back to dashboard showing "Application under review" |

#### Test Flow 2 — Admin approves the new user

```bash
# Get the new user's ID
# (run this in Neon SQL Editor)
# SELECT id, email FROM "User" ORDER BY "createdAt" DESC LIMIT 3;

curl -X POST https://test.eclat.social/api/admin/verify-member \
  -H "X-Admin-Key: YOUR_ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"NEW_USER_ID","action":"APPROVE"}'
```

After approving, the user needs to log out and back in for the session to refresh.

#### Test Flow 3 — Verified user browses candidates

| Step | What to do | What you should see |
|---|---|---|
| 1 | Generate queue (curl command above) | Returns usersProcessed > 0 |
| 2 | Log in as the newly verified user | Dashboard shows stats cards (not "under review" banner) |
| 3 | Click Browse | Profile cards of other users appear |
| 4 | Click "Interested" on someone | Card disappears, next card shown |
| 5 | Check Neon: `SELECT * FROM "DailyQueue" ORDER BY "actedAt" DESC LIMIT 5` | Action recorded |

#### Test Flow 4 — Two users match and message

This requires two verified users who have both marked each other as INTERESTED.
Use your two test accounts (Account A and Account B).

You can manually create a match in Neon:
```sql
-- First get both user IDs
SELECT id, email FROM "User" WHERE "verificationStatus" = 'VERIFIED';

-- Create a match between them (replace USER1_ID and USER2_ID)
INSERT INTO "Match" (id, "user1Id", "user2Id", status, "matchedAt", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'USER1_ID', 'USER2_ID', 'ACTIVE', NOW(), NOW(), NOW());

-- Create a conversation for this match
INSERT INTO "Conversation" (id, "matchId", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), (SELECT id FROM "Match" ORDER BY "createdAt" DESC LIMIT 1), NOW(), NOW());
```

Now log in as User 1, go to Matches → click Message → you should see the conversation UI.
Type a message → click Send → it should appear in the chat.
Log in as User 2, go to Messages → find the conversation → you should see User 1's message.

#### Test Flow 5 — Settings

| Step | What to do | What you should see |
|---|---|---|
| 1 | Go to `/dashboard/settings` | Two sections: Change Password and Delete Account |
| 2 | Enter wrong current password → click Save | "Current password is incorrect" error |
| 3 | Enter correct current password and a new valid password → click Save | "Password updated" success message |
| 4 | Log out and log back in with the NEW password | Login succeeds |

#### Test Flow 6 — Subscription

| Step | What to do | What you should see |
|---|---|---|
| 1 | Go to Billing page | Three tier cards |
| 2 | Click Subscribe on SELECT | Redirected to Stripe checkout page |
| 3 | Pay with test card `4242 4242 4242 4242`, any future date, any CVC | Redirected back to billing page |
| 4 | Wait 30 seconds, refresh | Your tier shows as SELECT |

#### Track your results

Create a file and record what passed or failed. For anything that failed, write down
the error message exactly. These are the bugs to fix tomorrow.

---

### Sun May 3 — Fix Bugs + Security Check

**What you're doing:** Fix every bug found on Saturday (the tests). Then do a quick
security headers check.

**Bug fixing process:**
1. For each failed test from Saturday, check the App Runner logs first:
   🖱️ AWS Console → App Runner → `eclat-test` → Logs → Application logs → filter for "error"
2. Read the error message
3. 🤖 Tell Claude Code: "I have this error: [paste error]. The failing test was [describe test].
   Fix the bug." Then commit and test again.

**Security check (20 min):**
```bash
# Verify security headers are present
curl -sI https://test.eclat.social/ | grep -E "strict-transport|x-frame|x-content|x-xss|referrer-policy"
```
You should see all 5 headers. If any are missing, check `infrastructure/terraform/security.tf`.

**Final commit before production week:**
```bash
git add -A
git commit -m "fix: resolve regression bugs from May 2 testing"
git push origin main
```

---

## Week 3 — May 4 - May 10 — Production Setup

**What this week is about:** Creating a completely separate, production-grade version
of the app. Think of it like this: test.eclat.social is your rehearsal space — it's
OK if things break there. eclat.social is the real stage — it needs to be rock solid.
This week you build and configure that real stage.

**Key concept:** Everything in AWS is duplicated for production. A new ECR repository,
a new App Runner service, a new database, a new set of secrets. They are completely
separate from test so a bug in test can never touch production.

---

### Mon May 4 — Create the Production AWS Environment

**What you're doing:** Using Terraform (the infrastructure code you already have) to
create all the AWS resources for production in one go.

---

#### TASK 1 — Create a new Neon production database (15 min)

**Why separate from test:** If a test migration fails, it would corrupt your production
data if they shared a database. They must be separate.

🖱️ Go to neon.tech → click **New project**
1. Name: `eclat-prod`
2. Region: **AWS / Singapore (ap-southeast-1)** or nearest available
3. Click **Create project**
4. Copy the connection string from **Connection Details** — it looks like:
   `postgresql://neondb_owner:SOMEPASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

Save this connection string — you'll need it in Task 2.

---

#### TASK 2 — Create prod.tfvars (30 min)

🤖 **Tell Claude Code:**
```
Create infrastructure/terraform/environments/prod.tfvars based on the existing
infrastructure/terraform/environments/test.tfvars file.

Make these changes for production:
- environment = "prod"
- domain_name = "eclat.social"
- hosted_zone_name = "eclat.social"
- neon_database_url = "FILL_IN_PROD_NEON_URL"  (I will fill this in manually)
- db_name = "eclat_prod"
- app_runner_cpu = "1024"
- app_runner_memory = "2048"
- app_runner_min_size = 1
- app_runner_max_size = 5
- ecr_image_uri = "524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-prod:latest"
- create_app_runner_service = true
- use_waf = true
- enable_secrets_manager = true
- use_cloudfront = true
- waf_rate_limit_per_5min = 1000
- verification_doc_retention_years = 7
- alert_email = "middwin@gmail.com"

Keep everything else the same as test.tfvars.
```

After Claude creates the file, open it in your code editor and replace `FILL_IN_PROD_NEON_URL`
with the actual Neon connection string you copied in Task 1.

---

#### TASK 3 — Create the production ECR repository (5 min)

```bash
aws ecr create-repository \
  --repository-name eclat-prod \
  --image-tag-mutability MUTABLE \
  --image-scanning-configuration scanOnPush=true \
  --region ap-southeast-1
```

---

#### TASK 4 — Provision the production infrastructure (30-45 min)

```bash
cd infrastructure/terraform
terraform apply -var-file=environments/prod.tfvars
```

When Terraform asks "Do you want to perform these actions?" — type `yes` and press Enter.

This will take 15-20 minutes. Terraform is creating:
- New App Runner service (`eclat-prod`)
- CloudFront distribution for `eclat.social`
- ACM SSL certificate for `eclat.social`
- WAF (Web Application Firewall)
- KMS encryption key
- S3 buckets
- CloudWatch monitoring

When it finishes, it prints outputs. **Write down** the App Runner URL — it looks like
`xxxxxxxxxxxx.ap-southeast-1.awsapprunner.com`. You'll need this on Wednesday.

---

### Tue May 5 — Production Database + Secrets

**What you're doing:** Running your database setup scripts on the production database
(creating all the tables), then storing all your API keys securely in AWS Secrets Manager.

---

#### TASK 1 — Run database migrations on production (20 min)

```bash
# Set the production database URL in your terminal session
# Replace this with your actual production Neon URL from yesterday
export DATABASE_URL="postgresql://neondb_owner:YOUR_PROD_PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Create all database tables in production
pnpm prisma migrate deploy
```

**How to know it worked:**
🖱️ neon.tech → `eclat-prod` project → Tables tab → you should see User, Profile, Match, etc.

Also run the seed if you want some test data in production (optional for now):
```bash
pnpm prisma db seed
```

---

#### TASK 2 — Store secrets in AWS Secrets Manager (45 min)

**What this is:** Instead of putting your API keys in plain-text environment variables
(which is fine for testing but not for production), production uses AWS Secrets Manager
which encrypts them and audits every access.

🖱️ AWS Console → search "Secrets Manager" → make sure region is ap-southeast-1

For each secret below, click **Store a new secret**:
- Secret type: **Other type of secret**
- Key/value: one key called `value`, value = the actual secret
- Secret name: use the path shown below

| Secret name (path) | Value | Where to get it |
|---|---|---|
| `/eclat/prod/nextauth-secret` | Run `openssl rand -base64 32` in terminal | Generate it fresh |
| `/eclat/prod/google-client-id` | Ends with `.apps.googleusercontent.com` | Google Cloud Console |
| `/eclat/prod/google-client-secret` | Starts with `GOCSPX-` | Google Cloud Console |
| `/eclat/prod/resend-api-key` | Starts with `re_` | resend.com dashboard |
| `/eclat/prod/stripe-secret-key` | Starts with `sk_live_` (use test key for now: `sk_test_`) | Stripe dashboard |
| `/eclat/prod/stripe-webhook-secret` | Starts with `whsec_` | Stripe → Webhooks (create prod endpoint first) |
| `/eclat/prod/upstash-redis-url` | From Upstash dashboard | upstash.com |
| `/eclat/prod/upstash-redis-token` | From Upstash dashboard | upstash.com |
| `/eclat/prod/admin-secret-key` | Run `openssl rand -hex 32` in terminal | Generate it fresh |

> **Note on Stripe:** Create a separate Stripe webhook endpoint for `https://eclat.social/api/webhooks/stripe`
> in the Stripe dashboard. Use the production webhook secret for the prod secret.

---

#### TASK 3 — Add production Google OAuth redirect URIs (10 min)

🖱️ Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client

Add under **Authorised JavaScript origins:**
```
https://eclat.social
```

Add under **Authorised redirect URIs:**
```
https://eclat.social/api/auth/callback/google
```

Click **Save**.

---

### Wed May 6 — First Production Deploy

**What you're doing:** Updating the CI/CD pipeline to also build and deploy to
production, then triggering the first production deployment.

---

#### TASK 1 — Update CI/CD for production (30 min)

🤖 **Tell Claude Code:**
```
Create a second GitHub Actions workflow file at .github/workflows/deploy-prod.yml

This workflow should:
- Trigger on: pushing a git tag that starts with 'v' (like v1.0.0), OR manual trigger
- Manual trigger should require typing "deploy-to-prod" in a confirmation field
- Run pnpm test:run first
- Build the Docker image for linux/amd64 (important for AWS)
- Push to 524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-prod
- Deploy to App Runner service named 'eclat-prod'
- Smoke test the production App Runner URL: get it from the PROD_APP_RUNNER_URL GitHub secret
- Use the same OIDC role: arn:aws:iam::524419234223:role/github-actions-eclat-deploy

Build args from GitHub secrets:
  NEXT_PUBLIC_PUSHER_KEY=${{ secrets.NEXT_PUBLIC_PUSHER_KEY }}
  NEXT_PUBLIC_PUSHER_CLUSTER=ap2
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD }}
  SKIP_ENV_VALIDATION=1
```

🖱️ Add to GitHub repo secrets (Settings → Secrets → Actions):
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD` — your live Stripe publishable key (or test key for now)
- `PROD_APP_RUNNER_URL` — the App Runner URL from terraform output on Monday

Also, update the production App Runner service environment variables:
🖱️ AWS Console → App Runner → `eclat-prod` → Configuration → Environment variables

Set these (read from Secrets Manager paths you created yesterday):
- `NEXTAUTH_URL` = `https://eclat.social`
- `NEXTAUTH_SECRET` = (from Secrets Manager: `/eclat/prod/nextauth-secret`)
- `DATABASE_URL` = (your production Neon URL)
- `GOOGLE_CLIENT_ID` = (from Secrets Manager)
- `GOOGLE_CLIENT_SECRET` = (from Secrets Manager)
- `STRIPE_SECRET_KEY` = (from Secrets Manager)
- `STRIPE_WEBHOOK_SECRET` = (from Secrets Manager)
- `RESEND_API_KEY` = (from Secrets Manager)
- `UPSTASH_REDIS_REST_URL` = (from Secrets Manager)
- `UPSTASH_REDIS_REST_TOKEN` = (from Secrets Manager)
- `ADMIN_SECRET_KEY` = (from Secrets Manager)
- `NODE_ENV` = `production`

---

#### TASK 2 — Trigger the first production deployment (15 min)

🖱️ GitHub → your repo → Actions tab → Deploy to Production workflow → Run workflow
→ Type `deploy-to-prod` → click Run workflow

Watch the pipeline. When it goes green:
```bash
# Test production App Runner directly (before DNS cutover)
curl https://YOUR_PROD_APP_RUNNER_URL.ap-southeast-1.awsapprunner.com/api/health
```
Should return: `{"status":"ok","db":"ok","timestamp":"...","environment":"production"}`

---

### Thu May 7 — DNS Setup

**What you're doing:** Pointing the domain `eclat.social` to your production servers.
This does NOT make the site live yet for the public — you're just preparing the DNS
records. The actual go-live happens on Monday May 11.

---

#### TASK 1 — Get your CloudFront domain (5 min)

```bash
cd infrastructure/terraform
terraform output -var-file=environments/prod.tfvars
```
Look for the CloudFront domain in the output — it looks like `d1a2b3c4d5e.cloudfront.net`.
Write this down.

---

#### TASK 2 — Add App Runner domain validation records (20 min)

🖱️ AWS Console → App Runner → `eclat-prod` → Custom domains tab

You should see `eclat.social` with status **Pending certificate validation**.
Note the CNAME records it shows — they look like:
```
_abc123.eclat.social → _xyz789.acm-validations.aws
```

Add these CNAME records in your DNS provider (wherever you manage eclat.social — Cloudflare, Namecheap, etc.).

Wait 10-20 minutes. Refresh the Custom domains tab — status should change to **Active**.

---

#### TASK 3 — Write down the DNS cutover plan

Write down these values (you'll enter them on Monday):
```
DNS Cutover Plan — Mon May 11

Where to make DNS changes: [your DNS provider — Cloudflare / Namecheap / Route53 / etc]
Login URL: [your DNS provider URL]

Records to add/update:
  eclat.social       → CNAME or ALIAS → d1a2b3c4d5e.cloudfront.net
  www.eclat.social   → CNAME → d1a2b3c4d5e.cloudfront.net

TTL: Lower to 60 seconds the night of May 10
     Set back to 300 after May 11 testing confirms everything works
```

---

### Fri May 8 — Full Production Regression Test

**What you're doing:** Running through every test from May 2 again, but against the
production App Runner URL (before DNS cutover, so before `eclat.social` points there).

Replace `YOUR_PROD_APP_RUNNER_URL` with your actual production App Runner URL from
the terraform output.

```bash
# Health check
curl https://YOUR_PROD_APP_RUNNER_URL.ap-southeast-1.awsapprunner.com/api/health
```
Then manually test (open in browser): login, signup, browse, messaging, billing.

Fix any production-specific bugs (usually env var mismatches) via the prod deploy workflow.

---

#### Seed some production test data

```bash
# Generate queue for production
curl -X POST https://YOUR_PROD_APP_RUNNER_URL.ap-southeast-1.awsapprunner.com/api/admin/generate-queue \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"
```

---

### Sat May 9 — Invite First Testers + Fix Issues

**What you're doing:** Inviting 3-5 real people to test the production app using the
App Runner URL (not the main domain yet). Watch for bugs in real usage.

**How to invite testers:**
1. Send them the link: `https://YOUR_PROD_APP_RUNNER_URL.ap-southeast-1.awsapprunner.com`
2. Ask them to sign up
3. After they sign up, you manually verify them:
   ```bash
   # First get their user ID
   curl https://YOUR_PROD_APP_RUNNER_URL.ap-southeast-1.awsapprunner.com/api/admin/verify-member \
     -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"

   # Then approve them
   curl -X POST https://YOUR_PROD_APP_RUNNER_URL.ap-southeast-1.awsapprunner.com/api/admin/verify-member \
     -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY" \
     -H "Content-Type: application/json" \
     -d '{"userId":"THEIR_USER_ID","action":"APPROVE"}'
   ```
4. Tell them to log out and log back in
5. Generate the queue so they see each other:
   ```bash
   curl -X POST https://YOUR_PROD_APP_RUNNER_URL.ap-southeast-1.awsapprunner.com/api/admin/generate-queue \
     -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"
   ```

**Monitor in real time while testers use the app:**
🖱️ AWS Console → CloudWatch → Dashboards → `eclat-prod`

Look for errors. For any bugs testers report, fix and deploy via the prod workflow.

---

### Sun May 10 — Pre-Launch Checklist + Lower DNS TTL

Work through every item on this checklist. Do NOT proceed to Monday if any item is unchecked.

```
## Pre-Launch Checklist — May 10

### App is working
- [ ] /api/health returns {"status":"ok","db":"ok"} on production URL
- [ ] Sign up works on production URL
- [ ] Google OAuth sign-in works on production URL
- [ ] Email/password login works on production URL
- [ ] Admin verification endpoint works (you can approve/reject users)
- [ ] Queue generation works (browse shows profiles after generating queue)
- [ ] Messaging works (two matched users can exchange messages)
- [ ] Settings works (change password and delete account)
- [ ] Subscription flow works (Stripe checkout → webhook → tier updated)

### Infrastructure
- [ ] Production App Runner service is running (green in console)
- [ ] CloudWatch alarms exist for eclat-prod
- [ ] SNS email subscription confirmed at middwin@gmail.com (you got the confirmation email and clicked the link)
- [ ] WAF is enabled (use_waf = true in prod.tfvars, terraform applied)
- [ ] ACM certificate is issued (Status: Issued in AWS Certificate Manager)

### Security
- [ ] All secrets are in Secrets Manager (not plain-text in App Runner env vars for prod)
- [ ] NEXTAUTH_SECRET is a strong random value
- [ ] TLS is working: `curl -vI https://YOUR_PROD_APP_RUNNER_URL/api/health 2>&1 | grep TLS`

### CI/CD
- [ ] Test pipeline works (last push to main resulted in green Actions run)
- [ ] Prod pipeline works (last prod deploy was successful)

### DNS ready
- [ ] CloudFront domain written down
- [ ] App Runner validation CNAME records added to DNS provider
- [ ] Custom domain status in App Runner shows "Active"
- [ ] DNS cutover plan written down (see May 7)
```

**Lower the DNS TTL tonight (do this at 10 PM):**
🖱️ Your DNS provider → find the eclat.social record → change TTL to **60 seconds** → save.
This means when you change the record tomorrow, it propagates to everyone in 1 minute instead of hours.

---

## Week 4 — May 11 - May 19 — Launch

### Mon May 11 — DNS Cutover (Go Live!)

**What you're doing:** Switching the domain `eclat.social` so it points to your
production servers. This is the moment the app becomes publicly accessible at your domain.

Do this in the morning when you're alert and can monitor for problems.

---

#### TASK 1 — Add Google OAuth for eclat.social (10 min)

🖱️ Google Cloud Console → APIs & Services → Credentials → your OAuth client

Add:
- **Authorised JavaScript origins**: `https://eclat.social`
- **Authorised redirect URIs**: `https://eclat.social/api/auth/callback/google`

Click **Save**. (You should have done this on May 5 already — double-check now.)

---

#### TASK 2 — DNS cutover (15 min)

🖱️ Your DNS provider → update the eclat.social DNS records:

| Record | Type | Value |
|---|---|---|
| `eclat.social` | CNAME or ALIAS | `d1a2b3c4d5e.cloudfront.net` (your CloudFront domain) |
| `www.eclat.social` | CNAME | `d1a2b3c4d5e.cloudfront.net` |

Click Save.

Wait 2-5 minutes. Verify DNS is pointing to your app:
```bash
dig eclat.social +short
# Should return CloudFront IPs

curl https://eclat.social/api/health
# Should return {"status":"ok","db":"ok",...}
```

If `curl` still fails after 5 minutes, the DNS change is still propagating. Try again in 5 more minutes.

---

#### TASK 3 — Smoke test on eclat.social (30 min)

Open an incognito browser and go through these in order:

```
✓ https://eclat.social → homepage loads with correct branding
✓ https://eclat.social/api/health → returns {"status":"ok","db":"ok",...}
✓ https://eclat.social/login → login page loads
✓ https://eclat.social/signup → signup page loads
✓ Sign in with Google → works correctly
✓ Sign in with email/password → works correctly
✓ Browse page → shows candidate cards (after generating queue)
✓ Messages page → loads
```

If anything fails, check the App Runner logs immediately:
🖱️ AWS Console → App Runner → `eclat-prod` → Logs → Application logs

---

#### Generate the first production queue

```bash
curl -X POST https://eclat.social/api/admin/generate-queue \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"
```

---

### Tue May 12 — Soft Launch Day

**What this means:** The app is live at eclat.social. You invite 10-20 people you
know personally to test it before the public announcement.

**Why soft launch (not full public):** Real users find bugs that testers don't.
Better to find them with 20 users than 2,000.

**Your tasks today:**
1. Keep the CloudWatch dashboard open all day
2. Invite 10-20 people via personal message
3. For each who signs up: approve them using the admin endpoint (within minutes)
4. Generate the queue after approving a batch of users
5. Be available to fix issues immediately

**Monitor this dashboard (open it now, keep it open):**
🖱️ AWS Console → CloudWatch → Dashboards → `eclat-prod`

Watch for:
- 5xx errors (should be near 0)
- p99 latency (should be under 3 seconds)
- Active instances (should be 1-3)

**Queue generation — run every morning:**
```bash
curl -X POST https://eclat.social/api/admin/generate-queue \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"
```

Add this to your morning routine during launch week.

---

### Wed May 13 - Fri May 16 — Hypercare

**What you're doing:** Actively monitoring the live app and fixing issues as they appear.
Real users reveal bugs that testing never finds.

**Daily routine:**
1. Morning: Generate the daily queue (curl command above)
2. Check CloudWatch dashboard every 2-4 hours
3. Check App Runner logs for new error patterns:
   🖱️ AWS Console → App Runner → `eclat-prod` → Logs → Application logs → filter: `error`
4. For each new bug: fix and deploy through the prod workflow

**Common issues at this stage and how to handle them:**

| Problem | Symptom | Fix |
|---|---|---|
| Database slow start | First request of the day is slow | Neon "cold start" — expected, add a scheduled warmup ping |
| 5xx spike | CloudWatch alarm fires | Check App Runner logs immediately, rollback if needed |
| User can't log in | Reports from users | Check that their email/password is correct in DB; check Google OAuth if OAuth user |
| Browse shows no one | User complains queue is empty | Run queue generation curl command |
| Subscription not activating | User paid but still on free tier | Check Stripe webhook dashboard for delivery failures |

**Rollback procedure (if a bad deploy breaks production):**

```bash
# Find the previous good image tag in ECR
aws ecr describe-images --repository-name eclat-prod --region ap-southeast-1 \
  --query 'sort_by(imageDetails,& imagePushedAt)[*].[imageTags[0],imagePushedAt]' \
  --output table

# Re-tag the previous image as latest (replace PREVIOUS_SHA with the tag you want)
MANIFEST=$(aws ecr batch-get-image \
  --repository-name eclat-prod \
  --image-ids imageTag=PREVIOUS_SHA \
  --region ap-southeast-1 \
  --query 'images[0].imageManifest' \
  --output text)

aws ecr put-image \
  --repository-name eclat-prod \
  --image-tag latest \
  --image-manifest "$MANIFEST" \
  --region ap-southeast-1

# Redeploy
PROD_ARN=$(aws apprunner list-services \
  --query "ServiceSummaryList[?ServiceName=='eclat-prod'].ServiceArn" \
  --output text --region ap-southeast-1)
aws apprunner start-deployment --service-arn "$PROD_ARN" --region ap-southeast-1
```

---

### Sat May 17 — Fix Remaining Issues

Use this day to fix any outstanding bugs from the hypercare period.

Also: raise the DNS TTL back to 300 seconds now that the launch is stable:
🖱️ Your DNS provider → eclat.social records → change TTL from 60 to 300 → save

---

### Sun May 18 — Post-Launch Review

Write a brief notes document covering:
- How many users signed up
- What broke and how you fixed it
- What was harder than expected
- What you would do differently
- Open bugs for the next sprint

---

### Mon May 19 — Public Launch Announcement

The app has been live and tested for a week. Make your public announcement today.

**Pre-announcement checklist:**
- [ ] Run queue generation one more time
- [ ] Health check passes: `curl https://eclat.social/api/health`
- [ ] CloudWatch shows all alarms in OK state
- [ ] You have a plan for approving new members who sign up today (you'll be busy)

**Tip:** Prepare a batch approval command. When you get a wave of signups, get all
pending users and approve them in a loop:
```bash
# Get all pending users
curl https://eclat.social/api/admin/verify-member \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"

# Approve each one by their ID
curl -X POST https://eclat.social/api/admin/verify-member \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","action":"APPROVE"}'
```

---

## What's NOT Being Built for Launch (Intentionally)

These features are scoped OUT for the initial launch to keep the timeline achievable.
They are planned for the first post-launch sprint (June 2026).

| Feature | Why deferred |
|---|---|
| Video calls | Complex to build correctly; text messaging is the core value |
| Events page | Marked "coming soon" — no demand signal yet |
| Profile photo upload | S3 integration adds 3-4 days of work; users can describe themselves in bio for now |
| Razorpay (India payments) | Stripe works; Razorpay can be added post-launch |
| Push/email notifications | Not critical for MVP; queue generation email can be built later |
| Admin dashboard UI | The curl commands are sufficient at low user volume |
| Realtime messaging (Pusher) | 30-second polling is good enough at launch; upgrade when users complain |
| Two-factor authentication | Not required for launch |
| Message encryption (KMS) | The infrastructure is ready; activate after confirming messaging works |

---

## Quick Reference

### Key URLs

| Service | URL |
|---|---|
| Test app | https://test.eclat.social |
| Production app | https://eclat.social |
| App Runner console | https://ap-southeast-1.console.aws.amazon.com/apprunner/home |
| CloudWatch dashboard | https://ap-southeast-1.console.aws.amazon.com/cloudwatch/home#dashboards |
| Neon test database | https://neon.tech (project: eclat) |
| Neon prod database | https://neon.tech (project: eclat-prod) |
| Stripe dashboard | https://dashboard.stripe.com |
| GitHub Actions | https://github.com/YOUR_GITHUB_USERNAME/eclat-standalone/actions |

### Key daily commands

```bash
# Run unit tests locally (do this before any commit)
pnpm test:run

# Start the app locally for development
pnpm dev

# Apply Terraform changes to test environment
cd infrastructure/terraform && terraform apply -var-file=environments/test.tfvars

# Apply Terraform changes to prod environment
cd infrastructure/terraform && terraform apply -var-file=environments/prod.tfvars

# Generate daily queue on TEST
curl -X POST https://test.eclat.social/api/admin/generate-queue \
  -H "X-Admin-Key: YOUR_TEST_ADMIN_SECRET_KEY"

# Generate daily queue on PROD
curl -X POST https://eclat.social/api/admin/generate-queue \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"

# Check pending members on PROD
curl https://eclat.social/api/admin/verify-member \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY"

# Approve a member on PROD
curl -X POST https://eclat.social/api/admin/verify-member \
  -H "X-Admin-Key: YOUR_PROD_ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","action":"APPROVE"}'

# Health check TEST
curl https://test.eclat.social/api/health

# Health check PROD
curl https://eclat.social/api/health
```

### AWS Region Reminder

**All your AWS resources are in ap-southeast-1 (Singapore).**
When you open the AWS Console, always check the region in the top-right corner and
switch to ap-southeast-1 if it shows something else.

### If Claude Code gives you an error you don't understand

Paste the exact error message back to Claude Code and say:
"I got this error when running [the command]. What does it mean and how do I fix it?"
Claude Code will explain and fix it.

---

## Day-by-Day Summary

| Date | Day | Focus | Where |
|---|---|---|---|
| Apr 27 | Mon (TODAY) | Fix tests, set up CI/CD, fix Google OAuth | Terminal + AWS Console |
| Apr 28 | Tue | Build messaging feature (API + UI) | Claude Code |
| Apr 29 | Wed | Build daily queue generation | Claude Code + Neon SQL |
| Apr 30 | Thu | Build Stripe webhook, make subscriptions work | Claude Code + Stripe |
| May 1 | Fri | Settings (change password, delete account) + admin verification | Claude Code |
| May 2 | Sat | Full end-to-end regression test | Browser + curl |
| May 3 | Sun | Fix bugs, security check | Claude Code |
| May 4 | Mon | Create production AWS environment | Terminal + AWS Console |
| May 5 | Tue | Production database + secrets | Neon + AWS Secrets Manager |
| May 6 | Wed | First production deploy | GitHub Actions |
| May 7 | Thu | DNS setup and validation | DNS provider + AWS Console |
| May 8 | Fri | Full production regression test | Browser + curl |
| May 9 | Sat | Invite first testers, fix issues | Browser + Claude Code |
| May 10 | Sun | Pre-launch checklist + lower DNS TTL | Browser + DNS provider |
| May 11 | Mon | DNS cutover — eclat.social goes live | DNS provider + Browser |
| May 12 | Tue | Soft launch: invite 20 people | Personal outreach |
| May 13-16 | Wed-Sat | Hypercare: monitor and fix | AWS Console + Claude Code |
| May 17 | Sat | Fix remaining issues | Claude Code |
| May 18 | Sun | Post-launch review | Notes |
| May 19 | Mon | **PUBLIC LAUNCH ANNOUNCEMENT** 🚀 | Social media / email |
