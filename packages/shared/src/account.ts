/**
 * Email and password rules for sign-up. Dependency-free so the web app and the
 * `check-email` Edge Function (Deno) share one definition.
 *
 * The password rules mirror the server settings (min length 8; lower, upper and
 * a digit required), so the form can't accept a password the server rejects.
 */

/** Emails are compared case-insensitively and without surrounding spaces. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Pragmatic check: one @, no spaces, a dot in the domain, sane lengths. The
// auth server does the final validation; this catches typos early.
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/

export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email)
  return e.length <= 254 && e.split('@')[0].length <= 64 && EMAIL.test(e) && !e.includes('..')
}

export const PASSWORD_MIN_LENGTH = 8

export interface PasswordCheck {
  id: 'length' | 'lower' | 'upper' | 'digit'
  label: string
  met: boolean
}

/** The required rules, in the order the form lists them. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'lower', label: 'A lowercase letter', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'An uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'digit', label: 'A number', met: /\d/.test(password) },
  ]
}

export function meetsPasswordRules(password: string): boolean {
  return passwordChecks(password).every((c) => c.met)
}

// Passwords that pass the rules but are guessed first. Checked case-insensitively
// against the password with digits and symbols stripped from the ends.
const COMMON = new Set([
  'password', 'passw0rd', 'qwerty', 'qwertyuiop', 'letmein', 'welcome', 'admin', 'iloveyou',
  'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'abc', 'abcdef',
  'punchlist', 'changeme', 'trustno', 'master', 'login', 'hello',
])

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' }

const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const

/**
 * A simple 0–4 strength score for the meter. Anything that misses a required
 * rule, is a common password, or repeats one character caps out at "Weak".
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: LABELS[0] }
  const core = password.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '')
  const weak = !meetsPasswordRules(password) || COMMON.has(core) || /^(.)\1+$/.test(password)
  if (weak) return { score: password.length >= 4 ? 1 : 0, label: LABELS[password.length >= 4 ? 1 : 0] }

  let score = 2
  if (password.length >= 12) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (password.length >= 16 && /[^A-Za-z0-9]/.test(password)) score = 4
  const s = Math.min(score, 4) as PasswordStrength['score']
  return { score: s, label: LABELS[s] }
}
