###############################################################################
# dev.tfvars — Development environment variable values
# Used with: terraform plan/apply -var-file=environments/dev.tfvars
###############################################################################

environment = "dev"
aws_region  = "ap-southeast-1"

# FILL IN: your AWS account ID
aws_account_id = "YOUR_AWS_ACCOUNT_ID"

# Domain — use a staging subdomain or test domain for dev
domain_name        = "dev.eclat.social"
create_hosted_zone = false   # Hosted zone is eclat.social — records added there
hosted_zone_name   = "eclat.social" # Apex zone that contains dev.eclat.social records

# Database — smallest instance for dev (cost ~$15/month)
db_instance_class           = "db.t3.micro"
db_allocated_storage_gb     = 20
db_max_allocated_storage_gb = 50
db_multi_az                 = false
db_backup_retention_days    = 3
db_name                     = "eclat_dev"

# App Runner — minimal sizing for dev
app_runner_cpu      = "256"
app_runner_memory   = "512"
app_runner_min_size = 1 # App Runner minimum is 1 (scale-to-zero not supported by AWS)
app_runner_max_size = 2

# Networking
vpc_cidr           = "10.0.0.0/16"
enable_nat_gateway = true

# Monitoring
alert_email = "YOUR_EMAIL@example.com"

# Security — allow broader geo access for dev testing
waf_geo_allow_countries = ["IN", "AE", "GB", "US", "SG", "AU", "CA"]
waf_rate_limit_per_5min = 5000 # Higher limit for dev testing

# Storage
verification_doc_retention_years = 1 # Shorter in dev — saves Object Lock cost
