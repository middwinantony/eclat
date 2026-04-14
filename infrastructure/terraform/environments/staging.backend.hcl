# staging.backend.hcl — S3 backend config for staging environment
# Usage: terraform init -backend-config=environments/staging.backend.hcl

bucket = "eclat-terraform-state"
key    = "eclat/staging/terraform.tfstate"
region = "ap-southeast-1"
