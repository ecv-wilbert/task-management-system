import { describe, expect, it } from 'vitest'
import { computeTaskStats } from './stats.ts'

describe('computeTaskStats', () => {
  const today = '2026-09-24'

  it('returns zeros for no tasks', () => {
    const s = computeTaskStats([], today)
    expect(s.total).toBe(0)
    expect(s.completionRate).toBe(0)
  })

  it('counts status, priority, overdue and due-soon', () => {
    const s = computeTaskStats(
      [
        { status: 'todo', priority: 'high', due_date: '2026-09-20' }, // overdue
        { status: 'in_progress', priority: 'medium', due_date: '2026-09-30' }, // due soon
        { status: 'done', priority: 'low', due_date: '2026-09-01' }, // done, not overdue
        { status: 'todo', priority: 'low', due_date: null },
      ],
      today,
    )
    expect(s.total).toBe(4)
    expect(s.byStatus).toEqual({ todo: 2, in_progress: 1, done: 1 })
    expect(s.byPriority).toEqual({ low: 2, medium: 1, high: 1 })
    expect(s.overdue).toBe(1)
    expect(s.dueSoon).toBe(1)
    expect(s.completionRate).toBe(25)
  })

  it('treats a task due today as due soon, not overdue', () => {
    const s = computeTaskStats([{ status: 'todo', priority: 'low', due_date: today }], today)
    expect(s.overdue).toBe(0)
    expect(s.dueSoon).toBe(1)
  })
})
