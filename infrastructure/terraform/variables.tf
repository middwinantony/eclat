###############################################################################
# variables.tf
# All input variables for the eclat infrastructure.
# Values are supplied via environments/<env>.tfvars files.
# Never hardcode account IDs, secrets, or environment-specific values here.
###############################################################################

variable "environment" {
  description = "Deployment environment: dev, test, staging, or prod"
  type        = string
  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, test, staging, or prod."
  }
}

variable "aws_region" {
  description = "Primary AWS region for all resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_account_id" {
  description = "AWS account ID — used for IAM ARNs and resource policies"
  type        = string
  sensitive   = true
}

# ─── Domain ───────────────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Root domain for the application (e.g. eclat.social)"
  type        = string
}

variable "create_hosted_zone" {
  description = "Set to true if Route 53 hosted zone should be created by Terraform. False if already exists."
  type        = bool
  default     = false
}

variable "hosted_zone_name" {
  description = "The Route 53 hosted zone to add DNS records to. Defaults to domain_name. Override in sub-environments (test/staging/dev) to point at the apex zone (e.g. 'eclat.social') when domain_name is a subdomain like 'test.eclat.social'."
  type        = string
  default     = ""
}

# ─── Database ─────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance type (e.g. db.t3.micro for dev, db.t3.small for prod)"
  type        = string
}

variable "db_allocated_storage_gb" {
  description = "Initial RDS storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage_gb" {
  description = "Maximum RDS storage autoscaling cap in GB"
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Enable Multi-AZ RDS for high availability (true for prod, false for dev/staging)"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated RDS backups"
  type        = number
  default     = 7
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "eclat"
}

# ─── App Runner ───────────────────────────────────────────────────────────────

variable "app_runner_cpu" {
  description = "vCPU units for App Runner (256|512|1024|2048|4096)"
  type        = string
  default     = "512"
}

variable "app_runner_memory" {
  description = "Memory in MB for App Runner (512|1024|2048|3072|4096)"
  type        = string
  default     = "1024"
}

variable "app_runner_min_size" {
  description = "Minimum number of App Runner instances"
  type        = number
  default     = 1
}

variable "app_runner_max_size" {
  description = "Maximum number of App Runner instances"
  type        = number
  default     = 3
}

variable "ecr_image_uri" {
  description = "Full ECR image URI including tag (e.g. 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/eclat:latest)"
  type        = string
  default     = "public.ecr.aws/docker/library/node:20-alpine" # placeholder until first build
}

# ─── Networking ───────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet internet access (needed for Lambda + App Runner). Adds ~$32/month."
  type        = bool
  default     = true
}

# ─── Monitoring ───────────────────────────────────────────────────────────────

variable "alert_email" {
  description = "Email address for CloudWatch alarm SNS notifications"
  type        = string
}

# ─── Security ─────────────────────────────────────────────────────────────────

variable "waf_geo_allow_countries" {
  description = "ISO country codes to allow through WAF geo rule (blocks all others)"
  type        = list(string)
  # India + UAE + UK + USA + Singapore + Australia + Canada (core NRI markets)
  default = ["IN", "AE", "GB", "US", "SG", "AU", "CA"]
}

variable "waf_rate_limit_per_5min" {
  description = "Maximum requests per IP per 5 minutes before WAF blocks"
  type        = number
  default     = 2000
}

# ─── Storage ──────────────────────────────────────────────────────────────────

variable "verification_doc_retention_years" {
  description = "Years to retain government ID documents (legal compliance)"
  type        = number
  default     = 7
}

# ─── Tier-control flags ───────────────────────────────────────────────────────
# These flags allow expensive services to be disabled in test/dev tiers to
# minimise cost. Set to true in staging and prod, false in test.
#
# NOTE: Most existing resource blocks do not yet use these flags.
# They are added here to document intent and to be wired in future updates.
# Use test.tfvars to set these flags; they serve as cost documentation.

variable "enable_vpc" {
  description = "Create VPC, subnets, NAT Gateway, and security groups. Set false in test when using Neon (external DB) — eliminates the $32/mo NAT Gateway cost."
  type        = bool
  default     = true
}

variable "enable_background_jobs" {
  description = "Create Lambda functions, EventBridge rules, and SQS queues. Set false in test to reduce complexity; trigger jobs manually via API routes instead."
  type        = bool
  default     = true
}

variable "enable_secrets_manager" {
  description = "Create Secrets Manager secret placeholders for all API keys. Set false in test and inject secrets manually via App Runner environment variables in the console."
  type        = bool
  default     = true
}

variable "neon_database_url" {
  description = "Neon PostgreSQL connection string. Required when use_rds = false. Format: postgresql://user:pass@host/db?sslmode=require"
  type        = string
  default     = ""
  sensitive   = true
}

variable "use_waf" {
  description = "Enable WAF Web ACL. Set false in test to save ~$5/mo. Required in staging and prod."
  type        = bool
  default     = true
}

variable "use_kms" {
  description = "Enable KMS CMK for field-level encryption. Required in all tiers for eclat (KYC + Article 9 data)."
  type        = bool
  default     = true
  # NOTE: eclat must always have use_kms = true — it encrypts govt IDs, messages, and Article 9 fields.
  # This flag is provided for completeness but should never be false in any eclat environment.
}

variable "use_cloudfront" {
  description = "Enable CloudFront CDN for profile photo delivery. Set false in test to save ~$1-5/mo."
  type        = bool
  default     = true
}

variable "use_rds" {
  description = "Use RDS for database. When false, DATABASE_URL should point to an external provider (e.g. Neon). Set false in test to eliminate RDS cost (~$15/mo)."
  type        = bool
  default     = true
}

variable "use_lambda_reserved" {
  description = "Enable reserved concurrency for Lambda functions. Set false in test (pay-per-use instead). Required in prod for predictable capacity."
  type        = bool
  default     = false
}

variable "database_provider" {
  description = "Database provider: 'rds' (AWS RDS) or 'neon' (external Neon PostgreSQL). Use 'neon' in test for zero DB cost."
  type        = string
  default     = "rds"
  validation {
    condition     = contains(["rds", "neon"], var.database_provider)
    error_message = "database_provider must be 'rds' or 'neon'."
  }
}

variable "hosting_tier" {
  description = "App Runner sizing tier: 'free' (256 vCPU / 512 MB, min=0) or 'production' (1024+ vCPU). Use 'free' in test to minimise cost."
  type        = string
  default     = "production"
  validation {
    condition     = contains(["free", "production"], var.hosting_tier)
    error_message = "hosting_tier must be 'free' or 'production'."
  }
}

variable "create_app_runner_service" {
  description = "Set to true only after CI has pushed a real application image to ECR. The placeholder node:20-alpine image has no web server, so App Runner health checks will always fail until a real image is deployed. Bootstrap workflow: apply with false → CI pushes image → set to true → apply again."
  type        = bool
  default     = false
}
