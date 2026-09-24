import type { Task, TaskPriority, TaskStatus } from './task.ts'

export interface TaskStats {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  overdue: number
  dueSoon: number
  completionRate: number
}

type StatsInput = Pick<Task, 'status' | 'priority' | 'due_date'>

/**
 * Aggregate counts for the dashboard. Pure so it can be unit tested and
 * computed from the offline cache without a round trip.
 * `today` is a yyyy-mm-dd string in the user's local timezone.
 */
export function computeTaskStats(tasks: StatsInput[], today: string): TaskStats {
  const soon = addDays(today, 7)
  const stats: TaskStats = {
    total: tasks.length,
    byStatus: { todo: 0, in_progress: 0, done: 0 },
    byPriority: { low: 0, medium: 0, high: 0 },
    overdue: 0,
    dueSoon: 0,
    completionRate: 0,
  }

  for (const t of tasks) {
    stats.byStatus[t.status]++
    stats.byPriority[t.priority]++
    if (t.status !== 'done' && t.due_date) {
      if (t.due_date < today) stats.overdue++
      else if (t.due_date <= soon) stats.dueSoon++
    }
  }

  stats.completionRate = stats.total === 0 ? 0 : Math.round((stats.byStatus.done / stats.total) * 100)
  return stats
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
