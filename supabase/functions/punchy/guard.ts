// Abuse guard policy for Punchy: which limits apply to a request, checked and
// logged in one call to punchy_guard() (see migration punchy_abuse_guard).
import {
  DEVICE_HEADER,
  SIGNATURE_HEADER,
  isDeviceId,
  isSignature,
  parseUserAgent,
} from '../../../packages/shared/src/client-signals.ts'
import type { PunchySurface } from '../../../packages/shared/src/punchy.ts'
import { admin, clientIp, hmac } from '../_shared/supabase.ts'

const TEN_MINUTES = 600
const DAY = 86_400

/** Limits. Buckets are checked in order; the first one over its limit refuses the request. */
export const LIMITS = {
  landing: {
    perDevice: 10, // per 10 min, per browser (device id)
    perSignatureOnNetwork: 15, // per 10 min, same browser signature + IP (private windows, cleared storage)
    perIp: 20, // per 10 min, everyone behind one IP
    perIpDaily: 60,
    allVisitorsDaily: 1000,
  },
  app: {
    perUser: 30, // per 10 min
    perUserDaily: 200,
    perDevice: 40, // per 10 min, all accounts on one browser together
    perIpDaily: 400, // all accounts on one network together
  },
  // Accounts that may use Punchy from one device (or browser + network) / one IP in 24 hours.
  // The next account is refused (punchy_guard blocks once this many *other* accounts were active).
  accountsPerDevicePerDay: 3,
  accountsPerIpPerDay: 10,
}

type Quota = { bucket: string; window: number; limit: number }

export interface GuardInput {
  req: Request
  surface: PunchySurface
  userId: string | null
}

/** Returns null when the request may go ahead, otherwise a message for the user. */
export async function guardPunchy({ req, surface, userId }: GuardInput): Promise<{ status: number; message: string } | null> {
  const ip = clientIp(req)
  const deviceId = req.headers.get(DEVICE_HEADER)
  const signature = req.headers.get(SIGNATURE_HEADER)
  const { browser, os } = parseUserAgent(req.headers.get('user-agent') ?? '')

  const ipHash = await hmac(`ip:${ip}`)
  const deviceHash = isDeviceId(deviceId) ? await hmac(`device:${deviceId}`) : null
  const fpipHash = isSignature(signature) ? await hmac(`fpip:${signature}|${ip}`) : null

  const quotas: Quota[] = []
  const add = (bucket: string, window: number, limit: number) => quotas.push({ bucket, window, limit })

  if (surface === 'landing') {
    const l = LIMITS.landing
    if (deviceHash) add(`device:${deviceHash}`, TEN_MINUTES, l.perDevice)
    if (fpipHash) add(`fpip:${fpipHash}`, TEN_MINUTES, l.perSignatureOnNetwork)
    add(`ip:${ipHash}`, TEN_MINUTES, l.perIp)
    add(`ipday:${ipHash}`, DAY, l.perIpDaily)
    add('global:landing', DAY, l.allVisitorsDaily)
  } else {
    const a = LIMITS.app
    add(`user:${userId}`, TEN_MINUTES, a.perUser)
    add(`userday:${userId}`, DAY, a.perUserDaily)
    if (deviceHash) add(`appdevice:${deviceHash}`, TEN_MINUTES, a.perDevice)
    add(`appipday:${ipHash}`, DAY, a.perIpDaily)
  }

  const { data: reason, error } = await admin.rpc('punchy_guard', {
    p_surface: surface,
    p_user_id: userId,
    p_ip_hash: ipHash,
    p_device_hash: deviceHash,
    p_fpip_hash: fpipHash,
    p_browser: browser,
    p_os: os,
    p_quotas: quotas,
    p_max_other_accounts_per_device: LIMITS.accountsPerDevicePerDay,
    p_max_other_accounts_per_ip: LIMITS.accountsPerIpPerDay,
  })
  if (error) throw error // callers fail closed
  return reason ? { status: 429, message: messageFor(reason as string, surface) } : null
}

function messageFor(reason: string, surface: PunchySurface): string {
  if (reason.startsWith('accounts:')) {
    return 'Punchy can only help a few accounts from the same device or network each day. Try again tomorrow.'
  }
  if (reason === 'quota:global') return 'Punchy has answered a lot of visitors today. Try again tomorrow.'
  if (reason.endsWith('day')) return 'You’ve reached today’s limit for Punchy. It resets tomorrow.'
  return surface === 'landing'
    ? 'That’s a lot of questions. Create an account or try again in a few minutes.'
    : 'That’s a lot of questions. Give Punchy a few minutes.'
}
