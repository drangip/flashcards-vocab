export const INTERVALS_DAYS = [0, 1, 4, 7, 14, 60, 180]
export const MAX_LEVEL = 6

/**
 * Returns the next Leitner level after an answer.
 * @param {number} currentLevel  0–6
 * @param {boolean} correct
 * @returns {number} 0–6
 */
export function nextLevel(currentLevel, correct) {
  if (!correct) return 0
  return Math.min(currentLevel + 1, MAX_LEVEL)
}

/**
 * Returns an ISO string for the next review date given a level.
 * @param {number} level  0–6
 * @returns {string} ISO date string
 */
export function nextReviewDate(level) {
  const days = INTERVALS_DAYS[level]
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

/**
 * Returns true if the card is due for review now.
 * Cards with no progress record (null/undefined) are always due.
 * @param {string|null|undefined} nextReviewAt
 * @returns {boolean}
 */
export function isDue(nextReviewAt) {
  if (nextReviewAt == null) return true
  return new Date(nextReviewAt) <= new Date()
}

/**
 * Returns a new array sorted by due date (most overdue first, new cards first).
 * @param {Array<{next_review_at: string|null}>} cards
 */
export function sortByDue(cards) {
  return [...cards].sort((a, b) => {
    if (a.next_review_at == null) return -1
    if (b.next_review_at == null) return 1
    return new Date(a.next_review_at) - new Date(b.next_review_at)
  })
}
