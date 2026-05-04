###############################################################################
# hosting.tf
# AWS App Runner — containerised Next.js application hosting.
# AWS ECR — Docker image registry.
#
# Why App Runner over ECS/EKS:
#   - Auto-scales to zero instances overnight (no idle compute cost)
#   - Built-in load balancing and TLS termination
#   - No container orchestration overhead
#   - Connects to VPC via VPC Connector for private RDS access
#   - Ideal for <1k users — scales up automatically as traffic grows
###############################################################################

# ─── ECR Repository ───────────────────────────────────────────────────────────
# Stores Docker images built by GitHub Actions CI/CD pipeline.

resource "aws_ecr_repository" "eclat" {
  name                 = "eclat-${var.environment}"
  image_tag_mutability = "MUTABLE" # allows updating the 'latest' tag on each deploy
  force_delete         = true      # allows terraform to delete repo even if it contains images

  # Scan images for known vulnerabilities on every push
  image_scanning_configuration {
    scan_on_push = true
  }

  # Encrypt images at rest using KMS
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.eclat.arn
  }

  tags = { Name = "eclat-${var.environment}-ecr" }
}

# Auto-delete old untagged images after 30 days — prevents storage cost creep
resource "aws_ecr_lifecycle_policy" "eclat" {
  repository = aws_ecr_repository.eclat.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Delete untagged images older than 30 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 30
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep only the 10 most recent tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}

# ─── IAM Policy Statements (conditional by tier) ─────────────────────────────
# Built as a local so we can conditionally include Secrets Manager and SQS
# statements depending on which services are enabled in this environment.

locals {
  # Detect public ECR images (e.g. the node:20-alpine placeholder used in test).
  # Public ECR requires ECR_PUBLIC type and no authentication_configuration block.
  is_public_ecr = startswith(var.ecr_image_uri, "public.ecr.aws/")

  # Resolved App Runner URL — used by CloudFront and monitoring.
  # Falls back to a placeholder when the service hasn't been created yet so that
  # CloudFront and dashboard resources can still be applied in the bootstrap pass.
  app_runner_url = var.create_app_runner_service ? aws_apprunner_service.eclat[0].service_url : "placeholder.${var.aws_region}.awsapprunner.com"

  app_runner_iam_statements = concat(
    [{
      Sid      = "KMSDecryptEncrypt"
      Effect   = "Allow"
      Action   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
      Resource = aws_kms_key.eclat.arn
    }],
    [{
      Sid      = "S3ProfilesReadWrite"
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = "${aws_s3_bucket.profiles.arn}/*"
    }],
    [{
      Sid      = "S3ProfilesList"
      Effect   = "Allow"
      Action   = ["s3:ListBucket"]
      Resource = aws_s3_bucket.profiles.arn
    }],
    [{
      Sid      = "S3VerificationReadWrite"
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "${aws_s3_bucket.verification.arn}/*"
    }],
    [{
      Sid      = "CloudWatchLogs"
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:${var.aws_region}:${var.aws_account_id}:log-group:/aws/apprunner/eclat-${var.environment}:*"
    }],
    var.enable_secrets_manager ? [{
      Sid      = "SecretsManagerRead"
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:/eclat/${var.environment}/*"
    }] : [],
    var.enable_background_jobs ? [{
      Sid    = "SQSSendMessage"
      Effect = "Allow"
      Action = ["sqs:SendMessage"]
      Resource = [
        aws_sqs_queue.email[0].arn,
        aws_sqs_queue.account_delete[0].arn
      ]
    }] : []
  )
}

# ─── IAM Role for App Runner ──────────────────────────────────────────────────
# App Runner instance role — grants the running application permission
# to access AWS services: S3, Secrets Manager, KMS, SQS, SES.

resource "aws_iam_role" "app_runner_instance" {
  name        = "eclat-${var.environment}-apprunner-instance-role"
  description = "Role assumed by the eclat Next.js application running in App Runner"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "eclat-${var.environment}-apprunner-instance-role" }
}

# Least-privilege policy — built from local.app_runner_iam_statements above
resource "aws_iam_role_policy" "app_runner_instance" {
  name = "eclat-${var.environment}-apprunner-instance-policy"
  role = aws_iam_role.app_runner_instance.id

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = local.app_runner_iam_statements
  })
}

# ECR access role — allows App Runner to pull images from ECR
resource "aws_iam_role" "app_runner_ecr_access" {
  name        = "eclat-${var.environment}-apprunner-ecr-role"
  description = "Allows App Runner service to pull Docker images from ECR"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "eclat-${var.environment}-apprunner-ecr-role" }
}

resource "aws_iam_role_policy_attachment" "app_runner_ecr_access" {
  role       = aws_iam_role.app_runner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# ─── App Runner Service ───────────────────────────────────────────────────────

resource "aws_apprunner_service" "eclat" {
  count        = var.create_app_runner_service ? 1 : 0
  service_name = "eclat-${var.environment}"

  source_configuration {
    # Only include authentication for private ECR images.
    # Public ECR images (public.ecr.aws/*) do not accept an access role —
    # passing one causes CREATE_FAILED with "Invalid Access Role".
    dynamic "authentication_configuration" {
      for_each = local.is_public_ecr ? [] : [1]
      content {
        access_role_arn = aws_iam_role.app_runner_ecr_access.arn
      }
    }

    image_repository {
      image_identifier      = var.ecr_image_uri
      image_repository_type = local.is_public_ecr ? "ECR_PUBLIC" : "ECR"

      image_configuration {
        port = "3000"

        # Environment variables read by the Next.js app at runtime.
        # Secrets are fetched at startup via the instance role — not hardcoded here.
        runtime_environment_variables = merge(
          {
            NODE_ENV               = "production"
            PORT                   = "3000"
            # Override the container hostname App Runner injects so Next.js
            # standalone server.js binds to 0.0.0.0, not the internal IP.
            # Without this, health checks to localhost:3000 get connection refused.
            HOSTNAME               = "0.0.0.0"
            AWS_REGION             = var.aws_region
            ENVIRONMENT            = var.environment
            # Allows the service to start before all secrets are configured.
            # Remove this once all env vars are set in the App Runner console.
            SKIP_ENV_VALIDATION    = "1"
          },
          # When using Neon (use_rds = false), inject DATABASE_URL directly.
          # For RDS, the app reads /eclat/{env}/database-url from Secrets Manager.
          var.use_rds ? {} : { DATABASE_URL = var.neon_database_url }
        )
      }
    }

    # Disable auto-deploy from ECR — GitHub Actions controls deploys explicitly
    auto_deployments_enabled = false
  }

  instance_configuration {
    cpu    = var.app_runner_cpu
    memory = var.app_runner_memory

    # Instance role grants app access to AWS services
    instance_role_arn = aws_iam_role.app_runner_instance.arn
  }

  # Auto-scaling: keep min 1 instance to avoid cold starts on messaging
  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  depends_on = [aws_iam_role_policy_attachment.app_runner_ecr_access]

  # VPC connector used when enable_vpc = true (RDS in private subnet).
  # When enable_vpc = false (Neon test tier), App Runner uses DEFAULT egress
  # and reaches Neon directly over the internet — no VPC needed.
  network_configuration {
    egress_configuration {
      egress_type       = var.enable_vpc ? "VPC" : "DEFAULT"
      vpc_connector_arn = var.enable_vpc ? aws_apprunner_vpc_connector.main[0].arn : null
    }
    ingress_configuration {
      is_publicly_accessible = true
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 3
  }

  observability_configuration {
    observability_enabled = true
    observability_configuration_arn = aws_apprunner_observability_configuration.main.arn
  }

  tags = { Name = "eclat-${var.environment}-apprunner" }
}

# ─── App Runner Auto-scaling ──────────────────────────────────────────────────

resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "eclat-${var.environment}-autoscaling"

  min_size            = var.app_runner_min_size
  max_size            = var.app_runner_max_size
  max_concurrency     = 100 # requests per instance before scaling out

  tags = { Name = "eclat-${var.environment}-autoscaling" }
}

# ─── App Runner Observability (X-Ray tracing) ─────────────────────────────────

resource "aws_apprunner_observability_configuration" "main" {
  observability_configuration_name = "eclat-${var.environment}-observability"

  trace_configuration {
    vendor = "AWSXRAY"
  }

  tags = { Name = "eclat-${var.environment}-observability" }
}

# ─── App Runner Custom Domain ─────────────────────────────────────────────────
# Associates the custom domain with App Runner service.
# After apply, output the validation records and add them to DNS.

resource "aws_apprunner_custom_domain_association" "main" {
  count                = var.create_app_runner_service ? 1 : 0
  domain_name          = var.environment == "prod" ? "app.${var.domain_name}" : "${var.environment}.${var.domain_name}"
  service_arn          = aws_apprunner_service.eclat[0].arn
  enable_www_subdomain = false

  depends_on = [aws_apprunner_service.eclat]
}
