# Eclat

Eclat is a curated matchmaking web app — think a members-only dating service where every person is manually verified before they can browse or connect. Members sign up, upload an ID document, wait for admin approval, then get a small daily queue of introductions to swipe on. When both sides express interest, a match is created and a private conversation opens.

**Live environments:**
- Test: `https://test.eclat.social`
- Production: `https://eclat.social`

---

## Tech stack

| Layer | What we use |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 15 (AWS RDS / Neon) via Prisma |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| Payments | Stripe (international) + Razorpay (India) |
| File storage | AWS S3 (photos, ID documents) |
| Encryption | AWS KMS (messages, ID document keys, IP addresses) |
| Rate limiting | Upstash Redis |
| Real-time | Pusher |
| Video calls | Daily.co |
| Email | Resend (dev) / AWS SES (prod) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Deployment | AWS App Runner (Docker) via GitHub Actions |

---

## How the app works

1. **Sign up** — a new user provides name, email, date of birth, and gender. A verification email is sent.
2. **Submit ID** — the user uploads a government ID (passport, Aadhaar, etc.) and optionally a liveness video. The document key is encrypted with KMS before it is stored.
3. **Admin review** — an admin views the pending verification in `/admin`, approves or rejects it. Only verified members can browse.
4. **Daily queue** — each day a small set of candidate profiles is assembled for each verified member. Members see them one at a time and mark Interested or Pass.
5. **Matching** — when two members are both Interested in each other, a Match is created and a private Conversation is opened.
6. **Messaging** — matched members exchange end-to-end-like messages (stored encrypted with KMS).
7. **Subscription** — members choose a tier (SELECT / RESERVE / NOIR) and pay via Stripe or Razorpay. The Stripe/Razorpay webhook activates the subscription in the database.

### User roles

| Role | What they can do |
|---|---|
| MEMBER | Browse, match, message |
| MATCHMAKER | Curate the daily queue manually |
| ADMIN | Approve/reject verifications, manage members |

---

## Project structure

```
eclat-standalone/
├── app/                     # Next.js App Router pages and API routes
│   ├── (auth)/              # Login and signup pages (unauthenticated)
│   ├── (dashboard)/         # All member-facing pages behind login
│   │   ├── browse/          # Daily queue swipe view
│   │   ├── matches/         # List of active matches
│   │   ├── messages/        # Conversation threads
│   │   ├── profile/         # Edit profile and photos
│   │   └── events/          # Future: curated events
│   ├── admin/               # Admin panel (verification review, member management)
│   ├── api/                 # REST API route handlers
│   │   ├── auth/            # NextAuth callbacks
│   │   ├── billing/         # Stripe + Razorpay checkout and portal
│   │   ├── discover/        # Daily queue fetch and action (interested/pass)
│   │   ├── matches/         # Match list and status
│   │   ├── messages/        # Send and fetch messages
│   │   ├── profile/         # Profile CRUD and photo upload
│   │   ├── settings/        # Password change, account deletion
│   │   ├── webhooks/        # Stripe and Razorpay webhook handlers
│   │   └── health/          # Health check endpoint for App Runner
├── components/              # Shared React components
│   ├── ui/                  # shadcn/ui base components
│   └── sections/            # Page-level sections (nav, cards, etc.)
├── lib/                     # Server-side business logic
│   ├── auth.ts              # NextAuth configuration (full, server-side)
│   ├── auth.config.ts       # Minimal NextAuth config used by Edge middleware
│   ├── db.ts                # Prisma client singleton
│   ├── email.ts             # Resend email helpers
│   ├── env.ts               # Typed, validated environment variables
│   ├── queue/               # Daily queue seeding and fetching logic
│   ├── security/            # KMS encrypt/decrypt helpers
│   ├── utils.ts             # General utilities (cn, formatters)
│   └── validators/          # Zod schemas shared across API and forms
├── prisma/
│   ├── schema.prisma        # Full database schema
│   ├── migrations/          # Prisma migration history
│   └── seed.ts              # Dev seed data (creates test admin + members)
├── __tests__/               # Unit tests co-located with features
│   └── api/auth/login.test.ts
├── tests/                   # Integration tests (hit real database)
│   ├── setup.ts             # Global test setup (DB reset before each run)
│   ├── health.test.ts
│   ├── auth/                # Sign-up, sign-in, token validation
│   ├── discover.test.ts     # Queue API
│   ├── matches.test.ts
│   ├── messages.test.ts
│   └── profile.test.ts
├── infrastructure/          # Terraform (AWS: App Runner, RDS, S3, KMS, WAF)
├── middleware.ts            # Edge middleware: auth + role + verification guards
├── docker-compose.yml       # Local dev: PostgreSQL
├── docker-compose.test.yml  # Test runs: isolated PostgreSQL on port 5433
└── Dockerfile               # Production image (linux/amd64 for App Runner)
```

---

## Getting started locally

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Docker Desktop (for local Postgres)

### 1 — Clone and install

```bash
git clone <repo-url>
cd eclat-standalone
pnpm install
```

### 2 — Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the values. For a basic local run you need at minimum:

- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `DATABASE_URL` — already points to the local Docker Postgres (no change needed)
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — needed only for Google sign-in
- `RESEND_API_KEY` — use `onboarding@resend.dev` as `EMAIL_FROM` for free dev testing

Everything else (Stripe, Razorpay, Pusher, Daily.co, AWS) can be left as placeholder values to get the app running. Features that depend on them will fail gracefully or be skipped.

See `API_KEYS_GUIDE.md` for step-by-step instructions on obtaining every key.

### 3 — Start Postgres

```bash
docker compose up -d
```

### 4 — Migrate and seed the database

```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

The seed script creates:
- An admin account you can use to log in
- A handful of test member accounts in various verification states

### 5 — Run the dev server

```bash
pnpm dev
```

App is at `http://localhost:3000`.

---

## Testing

Tests are written with **Vitest** and **Testing Library**. There are two categories:

### Unit tests (`__tests__/`)

These test individual functions and API handlers in isolation, with external services mocked. They run fast and require no database.

```bash
pnpm test:run        # run once
pnpm test:watch      # re-run on file save
pnpm test:coverage   # run with coverage report (must hit 80% on branches/functions/lines)
pnpm test:ui         # open the Vitest browser UI
```

### Integration tests (`tests/`)

These hit a real PostgreSQL database. They use a separate database (`eclat_test`) so dev data is never touched. Each test file resets the relevant tables before running.

**Running integration tests locally:**

```bash
# 1. Start the isolated test database (port 5433, no persistent volume)
docker compose -f docker-compose.test.yml up -d

# 2. Run the full test suite
pnpm test:run

# 3. Tear down
docker compose -f docker-compose.test.yml down -v
```

### What is tested

| Test file | What it covers |
|---|---|
| `health.test.ts` | `/api/health` returns 200 |
| `__tests__/api/auth/login.test.ts` | Login handler — valid creds, wrong password, unknown email |
| `tests/discover.test.ts` | Queue fetch, interested/pass actions, duplicate prevention |
| `tests/matches.test.ts` | Match creation on mutual interest, match list endpoint |
| `tests/messages.test.ts` | Send message, fetch conversation, unmatched conversation blocked |
| `tests/profile.test.ts` | Profile update, photo upload, visibility toggle |

### Coverage thresholds

The project enforces **80% coverage** on branches, functions, lines, and statements. CI will fail if coverage drops below this. Run `pnpm test:coverage` to check locally before pushing.

### Mocking external services

A helper at `scripts/mock-services.ts` stubs out Pusher, Daily.co, Upstash Redis, and AWS KMS for test runs. It is loaded automatically via `tests/setup.ts`. You do not need real credentials to run tests.

---

## CI/CD

Two GitHub Actions workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy.yml` | Push to `main` | Runs tests → builds Docker image for `linux/amd64` → pushes to ECR → deploys to App Runner test environment |
| `deploy-prod.yml` | Manual (`workflow_dispatch`) | Same pipeline but targets production App Runner + requires a confirmation step |

**Tests must pass before the Docker build starts.** If any test fails, the deploy is cancelled.

The Docker image is always built for `linux/amd64`, even on Apple Silicon Macs, because App Runner runs on x86. Building locally for the wrong architecture will produce an image that crashes silently.

---

## Infrastructure

Defined in Terraform under `infrastructure/`. Key AWS resources:

- **App Runner** — runs the Docker container, auto-scales, handles TLS
- **RDS PostgreSQL** — primary database (production); Neon is used for test environment
- **S3** — two buckets: profile photos and verification documents
- **KMS** — one key used to encrypt sensitive fields before DB storage (messages, IP addresses, ID document S3 keys)
- **CloudFront + WAF** — CDN and web application firewall in front of the app
- **Secrets Manager** — stores runtime secrets referenced by App Runner
- **ECR** — private Docker image registry

See `INFRASTRUCTURE_GUIDE.md` and `AWS_Deployment_guide.md` for the full setup walkthrough.

---

## Where things stand (as of early June 2026)

The foundation is fully deployed and working:

- Auth (email + Google OAuth) is live and tested
- Sign-up with email verification works
- Admin can approve/reject verifications via `/admin`
- Browse (daily queue), matches, and messaging APIs are built
- Stripe and Razorpay billing pages are set up; webhooks activate subscriptions
- Settings page supports password change and account deletion
- CI/CD deploys automatically on every push to `main`
- Test environment is live at `https://test.eclat.social`
- Production environment is provisioned at `https://eclat.social`

**What is not yet done / known gaps:**

- Load testing has not been run — no benchmarks for how many concurrent users the current App Runner config handles
- End-to-end regression testing (full Playwright/Cypress flow) was planned but not built
- The events feature (`/events`) is scaffolded but has no backend
- Real-time messaging via Pusher is wired on the server side but the client-side subscription component needs to be connected

---

## Key reference documents

| File | What it covers |
|---|---|
| `API_KEYS_GUIDE.md` | Step-by-step instructions for every third-party API key |
| `AWS_Deployment_guide.md` | Full AWS setup walkthrough (ECR, App Runner, RDS, etc.) |
| `INFRASTRUCTURE_GUIDE.md` | Terraform usage and environment setup |
| `LAUNCH_PLAN.md` | Full day-by-day launch timeline and task history |
| `PHASE_11_CHECKLIST.md` | Final pre-launch checklist |
| `.env.local.example` | Template for all environment variables |
| `.env.production.example` | Production-specific environment variable reference |
