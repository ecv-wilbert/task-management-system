import { describe, expect, it } from 'vitest'
import { isOverdue, todayISO } from './dates'

describe('dates', () => {
  it('formats today as local yyyy-mm-dd', () => {
    expect(todayISO(new Date(2026, 8, 4))).toBe('2026-09-04')
  })

  it('flags open tasks past their due date as overdue', () => {
    expect(isOverdue('2026-09-01', 'todo', '2026-09-24')).toBe(true)
    expect(isOverdue('2026-09-24', 'todo', '2026-09-24')).toBe(false)
    expect(isOverdue('2026-09-01', 'done', '2026-09-24')).toBe(false)
    expect(isOverdue(null, 'todo', '2026-09-24')).toBe(false)
  })
})
