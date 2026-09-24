import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7', className)}>
      <rect width="32" height="32" rx="7" fill="oklch(0.3 0.06 258)" />
      <rect x="6" y="15" width="20" height="7" rx="2" fill="oklch(0.86 0.17 92)" />
      <path d="M9 16.5l4.5 4.5L23.5 10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight', className)}>
      <LogoMark />
      Punchlist
    </span>
  )
}
