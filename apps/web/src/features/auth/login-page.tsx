import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'

const signInSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name').max(100),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

export function LoginPage() {
  const { session } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState<'sign-in' | 'sign-up'>('sign-in')
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

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
                <SignInForm redirectTo={from} />
              </TabsContent>
              <TabsContent value="sign-up">
                <SignUpForm redirectTo={from} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SignInForm({ redirectTo }: { redirectTo: string }) {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(error.message)
    navigate(redirectTo, { replace: true })
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field id="signin-email" label="Email" error={errors.email?.message}>
        <Input id="signin-email" type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field id="signin-password" label="Password" error={errors.password?.message}>
        <Input id="signin-password" type="password" autoComplete="current-password" {...form.register('password')} />
      </Field>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {!online && <p className="text-muted-foreground text-sm">You’re offline. Connect to sign in.</p>}
      <Button type="submit" disabled={isSubmitting || !online}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Sign in
      </Button>
    </form>
  )
}

function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<z.infer<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema) })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ fullName, email, password }) => {
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/app` },
    })
    if (error) return setError(error.message)
    // With email confirmation on, no session is returned until the link is clicked.
    if (data.session) navigate(redirectTo, { replace: true })
    else setSentTo(email)
  })

  if (sentTo) {
    return (
      <p className="text-sm">
        We sent a confirmation link to <strong>{sentTo}</strong>. Open it to finish creating your account.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field id="signup-name" label="Name" error={errors.fullName?.message}>
        <Input id="signup-name" autoComplete="name" {...form.register('fullName')} />
      </Field>
      <Field id="signup-email" label="Email" error={errors.email?.message}>
        <Input id="signup-email" type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field id="signup-password" label="Password" error={errors.password?.message}>
        <Input id="signup-password" type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {!online && <p className="text-muted-foreground text-sm">You’re offline. Connect to create an account.</p>}
      <Button type="submit" disabled={isSubmitting || !online}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />} Create account
      </Button>
    </form>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
