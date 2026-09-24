# Authentication and security

How sign-in works, what is encrypted where, form validation, and passkeys.

## Ways to sign in

| Method | Where | Notes |
| --- | --- | --- |
| Email + password | Login page, "Sign in" tab | `supabase.auth.signInWithPassword` |
| Passkey | "Sign in with a passkey" button, or the passkey offered in the email field's autofill | `supabase.auth.signInWithPasskey`; only works on the production domain (see below) |
| Sign up | "Create account" tab | Name, email, password, confirm password. Email confirmation is off for the demo (ADR-006) |

Signed-in users manage passkeys from **Passkeys** in the sidebar footer (`features/auth/passkeys-dialog.tsx`).
Right after sign-up the app suggests adding one once (a toast with **Add passkey**).

## Server settings

| Setting | Value | Where it lives |
| --- | --- | --- |
| `minimum_password_length` | 8 | `supabase/config.toml` |
| `password_requirements` | `lower_upper_letters_digits` (a lowercase letter, an uppercase letter and a digit) | `supabase/config.toml` |
| `jwt_expiry` | 3600 s: access tokens last 1 hour | `supabase/config.toml` |
| `enable_refresh_token_rotation` | on: every refresh issues a new refresh token and retires the old one | `supabase/config.toml` |
| `refresh_token_reuse_interval` | 10 s grace for parallel tabs | `supabase/config.toml` |
| Passkeys | enabled; RP name `Punchlist`, RP ID `task-management-system-two-puce.vercel.app`, origin `https://task-management-system-two-puce.vercel.app` | `config.toml` **and** set on the live project through the Management API (see "Passkeys") |

## Form validation

Client rules come from `packages/shared/src/account.ts` (tested), so the web app and the
`check-email` Edge Function use the same definitions. The server enforces the same rules again.

| Form | Rules | Shown |
| --- | --- | --- |
| Sign in | Email required and well-formed; password required | On blur, then as you type. No asterisks |
| Create account | Name required (≤ 100); email required, well-formed, **not already registered**; password meets the rules and isn't too guessable; confirm password matches | Red `*` on every field plus "Fields marked * are required"; errors on blur, then as you type |
| New/edit task | Title required (≤ 200) | Red `*` on Title |

Password checker (`passwordStrength`, `PasswordStrength` component): a four-segment meter
(Too weak / Weak / Fair / Good / Strong) and a live checklist of the four required rules. A password
that meets the rules but is common (e.g. `Password1`, `Punchlist2026!`) or one repeated character
scores Weak and is refused with a hint. Fair or better is required to submit.

### Duplicate emails

1. **On blur** of the sign-up email field and again **on submit**, the form calls the `check-email`
   Edge Function (`features/auth/account-api.ts`). It normalises the email (trim, lowercase),
   validates it with `isValidEmail`, and asks Postgres via `email_registered()`, a
   `security definer` function only the service role can execute.
2. If the email is taken, the field says "An account with this email already exists." with a
   **Sign in instead** link that switches tabs and carries the email over.
3. If the check can't run (offline, rate limited), the form carries on: Supabase Auth rejects
   duplicates anyway (`user_already_exists`), and the form maps that error to the same message.

Trade-off: an "is this email registered?" endpoint lets someone test whether an address has an
account. With email confirmation off, `signUp` already reveals this, so the check adds convenience
rather than a new leak. It is limited to 20 checks per 10 minutes per (hashed) IP, and
`auth.users` remains the real uniqueness guarantee. Revisit if email confirmation is turned on
(ADR-010).

## What is protected, and how

| Where | What | Protection |
| --- | --- | --- |
| Password at rest | `auth.users.encrypted_password` | **Hashed with bcrypt** by Supabase Auth (salted, one-way). Despite the column name it is a hash, not reversible encryption. The app never stores or logs passwords |
| Passkeys | WebAuthn credentials | The private key never leaves the device or its passkey manager (Secure Enclave, TPM, iCloud Keychain, Google Password Manager). Supabase stores only the public key. Nothing reusable to phish or leak |
| Everything in transit | Browser ↔ Vercel, browser ↔ Supabase, Edge Functions ↔ Gemini | **TLS (HTTPS)** only |
| Session (access token) | JWT sent on every request | **Signed with ES256** (ECDSA, P-256 curve) using the project's asymmetric signing key; public keys at `/auth/v1/.well-known/jwks.json`. Signed, not encrypted: anyone holding it can read the claims (user id, email, role) but can't forge or alter one |
| Who can read which rows | Postgres | Row Level Security: every query runs as the signed-in user; policies allow only `user_id = auth.uid()` |
| Database at rest | Supabase-managed Postgres | Disk encryption at rest (AES-256), per Supabase's platform security docs |
| Session on the device | `localStorage` (supabase-js) | Not encrypted by the app. Protected by the browser profile and the OS (FileVault, BitLocker, iOS/Android device encryption). This is also what lets a signed-in user open the app offline |
| Task cache on the device | IndexedDB (`tms-query-cache`) | Same as above. Cleared on sign-out (`AuthProvider`) |
| Secrets | Gemini key, service role key, DB password | Supabase secrets / dashboard only. The browser only has the publishable key (AGENTS.md rule 4) |

Gaps worth knowing before real users: no email confirmation, no password reset flow, no leaked-password
check (Supabase's HIBP check needs a paid plan), and anyone with access to an unlocked device and
browser profile can use the saved session.

## Passkeys

A passkey is a WebAuthn key pair. Signing in is a Face ID, Touch ID, fingerprint, Windows Hello or
device PIN prompt.

| Platform | Works? | Notes |
| --- | --- | --- |
| iOS / iPadOS (Safari, installed PWA) | Yes | Face ID / Touch ID, synced with iCloud Keychain |
| Android (Chrome, installed PWA) | Yes | Fingerprint / screen lock, synced with Google Password Manager |
| macOS, Windows, ChromeOS, Linux browsers | Yes | Touch ID, Windows Hello, a password manager, or a phone via QR code |
| Native iOS/Android apps | n/a | Punchlist is a PWA. A future native app would need Associated Domains / Digital Asset Links for the same domain |

### How it's wired

| Piece | File |
| --- | --- |
| Sign in button + autofill (conditional mediation on the email field, `autocomplete="username webauthn"`) | `features/auth/login-page.tsx` |
| Add / list / remove passkeys | `features/auth/passkeys-dialog.tsx` (`registerPasskey`, `passkey.list`, `passkey.delete`) |
| Support checks and friendly errors (cancel is silent; wrong domain, duplicate, expired challenge explained) | `features/auth/passkeys.ts` (+ test) |
| One-time "add a passkey" suggestion after sign-up | `features/auth/passkey-offer.ts`, `components/layout/app-layout.tsx` |

Passkey requests are not queued offline like task writes: they need a live challenge from the
server, so they run immediately (`networkMode: 'always'`) and the UI disables them offline.

### Operating notes

- **Bound to the domain.** The RP ID is the current production host. Renaming the domain orphans
  every passkey (users sign in with their password and add a new one). Passkeys can't be tested on
  `localhost` or Vercel preview URLs against this project; the UI says "Passkeys only work on the
  Punchlist website" there.
- **Not managed by `config push`.** The CLI (2.117) doesn't send `[auth.passkey]`/`[auth.webauthn]`.
  They were enabled with the Management API, and `config.toml` mirrors the live values:
  ```bash
  curl -X PATCH https://api.supabase.com/v1/projects/<ref>/config/auth \
    -H "Authorization: Bearer <personal access token>" -H 'Content-Type: application/json' \
    -d '{"passkey_enabled":true,"webauthn_rp_display_name":"Punchlist",
         "webauthn_rp_id":"<host>","webauthn_rp_origins":"https://<host>"}'
  ```
  Or Dashboard → Authentication → Sign In / Providers → Passkeys.
- **Config drift, reconciled 2026-09-24.** `config.toml` now matches the live pooler sizes (15 / 200)
  and leaves the Twilio block undeclared (the live project has it enabled; SMS sign-in is off). With
  that, `supabase config diff` shows no updates, so `config push` only changes what you edit.
