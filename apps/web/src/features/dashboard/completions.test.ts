import { describe, expect, it } from 'vitest'
import { completionsByDay } from './completions'

describe('completionsByDay', () => {
  it('buckets completed tasks into the trailing window', () => {
    const now = new Date(2026, 8, 24, 12)
    const result = completionsByDay(
      [
        { completed_at: new Date(2026, 8, 24, 9).toISOString() },
        { completed_at: new Date(2026, 8, 24, 10).toISOString() },
        { completed_at: new Date(2026, 8, 20, 10).toISOString() },
        { completed_at: new Date(2026, 7, 1).toISOString() }, // outside window
        { completed_at: null },
      ],
      7,
      now,
    )
    expect(result).toHaveLength(7)
    expect(result.at(-1)).toMatchObject({ day: '2026-09-24', completed: 2 })
    expect(result.find((d) => d.day === '2026-09-20')?.completed).toBe(1)
    expect(result.reduce((n, d) => n + d.completed, 0)).toBe(3)
  })
})
