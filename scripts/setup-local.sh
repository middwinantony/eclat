#!/bin/bash
# =============================================================================
# setup-local.sh
# One-command local development setup for eclat.
#
# USAGE:
#   cd apps/eclat
#   chmod +x scripts/setup-local.sh
#   ./scripts/setup-local.sh
#
# What this does:
#   1. Checks prerequisites (Docker, pnpm)
#   2. Starts PostgreSQL via Docker Compose
#   3. Waits for Postgres to be ready
#   4. Checks .env.local exists (copies from example if not)
#   5. Generates Prisma client
#   6. Runs database migrations
#   7. Seeds the database with test data
#   8. Prints the dev server command
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ─── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

info()    { echo -e "${BLUE}[eclat]${NC} $1"; }
success() { echo -e "${GREEN}[eclat]${NC} $1"; }
warn()    { echo -e "${YELLOW}[eclat]${NC} $1"; }
error()   { echo -e "${RED}[eclat]${NC} $1"; exit 1; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  eclat — Local Development Setup     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# ─── Step 1: Check prerequisites ─────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  error "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
fi

if ! docker info &>/dev/null; then
  error "Docker is not running. Start Docker Desktop and try again."
fi

if ! command -v pnpm &>/dev/null; then
  error "pnpm not found. Install with: npm install -g pnpm"
fi

success "Prerequisites OK"

# ─── Step 2: Start PostgreSQL ─────────────────────────────────────────────────
info "Starting PostgreSQL via Docker Compose..."

cd "${APP_DIR}"
docker compose up -d postgres

# ─── Step 3: Wait for Postgres to be ready ───────────────────────────────────
info "Waiting for PostgreSQL to be ready..."

MAX_ATTEMPTS=30
ATTEMPT=0

until docker compose exec -T postgres pg_isready -U eclat -d eclat_dev &>/dev/null; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    error "PostgreSQL did not become ready after ${MAX_ATTEMPTS} attempts. Check: docker compose logs postgres"
  fi
  echo -n "."
  sleep 1
done

echo ""
success "PostgreSQL is ready"

# ─── Step 4: Check .env.local ────────────────────────────────────────────────
if [ ! -f "${APP_DIR}/.env.local" ]; then
  warn ".env.local not found. Copying from .env.local.example..."
  cp "${APP_DIR}/.env.local.example" "${APP_DIR}/.env.local"
  warn "ACTION REQUIRED: Open .env.local and fill in your API keys before running pnpm dev"
  warn "Minimum required: NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
  warn "MOCK_EXTERNAL_SERVICES=true is set — external APIs (Pusher, Daily.co etc) are mocked"
else
  success ".env.local exists"
fi

# Set DATABASE_URL to local docker postgres if not already set
if ! grep -q "^DATABASE_URL=postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev" "${APP_DIR}/.env.local" 2>/dev/null; then
  warn "DATABASE_URL in .env.local may not point to local Docker postgres."
  warn "Expected: postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev"
fi

# ─── Step 5: Install dependencies ────────────────────────────────────────────
info "Installing dependencies..."
cd "${APP_DIR}"
pnpm install

# ─── Step 6: Generate Prisma client ─────────────────────────────────────────
info "Generating Prisma client..."
DATABASE_URL="postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev" \
  pnpm prisma generate

# ─── Step 7: Run database migrations ────────────────────────────────────────
info "Running database migrations..."
DATABASE_URL="postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev" \
  pnpm prisma migrate dev --name init 2>/dev/null || \
DATABASE_URL="postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev" \
  pnpm prisma migrate deploy

success "Database migrations applied"

# ─── Step 8: Seed database ──────────────────────────────────────────────────
if [ -f "${APP_DIR}/prisma/seed.ts" ]; then
  info "Seeding database with test data..."
  DATABASE_URL="postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev" \
    pnpm prisma db seed
  success "Database seeded"
else
  warn "No prisma/seed.ts found — skipping seed step"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  eclat is ready for local development!   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "  Start the dev server:"
echo "    cd apps/eclat && pnpm dev"
echo ""
echo "  App URL:      http://localhost:3000"
echo "  Database:     postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev"
echo "  Prisma Studio: DATABASE_URL=postgresql://eclat:eclat_dev_password@localhost:5432/eclat_dev pnpm prisma studio"
echo ""
echo "  Stop services:"
echo "    docker compose down"
echo ""
echo "  Reset database (delete all data):"
echo "    docker compose down -v && ./scripts/setup-local.sh"
echo ""
