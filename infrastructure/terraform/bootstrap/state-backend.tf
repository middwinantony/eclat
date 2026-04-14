###############################################################################
# bootstrap/state-backend.tf
# One-time bootstrap: creates the S3 bucket and DynamoDB table that the
# main Terraform configuration uses for remote state and locking.
#
# Run this ONCE before running terraform init in the parent directory.
#
# USAGE:
#   cd apps/eclat/infrastructure/terraform/bootstrap
#   terraform init
#   terraform apply
#
# After apply, go back to apps/eclat/infrastructure/terraform and run:
#   terraform init -backend-config=environments/test.backend.hcl
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bootstrap has NO backend — state stored locally in this directory.
  # The bootstrap state file is safe to commit (contains no secrets).
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "eclat"
      ManagedBy = "terraform-bootstrap"
    }
  }
}

variable "aws_region" {
  description = "AWS region for state backend resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_account_id" {
  description = "Your 12-digit AWS account ID (used in bucket name to ensure global uniqueness)"
  type        = string
  sensitive   = true
}

# ─── S3 State Bucket ─────────────────────────────────────────────────────────
# Stores Terraform state files for all eclat environments.
# Global uniqueness guaranteed by including the account ID in the bucket name.

resource "aws_s3_bucket" "terraform_state" {
  bucket = "eclat-terraform-state-${var.aws_account_id}"

  # Prevent accidental deletion — must force-destroy if you really want to remove
  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "eclat-terraform-state" }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled" # Required: lets you recover from accidental state deletion
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── DynamoDB Lock Table ──────────────────────────────────────────────────────
# Prevents two engineers from running terraform apply at the same time.
# Pay-per-request billing: essentially free (cents per month).

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "eclat-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "eclat-terraform-locks" }
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "state_bucket_name" {
  description = "S3 bucket name — use this in your backend.hcl files"
  value       = aws_s3_bucket.terraform_state.id
}

output "lock_table_name" {
  description = "DynamoDB table name — use this in your backend.hcl files"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "next_steps" {
  description = "Instructions for next steps after bootstrap"
  value       = <<-EOT
    Bootstrap complete. Next steps:

    1. Create a backend.hcl for each environment:

       # environments/test.backend.hcl
       bucket         = "${aws_s3_bucket.terraform_state.id}"
       key            = "eclat/test/terraform.tfstate"
       region         = "${var.aws_region}"
       dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
       encrypt        = true

    2. Initialise main Terraform:
       cd ..
       terraform init -backend-config=environments/test.backend.hcl

    3. Deploy test tier:
       terraform plan -var-file=environments/test.tfvars
       terraform apply -var-file=environments/test.tfvars
  EOT
}
