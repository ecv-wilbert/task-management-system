import { zodResolver } from '@hookform/resolvers/zod'
import { Fingerprint, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isValidEmail, meetsPasswordRules, passwordStrength } from '@tms/shared'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePageMeta } from '@/lib/seo'
import { supabase } from '@/lib/supabase'
import { checkEmail } from './account-api'
import { useAuth } from './auth-context'
import { OFFER_PASSKEY_KEY } from './passkey-offer'
import { passkeyAutofillSupported, passkeyErrorMessage, passkeysSupported } from './passkeys'
import { PasswordStrength } from './password-strength'

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address')
  .refine(isValidEmail, 'Enter a valid email address, like name@example.com')

const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your name').max(100, 'Keep it under 100 characters'),
    email,
    password: z
      .string()
      .min(1, 'Create a password')
      .refine(meetsPasswordRules, 'Use at least 8 characters with an uppercase letter, a lowercase letter and a number')
      .refine((p) => !meetsPasswordRules(p) || passwordStrength(p).score >= 2, 'That password is too easy to guess. Try a longer or less common one'),
    confirmPassword: z.string().min(1, 'Type your password again'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords don’t match' })

const TAKEN = 'An account with this email already exists.'

export function LoginPage() {
  const { session } = useAuth()
  const location = useLocation()
  const state = location.state as { from?: string; tab?: 'sign-in' | 'sign-up' } | null
  const [tab, setTab] = useState<'sign-in' | 'sign-up'>(state?.tab ?? 'sign-in')
  const from = state?.from ?? '/app'
  // Email carried over when "Sign in instead" is chosen on the sign-up form.
  const [signInEmail, setSignInEmail] = useState('')
  usePageMeta({ title: tab === 'sign-in' ? 'Sign in' : 'Create your account', noindex: true })

  if (session) return <Navigate to={from} replace />

  return (
    <div className="grid min-h-svh place-items-center px-4 py-10">
      <div className="grid w-full max-w-sm gap-6">
        <Link to="/" className="justify-self-center">
          <Logo />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{tab === 'sign-in' ? 'Sign in' : 'Create your account'}</CardTitle>
            <CardDescription>
              {tab === 'sign-in' ? 'Pick up where you left off.' : 'It takes less than a minute.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="sign-in">Sign in</TabsTrigger>
                <TabsTrigger value="sign-up">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="sign-in">
                <SignInForm redirectTo={from} initialEmail={signInEmail} />
              </TabsContent>
              <TabsContent value="sign-up">
                <SignUpForm
                  redirectTo={from}
                  onSignInInstead={(e) => {
                    setSignInEmail(e)
                    setTab('sign-in')
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SignInForm({ redirectTo, initialEmail }: { redirectTo: string; initialEmail: string }) {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: { email: initialEmail, password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const autofill = useRef<AbortController | null>(null)

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setError(null)
    autofill.current?.abort()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return setError(
        error.code === 'invalid_credentials' ? 'That email and password don’t match. Check them and try again.' : error.message,
      )
    }
    navigate(redirectTo, { replace: true })
  })

  // Offer saved passkeys in the email field's autofill where the browser supports it.
  // A successful sign-in updates the session and LoginPage redirects.
  useEffect(() => {
    if (!online) return
    const controller = new AbortController()
    autofill.current = controller
    void passkeyAutofillSupported().then((ok) => {
      if (!ok || controller.signal.aborted) return
      void supabase.auth.signInWithPasskey({ options: { mediation: 'conditional', signal: controller.signal } })
    })
    return () => controller.abort()
  }, [online])

  const signInWithPasskey = async () => {
    setError(null)
    autofill.current?.abort()
    setPasskeyBusy(true)
    const { error } = await supabase.auth.signInWithPasskey()
    setPasskeyBusy(false)
    if (error) return setError(passkeyErrorMessage(error, 'sign-in'))
    navigate(redirectTo, { replace: true })
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field id="signin-email" label="Email" error={errors.email?.message}>
        <Input
          id="signin-email"
          type="email"
          autoComplete="username webauthn"
          {...fieldA11y('signin-email', errors.email?.message)}
          {...form.register('email')}
        />
      </Field>
      <Field id="signin-password" label="Password" error={errors.password?.message}>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          {...fieldA11y('signin-password', errors.password?.message)}
          {...form.register('password')}
        />
      </Field>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {!online && <p className="text-muted-foreground text-sm">You’re offline. Connect to sign in.</p>}
      <Button type="submit" disabled={isSubmitting || !online}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Sign in
      </Button>
      {passkeysSupported() && (
        <>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" /> or <span className="bg-border h-px flex-1" />
          </div>
          <Button type="button" variant="outline" disabled={passkeyBusy || !online} onClick={() => void signInWithPasskey()}>
            {passkeyBusy ? <Loader2 className="animate-spin" aria-hidden /> : <Fingerprint aria-hidden />}
            Sign in with a passkey
          </Button>
        </>
      )}
    </form>
  )
}

function SignUpForm({ redirectTo, onSignInInstead }: { redirectTo: string; onSignInInstead: (email: string) => void }) {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors, isSubmitting } = form.formState
  const password = form.watch('password')

  /** Server-side duplicate check. Returns false if the email is taken. */
  const ensureEmailAvailable = async (value: string) => {
    if (!isValidEmail(value)) return true
    setChecking(true)
    const result = await checkEmail(value.trim())
    setChecking(false)
    if (result?.valid && !result.available) {
      form.setError('email', { type: 'taken', message: TAKEN })
      return false
    }
    return true
  }

  const onSubmit = form.handleSubmit(async ({ fullName, email, password }) => {
    setError(null)
    if (!(await ensureEmailAvailable(email))) return
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/app` },
    })
    if (error) {
      if (error.code === 'user_already_exists' || error.code === 'email_exists') {
        return form.setError('email', { type: 'taken', message: TAKEN })
      }
      if (error.code === 'weak_password') return form.setError('password', { type: 'server', message: error.message })
      return setError(error.message)
    }
    // With email confirmation on, no session is returned until the link is clicked.
    if (data.session) {
      try {
        sessionStorage.setItem(OFFER_PASSKEY_KEY, '1')
      } catch {
        // Storage unavailable: skip the passkey suggestion.
      }
      navigate(redirectTo, { replace: true })
    } else setSentTo(email)
  })

  if (sentTo) {
    return (
      <p className="text-sm">
        We sent a confirmation link to <strong>{sentTo}</strong>. Open it to finish creating your account.
      </p>
    )
  }

  const emailField = form.register('email', {
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void ensureEmailAvailable(e.target.value),
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <p className="text-muted-foreground text-xs">
        Fields marked <span className="text-destructive">*</span> are required.
      </p>
      <Field id="signup-name" label="Name" required error={errors.fullName?.message}>
        <Input
          id="signup-name"
          autoComplete="name"
          {...fieldA11y('signup-name', errors.fullName?.message, true)}
          {...form.register('fullName')}
        />
      </Field>
      <Field
        id="signup-email"
        label="Email"
        required
        error={errors.email?.message}
        action={
          errors.email?.type === 'taken' && (
            <button
              type="button"
              className="text-foreground text-sm font-medium underline underline-offset-4"
              onClick={() => onSignInInstead(form.getValues('email').trim())}
            >
              Sign in instead
            </button>
          )
        }
        hint={checking ? 'Checking…' : undefined}
      >
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          {...fieldA11y('signup-email', errors.email?.message, true)}
          {...emailField}
        />
      </Field>
      <Field id="signup-password" label="Password" required error={errors.password?.message}>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          {...fieldA11y('signup-password', errors.password?.message, true, 'signup-password-strength')}
          {...form.register('password', {
            // Keep the confirm field's match error in sync while typing.
            onChange: () => form.formState.touchedFields.confirmPassword && void form.trigger('confirmPassword'),
          })}
        />
        <PasswordStrength id="signup-password-strength" password={password} />
      </Field>
      <Field id="signup-confirm" label="Confirm password" required error={errors.confirmPassword?.message}>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          {...fieldA11y('signup-confirm', errors.confirmPassword?.message, true)}
          {...form.register('confirmPassword')}
        />
      </Field>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {!online && <p className="text-muted-foreground text-sm">You’re offline. Connect to create an account.</p>}
      <Button type="submit" disabled={isSubmitting || !online}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Create account
      </Button>
    </form>
  )
}

/** ARIA wiring so screen readers announce required fields and their errors. */
function fieldA11y(id: string, error: string | undefined, required = false, describedBy?: string) {
  const ids = [error ? `${id}-error` : null, describedBy].filter(Boolean).join(' ')
  return {
    'aria-invalid': !!error,
    'aria-required': required || undefined,
    'aria-describedby': ids || undefined,
  }
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  action,
  children,
}: {
  id: string
  label: string
  /** Shows a red asterisk. Used on the sign-up form only. */
  required?: boolean
  error?: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive -ml-1">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error} {action}
        </p>
      ) : (
        hint && <p className="text-muted-foreground text-xs">{hint}</p>
      )}
    </div>
  )
}
