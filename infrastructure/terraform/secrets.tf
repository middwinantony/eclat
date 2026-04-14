###############################################################################
# secrets.tf
# AWS Secrets Manager — all application secrets stored here.
#
# When enable_secrets_manager = false (test tier):
#   - No secrets created — saves ~$6/mo (15 secrets × $0.40)
#   - Set environment variables manually in the App Runner console after deploy,
#     or add them to runtime_environment_variables in hosting.tf for test.
#
# When enable_secrets_manager = true (staging/prod):
#   - Secrets created as empty placeholders by Terraform
#   - After apply, populate each secret via AWS Console or CLI:
#       aws secretsmanager put-secret-value \
#         --secret-id /eclat/{env}/stripe-secret-key \
#         --secret-string "sk_live_..."
###############################################################################

locals {
  secret_prefix = "/eclat/${var.environment}"
  recovery_days = var.environment == "prod" ? 30 : 7
}

# ─── Auth Secrets ─────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "nextauth_secret" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/nextauth-secret"
  description             = "NextAuth.js JWT signing secret — generate with: openssl rand -base64 32"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-nextauth-secret" }
}

resource "aws_secretsmanager_secret" "google_client_id" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/google-client-id"
  description             = "Google OAuth 2.0 Client ID — from Google Cloud Console"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-google-client-id" }
}

resource "aws_secretsmanager_secret" "google_client_secret" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/google-client-secret"
  description             = "Google OAuth 2.0 Client Secret — from Google Cloud Console"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-google-client-secret" }
}

# ─── Payment Secrets ──────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "stripe_secret_key" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/stripe-secret-key"
  description             = "Stripe secret key (sk_test_... for staging, sk_live_... for prod)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-stripe-secret-key" }
}

resource "aws_secretsmanager_secret" "stripe_webhook_secret" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/stripe-webhook-secret"
  description             = "Stripe webhook endpoint signing secret (whsec_...)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-stripe-webhook-secret" }
}

resource "aws_secretsmanager_secret" "stripe_publishable_key" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/stripe-publishable-key"
  description             = "Stripe publishable key — safe to expose client-side (pk_...)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-stripe-publishable-key" }
}

resource "aws_secretsmanager_secret" "razorpay_key_id" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/razorpay-key-id"
  description             = "Razorpay API Key ID (rzp_test_... or rzp_live_...)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-razorpay-key-id" }
}

resource "aws_secretsmanager_secret" "razorpay_key_secret" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/razorpay-key-secret"
  description             = "Razorpay API Key Secret"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-razorpay-key-secret" }
}

resource "aws_secretsmanager_secret" "razorpay_webhook_secret" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/razorpay-webhook-secret"
  description             = "Razorpay webhook signature secret"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-razorpay-webhook-secret" }
}

# ─── Real-time / Video Secrets ────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "pusher_app_id" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/pusher-app-id"
  description             = "Pusher application ID"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-pusher-app-id" }
}

resource "aws_secretsmanager_secret" "pusher_key" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/pusher-key"
  description             = "Pusher application key (public)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-pusher-key" }
}

resource "aws_secretsmanager_secret" "pusher_secret" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/pusher-secret"
  description             = "Pusher application secret"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-pusher-secret" }
}

resource "aws_secretsmanager_secret" "daily_api_key" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/daily-api-key"
  description             = "Daily.co API key for encrypted video call room creation"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-daily-api-key" }
}

# ─── Rate Limiting (Upstash Redis) ────────────────────────────────────────────

resource "aws_secretsmanager_secret" "upstash_redis_url" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/upstash-redis-url"
  description             = "Upstash Redis REST URL for rate limiting (https://...upstash.io)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-upstash-redis-url" }
}

resource "aws_secretsmanager_secret" "upstash_redis_token" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/upstash-redis-token"
  description             = "Upstash Redis REST token for rate limiting"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-upstash-redis-token" }
}

# ─── Email (SES + Resend for dev) ─────────────────────────────────────────────

resource "aws_secretsmanager_secret" "resend_api_key" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/resend-api-key"
  description             = "Resend API key for transactional email (re_...)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-resend-api-key" }
}

# ─── Error Tracking ───────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "sentry_dsn" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/sentry-dsn"
  description             = "Sentry DSN for error tracking (https://...@sentry.io/...)"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-sentry-dsn" }
}

resource "aws_secretsmanager_secret" "sentry_auth_token" {
  count                   = var.enable_secrets_manager ? 1 : 0
  name                    = "${local.secret_prefix}/sentry-auth-token"
  description             = "Sentry auth token for source map uploads during CI/CD builds"
  recovery_window_in_days = local.recovery_days
  tags                    = { Name = "eclat-${var.environment}-sentry-auth-token" }
}
