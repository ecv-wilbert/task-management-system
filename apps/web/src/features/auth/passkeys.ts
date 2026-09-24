/** Browser support checks and friendly errors for passkeys (WebAuthn). */

export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function'
}

/** True when the browser can offer passkeys in the email field's autofill. */
export async function passkeyAutofillSupported(): Promise<boolean> {
  if (!passkeysSupported()) return false
  const check = window.PublicKeyCredential.isConditionalMediationAvailable
  return typeof check === 'function' ? check.call(window.PublicKeyCredential).catch(() => false) : false
}

type ErrorLike = { name?: unknown; code?: unknown; message?: unknown; cause?: unknown }

function signals(err: unknown): string[] {
  const out: string[] = []
  let e = err as ErrorLike | undefined
  for (let depth = 0; e && typeof e === 'object' && depth < 3; depth++) {
    for (const v of [e.name, e.code, e.message]) if (typeof v === 'string') out.push(v)
    e = e.cause as ErrorLike | undefined
  }
  return out
}

/**
 * Turns a WebAuthn / Supabase error into a message for the user, or null when
 * there's nothing to say (the user cancelled the prompt).
 */
export function passkeyErrorMessage(err: unknown, action: 'sign-in' | 'add'): string | null {
  const s = signals(err).join(' ')
  if (/NotAllowedError|AbortError|ERROR_CEREMONY_ABORTED/.test(s)) return null
  if (/InvalidStateError|PREVIOUSLY_REGISTERED/.test(s)) return 'This device already has a passkey for your account.'
  if (/SecurityError|INVALID_DOMAIN|INVALID_RP_ID/.test(s)) {
    return 'Passkeys only work on the Punchlist website, not on this address.'
  }
  if (/challenge_expired/.test(s)) return 'That took a little too long. Please try again.'
  if (/NotSupportedError/.test(s)) return 'This browser doesn’t support passkeys yet.'
  if (action === 'sign-in' && /not[_ ]found|invalid[_ ]credential|credential/i.test(s)) {
    return 'We couldn’t match that passkey to an account. Sign in with your password, then add a passkey.'
  }
  return action === 'sign-in'
    ? 'Passkey sign-in didn’t work. Try again or use your password.'
    : 'Couldn’t add the passkey. Please try again.'
}
