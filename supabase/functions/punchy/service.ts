import {
  PUNCHY_RESPONSE_SCHEMA,
  buildPunchyPrompt,
  sanitizePunchyReply,
  type PunchyReply,
  type PunchyRequest,
  type PunchyTaskContext,
} from '../../../packages/shared/src/punchy.ts'

// Same models as adaptive-routine: cheap and fast first, then the rolling alias.
const MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-latest'] as const

export class PunchyError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

const BLOCK_LOW = 'BLOCK_LOW_AND_ABOVE'

/** Prompt → Gemini → validated reply. Tries each model in turn on transient failures. */
export async function askPunchy(req: PunchyRequest, tasks: PunchyTaskContext[] | null): Promise<PunchyReply> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new PunchyError(503, 'Punchy isn’t set up yet.')
  const prompt = buildPunchyPrompt(req, tasks)

  let lastStatus = 502
  let rateLimited = false
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
          responseSchema: PUNCHY_RESPONSE_SCHEMA,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: BLOCK_LOW },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: BLOCK_LOW },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: BLOCK_LOW },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: BLOCK_LOW },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null)

    if (!res) continue
    lastStatus = res.status
    if (res.status === 429) rateLimited = true
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) break
      continue
    }
    const body = await res.json()
    if (body?.promptFeedback?.blockReason || body?.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new PunchyError(422, 'Punchy can’t help with that one. Try a question about your tasks or Punchlist.')
    }
    const text = body?.candidates?.[0]?.content?.parts?.find((p: { text?: unknown }) => typeof p.text === 'string')?.text
    let parsed: unknown = null
    try {
      parsed = typeof text === 'string' ? JSON.parse(text) : null
    } catch {
      continue
    }
    const reply = sanitizePunchyReply(parsed, req.surface)
    if (reply) return reply
  }

  // Gemini's own per-minute quota: say "busy" even if the fallback model failed differently.
  if (rateLimited || lastStatus === 429) throw new PunchyError(429, 'Punchy is getting a lot of questions right now. Try again in a minute.')
  throw new PunchyError(502, 'Punchy is having trouble answering. Try again shortly.')
}
