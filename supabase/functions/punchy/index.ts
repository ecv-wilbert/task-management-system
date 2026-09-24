// Punchy, the Punchlist assistant. POST { surface, question, history, today, now }.
// Controller: CORS, input validation, auth, rate limits. See docs/PUNCHY.md.
import { parsePunchyRequest, toPunchyTaskContext } from '../../../packages/shared/src/punchy.ts'
import { http, readJson } from '../_shared/http.ts'
import { guardPunchy } from './guard.ts'
import { fetchTasksForPunchy, getUserId } from './repository.ts'
import { PunchyError, askPunchy } from './service.ts'

const MAX_BODY_BYTES = 16_000

Deno.serve(async (req) => {
  const { allowed, preflight, json, fail } = http(req)
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return fail(405, 'Method not allowed.')
  if (!allowed) return fail(403, 'Punchy only answers inside Punchlist.')

  const body = await readJson(req, MAX_BODY_BYTES)
  if (body === undefined) return fail(413, 'That message is too long.')
  const input = parsePunchyRequest(body)
  if (!input) return fail(400, 'Punchy couldn’t read that message. Keep it under 500 characters.')

  try {
    let tasks = null
    let userId: string | null = null
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (input.surface === 'app') {
      userId = await getUserId(jwt)
      if (!userId) return fail(401, 'Sign in again to chat with Punchy.')
    }

    // Rate limits by account, device, browser + network and IP; multi-account check; traffic log.
    const refused = await guardPunchy({ req, surface: input.surface, userId })
    if (refused) return fail(refused.status, refused.message)

    if (userId) tasks = toPunchyTaskContext(await fetchTasksForPunchy(jwt))

    const reply = await askPunchy(input, tasks)
    return json(200, { reply })
  } catch (err) {
    if (err instanceof PunchyError) return fail(err.status, err.message)
    console.error('punchy failed', err)
    return fail(500, 'Punchy is having trouble answering. Try again shortly.')
  }
})
