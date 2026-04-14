###############################################################################
# monitoring.tf
# CloudWatch log groups, metric alarms, SNS topic, and dashboard.
# Every critical metric has an alarm → SNS → email notification.
###############################################################################

# ─── SNS Topic for Alerts ─────────────────────────────────────────────────────
# All CloudWatch alarms publish to this topic.
# Email subscription created below — confirm it via the email sent to alert_email.

resource "aws_sns_topic" "alerts" {
  name         = "eclat-${var.environment}-alerts"
  display_name = "eclat ${var.environment} Alerts"
  kms_master_key_id = aws_kms_key.eclat.arn # Encrypt SNS messages at rest

  tags = { Name = "eclat-${var.environment}-alerts" }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
  # After apply, AWS sends a confirmation email to alert_email.
  # The subscription won't be active until the email link is clicked.
}

# ─── CloudWatch Log Groups ────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "app_runner" {
  name              = "/aws/apprunner/eclat-${var.environment}/application"
  retention_in_days = var.environment == "prod" ? 90 : 30
  kms_key_id        = aws_kms_key.eclat.arn

  tags = { Name = "eclat-${var.environment}-apprunner-logs" }
}

resource "aws_cloudwatch_log_group" "lambda_daily_queue" {
  count             = var.enable_background_jobs ? 1 : 0
  name              = "/aws/lambda/eclat-daily-queue-${var.environment}"
  retention_in_days = 30
  tags              = { Name = "eclat-${var.environment}-lambda-daily-queue-logs" }
}

resource "aws_cloudwatch_log_group" "lambda_email_digest" {
  count             = var.enable_background_jobs ? 1 : 0
  name              = "/aws/lambda/eclat-email-digest-${var.environment}"
  retention_in_days = 30
  tags              = { Name = "eclat-${var.environment}-lambda-email-digest-logs" }
}

resource "aws_cloudwatch_log_group" "lambda_account_delete" {
  count             = var.enable_background_jobs ? 1 : 0
  name              = "/aws/lambda/eclat-account-delete-${var.environment}"
  retention_in_days = 90
  tags              = { Name = "eclat-${var.environment}-lambda-account-delete-logs" }
}

resource "aws_cloudwatch_log_group" "lambda_match_expire" {
  count             = var.enable_background_jobs ? 1 : 0
  name              = "/aws/lambda/eclat-match-expire-${var.environment}"
  retention_in_days = 30
  tags              = { Name = "eclat-${var.environment}-lambda-match-expire-logs" }
}

# ─── App Runner Alarms ────────────────────────────────────────────────────────

# Alert when 5XX error rate exceeds 5% over a 5-minute window
resource "aws_cloudwatch_metric_alarm" "apprunner_5xx" {
  count               = var.create_app_runner_service ? 1 : 0
  alarm_name          = "eclat-${var.environment}-apprunner-5xx-errors"
  alarm_description   = "App Runner 5XX error rate exceeded 5% for 5 minutes — possible application crash"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5xxStatusCodeRate"
  namespace           = "AWS/AppRunner"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = aws_apprunner_service.eclat[0].service_name
    ServiceId   = aws_apprunner_service.eclat[0].service_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = { Name = "eclat-${var.environment}-apprunner-5xx-alarm" }
}

# Alert when request latency p99 exceeds 10 seconds
resource "aws_cloudwatch_metric_alarm" "apprunner_latency" {
  count               = var.create_app_runner_service ? 1 : 0
  alarm_name          = "eclat-${var.environment}-apprunner-high-latency"
  alarm_description   = "App Runner p99 latency exceeded 10 seconds — application may be under stress"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RequestLatency"
  namespace           = "AWS/AppRunner"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 10000 # milliseconds
  treat_missing_data  = "notBreaching"

  dimensions = {
    ServiceName = aws_apprunner_service.eclat[0].service_name
    ServiceId   = aws_apprunner_service.eclat[0].service_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = { Name = "eclat-${var.environment}-apprunner-latency-alarm" }
}

# ─── RDS Alarms ───────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  count               = var.use_rds ? 1 : 0
  alarm_name          = "eclat-${var.environment}-rds-high-cpu"
  alarm_description   = "RDS CPU utilization exceeded 80% for 10 minutes — consider scaling up"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.eclat[0].identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = { Name = "eclat-${var.environment}-rds-cpu-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  count               = var.use_rds ? 1 : 0
  alarm_name          = "eclat-${var.environment}-rds-low-storage"
  alarm_description   = "RDS free storage is below 5GB — database may run out of space"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5GB in bytes
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.eclat[0].identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = { Name = "eclat-${var.environment}-rds-storage-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count               = var.use_rds ? 1 : 0
  alarm_name          = "eclat-${var.environment}-rds-high-connections"
  alarm_description   = "RDS connection count exceeded 80 — possible connection pool leak"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.eclat[0].identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = { Name = "eclat-${var.environment}-rds-connections-alarm" }
}

# ─── SQS Dead Letter Queue Alarm ─────────────────────────────────────────────
# Any message in DLQ means a background job failed 3 times — immediate attention needed.

resource "aws_cloudwatch_metric_alarm" "sqs_email_dlq" {
  count               = var.enable_background_jobs ? 1 : 0
  alarm_name          = "eclat-${var.environment}-sqs-email-dlq-not-empty"
  alarm_description   = "Email DLQ has messages — email Lambda is failing repeatedly"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.email_dlq[0].name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = { Name = "eclat-${var.environment}-sqs-email-dlq-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "sqs_delete_dlq" {
  count               = var.enable_background_jobs ? 1 : 0
  alarm_name          = "eclat-${var.environment}-sqs-delete-dlq-not-empty"
  alarm_description   = "Account delete DLQ has messages — deletion Lambda is failing (GDPR risk)"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.account_delete_dlq[0].name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = { Name = "eclat-${var.environment}-sqs-delete-dlq-alarm" }
}

# ─── WAF Alarm ────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "waf_blocked_spike" {
  count    = var.use_waf ? 1 : 0
  provider = aws.us_east_1 # WAF metrics are in us-east-1 for CloudFront

  alarm_name          = "eclat-${var.environment}-waf-blocked-spike"
  alarm_description   = "WAF blocked more than 500 requests in 5 minutes — possible attack"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 500
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = try(aws_wafv2_web_acl.main[0].name, "waf-disabled")
    Region = "us-east-1"
    Rule   = "ALL"
  }

  # No alarm_actions: CloudWatch in us-east-1 cannot publish to SNS in ap-southeast-1
  # Monitor this alarm via the CloudWatch console in us-east-1

  tags = { Name = "eclat-${var.environment}-waf-blocked-alarm" }
}

# ─── CloudWatch Dashboard ─────────────────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "eclat-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "App Runner — Request Rate & Errors"
          region  = var.aws_region
          period  = 300
          stat    = "Sum"
          metrics = [
            ["AWS/AppRunner", "RequestCount", "ServiceName", try(aws_apprunner_service.eclat[0].service_name, "not-deployed"), "ServiceId", try(aws_apprunner_service.eclat[0].service_id, "none")],
            ["AWS/AppRunner", "5xxStatusCodeCount", "ServiceName", try(aws_apprunner_service.eclat[0].service_name, "not-deployed"), "ServiceId", try(aws_apprunner_service.eclat[0].service_id, "none")],
            ["AWS/AppRunner", "4xxStatusCodeCount", "ServiceName", try(aws_apprunner_service.eclat[0].service_name, "not-deployed"), "ServiceId", try(aws_apprunner_service.eclat[0].service_id, "none")]
          ]
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "RDS — CPU & Connections"
          region  = var.aws_region
          period  = 300
          metrics = [
            [{ expression = "m1", label = "CPU %" }],
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", try(aws_db_instance.eclat[0].identifier, "rds-disabled"), { id = "m1", visible = false }],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", try(aws_db_instance.eclat[0].identifier, "rds-disabled")]
          ]
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "SQS — Queue Depth"
          region  = var.aws_region
          period  = 300
          stat    = "Maximum"
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", try(aws_sqs_queue.email[0].name, "sqs-disabled")],
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", try(aws_sqs_queue.account_delete[0].name, "sqs-disabled")]
          ]
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "App Runner — Latency p50/p99"
          region  = var.aws_region
          period  = 300
          metrics = [
            ["AWS/AppRunner", "RequestLatency", "ServiceName", try(aws_apprunner_service.eclat[0].service_name, "not-deployed"), "ServiceId", try(aws_apprunner_service.eclat[0].service_id, "none"), { stat = "p50" }],
            ["AWS/AppRunner", "RequestLatency", "ServiceName", try(aws_apprunner_service.eclat[0].service_name, "not-deployed"), "ServiceId", try(aws_apprunner_service.eclat[0].service_id, "none"), { stat = "p99" }]
          ]
        }
      }
    ]
  })
}
