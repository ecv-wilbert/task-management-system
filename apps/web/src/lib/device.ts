import { DEVICE_HEADER, SIGNATURE_HEADER, signatureSource, type BrowserTraits } from '@tms/shared'

const DEVICE_KEY = 'punchlist:device-id'
let memoryId: string | null = null

/**
 * A random id for this browser, kept in localStorage so Punchy's limits follow
 * the device rather than the account. Not personal data and not a secret; the
 * server only ever stores a keyed hash of it. Falls back to a per-tab id when
 * storage is blocked.
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    memoryId ??= crypto.randomUUID()
    return memoryId
  }
}

function browserTraits(): BrowserTraits {
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string } }
  return {
    screen: `${screen.width}x${screen.height}@${Math.round(devicePixelRatio * 100) / 100}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    languages: (navigator.languages ?? [navigator.language]).join(','),
    cores: navigator.hardwareConcurrency ?? 0,
    memory: nav.deviceMemory ?? 0,
    platform: nav.userAgentData?.platform ?? navigator.platform ?? '',
    touchPoints: navigator.maxTouchPoints ?? 0,
  }
}

let signature: Promise<string | null> | null = null

/** SHA-256 of coarse browser traits. Stays the same in private windows and after clearing storage. */
export function getBrowserSignature(): Promise<string | null> {
  signature ??= (async () => {
    try {
      const bytes = new TextEncoder().encode(signatureSource(browserTraits()))
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
      return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
    } catch {
      return null
    }
  })()
  return signature
}

/** Headers Punchy uses for fair-use limits. */
export async function deviceHeaders(): Promise<Record<string, string>> {
  const sig = await getBrowserSignature()
  return { [DEVICE_HEADER]: getDeviceId(), ...(sig ? { [SIGNATURE_HEADER]: sig } : {}) }
}
