/**
 * message.ts
 * Zod schema for message sending.
 */

import { z } from 'zod'

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be less than 2000 characters')
    .refine(
      (content) => content.trim().length > 0,
      'Message cannot be only whitespace'
    ),
  contentType: z.enum(['text', 'voice']).default('text'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
