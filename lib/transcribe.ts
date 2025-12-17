import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const SUPPORTED_MODELS = [
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
  'gpt-4o-transcribe-diarize',
  'whisper-1',
] as const

export type TranscriptionModel = typeof SUPPORTED_MODELS[number]
export const DEFAULT_MODEL: TranscriptionModel = 'gpt-4o-transcribe'

export interface TranscriptionResult {
  text: string
  segments?: Array<{
    speaker: string
    text: string
    start: number
    end: number
  }>
}

export function isValidModel(model: string): model is TranscriptionModel {
  return SUPPORTED_MODELS.includes(model as TranscriptionModel)
}

export async function transcribeAudio(
  audio: File,
  model: TranscriptionModel = DEFAULT_MODEL,
  language: string = 'ja'
): Promise<TranscriptionResult> {
  const isDiarize = model === 'gpt-4o-transcribe-diarize'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model,
    language,
    // diarize model requires diarized_json format and chunking_strategy for audio > 30s
    ...(isDiarize && {
      response_format: 'diarized_json',
      chunking_strategy: 'auto',
    }),
  } as any)

  const result: TranscriptionResult = {
    text: transcription.text,
  }

  // Include speaker segments for diarize model
  if (isDiarize && 'segments' in transcription) {
    result.segments = transcription.segments as TranscriptionResult['segments']
  }

  return result
}
