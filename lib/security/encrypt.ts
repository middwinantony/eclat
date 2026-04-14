/**
 * encrypt.ts
 * Application-level field encryption using AWS KMS.
 * Used for encrypting sensitive database fields: messages, IP addresses, IDs.
 *
 * All fields marked ENCRYPTED in the Prisma schema must use these helpers
 * before being written to the database.
 */

import {
  KMSClient,
  EncryptCommand,
  DecryptCommand,
} from '@aws-sdk/client-kms'

const kmsClient = new KMSClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
const KMS_KEY_ARN = process.env.AWS_KMS_KEY_ARN

if (!KMS_KEY_ARN && process.env.NODE_ENV === 'production') {
  throw new Error('AWS_KMS_KEY_ARN environment variable is required in production')
}

/**
 * Encrypts a plaintext string using AWS KMS.
 * Returns base64-encoded ciphertext.
 * Returns null if input is null/undefined.
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (!KMS_KEY_ARN) {
    // In development without KMS, return base64 encoded (NOT secure — dev only)
    if (process.env.NODE_ENV !== 'production') {
      return Buffer.from(plaintext).toString('base64')
    }
    throw new Error('KMS key ARN not configured')
  }

  const command = new EncryptCommand({
    KeyId: KMS_KEY_ARN,
    Plaintext: Buffer.from(plaintext, 'utf-8'),
  })

  const response = await kmsClient.send(command)

  if (!response.CiphertextBlob) {
    throw new Error('KMS encryption returned no ciphertext')
  }

  return Buffer.from(response.CiphertextBlob).toString('base64')
}

/**
 * Decrypts a base64-encoded ciphertext string using AWS KMS.
 * Returns the original plaintext string.
 */
export async function decryptField(ciphertext: string): Promise<string> {
  if (!KMS_KEY_ARN) {
    if (process.env.NODE_ENV !== 'production') {
      return Buffer.from(ciphertext, 'base64').toString('utf-8')
    }
    throw new Error('KMS key ARN not configured')
  }

  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    KeyId: KMS_KEY_ARN,
  })

  const response = await kmsClient.send(command)

  if (!response.Plaintext) {
    throw new Error('KMS decryption returned no plaintext')
  }

  return Buffer.from(response.Plaintext).toString('utf-8')
}

/**
 * Encrypts a field only if it has a value.
 * Useful for optional encrypted fields.
 */
export async function encryptOptionalField(
  value: string | null | undefined
): Promise<string | null> {
  if (value == null) return null
  return encryptField(value)
}

/**
 * Decrypts a field only if it has a value.
 */
export async function decryptOptionalField(
  value: string | null | undefined
): Promise<string | null> {
  if (value == null) return null
  return decryptField(value)
}
