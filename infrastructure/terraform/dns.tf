###############################################################################
# dns.tf
# Route 53 hosted zone, DNS records for CloudFront, SES email, and health checks.
#
# Two modes:
#   create_hosted_zone = true  → Terraform manages the hosted zone
#   create_hosted_zone = false → Hosted zone already exists, just add records
#
# After apply, if create_hosted_zone = true:
#   Point your domain registrar's nameservers to the 4 NS records in outputs.nameservers
###############################################################################

# ─── Hosted Zone ──────────────────────────────────────────────────────────────

# Only created if create_hosted_zone = true
resource "aws_route53_zone" "main" {
  count   = var.create_hosted_zone ? 1 : 0
  name    = var.domain_name
  comment = "eclat ${var.environment} — managed by Terraform"

  tags = { Name = "eclat-${var.environment}-hosted-zone" }
}

# Reference existing hosted zone if not creating a new one.
# hosted_zone_name lets test/staging/dev point at the apex eclat.social zone
# even when domain_name is a subdomain (e.g. test.eclat.social).
data "aws_route53_zone" "existing" {
  count        = var.create_hosted_zone ? 0 : 1
  name         = var.hosted_zone_name != "" ? var.hosted_zone_name : var.domain_name
  private_zone = false
}

locals {
  zone_id = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.existing[0].zone_id
}

# ─── CloudFront DNS Records ────────────────────────────────────────────────────

# Apex domain → CloudFront
resource "aws_route53_record" "apex" {
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# www subdomain → CloudFront
resource "aws_route53_record" "www" {
  zone_id = local.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# IPv6 apex
resource "aws_route53_record" "apex_v6" {
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# ─── SES Email Records ─────────────────────────────────────────────────────────
# Required for sending email from noreply@eclat.social (or your domain).
# After apply, verify the domain in AWS SES console.

# SES domain verification TXT record
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

resource "aws_route53_record" "ses_verification" {
  zone_id = local.zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = [aws_ses_domain_identity.main.verification_token]
}

resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.domain
  depends_on = [aws_route53_record.ses_verification]
}

# SES DKIM records — improves email deliverability and prevents spoofing
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = local.zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# SPF record — tells email servers that SES is authorised to send from this domain
resource "aws_route53_record" "spf" {
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}

# DMARC policy — instructs receiving servers what to do with unauthenticated email
resource "aws_route53_record" "dmarc" {
  zone_id = local.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=quarantine; rua=mailto:dmarc@${var.domain_name}; pct=100"]
}

# SES MAIL FROM domain — makes From header match the sending domain (improves deliverability)
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.domain_name}"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = local.zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "MX"
  ttl     = 300
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = local.zone_id
  name    = aws_ses_domain_mail_from.main.mail_from_domain
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}

# ─── Route 53 Health Check (for CloudFront failover) ─────────────────────────

resource "aws_route53_health_check" "main" {
  fqdn              = var.domain_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/health"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true

  tags = { Name = "eclat-${var.environment}-health-check" }
}
