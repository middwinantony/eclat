# =============================================================================
# test.tfvars — Test / Low-cost environment
#
# COST TARGET: ~$7-10/mo
#
# COST BREAKDOWN:
#   App Runner (min=1, 256vCPU/512MB): ~$5/mo
#   KMS customer managed key:          ~$1/mo
#   CloudFront:                        ~$1/mo
#   Route 53 hosted zone:              ~$0.50/mo
#   S3 (test volumes):                 ~$0
#   SES (small volume):                ~$0
#   CloudWatch logs (free tier):       ~$0
#   ──────────────────────────────────────────
#   Estimated total:                   ~$7-8/mo
#
# WHAT IS DISABLED vs PROD:
#   ✗ VPC + NAT Gateway  (saves $32/mo) — App Runner reaches Neon directly
#   ✗ RDS PostgreSQL     (saves $15/mo) — use Neon free tier instead
#   ✗ Secrets Manager    (saves  $6/mo) — set env vars in App Runner console
#   ✗ WAF                (saves  $5/mo) — no attack surface worth protecting in test
#   ✗ Lambda + EventBridge + SQS        — trigger background tasks via API routes
#
# DATABASE SETUP (Neon free tier):
#   1. Sign up at neon.tech
#   2. Create a project → copy the connection string
#   3. Paste it as neon_database_url below
#   4. Run: terraform apply -var-file=environments/test.tfvars
#   5. After apply: set all other API keys in App Runner console > Configuration > Environment variables
# =============================================================================

environment = "test"
aws_region  = "ap-southeast-1"

# FILL IN: your AWS account ID
aws_account_id = "524419234223"

# Domain
domain_name        = "test.eclat.social"
create_hosted_zone = false   # Hosted zone is eclat.social — records added there
hosted_zone_name   = "eclat.social" # Apex zone that contains test.eclat.social records

# ─── Tier-control flags ───────────────────────────────────────────────────────

use_rds                = false   # Use Neon instead — eliminates $15/mo RDS cost
database_provider      = "neon"
enable_vpc             = false   # No VPC needed when using Neon — eliminates $32/mo NAT cost
enable_nat_gateway     = false   # Redundant when enable_vpc = false, kept for clarity
enable_background_jobs = false   # No Lambda/SQS/EventBridge — trigger via API routes
enable_secrets_manager = false   # Set env vars in App Runner console instead — saves $6/mo
use_waf                = false   # No WAF in test — saves $5/mo
use_cloudfront         = true    # Needed for S3 profile photo serving
create_app_runner_service = false  # Set to true only after CI pushes a real image to ECR — placeholder node:alpine has no web server

# ─── Database (Neon) ──────────────────────────────────────────────────────────
# FILL IN: your Neon connection string
# Get it from: neon.tech → your project → Connection Details → Connection string
# Format: postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/eclat_test?sslmode=require

neon_database_url = "postgresql://neondb_owner:npg_qjYD4U9RMiwo@ep-mute-pine-a10pfehb.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" # FILL IN BEFORE APPLYING

db_name                     = "eclat_test"
db_instance_class           = "db.t3.micro" # Not used when use_rds = false — kept for variable completeness
db_allocated_storage_gb     = 20
db_max_allocated_storage_gb = 20
db_multi_az                 = false
db_backup_retention_days    = 1

# ─── App Runner ──────────────────────────────────────────────────────────────
app_runner_cpu      = "256"  # Smallest available
app_runner_memory   = "512"  # Smallest available
app_runner_min_size = 1      # AWS minimum is 1 (scale-to-zero not supported)
app_runner_max_size = 1      # Single instance — not for load testing

# Placeholder until first CI/CD build pushes a real image
ecr_image_uri = "public.ecr.aws/docker/library/node:20-alpine"

# ─── Networking (not used when enable_vpc = false) ───────────────────────────
vpc_cidr = "10.3.0.0/16"

# ─── Monitoring ───────────────────────────────────────────────────────────────
# FILL IN: your email address for alarm notifications
alert_email = "YOUR_EMAIL@example.com"

# ─── Security ────────────────────────────────────────────────────────────────
waf_geo_allow_countries = ["IN", "AE", "GB", "US", "SG", "AU", "CA"]
waf_rate_limit_per_5min = 10000

# ─── Storage ─────────────────────────────────────────────────────────────────
verification_doc_retention_years = 1
