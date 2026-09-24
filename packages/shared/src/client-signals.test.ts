import { describe, expect, it } from 'vitest'
import { isDeviceId, isSignature, parseUserAgent, signatureSource } from './client-signals.ts'

describe('client signal validation', () => {
  it('accepts a random UUID device id and a SHA-256 hex signature only', () => {
    expect(isDeviceId('3f2b8c1e-9d4a-4e7b-8a6c-1f0e2d3c4b5a')).toBe(true)
    expect(isDeviceId('not-a-uuid')).toBe(false)
    expect(isDeviceId(42)).toBe(false)
    expect(isSignature('a'.repeat(64))).toBe(true)
    expect(isSignature('A'.repeat(64))).toBe(false)
    expect(isSignature('a'.repeat(63))).toBe(false)
  })
})

describe('signatureSource', () => {
  it('is stable for the same traits', () => {
    const t = { screen: '390x844@3x24', timezone: 'Asia/Manila', languages: 'en-US,fil', cores: 6, memory: 4, platform: 'iPhone', touchPoints: 5 }
    expect(signatureSource(t)).toBe(signatureSource({ ...t }))
    expect(signatureSource(t)).not.toBe(signatureSource({ ...t, timezone: 'UTC' }))
  })
})

describe('parseUserAgent', () => {
  it('reads common browser and OS families', () => {
    expect(
      parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1'),
    ).toEqual({ browser: 'Safari', os: 'iOS' })
    expect(
      parseUserAgent('Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'),
    ).toEqual({ browser: 'Chrome', os: 'Android' })
    expect(
      parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'),
    ).toEqual({ browser: 'Edge', os: 'Windows' })
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 15.0; rv:140.0) Gecko/20100101 Firefox/140.0')).toEqual({
      browser: 'Firefox',
      os: 'macOS',
    })
    expect(parseUserAgent('curl/8.7.1')).toEqual({ browser: 'Script/bot', os: 'Other' })
  })
})
