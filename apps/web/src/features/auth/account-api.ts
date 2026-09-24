import { supabase } from '@/lib/supabase'

export interface EmailCheck {
  valid: boolean
  available: boolean
}

/**
 * Asks the `check-email` Edge Function whether an email already has an account.
 * Returns null if the check couldn't run (offline, rate limited): sign-up then
 * relies on the auth server, which rejects duplicates anyway.
 */
export async function checkEmail(email: string): Promise<EmailCheck | null> {
  const { data, error } = await supabase.functions.invoke('check-email', { body: { email } })
  if (error || typeof data?.available !== 'boolean') return null
  return { valid: data.valid === true, available: data.available }
}
