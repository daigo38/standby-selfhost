import { NextRequest, NextResponse } from 'next/server'
import { verifySignature } from '@/lib/auth'
import { transcribeAudio, isValidModel, DEFAULT_MODEL } from '@/lib/transcribe'

export async function POST(request: NextRequest) {
  try {
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

    // Validate model
    const model = requestedModel && isValidModel(requestedModel)
      ? requestedModel
      : DEFAULT_MODEL

    // Verify signature
    const signatureTimestamp = request.headers.get('x-standby-timestamp') || ''
    const signature = request.headers.get('x-standby-signature') || ''

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
    const result = await transcribeAudio(audio, model)

    console.log('Transcribed audio:', {
      sessionId,
      chunkId,
      timestamp,
      userId,
      model,
      text: result.text,
    })

    return NextResponse.json({
      success: true,
      sessionId,
      chunkId,
      model,
      ...result,
    }, { status: 200 })
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
