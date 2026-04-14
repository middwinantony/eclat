# eclat Infrastructure — Terraform

AWS infrastructure for eclat, managed entirely as code.
All resources tagged with `Project=eclat`, `Environment`, and `ManagedBy=terraform`.

---

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with your account
- AWS account ID handy for `.tfvars` files

---

## One-Time Bootstrap

Run once before `terraform init`. Creates the S3 state bucket and DynamoDB lock table.

```bash
# Create state bucket
aws s3 mb s3://eclat-terraform-state --region ap-southeast-1

# Enable versioning (so you can recover from accidental state deletion)
aws s3api put-bucket-versioning \
  --bucket eclat-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket eclat-terraform-state \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name eclat-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

---

## Fill in Your Values

Edit the `.tfvars` file for your target environment and replace:
- `YOUR_AWS_ACCOUNT_ID` — your 12-digit AWS account ID
- `YOUR_EMAIL@example.com` — your alert email address

---

## Workflow for Each Environment

### Development

```bash
cd infrastructure/terraform

# Initialise with dev backend
terraform init -backend-config=environments/dev.backend.hcl

# Preview what will be created (safe — no changes made)
terraform plan -var-file=environments/dev.tfvars

# Apply changes
terraform apply -var-file=environments/dev.tfvars

# Destroy dev environment (careful — deletes everything)
terraform destroy -var-file=environments/dev.tfvars
```

### Staging

```bash
# Re-initialise if switching from dev
terraform init -reconfigure -backend-config=environments/staging.backend.hcl

terraform plan -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars
```

### Production

```bash
# Re-initialise if switching from staging
terraform init -reconfigure -backend-config=environments/prod.backend.hcl

# ALWAYS plan first for production
terraform plan -var-file=environments/prod.tfvars

# Review the plan carefully, then apply
terraform apply -var-file=environments/prod.tfvars
```

---

## How to Switch Environments

```bash
# Switch to prod (from staging)
terraform init -reconfigure -backend-config=environments/prod.backend.hcl
terraform workspace list  # confirm you're on the right state
```

---

## After First Apply — Populate Secrets

After `terraform apply`, all Secrets Manager placeholders are created but empty.
Populate each one:

```bash
# List all secrets for an environment
aws secretsmanager list-secrets \
  --filters Key=name,Values=/eclat/staging/ \
  --query "SecretList[].Name" \
  --output table

# Set a secret value
aws secretsmanager put-secret-value \
  --secret-id /eclat/staging/stripe-secret-key \
  --secret-string "sk_test_..."
```

---

## How to Import Existing Resources

If a resource already exists in AWS and you want Terraform to manage it:

```bash
# Example: import an existing RDS instance
terraform import -var-file=environments/prod.tfvars \
  aws_db_instance.eclat "eclat-prod"

# Example: import an existing S3 bucket
terraform import -var-file=environments/prod.tfvars \
  aws_s3_bucket.profiles "eclat-profiles-prod-123456789012"
```

---

## File Reference

| File | What it creates |
|---|---|
| `main.tf` | AWS provider, S3+DynamoDB backend |
| `variables.tf` | All input variable definitions |
| `outputs.tf` | Exported values after apply |
| `networking.tf` | VPC, subnets, NAT GW, security groups, App Runner VPC connector |
| `database.tf` | RDS PostgreSQL 15, parameter group, DB subnet group, master password in Secrets Manager |
| `hosting.tf` | ECR repository, App Runner service, IAM roles, auto-scaling |
| `storage.tf` | S3 profiles bucket (CDN), S3 verification bucket (private + Object Lock) |
| `secrets.tf` | All Secrets Manager secret placeholders |
| `security.tf` | KMS CMK, ACM certificate, CloudFront OAC, WAF WebACL, CloudFront distribution, security headers |
| `monitoring.tf` | SNS topic, CloudWatch log groups, alarms, dashboard |
| `dns.tf` | Route 53 hosted zone, A/AAAA records, SES email records (SPF, DKIM, DMARC) |
| `realtime.tf` | API Gateway WebSocket, Lambda authorizer, Lambda router |
| `jobs.tf` | SQS queues (email + delete), Lambda functions (daily-queue, match-expire, email-digest, account-delete), EventBridge rules |

---

## Common Issues

**`Error: S3 bucket already exists`**
Someone already created a bucket with that name. Update `aws_account_id` in `.tfvars`.

**`Error: Error acquiring the state lock`**
Another `terraform apply` is running. If it's stuck: check the DynamoDB `eclat-terraform-locks` table and delete the lock item manually.

**`ACM certificate stuck in PENDING_VALIDATION`**
The DNS validation records haven't propagated yet. Run:
```bash
terraform output nameservers  # Make sure your registrar points here
```
Wait 5–30 minutes for DNS to propagate, then re-run `terraform apply`.

**`App Runner can't connect to RDS`**
Check the security group rules — `app_runner_connector` SG must be in the inbound rules of `rds` SG on port 5432.
