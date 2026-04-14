###############################################################################
# staging.tfvars — Staging environment variable values
# Mirrors production config except for sizing and data policies.
# Used with: terraform plan/apply -var-file=environments/staging.tfvars
###############################################################################

environment = "staging"
aws_region  = "ap-southeast-1"

# FILL IN: your AWS account ID
aws_account_id = "YOUR_AWS_ACCOUNT_ID"

# Domain
domain_name        = "staging.eclat.social"
create_hosted_zone = false   # Hosted zone is eclat.social — records added there
hosted_zone_name   = "eclat.social" # Apex zone that contains staging.eclat.social records

# Database — small instance for staging (cost ~$20/month)
db_instance_class           = "db.t3.small"
db_allocated_storage_gb     = 20
db_max_allocated_storage_gb = 100
db_multi_az                 = false # No Multi-AZ for staging
db_backup_retention_days    = 7
db_name                     = "eclat_staging"

# App Runner
app_runner_cpu      = "512"
app_runner_memory   = "1024"
app_runner_min_size = 1 # Always warm — smoke tests need instant response
app_runner_max_size = 3

# Networking
vpc_cidr           = "10.1.0.0/16" # Different CIDR from dev to allow VPC peering if needed
enable_nat_gateway = true

# Monitoring
alert_email = "YOUR_EMAIL@example.com"

# Security
waf_geo_allow_countries = ["IN", "AE", "GB", "US", "SG", "AU", "CA"]
waf_rate_limit_per_5min = 2000

# Storage
verification_doc_retention_years = 2
