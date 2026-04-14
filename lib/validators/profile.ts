/**
 * profile.ts
 * Zod schemas for profile creation and editing.
 */

import { z } from 'zod'

export const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  gender: z.enum(['man', 'woman', 'non_binary', 'prefer_not_to_say']),
  sexualOrientation: z
    .enum(['straight', 'gay', 'lesbian', 'bisexual', 'queer', 'prefer_not_to_say'])
    .optional(),
  pronouns: z.string().max(20).optional(),
  city: z.string().min(2).max(100),
  country: z.enum(['IN', 'AE', 'GB', 'US', 'SG', 'AU', 'CA']),
  profession: z.string().min(2).max(100),
  employer: z.string().max(100).optional(),
  educationLevel: z
    .enum(['undergraduate', 'graduate', 'postgraduate', 'doctorate', 'other'])
    .optional(),
  university: z.string().max(100).optional(),
  heightCm: z.number().int().min(120).max(250).optional(),
  religion: z
    .enum(['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'agnostic', 'atheist', 'other', 'prefer_not_to_say'])
    .optional(),
  diet: z.enum(['vegetarian', 'vegan', 'non_vegetarian', 'jain', 'prefer_not_to_say']).optional(),
  drinking: z.enum(['never', 'socially', 'regularly', 'prefer_not_to_say']).optional(),
  smoking: z.enum(['never', 'socially', 'regularly', 'prefer_not_to_say']).optional(),
  hasChildren: z.boolean().optional(),
  wantsChildren: z.enum(['yes', 'no', 'open', 'prefer_not_to_say']).optional(),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>
