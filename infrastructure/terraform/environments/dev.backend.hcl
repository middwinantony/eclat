# dev.backend.hcl — S3 backend config for dev environment
# Usage: terraform init -backend-config=environments/dev.backend.hcl

bucket = "eclat-terraform-state"
key    = "eclat/dev/terraform.tfstate"
region = "ap-southeast-1"
