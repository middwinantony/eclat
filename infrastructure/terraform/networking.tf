###############################################################################
# networking.tf
# VPC, subnets, routing, NAT Gateway, and security groups.
#
# Architecture (when enable_vpc = true):
#   - 1 VPC
#   - 2 public subnets (AZ a + b) — App Runner VPC connector, NAT GW
#   - 2 private subnets (AZ a + b) — RDS, Lambda
#   - 1 NAT Gateway in public-a — private subnets egress to internet
#   - Internet Gateway — public subnets ingress/egress
#
# When enable_vpc = false (test tier with Neon):
#   - No VPC, no NAT Gateway, no security groups
#   - App Runner uses DEFAULT egress (direct internet access)
#   - Neon DB is reached over the internet — no VPC required
#   - Saves ~$32/mo (NAT Gateway) + ~$5/mo (VPC resources)
###############################################################################

# ─── VPC ──────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  count                = var.enable_vpc ? 1 : 0
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "eclat-${var.environment}-vpc" }
}

# ─── Internet Gateway ─────────────────────────────────────────────────────────

resource "aws_internet_gateway" "main" {
  count  = var.enable_vpc ? 1 : 0
  vpc_id = aws_vpc.main[0].id
  tags   = { Name = "eclat-${var.environment}-igw" }
}

# ─── Public Subnets (2 AZs) ───────────────────────────────────────────────────

resource "aws_subnet" "public" {
  count = var.enable_vpc ? 2 : 0

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = "${var.aws_region}${count.index == 0 ? "a" : "b"}"
  map_public_ip_on_launch = true

  tags = { Name = "eclat-${var.environment}-public-${count.index == 0 ? "a" : "b"}" }
}

# ─── Private Subnets (RDS + Lambda) ───────────────────────────────────────────

resource "aws_subnet" "private" {
  count = var.enable_vpc ? 2 : 0

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = "${var.aws_region}${count.index == 0 ? "a" : "b"}"

  tags = { Name = "eclat-${var.environment}-private-${count.index == 0 ? "a" : "b"}" }
}

# ─── Elastic IP for NAT Gateway ───────────────────────────────────────────────

resource "aws_eip" "nat" {
  count  = (var.enable_vpc && var.enable_nat_gateway) ? 1 : 0
  domain = "vpc"
  tags   = { Name = "eclat-${var.environment}-nat-eip" }
}

# ─── NAT Gateway (~$32/mo — disabled in test tier) ───────────────────────────

resource "aws_nat_gateway" "main" {
  count = (var.enable_vpc && var.enable_nat_gateway) ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags       = { Name = "eclat-${var.environment}-nat" }
  depends_on = [aws_internet_gateway.main]
}

# ─── Route Tables ─────────────────────────────────────────────────────────────

resource "aws_route_table" "public" {
  count  = var.enable_vpc ? 1 : 0
  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = { Name = "eclat-${var.environment}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = var.enable_vpc ? 2 : 0
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

resource "aws_route_table" "private" {
  count  = var.enable_vpc ? 1 : 0
  vpc_id = aws_vpc.main[0].id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[0].id
    }
  }

  tags = { Name = "eclat-${var.environment}-rt-private" }
}

resource "aws_route_table_association" "private" {
  count          = var.enable_vpc ? 2 : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}

# ─── Security Groups ──────────────────────────────────────────────────────────

resource "aws_security_group" "app_runner_connector" {
  count       = var.enable_vpc ? 1 : 0
  name        = "eclat-${var.environment}-apprunner-sg"
  description = "Security group for App Runner VPC connector - allows outbound to RDS and internet"
  vpc_id      = aws_vpc.main[0].id

  egress {
    description = "Allow all outbound - App Runner needs internet for Stripe, Pusher, SES, etc."
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "eclat-${var.environment}-apprunner-sg" }
}

resource "aws_security_group" "lambda" {
  count       = var.enable_vpc ? 1 : 0
  name        = "eclat-${var.environment}-lambda-sg"
  description = "Security group for Lambda background job functions"
  vpc_id      = aws_vpc.main[0].id

  egress {
    description = "Allow all outbound - Lambda needs internet for SES email sending"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "eclat-${var.environment}-lambda-sg" }
}

resource "aws_security_group" "rds" {
  count       = var.enable_vpc ? 1 : 0
  name        = "eclat-${var.environment}-rds-sg"
  description = "Allow PostgreSQL inbound only from App Runner VPC connector and Lambda"
  vpc_id      = aws_vpc.main[0].id

  ingress {
    description     = "PostgreSQL from App Runner VPC connector"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_runner_connector[0].id]
  }

  ingress {
    description     = "PostgreSQL from Lambda functions"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda[0].id]
  }

  egress {
    description = "Allow all outbound (required for RDS maintenance)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "eclat-${var.environment}-rds-sg" }
}

# ─── App Runner VPC Connector ─────────────────────────────────────────────────
# Only created when enable_vpc = true. When false, App Runner uses DEFAULT
# egress (direct internet) and connects to Neon over the public internet.

resource "aws_apprunner_vpc_connector" "main" {
  count              = var.enable_vpc ? 1 : 0
  vpc_connector_name = "eclat-${var.environment}-connector"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.app_runner_connector[0].id]

  tags = { Name = "eclat-${var.environment}-vpc-connector" }
}

# ─── RDS Subnet Group ─────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  count       = var.use_rds ? 1 : 0
  name        = "eclat-${var.environment}-db-subnet-group"
  subnet_ids  = aws_subnet.private[*].id
  description = "Private subnets for eclat RDS - spans 2 AZs for Multi-AZ support"

  tags = { Name = "eclat-${var.environment}-db-subnet-group" }
}
