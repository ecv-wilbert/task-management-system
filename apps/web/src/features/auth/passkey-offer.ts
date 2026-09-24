/** sessionStorage flag set after sign-up so the app offers to add a passkey once. */
export const OFFER_PASSKEY_KEY = 'punchlist:offer-passkey'

/** Reads and clears the flag. */
export function takePasskeyOffer(): boolean {
  try {
    const offer = sessionStorage.getItem(OFFER_PASSKEY_KEY) === '1'
    sessionStorage.removeItem(OFFER_PASSKEY_KEY)
    return offer
  } catch {
    return false
  }
}
