import { passwordChecks, passwordStrength } from '@tms/shared'
import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

const BAR: Record<number, string> = {
  0: 'bg-overdue',
  1: 'bg-overdue',
  2: 'bg-marker',
  3: 'bg-chart-1',
  4: 'bg-chart-1',
}

/** Live strength meter and rule checklist for a new password. */
export function PasswordStrength({ id, password }: { id: string; password: string }) {
  const strength = passwordStrength(password)
  const checks = passwordChecks(password)

  return (
    <div id={id} className="grid gap-2">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={cn('h-1.5 rounded-full transition-colors', password && strength.score >= n ? BAR[strength.score] : 'bg-muted')}
            />
          ))}
        </div>
        <span className="text-muted-foreground w-16 text-right text-xs" aria-live="polite">
          {password ? strength.label : ''}
        </span>
      </div>
      {password && checks.every((c) => c.met) && strength.score < 2 && (
        <p className="text-overdue text-xs">Too common or easy to guess. Try something longer or less predictable.</p>
      )}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li key={c.id} className={cn('flex items-center gap-1.5 text-xs', c.met ? 'text-foreground' : 'text-muted-foreground')}>
            {c.met ? (
              <Check aria-hidden className="text-chart-1 size-3.5" strokeWidth={3} />
            ) : (
              <Circle aria-hidden className="size-3" />
            )}
            {c.label}
            <span className="sr-only">{c.met ? ' (done)' : ' (not yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
