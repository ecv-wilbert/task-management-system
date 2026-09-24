// Supabase access shared by Edge Functions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/** Service-role client. Only for RPCs that are locked to service_role and for verifying JWTs; never for user data. */
export const admin = createClient(url, serviceRoleKey, noSession)

/** Client that acts as the caller, so RLS applies to everything it reads. */
export function clientForUser(jwt: string): SupabaseClient {
  return createClient(url, anonKey, { ...noSession, global: { headers: { Authorization: `Bearer ${jwt}` } } })
}

export async function getUserId(jwt: string): Promise<string | null> {
  if (!jwt) return null
  const { data, error } = await admin.auth.getUser(jwt)
  return error || !data.user ? null : data.user.id
}

/** Counts a request against a rate-limit bucket. Throws if the check itself fails, so callers fail closed. */
export async function takeQuota(bucket: string, windowSeconds: number, limit: number): Promise<boolean> {
  const { data, error } = await admin.rpc('punchy_take_quota', {
    p_bucket: bucket,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  })
  if (error) throw error
  return data === true
}

const hmacKey = crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(serviceRoleKey),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign'],
)

/** Keyed hash (HMAC-SHA-256, 128 bits, hex). Lets us count and compare identifiers without storing them. */
export async function hmac(value: string): Promise<string> {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey, new TextEncoder().encode(value)))
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
}

/** Keyed hash of the caller's IP, so rate limits work without storing raw IPs. */
export function hashIp(req: Request): Promise<string> {
  return hmac(`ip:${clientIp(req)}`)
}
