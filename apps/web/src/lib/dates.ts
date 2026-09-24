import { format, parseISO } from 'date-fns'

/** Today as yyyy-mm-dd in the user's local timezone. */
export function todayISO(now = new Date()): string {
  return format(now, 'yyyy-MM-dd')
}

export function isOverdue(dueDate: string | null, status: string, today = todayISO()): boolean {
  return !!dueDate && status !== 'done' && dueDate < today
}

export function formatDue(dueDate: string | null): string {
  return dueDate ? format(parseISO(dueDate), 'MMM d, yyyy') : '—'
}
