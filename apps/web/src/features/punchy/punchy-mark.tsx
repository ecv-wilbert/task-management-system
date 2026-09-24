import { HandFist } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Punchy's avatar: the logo's ink square with a marker-yellow fist. Fixed colours so it reads the same in both themes. */
export function PunchyMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid size-8 shrink-0 place-items-center rounded-[9px] bg-[oklch(0.3_0.06_258)]', className)}
    >
      <HandFist className="size-[60%] text-[oklch(0.86_0.17_92)]" strokeWidth={2.25} />
    </span>
  )
}
