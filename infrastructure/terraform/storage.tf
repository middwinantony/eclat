###############################################################################
# storage.tf
# S3 buckets for profile media and identity verification documents.
#
# Two buckets with different access policies:
#   eclat-profiles-{env}      — profile photos, voice intros (CDN-accessible)
#   eclat-verification-{env}  — govt IDs, selfies (private, signed URLs only)
#
# CloudFront distribution for the profiles bucket is in security.tf
# (where the WAF and OAC are defined together).
###############################################################################

# ─── Profiles Bucket ──────────────────────────────────────────────────────────
# Stores profile photos and voice intro files.
# Access is via CloudFront only — no direct S3 URLs exposed to users.

resource "aws_s3_bucket" "profiles" {
  bucket = "eclat-profiles-${var.environment}-${var.aws_account_id}"
  # Account ID in bucket name ensures global uniqueness without guessing

  tags = { Name = "eclat-${var.environment}-profiles" }
}

resource "aws_s3_bucket_versioning" "profiles" {
  bucket = aws_s3_bucket.profiles.id
  versioning_configuration {
    status = "Disabled" # Photos replace rather than version — saves cost
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "profiles" {
  bucket = aws_s3_bucket.profiles.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.eclat.arn
    }
    bucket_key_enabled = true # reduces KMS API calls by up to 99% — significant cost saving
  }
}

# Block all public access — content is served only via CloudFront with OAC
resource "aws_s3_bucket_public_access_block" "profiles" {
  bucket = aws_s3_bucket.profiles.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS config — allows the Next.js app to generate presigned upload URLs
resource "aws_s3_bucket_cors_configuration" "profiles" {
  bucket = aws_s3_bucket.profiles.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://www.${var.domain_name}",
      var.environment != "prod" ? "http://localhost:3000" : "https://${var.domain_name}"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lifecycle rule — delete temp upload files that were never confirmed
resource "aws_s3_bucket_lifecycle_configuration" "profiles" {
  bucket = aws_s3_bucket.profiles.id

  rule {
    id     = "delete-incomplete-multipart-uploads"
    status = "Enabled"

    filter { prefix = "uploads/tmp/" }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# ─── Verification Bucket ──────────────────────────────────────────────────────
# Stores government ID documents and selfies for human verification.
# HIGHLY SENSITIVE — no CloudFront, no public access.
# Access via presigned URLs with 15-minute expiry only.
# Object Lock in COMPLIANCE mode for legal retention requirements.

resource "aws_s3_bucket" "verification" {
  bucket        = "eclat-verification-${var.environment}-${var.aws_account_id}"
  object_lock_enabled = true # Must be set at bucket creation time — cannot be added later

  tags = {
    Name            = "eclat-${var.environment}-verification"
    DataClass       = "highly-sensitive"
    ContainsPII     = "true"
    ComplianceScope = "legal-retention"
  }
}

resource "aws_s3_bucket_versioning" "verification" {
  bucket = aws_s3_bucket.verification.id
  versioning_configuration {
    status = "Enabled" # Required for Object Lock
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "verification" {
  bucket = aws_s3_bucket.verification.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.eclat.arn
    }
    bucket_key_enabled = true
  }
}

# Block ALL public access — no exceptions
resource "aws_s3_bucket_public_access_block" "verification" {
  bucket = aws_s3_bucket.verification.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Object Lock — COMPLIANCE mode prevents deletion for {retention_years} years.
# Even root/admin cannot delete objects before the retention period expires.
# Required for legal compliance when storing government identity documents.
resource "aws_s3_bucket_object_lock_configuration" "verification" {
  bucket = aws_s3_bucket.verification.id

  rule {
    default_retention {
      mode  = "COMPLIANCE"
      years = var.verification_doc_retention_years
    }
  }
}

# Lifecycle rule — move old verified documents to Glacier after 90 days
# Reduces storage cost from ~$0.023/GB to ~$0.004/GB after verification is complete
resource "aws_s3_bucket_lifecycle_configuration" "verification" {
  bucket = aws_s3_bucket.verification.id

  rule {
    id     = "archive-verified-documents"
    status = "Enabled"

    filter { prefix = "verified/" }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# ─── Bucket Policies ──────────────────────────────────────────────────────────

# Profiles bucket — allow CloudFront OAC to read objects
resource "aws_s3_bucket_policy" "profiles" {
  bucket = aws_s3_bucket.profiles.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.profiles.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.profiles.arn, "${aws_s3_bucket.profiles.arn}/*"]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })

  depends_on = [aws_cloudfront_distribution.main]
}

# Verification bucket — only App Runner instance role and admin can access
resource "aws_s3_bucket_policy" "verification" {
  bucket = aws_s3_bucket.verification.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAppRunnerAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.app_runner_instance.arn
        }
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.verification.arn}/*"
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.verification.arn, "${aws_s3_bucket.verification.arn}/*"]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })
}
