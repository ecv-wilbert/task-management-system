// Sign-up duplicate-email check. POST { email } → { valid, available }.
// "Is this email registered?" reveals accounts, so it is rate limited per IP.
// auth.users stays the real guarantee: emails are unique there regardless.
import { isValidEmail, normalizeEmail } from '../../../packages/shared/src/account.ts'
import { http, readJson } from '../_shared/http.ts'
import { admin, hashIp, takeQuota } from '../_shared/supabase.ts'

const TEN_MINUTES = 600
const PER_IP = 20

Deno.serve(async (req) => {
  const h = http(req)
  if (req.method === 'OPTIONS') return h.preflight()
  if (req.method !== 'POST') return h.fail(405, 'Method not allowed.')
  if (!h.allowed) return h.fail(403, 'Not allowed.')

  const body = await readJson(req, 2_000)
  const email = body && typeof body === 'object' && 'email' in body ? (body as { email: unknown }).email : null
  if (typeof email !== 'string') return h.fail(400, 'Enter an email address.')
  if (!isValidEmail(email)) return h.json(200, { valid: false, available: false })

  try {
    if (!(await takeQuota(`email:ip:${await hashIp(req)}`, TEN_MINUTES, PER_IP))) {
      return h.fail(429, 'Too many checks. Try again in a few minutes.')
    }
    const { data, error } = await admin.rpc('email_registered', { p_email: normalizeEmail(email) })
    if (error) throw error
    return h.json(200, { valid: true, available: data !== true })
  } catch (err) {
    console.error('check-email failed', err)
    return h.fail(500, 'Couldn’t check that email right now.')
  }
})
