###############################################################################
# outputs.tf
# Exported values after terraform apply.
# These are used by the CI/CD pipeline and application configuration.
# Sensitive outputs are marked sensitive — they won't print to console.
###############################################################################

# ─── Networking ───────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "VPC ID (empty when enable_vpc = false)"
  value       = var.enable_vpc ? aws_vpc.main[0].id : "VPC disabled — using Neon external DB"
}

output "private_subnet_ids" {
  description = "Private subnet IDs (empty when enable_vpc = false)"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (empty when enable_vpc = false)"
  value       = aws_subnet.public[*].id
}

# ─── App Runner ───────────────────────────────────────────────────────────────

output "app_runner_service_url" {
  description = "App Runner service URL (before custom domain). Null until create_app_runner_service = true."
  value       = var.create_app_runner_service ? try("https://${aws_apprunner_service.eclat[0].service_url}", null) : null
}

output "app_runner_service_arn" {
  description = "App Runner service ARN (used in CI/CD deploy commands). Null until create_app_runner_service = true."
  value       = var.create_app_runner_service ? aws_apprunner_service.eclat[0].arn : null
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing Docker images"
  value       = aws_ecr_repository.eclat.repository_url
}

# ─── Database ─────────────────────────────────────────────────────────────────

output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint (empty when use_rds = false)"
  value       = var.use_rds ? aws_db_instance.eclat[0].endpoint : "Using Neon PostgreSQL — see neon_database_url"
  sensitive   = true
}

output "rds_port" {
  description = "RDS PostgreSQL port (empty when use_rds = false)"
  value       = var.use_rds ? aws_db_instance.eclat[0].port : 0
}

output "rds_database_name" {
  description = "PostgreSQL database name (empty when use_rds = false)"
  value       = var.use_rds ? aws_db_instance.eclat[0].db_name : var.db_name
}

# ─── Storage ──────────────────────────────────────────────────────────────────

output "s3_profiles_bucket" {
  description = "S3 bucket name for profile photos and voice intros"
  value       = aws_s3_bucket.profiles.id
}

output "s3_verification_bucket" {
  description = "S3 bucket name for government ID verification documents (private)"
  value       = aws_s3_bucket.verification.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidation in CI/CD)"
  value       = aws_cloudfront_distribution.main.id
}

# ─── Secrets ──────────────────────────────────────────────────────────────────

output "secrets_manager_prefix" {
  description = "AWS Secrets Manager path prefix for this environment"
  value       = "/eclat/${var.environment}"
}

# ─── Security ─────────────────────────────────────────────────────────────────

output "kms_key_arn" {
  description = "KMS key ARN for application-level field encryption"
  value       = aws_kms_key.eclat.arn
  sensitive   = true
}

output "kms_key_id" {
  description = "KMS key ID (alias)"
  value       = aws_kms_alias.eclat.name
}

# ─── Monitoring ───────────────────────────────────────────────────────────────

output "sns_alert_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarm notifications"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=eclat-${var.environment}"
}

# ─── Real-time ────────────────────────────────────────────────────────────────

output "websocket_api_endpoint" {
  description = "API Gateway WebSocket endpoint for video call signalling"
  value       = "${aws_apigatewayv2_stage.websocket.invoke_url}"
}

# ─── Background Jobs ──────────────────────────────────────────────────────────

output "sqs_email_queue_url" {
  description = "SQS queue URL for email dispatch jobs (empty when enable_background_jobs = false)"
  value       = var.enable_background_jobs ? aws_sqs_queue.email[0].url : "Background jobs disabled in this tier"
}

output "sqs_delete_queue_url" {
  description = "SQS queue URL for account deletion jobs (empty when enable_background_jobs = false)"
  value       = var.enable_background_jobs ? aws_sqs_queue.account_delete[0].url : "Background jobs disabled in this tier"
}

# ─── DNS ──────────────────────────────────────────────────────────────────────

output "nameservers" {
  description = "Route 53 nameservers — point your domain registrar to these"
  value       = var.create_hosted_zone ? aws_route53_zone.main[0].name_servers : ["Hosted zone not managed by Terraform"]
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN (us-east-1) attached to CloudFront"
  value       = aws_acm_certificate.main.arn
}
