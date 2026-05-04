# =============================================================================
# prod.tfvars — Production environment
#
# COST TARGET: ~$30-40/mo
#
# Same architecture as test (Neon, no VPC) but with production sizing,
# WAF enabled, Secrets Manager enabled, and higher App Runner limits.
#
# WARNING: terraform apply with prod.tfvars affects live user data.
# =============================================================================

environment = "prod"
aws_region  = "ap-southeast-1"

aws_account_id = "524419234223"

# Domain
domain_name        = "eclat.social"
create_hosted_zone = false   # Hosted zone already exists — records added there
hosted_zone_name   = "eclat.social"

# ─── Tier-control flags ───────────────────────────────────────────────────────

use_rds                = false
database_provider      = "neon"
enable_vpc             = false
enable_nat_gateway     = false
enable_background_jobs = false
enable_secrets_manager = true
use_waf                = true
use_cloudfront         = true

# ─── Database (Neon) ──────────────────────────────────────────────────────────

neon_database_url = "postgresql://neondb_owner:npg_DBNnlpsOvL30@ep-muddy-base-aokzdt4f-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

db_name                     = "eclat_prod"
db_instance_class           = "db.t3.micro"
db_allocated_storage_gb     = 20
db_max_allocated_storage_gb = 100
db_multi_az                 = false
db_backup_retention_days    = 7

# ─── App Runner ──────────────────────────────────────────────────────────────

app_runner_cpu      = "1024"
app_runner_memory   = "2048"
app_runner_min_size = 1
app_runner_max_size = 5

create_app_runner_service = true
ecr_image_uri = "524419234223.dkr.ecr.ap-southeast-1.amazonaws.com/eclat-prod:latest"

# ─── Networking (not used when enable_vpc = false) ───────────────────────────
vpc_cidr = "10.2.0.0/16"

# ─── Monitoring ───────────────────────────────────────────────────────────────
alert_email = "middwin@gmail.com"

# ─── Security ────────────────────────────────────────────────────────────────
waf_geo_allow_countries = ["IN", "AE", "GB", "US", "SG", "AU", "CA"]
waf_rate_limit_per_5min = 1000

# ─── Storage ─────────────────────────────────────────────────────────────────
verification_doc_retention_years = 7
