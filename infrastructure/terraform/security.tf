###############################################################################
# security.tf
# KMS encryption key, WAF WebACL, IAM roles, CloudFront OAC, and ACM certificate.
#
# Note: WAF WebACL and ACM certificate must be in us-east-1 for CloudFront.
#       These use the `aws.us_east_1` provider alias defined in main.tf.
###############################################################################

# ─── KMS Customer Managed Key ─────────────────────────────────────────────────
# Used for: application-level field encryption (messages, IDs, IPs),
#           S3 SSE for both buckets, ECR image encryption.
# Annual automatic rotation enabled — new key material generated every year,
# old material retained for decryption of existing data.

resource "aws_kms_key" "eclat" {
  description             = "eclat ${var.environment} — application data encryption key"
  enable_key_rotation     = true
  deletion_window_in_days = 30 # 30-day waiting period before key is permanently deleted
  multi_region            = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.aws_account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowAppRunnerEncryptDecrypt"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.app_runner_instance.arn
        }
        Action   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
        Resource = "*"
      },
      {
        Sid    = "AllowLambdaDecrypt"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution.arn
        }
        Action   = ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
        Resource = "*"
      },
      {
        Sid    = "AllowRDSEncryption"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey", "kms:DescribeKey", "kms:CreateGrant"]
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action   = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:*"
          }
        }
      }
    ]
  })

  tags = { Name = "eclat-${var.environment}-cmk" }
}

resource "aws_kms_alias" "eclat" {
  name          = "alias/eclat-${var.environment}"
  target_key_id = aws_kms_key.eclat.key_id
}

# ─── ACM Certificate (us-east-1 — required for CloudFront) ───────────────────

resource "aws_acm_certificate" "main" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true # prevents downtime during cert renewal
  }

  tags = { Name = "eclat-${var.environment}-acm-cert" }
}

# DNS validation records — added to Route 53 to prove domain ownership
resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.existing[0].zone_id
}

resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# ─── CloudFront Origin Access Control ─────────────────────────────────────────
# OAC restricts S3 access to CloudFront only — no direct S3 URL access.

resource "aws_cloudfront_origin_access_control" "profiles" {
  name                              = "eclat-${var.environment}-profiles-oac"
  description                       = "OAC for eclat profiles S3 bucket — CloudFront only"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─── WAF WebACL (us-east-1 — required for CloudFront) ────────────────────────
# Protects against common attacks: SQLi, XSS, bot traffic, and geo-blocks
# non-target countries.

resource "aws_wafv2_web_acl" "main" {
  count       = var.use_waf ? 1 : 0
  provider    = aws.us_east_1
  name        = "eclat-${var.environment}-waf"
  description = "WAF for eclat ${var.environment} CloudFront distribution"
  scope       = "CLOUDFRONT" # Must be CLOUDFRONT for CloudFront distributions

  default_action {
    allow {} # Default allow — rules below add blocks on top
  }

  # Rule 1: AWS Common Rule Set — blocks SQLi, XSS, CSRF, path traversal
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSCommonRules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Known bad inputs — blocks Log4j, Spring4Shell, etc.
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: SQL Injection protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSSQLiRules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Geo restriction — block requests from countries outside target markets
  # This is a business decision: eclat targets India and NRI cities only.
  rule {
    name     = "GeoRestriction"
    priority = 4

    action {
      block {}
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = var.waf_geo_allow_countries
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlock"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Rate limiting — blocks IPs sending more than N requests per 5 minutes
  rule {
    name     = "RateLimitPerIP"
    priority = 5

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit_per_5min
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "eclat-${var.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = { Name = "eclat-${var.environment}-waf" }
}

# ─── CloudFront Distribution ──────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "eclat ${var.environment} — CDN + edge security"
  default_root_object = ""
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  price_class         = "PriceClass_200" # US/EU/Asia — covers India + NRI markets
  web_acl_id          = var.use_waf ? aws_wafv2_web_acl.main[0].arn : null

  # Origin 1: App Runner (Next.js app — pages + API)
  origin {
    domain_name = local.app_runner_url
    origin_id   = "apprunner"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin 2: S3 profiles bucket (photos via OAC)
  origin {
    domain_name              = aws_s3_bucket.profiles.bucket_regional_domain_name
    origin_id                = "s3-profiles"
    origin_access_control_id = aws_cloudfront_origin_access_control.profiles.id
  }

  # Default cache behaviour — routes to App Runner (Next.js)
  # AllViewerExceptHostHeader origin request policy forwards cookies (incl. session token)
  # to App Runner so Next.js middleware can read the session on every page request.
  default_cache_behavior {
    allowed_methods           = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods            = ["GET", "HEAD"]
    target_origin_id          = "apprunner"
    viewer_protocol_policy    = "redirect-to-https"
    compress                  = true
    cache_policy_id           = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id  = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # Cache behaviour for /media/* — routes to S3 profiles bucket
  ordered_cache_behavior {
    path_pattern           = "/media/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-profiles"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized — 30-day TTL

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # Cache behaviour for /api/* — no caching, pass all headers + cookies through
  # AllViewerExceptHostHeader origin request policy is required so CloudFront
  # forwards auth cookies (e.g. __Host-authjs.csrf-token) to App Runner.
  # Without this, NextAuth CSRF checks fail because the cookie is stripped.
  ordered_cache_behavior {
    path_pattern              = "/api/*"
    allowed_methods           = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods            = ["GET", "HEAD"]
    target_origin_id          = "apprunner"
    viewer_protocol_policy    = "redirect-to-https"
    compress                  = false
    cache_policy_id           = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id  = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none" # WAF handles geo restriction above
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "eclat-${var.environment}-cloudfront" }
}

# ─── CloudFront Security Headers Policy ──────────────────────────────────────
# Adds security headers to every response — protects against XSS, clickjacking, etc.

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "eclat-${var.environment}-security-headers"
  comment = "Security headers for eclat ${var.environment}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true # Prevents MIME type sniffing
    }

    frame_options {
      frame_option = "DENY" # Prevents clickjacking — eclat should never be framed
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(self), microphone=(self), geolocation=(self), payment=(self)" # Allow camera/mic for video calls
      override = true
    }
  }
}

# ─── Lambda Execution Role ────────────────────────────────────────────────────
# Defined here (used by jobs.tf) to avoid circular dependency with KMS key policy.

resource "aws_iam_role" "lambda_execution" {
  name        = "eclat-${var.environment}-lambda-execution-role"
  description = "Execution role for all eclat background Lambda functions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "eclat-${var.environment}-lambda-execution-role" }
}

resource "aws_iam_role_policy" "lambda_execution" {
  name = "eclat-${var.environment}-lambda-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "VPCNetworking"
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/aws/lambda/eclat-*:*"
      },
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:/eclat/${var.environment}/*"
      },
      {
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
        Resource = aws_kms_key.eclat.arn
      },
      {
        Sid    = "SQSConsume"
        Effect = "Allow"
        Action = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [
          "arn:aws:sqs:${var.aws_region}:${var.aws_account_id}:eclat-email-${var.environment}",
          "arn:aws:sqs:${var.aws_region}:${var.aws_account_id}:eclat-delete-${var.environment}"
        ]
      },
      {
        Sid    = "SESSendEmail"
        Effect = "Allow"
        Action = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = "noreply@${var.domain_name}"
          }
        }
      }
    ]
  })
}
