###############################################################################
# database.tf
# RDS PostgreSQL — primary data store for eclat application data.
#
# When use_rds = false (test tier):
#   - No RDS instance created — saves ~$15/mo
#   - Set neon_database_url in tfvars to your Neon connection string
#   - App Runner receives DATABASE_URL directly as an environment variable
#
# When use_rds = true (staging/prod):
#   - RDS db instance in private subnets, accessed via VPC connector
#   - Master password auto-generated and stored in Secrets Manager
###############################################################################

# ─── Random password for RDS master user ─────────────────────────────────────

resource "random_password" "db_master" {
  count            = var.use_rds ? 1 : 0
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  count                   = var.use_rds ? 1 : 0
  name                    = "/eclat/${var.environment}/db-master-password"
  description             = "RDS PostgreSQL master password for eclat ${var.environment}"
  recovery_window_in_days = 7

  tags = { Name = "eclat-${var.environment}-db-password" }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  count         = var.use_rds ? 1 : 0
  secret_id     = aws_secretsmanager_secret.db_password[0].id
  secret_string = random_password.db_master[0].result
}

# ─── RDS Parameter Group ──────────────────────────────────────────────────────

resource "aws_db_parameter_group" "main" {
  count       = var.use_rds ? 1 : 0
  family      = "postgres15"
  name        = "eclat-${var.environment}-pg15"
  description = "eclat ${var.environment} PostgreSQL 15 parameters"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = { Name = "eclat-${var.environment}-pg15-params" }
}

# ─── RDS Instance ─────────────────────────────────────────────────────────────

resource "aws_db_instance" "eclat" {
  count      = var.use_rds ? 1 : 0
  identifier = "eclat-${var.environment}"

  engine               = "postgres"
  engine_version       = "15.12"
  instance_class       = var.db_instance_class
  parameter_group_name = aws_db_parameter_group.main[0].name

  allocated_storage     = var.db_allocated_storage_gb
  max_allocated_storage = var.db_max_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = "eclat_admin"
  password = random_password.db_master[0].result

  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = false

  multi_az = var.db_multi_az

  backup_retention_period   = var.db_backup_retention_days
  backup_window             = "18:00-19:00"
  maintenance_window        = "sun:19:00-sun:20:00"
  delete_automated_backups  = false
  copy_tags_to_snapshot     = true
  skip_final_snapshot       = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment != "dev" ? "eclat-${var.environment}-final-${formatdate("YYYY-MM-DD", timestamp())}" : null

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  deletion_protection = var.environment == "prod" ? true : false

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring[0].arn

  tags = { Name = "eclat-${var.environment}-postgres" }

  depends_on = [aws_secretsmanager_secret_version.db_password]
}

# ─── IAM role for RDS Enhanced Monitoring ─────────────────────────────────────

resource "aws_iam_role" "rds_monitoring" {
  count       = var.use_rds ? 1 : 0
  name        = "eclat-${var.environment}-rds-monitoring-role"
  description = "Allows RDS to publish enhanced monitoring metrics to CloudWatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "eclat-${var.environment}-rds-monitoring-role" }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.use_rds ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ─── Store full DATABASE_URL in Secrets Manager ───────────────────────────────
# Only created when use_rds = true. When use_rds = false, DATABASE_URL is
# passed directly to App Runner as an environment variable (from neon_database_url).

resource "aws_secretsmanager_secret" "database_url" {
  count                   = var.use_rds ? 1 : 0
  name                    = "/eclat/${var.environment}/database-url"
  description             = "Full PostgreSQL connection URL for eclat ${var.environment} application"
  recovery_window_in_days = 7

  tags = { Name = "eclat-${var.environment}-database-url" }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  count         = var.use_rds ? 1 : 0
  secret_id     = aws_secretsmanager_secret.database_url[0].id
  secret_string = "postgresql://${aws_db_instance.eclat[0].username}:${random_password.db_master[0].result}@${aws_db_instance.eclat[0].endpoint}/${var.db_name}?sslmode=require"

  depends_on = [aws_db_instance.eclat]
}
