###############################################################################
# jobs.tf
# SQS queues, Lambda functions, and EventBridge scheduled rules for
# background job processing.
#
# When enable_background_jobs = false (test tier):
#   - No SQS queues, Lambda functions, or EventBridge rules created
#   - Background tasks (queue generation, match expiry) must be triggered
#     manually via internal API routes during testing
#   - Account deletion in test: handle manually or via direct DB query
#
# Background jobs (when enabled):
#   1. daily-queue   — generates daily curated match queue (02:00 SGT)
#   2. match-expire  — expires unseen matches after 7 days (every 6 hours)
#   3. email-digest  — processes email send queue from SQS (event-driven)
#   4. account-delete — hard-deletes accounts after soft-delete (GDPR)
###############################################################################

# ─── SQS Queues ───────────────────────────────────────────────────────────────

resource "aws_sqs_queue" "email_dlq" {
  count                     = var.enable_background_jobs ? 1 : 0
  name                      = "eclat-email-dlq-${var.environment}"
  message_retention_seconds = 1209600

  kms_master_key_id = aws_kms_key.eclat.arn

  tags = { Name = "eclat-${var.environment}-email-dlq" }
}

resource "aws_sqs_queue" "email" {
  count                      = var.enable_background_jobs ? 1 : 0
  name                       = "eclat-email-${var.environment}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  delay_seconds              = 0
  receive_wait_time_seconds  = 20

  kms_master_key_id = aws_kms_key.eclat.arn

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq[0].arn
    maxReceiveCount     = 3
  })

  tags = { Name = "eclat-${var.environment}-email-queue" }
}

resource "aws_sqs_queue" "account_delete_dlq" {
  count                     = var.enable_background_jobs ? 1 : 0
  name                      = "eclat-delete-dlq-${var.environment}"
  message_retention_seconds = 1209600

  kms_master_key_id = aws_kms_key.eclat.arn

  tags = { Name = "eclat-${var.environment}-delete-dlq" }
}

resource "aws_sqs_queue" "account_delete" {
  count                      = var.enable_background_jobs ? 1 : 0
  name                       = "eclat-delete-${var.environment}"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20

  kms_master_key_id = aws_kms_key.eclat.arn

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.account_delete_dlq[0].arn
    maxReceiveCount     = 3
  })

  tags = { Name = "eclat-${var.environment}-delete-queue" }
}

# ─── Lambda: Daily Queue Generator ────────────────────────────────────────────

data "archive_file" "daily_queue" {
  count       = var.enable_background_jobs ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda/daily_queue.zip"
  source {
    content  = file("${path.module}/lambda/daily_queue/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "daily_queue" {
  count            = var.enable_background_jobs ? 1 : 0
  function_name    = "eclat-daily-queue-${var.environment}"
  description      = "Generates daily curated match queue for all active eclat users"
  filename         = data.archive_file.daily_queue[0].output_path
  source_code_hash = data.archive_file.daily_queue[0].output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_execution.arn
  timeout          = 300
  memory_size      = 512

  environment {
    variables = {
      ENVIRONMENT = var.environment
      DB_SECRET   = try(aws_secretsmanager_secret.database_url[0].arn, "")
    }
  }

  dynamic "vpc_config" {
    for_each = var.enable_vpc ? [1] : []
    content {
      subnet_ids         = aws_subnet.private[*].id
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }

  tags = { Name = "eclat-${var.environment}-daily-queue" }
}

resource "aws_cloudwatch_event_rule" "daily_queue" {
  count               = var.enable_background_jobs ? 1 : 0
  name                = "eclat-${var.environment}-daily-queue-trigger"
  description         = "Triggers eclat daily match queue generation at 02:00 SGT"
  schedule_expression = "cron(0 18 * * ? *)"

  tags = { Name = "eclat-${var.environment}-daily-queue-rule" }
}

resource "aws_cloudwatch_event_target" "daily_queue" {
  count = var.enable_background_jobs ? 1 : 0
  rule  = aws_cloudwatch_event_rule.daily_queue[0].name
  arn   = aws_lambda_function.daily_queue[0].arn
}

resource "aws_lambda_permission" "daily_queue_eventbridge" {
  count         = var.enable_background_jobs ? 1 : 0
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_queue[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_queue[0].arn
}

# ─── Lambda: Match Expire ─────────────────────────────────────────────────────

data "archive_file" "match_expire" {
  count       = var.enable_background_jobs ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda/match_expire.zip"
  source {
    content  = file("${path.module}/lambda/match_expire/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "match_expire" {
  count            = var.enable_background_jobs ? 1 : 0
  function_name    = "eclat-match-expire-${var.environment}"
  description      = "Expires unseen match queue items older than 7 days"
  filename         = data.archive_file.match_expire[0].output_path
  source_code_hash = data.archive_file.match_expire[0].output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_execution.arn
  timeout          = 120
  memory_size      = 256

  environment {
    variables = {
      ENVIRONMENT = var.environment
      DB_SECRET   = try(aws_secretsmanager_secret.database_url[0].arn, "")
    }
  }

  dynamic "vpc_config" {
    for_each = var.enable_vpc ? [1] : []
    content {
      subnet_ids         = aws_subnet.private[*].id
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }

  tags = { Name = "eclat-${var.environment}-match-expire" }
}

resource "aws_cloudwatch_event_rule" "match_expire" {
  count               = var.enable_background_jobs ? 1 : 0
  name                = "eclat-${var.environment}-match-expire-trigger"
  description         = "Triggers eclat match expiry check every 6 hours"
  schedule_expression = "rate(6 hours)"

  tags = { Name = "eclat-${var.environment}-match-expire-rule" }
}

resource "aws_cloudwatch_event_target" "match_expire" {
  count = var.enable_background_jobs ? 1 : 0
  rule  = aws_cloudwatch_event_rule.match_expire[0].name
  arn   = aws_lambda_function.match_expire[0].arn
}

resource "aws_lambda_permission" "match_expire_eventbridge" {
  count         = var.enable_background_jobs ? 1 : 0
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.match_expire[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.match_expire[0].arn
}

# ─── Lambda: Email Digest ─────────────────────────────────────────────────────

data "archive_file" "email_digest" {
  count       = var.enable_background_jobs ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda/email_digest.zip"
  source {
    content  = file("${path.module}/lambda/email_digest/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "email_digest" {
  count            = var.enable_background_jobs ? 1 : 0
  function_name    = "eclat-email-digest-${var.environment}"
  description      = "Processes email queue and sends transactional emails via SES"
  filename         = data.archive_file.email_digest[0].output_path
  source_code_hash = data.archive_file.email_digest[0].output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_execution.arn
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      FROM_EMAIL     = "noreply@${var.domain_name}"
      AWS_REGION_VAR = var.aws_region
    }
  }

  tags = { Name = "eclat-${var.environment}-email-digest" }
}

resource "aws_lambda_event_source_mapping" "email_sqs" {
  count                              = var.enable_background_jobs ? 1 : 0
  event_source_arn                   = aws_sqs_queue.email[0].arn
  function_name                      = aws_lambda_function.email_digest[0].arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5
  function_response_types            = ["ReportBatchItemFailures"]
}

# ─── Lambda: Account Delete ───────────────────────────────────────────────────

data "archive_file" "account_delete" {
  count       = var.enable_background_jobs ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/lambda/account_delete.zip"
  source {
    content  = file("${path.module}/lambda/account_delete/handler.py")
    filename = "handler.py"
  }
}

resource "aws_lambda_function" "account_delete" {
  count            = var.enable_background_jobs ? 1 : 0
  function_name    = "eclat-account-delete-${var.environment}"
  description      = "Hard-deletes user data after account soft-deletion (GDPR erasure)"
  filename         = data.archive_file.account_delete[0].output_path
  source_code_hash = data.archive_file.account_delete[0].output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_execution.arn
  timeout          = 120
  memory_size      = 256

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      DB_SECRET           = try(aws_secretsmanager_secret.database_url[0].arn, "")
      PROFILES_BUCKET     = aws_s3_bucket.profiles.id
      VERIFICATION_BUCKET = aws_s3_bucket.verification.id
    }
  }

  dynamic "vpc_config" {
    for_each = var.enable_vpc ? [1] : []
    content {
      subnet_ids         = aws_subnet.private[*].id
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }

  tags = { Name = "eclat-${var.environment}-account-delete" }
}

resource "aws_iam_role_policy" "lambda_s3_delete" {
  count = var.enable_background_jobs ? 1 : 0
  name  = "eclat-${var.environment}-lambda-s3-delete"
  role  = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DeleteUserFiles"
      Effect = "Allow"
      Action = ["s3:DeleteObject", "s3:ListBucket"]
      Resource = [
        aws_s3_bucket.profiles.arn,
        "${aws_s3_bucket.profiles.arn}/*"
      ]
    }]
  })
}

resource "aws_lambda_event_source_mapping" "account_delete_sqs" {
  count                   = var.enable_background_jobs ? 1 : 0
  event_source_arn        = aws_sqs_queue.account_delete[0].arn
  function_name           = aws_lambda_function.account_delete[0].arn
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]
}
