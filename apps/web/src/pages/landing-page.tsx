import { Check, CloudOff, Download, Lock } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

const DEMO_LIST = [
  { title: 'Send the September invoice', done: true },
  { title: 'Renew the domain before it lapses', done: true },
  { title: 'Book the venue walkthrough', done: true },
  { title: 'Review the pricing page copy', done: false },
  { title: 'Plan next week’s sprint', done: false },
]

const POINTS = [
  {
    icon: CloudOff,
    title: 'Works without a connection',
    body: 'Add, edit and close tasks offline. Changes sync as soon as you’re back.',
  },
  {
    icon: Download,
    title: 'Installs like an app',
    body: 'Add it to your home screen or dock. It opens instantly, even on a slow network.',
  },
  {
    icon: Lock,
    title: 'Only you see your tasks',
    body: 'Every row is locked to your account at the database level.',
  },
]

export function LandingPage() {
  const { session } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <ThemeToggle />
          {session ? (
            <Button asChild variant="ghost">
              <Link to="/app">Open dashboard</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 md:grid-cols-[1.1fr_1fr] md:px-6 md:pt-20">
          <div className="grid gap-6">
            <h1 className="text-5xl leading-[1.02] font-bold text-balance md:text-7xl">Get to the end of the list.</h1>
            <p className="text-muted-foreground max-w-[46ch] text-lg">
              Punchlist keeps what’s left to do in one place, keeps working when your connection drops, and shows
              you what’s due before it’s late.
            </p>
            <div className="flex flex-wrap gap-3">
              {session ? (
                <Button asChild size="lg">
                  <Link to="/app">Open dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link to="/login" state={{ from: '/app' }}>
                      Create an account
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          <PunchCard />
        </section>

        <section className="border-t">
          <ul className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-3 md:px-6">
            {POINTS.map((p) => (
              <li key={p.title} className="grid content-start gap-2">
                <p.icon aria-hidden className="text-chart-1 size-5" />
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <p className="text-muted-foreground max-w-[36ch] text-sm">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-6xl px-4 py-8 text-sm md:px-6">
        Built with React, Supabase and Vercel.
      </footer>
    </div>
  )
}

/** The hero: a real-looking list whose finished items get highlighted once on load. */
function PunchCard() {
  const doneCount = DEMO_LIST.filter((i) => i.done).length
  return (
    <figure
      aria-label="Example task list"
      className="bg-card rotate-[-1.5deg] rounded-xl border p-6 shadow-[0_1px_0_var(--border),0_18px_40px_-24px_oklch(0.3_0.06_258/40%)] md:p-8"
    >
      <figcaption className="mb-5 flex items-baseline justify-between gap-4">
        <span className="font-heading text-xl font-semibold">Friday punch list</span>
        <span className="text-muted-foreground text-sm tabular-nums">
          {doneCount} of {DEMO_LIST.length} done
        </span>
      </figcaption>
      <ul className="grid gap-3.5">
        {DEMO_LIST.map((item, i) => (
          <li key={item.title} className="flex items-center gap-3">
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-[5px] border-2',
                item.done ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
              )}
            >
              {item.done && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
            </span>
            <span
              className={cn('text-[1.05rem]', item.done && 'marker-done px-0.5')}
              style={item.done ? ({ '--delay': `${500 + i * 380}ms` } as React.CSSProperties) : undefined}
            >
              {item.title}
              {item.done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
