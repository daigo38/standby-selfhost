import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import OpenAI from 'openai'

const WEBHOOK_SECRET = process.env.STANDBY_WEBHOOK_SECRET || ''
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000 // 5 minutes

// Supported transcription models
const SUPPORTED_MODELS = [
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
  'gpt-4o-transcribe-diarize',
  'whisper-1',
] as const
type TranscriptionModel = typeof SUPPORTED_MODELS[number]
const DEFAULT_MODEL: TranscriptionModel = 'gpt-4o-transcribe'

interface VerifyResult {
  valid: boolean
  error: string | null
}

function verifySignature(
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

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData()

    // Extract fields
    const audio = formData.get('audio') as File | null
    const sessionId = formData.get('sessionId') as string | null
    const chunkId = formData.get('chunkId') as string | null
    const timestamp = formData.get('timestamp') as string | null
    const userId = formData.get('userId') as string | null
    const requestedModel = formData.get('model') as string | null

    // Validate required fields
    if (!audio || !sessionId || !chunkId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: audio, sessionId, chunkId, userId' },
        { status: 400 }
      )
    }

    // Validate and set model
    const model: TranscriptionModel = requestedModel && SUPPORTED_MODELS.includes(requestedModel as TranscriptionModel)
      ? (requestedModel as TranscriptionModel)
      : DEFAULT_MODEL

    // Get signature headers
    const signatureTimestamp = request.headers.get('x-standby-timestamp') || ''
    const signature = request.headers.get('x-standby-signature') || ''

    // Verify signature
    const { valid, error } = verifySignature(
      signatureTimestamp,
      signature,
      sessionId,
      chunkId,
      userId
    )

    if (!valid) {
      console.error('Signature verification failed:', error)
      return NextResponse.json({ error }, { status: 401 })
    }

    // Transcribe audio
    const isDiarize = model === 'gpt-4o-transcribe-diarize'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model,
      language: 'ja',
      // diarize model requires diarized_json format and chunking_strategy for audio > 30s
      ...(isDiarize && {
        response_format: 'diarized_json',
        chunking_strategy: 'auto',
      }),
    } as any)

    console.log('Transcribed audio:', {
      sessionId,
      chunkId,
      timestamp,
      userId,
      model,
      text: transcription.text,
    })

    // Build response based on model type
    const response: Record<string, unknown> = {
      success: true,
      sessionId,
      chunkId,
      model,
      text: transcription.text,
    }

    // Include speaker segments for diarize model
    if (isDiarize && 'segments' in transcription) {
      response.segments = transcription.segments
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error processing audio:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
