import { describe, it, expect } from 'vitest'
import type { Goal, Milestone } from '../../types'
import {
  buildMilestones,
  milestoneStartDate,
  milestoneEndDate,
  daysUntilMilestoneEnd,
  currentActiveMilestone,
  isMilestoneNearEnd,
  goalProgress,
  periodLabel,
  calcMilestoneCount,
} from '../../utils/milestones'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    name: 'Test goal',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ── buildMilestones ───────────────────────────────────────────────────────────

describe('buildMilestones', () => {
  it('returns empty array when count is 0', () => {
    const g = makeGoal({ milestoneCount: 0 })
    expect(buildMilestones(g)).toHaveLength(0)
  })

  it('returns empty array when count is undefined', () => {
    const g = makeGoal()
    expect(buildMilestones(g)).toHaveLength(0)
  })

  it('generates correct number of milestones with default labels', () => {
    const g = makeGoal({ milestoneCount: 3 })
    const result = buildMilestones(g)
    expect(result).toHaveLength(3)
    expect(result[0].label).toBe('Milestone 1')
    expect(result[0].index).toBe(1)
    expect(result[1].label).toBe('Milestone 2')
    expect(result[2].label).toBe('Milestone 3')
  })

  it('preserves completedAt from existing milestones', () => {
    const existing: Milestone[] = [
      { id: 'mid-1', label: 'Custom label', index: 1, completedAt: '2026-03-01' },
    ]
    const g = makeGoal({ milestoneCount: 2, milestones: existing })
    const result = buildMilestones(g)
    expect(result[0].completedAt).toBe('2026-03-01')
    expect(result[0].label).toBe('Custom label')
    expect(result[0].id).toBe('mid-1')
  })

  it('assigns new ids for milestones without existing entries', () => {
    const g = makeGoal({ milestoneCount: 2 })
    const result = buildMilestones(g)
    expect(result[0].id).toBeTruthy()
    expect(result[1].id).toBeTruthy()
    expect(result[0].id).not.toBe(result[1].id)
  })
})

// ── milestoneStartDate ────────────────────────────────────────────────────────

describe('milestoneStartDate', () => {
  it('returns null when startDate missing', () => {
    const g = makeGoal({ milestonePeriod: 'week' })
    expect(milestoneStartDate(g, 1)).toBeNull()
  })

  it('returns null when milestonePeriod missing', () => {
    const g = makeGoal({ startDate: '2026-01-01' })
    expect(milestoneStartDate(g, 1)).toBeNull()
  })

  it('milestone 1 starts on the goal start date', () => {
    const g = makeGoal({ startDate: '2026-01-01', milestonePeriod: 'week' })
    const result = milestoneStartDate(g, 1)
    expect(result?.getFullYear()).toBe(2026)
    expect(result?.getMonth()).toBe(0)  // January
    expect(result?.getDate()).toBe(1)
  })

  it('milestone 2 starts one week after start (week period)', () => {
    const g = makeGoal({ startDate: '2026-01-01', milestonePeriod: 'week' })
    const result = milestoneStartDate(g, 2)
    expect(result?.getDate()).toBe(8)
  })

  it('supports month period', () => {
    const g = makeGoal({ startDate: '2026-01-01', milestonePeriod: 'month' })
    const result = milestoneStartDate(g, 2)
    expect(result?.getMonth()).toBe(1) // February
  })

  it('supports day period', () => {
    const g = makeGoal({ startDate: '2026-01-01', milestonePeriod: 'day' })
    const result = milestoneStartDate(g, 3)
    expect(result?.getDate()).toBe(3) // Jan 3
  })

  it('supports year period', () => {
    const g = makeGoal({ startDate: '2026-01-01', milestonePeriod: 'year' })
    const result = milestoneStartDate(g, 2)
    expect(result?.getFullYear()).toBe(2027)
  })
})

// ── milestoneEndDate ──────────────────────────────────────────────────────────

describe('milestoneEndDate', () => {
  it('returns null when startDate missing', () => {
    const g = makeGoal({ milestonePeriod: 'week' })
    expect(milestoneEndDate(g, 1)).toBeNull()
  })

  it('milestone 1 ends one day before milestone 2 start', () => {
    const g = makeGoal({ startDate: '2026-01-01', milestonePeriod: 'week' })
    const end = milestoneEndDate(g, 1)
    // Milestone 2 starts Jan 8 → milestone 1 ends Jan 7
    expect(end?.getDate()).toBe(7)
  })
})

// ── daysUntilMilestoneEnd ─────────────────────────────────────────────────────

describe('daysUntilMilestoneEnd', () => {
  it('returns null when dates not available', () => {
    const g = makeGoal()
    expect(daysUntilMilestoneEnd(g, 1)).toBeNull()
  })

  it('returns a number for a valid goal', () => {
    // end date = start of milestone 2 - 1 day
    // use a start date far in the future to ensure end is in the future
    const g = makeGoal({ startDate: '2030-01-01', milestonePeriod: 'year' })
    const result = daysUntilMilestoneEnd(g, 1)
    expect(typeof result).toBe('number')
    expect(result!).toBeGreaterThan(0)
  })
})

// ── currentActiveMilestone ────────────────────────────────────────────────────

describe('currentActiveMilestone', () => {
  it('returns null when no milestones', () => {
    const g = makeGoal()
    expect(currentActiveMilestone(g)).toBeNull()
  })

  it('returns first incomplete milestone', () => {
    const milestones: Milestone[] = [
      { id: 'm1', label: 'M1', index: 1, completedAt: '2026-01-01' },
      { id: 'm2', label: 'M2', index: 2 },
    ]
    const g = makeGoal({ milestones })
    expect(currentActiveMilestone(g)?.id).toBe('m2')
  })

  it('returns null when all milestones are completed', () => {
    const milestones: Milestone[] = [
      { id: 'm1', label: 'M1', index: 1, completedAt: '2026-01-01' },
    ]
    const g = makeGoal({ milestones })
    expect(currentActiveMilestone(g)).toBeNull()
  })
})

// ── isMilestoneNearEnd ────────────────────────────────────────────────────────

describe('isMilestoneNearEnd', () => {
  it('returns false when no active milestone', () => {
    const g = makeGoal()
    expect(isMilestoneNearEnd(g)).toBe(false)
  })

  it('returns false when end is far in the future', () => {
    const milestones: Milestone[] = [{ id: 'm1', label: 'M1', index: 1 }]
    const g = makeGoal({
      milestones,
      milestoneCount: 2,
      startDate: '2030-01-01',
      milestonePeriod: 'year',
    })
    expect(isMilestoneNearEnd(g)).toBe(false)
  })

  it('returns true when end is within 7 days', () => {
    // Craft a start date (local time) so milestone 1 ends 3 days from now.
    // With period='week', milestone 1 spans 7 days, milestone 2 starts on day 7.
    // milestone 1 ends on day 6. Set start to 3 days ago so day 6 = 3 days from now.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startLocal = new Date(today)
    startLocal.setDate(today.getDate() - 3) // 3 days ago
    const pad = (n: number) => String(n).padStart(2, '0')
    const startStr = `${startLocal.getFullYear()}-${pad(startLocal.getMonth() + 1)}-${pad(startLocal.getDate())}`
    const milestones: Milestone[] = [{ id: 'm1', label: 'M1', index: 1 }]
    const g = makeGoal({ milestones, milestoneCount: 2, startDate: startStr, milestonePeriod: 'week' })
    expect(isMilestoneNearEnd(g)).toBe(true)
  })
})

// ── goalProgress ──────────────────────────────────────────────────────────────

describe('goalProgress', () => {
  it('returns 0 when no milestones configured', () => {
    expect(goalProgress(makeGoal())).toBe(0)
  })

  it('returns 0 when none completed', () => {
    const milestones: Milestone[] = [{ id: 'm1', label: 'M1', index: 1 }]
    const g = makeGoal({ milestones, milestoneCount: 1 })
    expect(goalProgress(g)).toBe(0)
  })

  it('returns 100 when all completed', () => {
    const milestones: Milestone[] = [{ id: 'm1', label: 'M1', index: 1, completedAt: '2026-01-01' }]
    const g = makeGoal({ milestones, milestoneCount: 1 })
    expect(goalProgress(g)).toBe(100)
  })

  it('returns 50 when half completed', () => {
    const milestones: Milestone[] = [
      { id: 'm1', label: 'M1', index: 1, completedAt: '2026-01-01' },
      { id: 'm2', label: 'M2', index: 2 },
    ]
    const g = makeGoal({ milestones, milestoneCount: 2 })
    expect(goalProgress(g)).toBe(50)
  })
})

// ── periodLabel ───────────────────────────────────────────────────────────────

describe('periodLabel', () => {
  it('returns the correct labels', () => {
    expect(periodLabel('day')).toBe('day')
    expect(periodLabel('week')).toBe('week')
    expect(periodLabel('month')).toBe('month')
    expect(periodLabel('year')).toBe('year')
  })
})

// ── calcMilestoneCount ────────────────────────────────────────────────────────

describe('calcMilestoneCount', () => {
  it('returns 0 when startDate is empty', () => {
    expect(calcMilestoneCount('', '2027-01-01', 'month')).toBe(0)
  })

  it('returns 0 when endDate is empty', () => {
    expect(calcMilestoneCount('2026-01-01', '', 'month')).toBe(0)
  })

  it('returns 0 when end is before start', () => {
    expect(calcMilestoneCount('2027-01-01', '2026-01-01', 'month')).toBe(0)
  })

  it('returns 0 when start equals end', () => {
    expect(calcMilestoneCount('2026-01-01', '2026-01-01', 'day')).toBe(0)
  })

  it('calculates correct day count', () => {
    expect(calcMilestoneCount('2026-01-01', '2026-01-08', 'day')).toBe(7)
  })

  it('calculates correct week count', () => {
    expect(calcMilestoneCount('2026-01-01', '2026-04-02', 'week')).toBe(13) // 91 days / 7 = 13
  })

  it('calculates correct month count (same day)', () => {
    expect(calcMilestoneCount('2026-01-01', '2027-01-01', 'month')).toBe(12)
  })

  it('calculates correct month count (partial — end day before start day)', () => {
    // Jan 15 → Feb 10: end day (10) < start day (15) → only 0 full months
    expect(calcMilestoneCount('2026-01-15', '2026-02-10', 'month')).toBe(0)
  })

  it('calculates correct year count (same month/day)', () => {
    expect(calcMilestoneCount('2026-01-01', '2031-01-01', 'year')).toBe(5)
  })

  it('calculates correct year count (partial year)', () => {
    // Jan 01, 2026 → Dec 31, 2027: 1 full year
    expect(calcMilestoneCount('2026-01-01', '2027-12-31', 'year')).toBe(1)
  })

  it('handles month count across multiple years', () => {
    // Jan 2026 → Jan 2028 = 24 months
    expect(calcMilestoneCount('2026-01-01', '2028-01-01', 'month')).toBe(24)
  })
})
