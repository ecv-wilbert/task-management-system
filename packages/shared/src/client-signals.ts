/**
 * Client signals used to rate-limit Punchy fairly and spot abuse: a device id
 * the browser keeps, and a coarse browser signature. Dependency-free so the web
 * app and the Edge Functions (Deno) share one definition.
 *
 * Neither signal is trusted on its own (both can be cleared or faked). The
 * server always keeps IP-based limits too, and stores only keyed hashes.
 */

export const DEVICE_HEADER = 'x-punchy-device'
export const SIGNATURE_HEADER = 'x-punchy-signature'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const SHA256_HEX = /^[0-9a-f]{64}$/

export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

export function isSignature(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX.test(value)
}

/** Coarse traits that stay the same across private windows and cleared storage on one device. */
export interface BrowserTraits {
  screen: string // "1512x982@2x24"
  timezone: string
  languages: string
  cores: number
  memory: number
  platform: string
  touchPoints: number
}

/** Stable text the browser hashes (SHA-256) into its signature. Order and format matter. */
export function signatureSource(t: BrowserTraits): string {
  return ['v1', t.screen, t.timezone, t.languages, t.cores, t.memory, t.platform, t.touchPoints].join('|')
}

/** Browser and OS family from a user agent, for traffic review. Deliberately coarse (no versions). */
export function parseUserAgent(ua: string): { browser: string; os: string } {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /CrOS/.test(ua)
        ? 'ChromeOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Other'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'Firefox'
          : /Chrome\/|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : /curl|python|wget|node|axios|go-http|bot|spider|crawl/i.test(ua)
                ? 'Script/bot'
                : 'Other'
  return { browser, os }
}
