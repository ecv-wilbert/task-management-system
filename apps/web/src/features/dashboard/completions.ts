import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns'

export interface DayCount {
  day: string // yyyy-mm-dd
  label: string // "Sep 24"
  completed: number
}

/** Tasks completed per local day over the last `days` days, oldest first. */
export function completionsByDay(
  tasks: { completed_at: string | null }[],
  days: number,
  now = new Date(),
): DayCount[] {
  const range = eachDayOfInterval({ start: subDays(now, days - 1), end: now })
  const counts = new Map(range.map((d) => [format(d, 'yyyy-MM-dd'), 0]))
  for (const t of tasks) {
    if (!t.completed_at) continue
    const key = format(parseISO(t.completed_at), 'yyyy-MM-dd')
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1)
  }
  return range.map((d) => {
    const day = format(d, 'yyyy-MM-dd')
    return { day, label: format(d, 'MMM d'), completed: counts.get(day)! }
  })
}
