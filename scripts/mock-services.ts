/**
 * mock-services.ts
 * Mock implementations of all expensive external services for local development.
 *
 * Activated by: MOCK_EXTERNAL_SERVICES=true in .env.local
 * Real clients are used in all cloud environments (staging, production).
 *
 * Services mocked:
 *   - Pusher         — real-time messaging (channel events)
 *   - Daily.co       — video call room creation and token generation
 *   - Stripe         — checkout sessions, webhooks
 *   - Razorpay       — order creation, webhooks
 *   - Resend         — transactional email
 *   - Upstash Redis  — rate limiting (always passes in mock mode)
 *   - AWS KMS        — field encryption (uses base64 passthrough in dev)
 *   - AWS S3         — file uploads (returns local paths)
 *
 * USAGE in app code:
 *   import { getPusherServer, getEmailClient } from '@/lib/api/clients'
 *   // The client factory checks MOCK_EXTERNAL_SERVICES and returns the right impl.
 *
 * USAGE in scripts:
 *   import { mockAll } from '@/scripts/mock-services'
 *   mockAll()  // Call before any service interaction
 */

export const IS_MOCK_MODE = process.env.MOCK_EXTERNAL_SERVICES === 'true'

// ─── Pusher Mock ──────────────────────────────────────────────────────────────

export interface MockPusherClient {
  trigger: (channel: string, event: string, data: unknown) => Promise<void>
  authorizeChannel: (socketId: string, channel: string) => { auth: string }
}

export function createMockPusher(): MockPusherClient {
  return {
    async trigger(channel, event, data) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[MOCK Pusher] trigger ${channel} / ${event}:`, JSON.stringify(data))
      }
    },

    authorizeChannel(socketId, channel) {
      // Return a deterministic fake auth string — valid format, not a real signature
      return {
        auth: `${process.env.PUSHER_KEY ?? 'mock-key'}:mock-signature-${socketId}-${channel}`,
      }
    },
  }
}

// ─── Daily.co Mock ────────────────────────────────────────────────────────────

export interface MockDailyRoom {
  id: string
  name: string
  url: string
  privacy: string
  created_at: string
}

export interface MockDailyClient {
  createRoom: (options?: { name?: string; privacy?: string }) => Promise<MockDailyRoom>
  createMeetingToken: (options: { roomName: string; userId: string }) => Promise<{ token: string }>
  deleteRoom: (roomName: string) => Promise<void>
}

export function createMockDailyClient(): MockDailyClient {
  return {
    async createRoom(options) {
      const name = options?.name ?? `mock-room-${Date.now()}`
      return {
        id:         `mock-room-id-${name}`,
        name,
        url:        `https://mock.daily.co/${name}`,
        privacy:    options?.privacy ?? 'private',
        created_at: new Date().toISOString(),
      }
    },

    async createMeetingToken({ roomName, userId }) {
      return {
        token: `mock-daily-token.${Buffer.from(JSON.stringify({ roomName, userId, exp: Date.now() + 3600000 })).toString('base64')}`,
      }
    },

    async deleteRoom(roomName) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[MOCK Daily.co] deleteRoom: ${roomName}`)
      }
    },
  }
}

// ─── Stripe Mock ──────────────────────────────────────────────────────────────

export interface MockStripeCheckoutSession {
  id:        string
  url:       string
  status:    string
  client_reference_id: string | null
}

export interface MockStripeClient {
  checkout: {
    sessions: {
      create: (params: { line_items: unknown[]; client_reference_id?: string; success_url: string; cancel_url: string }) => Promise<MockStripeCheckoutSession>
    }
  }
  subscriptions: {
    retrieve: (id: string) => Promise<{ id: string; status: string; current_period_end: number }>
    cancel:   (id: string) => Promise<{ id: string; status: string }>
  }
  webhooks: {
    constructEvent: (body: string, signature: string, secret: string) => { type: string; data: { object: Record<string, unknown> } }
  }
}

export function createMockStripeClient(): MockStripeClient {
  return {
    checkout: {
      sessions: {
        async create(params) {
          const id = `cs_test_mock_${Date.now()}`
          return {
            id,
            url:                  `https://checkout.stripe.com/pay/mock#${id}`,
            status:               'open',
            client_reference_id:  params.client_reference_id ?? null,
          }
        },
      },
    },

    subscriptions: {
      async retrieve(id) {
        return {
          id,
          status:              'active',
          current_period_end:  Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        }
      },

      async cancel(id) {
        return { id, status: 'canceled' }
      },
    },

    webhooks: {
      constructEvent(body, _signature, _secret) {
        // In mock mode, trust the body without signature verification
        const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } }
        return event
      },
    },
  }
}

// ─── Razorpay Mock ────────────────────────────────────────────────────────────

export interface MockRazorpayOrder {
  id:     string
  amount: number
  currency: string
  status: string
}

export interface MockRazorpayClient {
  orders: {
    create: (params: { amount: number; currency: string; receipt?: string }) => Promise<MockRazorpayOrder>
  }
  validateWebhookSignature: (body: string, signature: string, secret: string) => boolean
}

export function createMockRazorpayClient(): MockRazorpayClient {
  return {
    orders: {
      async create(params) {
        return {
          id:       `order_mock_${Date.now()}`,
          amount:   params.amount,
          currency: params.currency,
          status:   'created',
        }
      },
    },

    validateWebhookSignature(_body, _signature, _secret) {
      // In mock mode, always return true — real signature verification happens in prod
      return true
    },
  }
}

// ─── Resend Mock ──────────────────────────────────────────────────────────────

export interface MockEmailClient {
  emails: {
    send: (params: { from: string; to: string | string[]; subject: string; html?: string; text?: string }) => Promise<{ id: string }>
  }
}

export function createMockResendClient(): MockEmailClient {
  return {
    emails: {
      async send(params) {
        const id = `mock-email-${Date.now()}`
        if (process.env.NODE_ENV !== 'test') {
          console.log(`[MOCK Resend] send email:`, {
            to:      params.to,
            subject: params.subject,
            id,
          })
        }
        return { id }
      },
    },
  }
}

// ─── Rate Limiting Mock ───────────────────────────────────────────────────────
// Returns a no-op rate limiter — all requests pass in mock mode.

export interface MockRateLimiter {
  limit: (identifier: string) => Promise<{ success: true; limit: number; remaining: number; reset: number }>
}

export function createMockRateLimiter(): MockRateLimiter {
  return {
    async limit(_identifier) {
      return {
        success:   true,
        limit:     1000,
        remaining: 999,
        reset:     Date.now() + 60_000,
      }
    },
  }
}

// ─── S3 Mock ──────────────────────────────────────────────────────────────────

export interface MockS3Client {
  getPresignedUploadUrl: (bucket: string, key: string, expiresIn?: number) => Promise<string>
  getPresignedDownloadUrl: (bucket: string, key: string, expiresIn?: number) => Promise<string>
  deleteObject: (bucket: string, key: string) => Promise<void>
}

export function createMockS3Client(): MockS3Client {
  return {
    async getPresignedUploadUrl(bucket, key, _expiresIn) {
      return `http://localhost:3000/mock-s3-upload?bucket=${bucket}&key=${encodeURIComponent(key)}`
    },

    async getPresignedDownloadUrl(bucket, key, _expiresIn) {
      return `http://localhost:3000/mock-s3-download?bucket=${bucket}&key=${encodeURIComponent(key)}`
    },

    async deleteObject(bucket, key) {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[MOCK S3] deleteObject: s3://${bucket}/${key}`)
      }
    },
  }
}

// ─── KMS Mock ─────────────────────────────────────────────────────────────────
// NOTE: The real encrypt.ts already falls back to base64 when NODE_ENV !== 'production'
// and KMS_KEY_ARN is not set. This mock makes the intent explicit.

export interface MockKmsClient {
  encrypt: (plaintext: string) => Promise<string>
  decrypt: (ciphertext: string) => Promise<string>
}

export function createMockKmsClient(): MockKmsClient {
  return {
    async encrypt(plaintext) {
      return `mock-enc:${Buffer.from(plaintext).toString('base64')}`
    },

    async decrypt(ciphertext) {
      if (ciphertext.startsWith('mock-enc:')) {
        return Buffer.from(ciphertext.replace('mock-enc:', ''), 'base64').toString('utf-8')
      }
      // Handle plain base64 (legacy dev fallback from encrypt.ts)
      return Buffer.from(ciphertext, 'base64').toString('utf-8')
    },
  }
}

// ─── Check mock mode ──────────────────────────────────────────────────────────

export function assertMockMode(): void {
  if (!IS_MOCK_MODE) {
    throw new Error(
      'Mock services are only available when MOCK_EXTERNAL_SERVICES=true. ' +
      'Add MOCK_EXTERNAL_SERVICES=true to your .env.local file.'
    )
  }
}

// ─── Summary: all mocks ───────────────────────────────────────────────────────

export const mocks = {
  pusher:      createMockPusher,
  daily:       createMockDailyClient,
  stripe:      createMockStripeClient,
  razorpay:    createMockRazorpayClient,
  resend:      createMockResendClient,
  rateLimiter: createMockRateLimiter,
  s3:          createMockS3Client,
  kms:         createMockKmsClient,
} as const
