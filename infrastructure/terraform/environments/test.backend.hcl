# test.backend.hcl — S3 backend config for test environment
# Usage: terraform init -backend-config=environments/test.backend.hcl

bucket = "eclat-terraform-state-524419234223"
key    = "eclat/test/terraform.tfstate"
region = "ap-southeast-1"
