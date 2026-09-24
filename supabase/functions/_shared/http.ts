// CORS, origin allow-list and JSON responses shared by Edge Functions.

const ALLOWED_ORIGINS = new Set([
  'https://task-management-system-two-puce.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  ...(Deno.env.get('PUNCHY_ALLOWED_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean),
])

export interface Http {
  origin: string
  allowed: boolean
  preflight: () => Response
  json: (status: number, body: unknown) => Response
  fail: (status: number, error: string) => Response
}

export function http(req: Request): Http {
  const origin = req.headers.get('origin') ?? ''
  const allowed = ALLOWED_ORIGINS.has(origin)
  const cors = {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-punchy-device, x-punchy-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  return {
    origin,
    allowed,
    preflight: () => new Response('ok', { headers: cors }),
    json,
    fail: (status, error) => json(status, { error }),
  }
}

/** Reads a JSON body up to maxBytes. Returns undefined if too big, null if not JSON. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const raw = await req.text()
  if (raw.length > maxBytes) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
