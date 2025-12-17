import { createHmac, timingSafeEqual } from 'crypto'

const WEBHOOK_SECRET = process.env.STANDBY_WEBHOOK_SECRET || ''
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000 // 5 minutes

export interface VerifyResult {
  valid: boolean
  error: string | null
}

export function verifySignature(
  timestamp: string,
  signature: string,
  sessionId: string,
  chunkId: string,
  userId: string
): VerifyResult {
  // Check if secret is configured
  if (!WEBHOOK_SECRET) {
    console.warn('STANDBY_WEBHOOK_SECRET is not set, skipping signature verification')
    return { valid: true, error: null }
  }

  // Check timestamp freshness
  const age = Date.now() - parseInt(timestamp, 10)
  if (isNaN(age) || age > MAX_TIMESTAMP_AGE_MS) {
    return { valid: false, error: 'Request too old or invalid timestamp' }
  }

  // Compute expected signature
  const payload = `${timestamp}.${sessionId}.${chunkId}.${userId}`
  const expected = 'v1=' + createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  // Constant-time comparison
  try {
    const valid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
    return { valid, error: valid ? null : 'Invalid signature' }
  } catch {
    return { valid: false, error: 'Invalid signature format' }
  }
}
