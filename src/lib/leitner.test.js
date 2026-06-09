import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextLevel, nextReviewDate, isDue, sortByDue, INTERVALS_DAYS } from './leitner'

describe('INTERVALS_DAYS', () => {
  it('has 7 entries matching the Leitner spec', () => {
    expect(INTERVALS_DAYS).toEqual([0, 1, 4, 7, 14, 60, 180])
  })
})

describe('nextLevel', () => {
  it('increments level on correct answer', () => {
    expect(nextLevel(0, true)).toBe(1)
    expect(nextLevel(3, true)).toBe(4)
  })
  it('caps at 6 on correct answer at max level', () => {
    expect(nextLevel(6, true)).toBe(6)
  })
  it('resets to 0 on wrong answer regardless of level', () => {
    expect(nextLevel(5, false)).toBe(0)
    expect(nextLevel(0, false)).toBe(0)
  })
})

describe('nextReviewDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns a date INTERVALS_DAYS[level] days from now', () => {
    const result = nextReviewDate(2) // 4 days
    const d = new Date(result)
    expect(d.toISOString()).toBe('2026-01-05T12:00:00.000Z')
  })
  it('returns now for level 0 (interval = 0 days)', () => {
    const result = nextReviewDate(0)
    expect(new Date(result).toISOString()).toBe('2026-01-01T12:00:00.000Z')
  })
  it('returns 180 days for level 6', () => {
    const result = nextReviewDate(6)
    // 2026-01-01 + 180 days = 2026-06-30
    expect(new Date(result).toISOString()).toBe('2026-06-30T12:00:00.000Z')
  })
})

describe('isDue', () => {
  it('returns true for null (new card, no progress)', () => {
    expect(isDue(null)).toBe(true)
    expect(isDue(undefined)).toBe(true)
  })
  it('returns true for a past date', () => {
    expect(isDue('2020-01-01T00:00:00Z')).toBe(true)
  })
  it('returns false for a future date', () => {
    expect(isDue('2099-01-01T00:00:00Z')).toBe(false)
  })
})

describe('sortByDue', () => {
  it('puts new cards (null next_review_at) first', () => {
    const cards = [
      { id: 'a', next_review_at: '2026-01-10T00:00:00Z' },
      { id: 'b', next_review_at: null },
    ]
    expect(sortByDue(cards)[0].id).toBe('b')
  })
  it('sorts oldest due date before more recent ones', () => {
    const cards = [
      { id: 'a', next_review_at: '2026-06-10T00:00:00Z' },
      { id: 'b', next_review_at: '2026-01-01T00:00:00Z' },
    ]
    expect(sortByDue(cards)[0].id).toBe('b')
  })
  it('does not mutate the original array', () => {
    const cards = [{ id: 'a', next_review_at: null }]
    const sorted = sortByDue(cards)
    expect(sorted).not.toBe(cards)
  })
})
