###############################################################################
# main.tf
# AWS provider configuration and Terraform backend.
# Backend uses S3 for state storage + DynamoDB for state locking.
# Run `terraform init -backend-config=environments/<env>.backend.hcl` to init.
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Partial backend config — complete with -backend-config=environments/<env>.backend.hcl
  backend "s3" {
    region         = "ap-southeast-1"
    dynamodb_table = "eclat-terraform-locks"
    encrypt        = true
  }
}

# Primary provider — ap-southeast-1 (Singapore) for all regional resources
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "eclat"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# us-east-1 provider alias — required for CloudFront ACM certificates and WAF WebACLs
# CloudFront only accepts ACM certs and WAF WebACLs created in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "eclat"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

###############################################################################
# Bootstrap resources — must exist BEFORE running terraform init
# Create these once manually (or via separate bootstrap script):
#
#   aws s3 mb s3://eclat-terraform-state --region ap-southeast-1
#   aws s3api put-bucket-versioning \
#     --bucket eclat-terraform-state \
#     --versioning-configuration Status=Enabled
#   aws s3api put-bucket-encryption \
#     --bucket eclat-terraform-state \
#     --server-side-encryption-configuration \
#       '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#   aws dynamodb create-table \
#     --table-name eclat-terraform-locks \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region ap-southeast-1
###############################################################################
