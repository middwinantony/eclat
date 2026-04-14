###############################################################################
# prod.tfvars — Production environment variable values
# These are the real production settings.
# Used with: terraform plan/apply -var-file=environments/prod.tfvars
# WARNING: terraform apply with prod.tfvars affects live user data.
###############################################################################

environment = "prod"
aws_region  = "ap-southeast-1"

# FILL IN: your AWS account ID
aws_account_id = "YOUR_AWS_ACCOUNT_ID"

# Domain — apex domain
domain_name        = "eclat.social"
create_hosted_zone = true # Terraform manages the hosted zone

# Database — production sizing with Multi-AZ for HA
db_instance_class           = "db.t3.small"
db_allocated_storage_gb     = 20
db_max_allocated_storage_gb = 100
db_multi_az                 = true  # Standby in different AZ — automatic failover
db_backup_retention_days    = 30    # 30-day retention for production
db_name                     = "eclat"

# App Runner — production sizing
app_runner_cpu      = "1024"
app_runner_memory   = "2048"
app_runner_min_size = 1
app_runner_max_size = 5

# Networking
vpc_cidr           = "10.2.0.0/16"
enable_nat_gateway = true

# Monitoring — FILL IN your production alert email
alert_email = "alerts@eclat.social"

# Security — strict geo restriction for production
waf_geo_allow_countries = ["IN", "AE", "GB", "US", "SG", "AU", "CA"]
waf_rate_limit_per_5min = 2000

# Storage
verification_doc_retention_years = 7 # 7-year legal retention for govt IDs
