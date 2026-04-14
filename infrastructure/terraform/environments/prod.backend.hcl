# prod.backend.hcl — S3 backend config for production environment
# Usage: terraform init -backend-config=environments/prod.backend.hcl

bucket = "eclat-terraform-state"
key    = "eclat/prod/terraform.tfstate"
region = "ap-southeast-1"
