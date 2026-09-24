import { describe, expect, it } from 'vitest'
import { passkeyErrorMessage } from './passkeys'

const domError = (name: string) => Object.assign(new Error('x'), { name })

describe('passkeyErrorMessage', () => {
  it('stays quiet when the user cancels, directly or wrapped by the SDK', () => {
    expect(passkeyErrorMessage(domError('NotAllowedError'), 'sign-in')).toBeNull()
    expect(passkeyErrorMessage({ code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY', cause: domError('NotAllowedError') }, 'add')).toBeNull()
    expect(passkeyErrorMessage({ code: 'ERROR_CEREMONY_ABORTED' }, 'sign-in')).toBeNull()
  })

  it('explains a duplicate passkey and a wrong address', () => {
    expect(passkeyErrorMessage({ code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' }, 'add')).toMatch(/already has a passkey/)
    expect(passkeyErrorMessage({ code: 'ERROR_INVALID_DOMAIN' }, 'sign-in')).toMatch(/Punchlist website/)
    expect(passkeyErrorMessage(domError('SecurityError'), 'add')).toMatch(/Punchlist website/)
  })

  it('handles an expired challenge and falls back to a generic message', () => {
    expect(passkeyErrorMessage({ code: 'webauthn_challenge_expired' }, 'sign-in')).toMatch(/try again/i)
    expect(passkeyErrorMessage(new Error('boom'), 'sign-in')).toMatch(/use your password/)
    expect(passkeyErrorMessage(new Error('boom'), 'add')).toMatch(/Couldn’t add/)
  })
})
