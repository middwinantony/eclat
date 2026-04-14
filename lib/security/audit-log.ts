/**
 * audit-log.ts
 * Writes security-relevant actions to the audit_logs table.
 *
 * Every sensitive action in the app (auth, billing, admin, profile changes)
 * MUST call writeAuditLog. This is required for PCI-DSS compliance.
 *
 * IP addresses are encrypted before storage using KMS (they are PII).
 */

import { db } from '@/lib/db'
import { encryptOptionalField } from '@/lib/security/encrypt'

export type AuditAction =
  // Auth actions
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'password_reset_request'
  | 'email_verified'
  | '2fa_enabled'
  | '2fa_disabled'
  // Profile actions
  | 'profile_created'
  | 'profile_updated'
  | 'photo_uploaded'
  | 'photo_deleted'
  | 'account_deleted'
  // Verification
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_rejected'
  // Match actions
  | 'profile_liked'
  | 'profile_passed'
  | 'match_created'
  | 'queue_passed'
  // Message actions
  | 'conversation_started'
  | 'message_sent'
  | 'message_deleted'
  // Billing
  | 'checkout_initiated'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'payment_failed'
  | 'plan_upgraded'
  | 'plan_downgraded'
  // Admin
  | 'user_banned'
  | 'user_restored'
  | 'user_deleted'
  | 'verification_reviewed'
  | 'event_created'
  // Privacy
  | 'user_blocked'
  | 'user_hidden'
  | 'incognito_toggled'
  // Security events
  | 'rate_limit_triggered'
  | 'invalid_token'
  | 'unauthorized_access_attempt'

export interface AuditLogParams {
  userId: string | null
  action: AuditAction
  entityType?: string
  entityId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

/**
 * Writes an audit log entry to the database.
 * IP address is encrypted with KMS before storage.
 * Never throws — audit log failures must not break the main flow.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const encryptedIp = await encryptOptionalField(params.ipAddress ?? null)

    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        ipAddress: encryptedIp,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (_error) {
    // Audit log failures must never break the main request
    // Log to CloudWatch but don't rethrow
    console.error('[audit-log] Failed to write audit log:', {
      action: params.action,
      userId: params.userId ? '[redacted]' : null,
      // Never log IP, userAgent, or metadata here — they may contain PII
    })
  }
}

/**
 * Extracts IP address from Next.js request headers.
 * Handles both direct connections and CloudFront/ALB forwarded headers.
 */
export function getIpFromHeaders(headers: Headers): string {
  // CloudFront sets X-Forwarded-For to the real client IP
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list — take the first (real client)
    return forwarded.split(',')[0].trim()
  }

  return headers.get('x-real-ip') ?? 'unknown'
}
