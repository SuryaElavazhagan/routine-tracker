import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppData, Routine, Completion } from '../../types'
import {
  toDateString,
  today,
  daysAgo,
  lastNDays,
  dayOfWeek,
  isScheduledOn,
  isDone,
  computeStats,
  todayRoutines,
  detectAnchors,
  classifyDay,
  buildHeatmap,
} from '../../utils/metrics'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'r1',
    name: 'Test routine',
    block: 'morning',
    recurrence: 'daily',
    scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    priority: 'low',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeData(routines: Routine[], completions: Completion[] = [], restDays: string[] = []): AppData {
  return {
    routines,
    goals: [],
    completions,
    hobbySessions: [],
    goalProgressSessions: [],
    restDays,
    dayNotes: {},
    meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
  }
}

// ── toDateString ──────────────────────────────────────────────────────────────

describe('toDateString', () => {
  it('returns YYYY-MM-DD', () => {
    expect(toDateString(new Date('2026-03-15T12:00:00Z'))).toBe('2026-03-15')
  })
})

// ── today ─────────────────────────────────────────────────────────────────────

describe('today', () => {
  it('returns a 10-char date string', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ── daysAgo ───────────────────────────────────────────────────────────────────

describe('daysAgo', () => {
  it('daysAgo(0) equals today()', () => {
    expect(daysAgo(0)).toBe(today())
  })

  it('daysAgo(1) is yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(daysAgo(1)).toBe(toDateString(yesterday))
  })
})

// ── lastNDays ─────────────────────────────────────────────────────────────────

describe('lastNDays', () => {
  it('returns N dates ending with today', () => {
    const result = lastNDays(7)
    expect(result).toHaveLength(7)
    expect(result[result.length - 1]).toBe(today())
  })

  it('is in ascending order', () => {
    const result = lastNDays(5)
    for (let i = 1; i < result.length; i++) {
      expect(result[i] > result[i - 1]).toBe(true)
    }
  })
})

// ── dayOfWeek ─────────────────────────────────────────────────────────────────

describe('dayOfWeek', () => {
  it('returns 0 for a known Sunday', () => {
    expect(dayOfWeek('2026-03-22')).toBe(0)
  })

  it('returns 6 for a known Saturday', () => {
    expect(dayOfWeek('2026-03-28')).toBe(6)
  })

  it('returns 1 for a known Monday', () => {
    expect(dayOfWeek('2026-03-23')).toBe(1)
  })
})

// ── isScheduledOn ─────────────────────────────────────────────────────────────

describe('isScheduledOn', () => {
  it('inactive routines are never scheduled', () => {
    const r = makeRoutine({ active: false })
    expect(isScheduledOn(r, '2026-03-28')).toBe(false)
  })

  it('daily routines are always scheduled', () => {
    const r = makeRoutine({ recurrence: 'daily' })
    expect(isScheduledOn(r, '2026-03-28')).toBe(true)
  })

  it('specific-days only on matching day-of-week', () => {
    // Saturday = 6
    const r = makeRoutine({ recurrence: 'specific-days', scheduledDays: [6] })
    expect(isScheduledOn(r, '2026-03-28')).toBe(true)  // Sat
    expect(isScheduledOn(r, '2026-03-27')).toBe(false) // Fri
  })

  it('once-a-week returns true every day', () => {
    const r = makeRoutine({ recurrence: 'once-a-week', scheduledDays: [] })
    expect(isScheduledOn(r, '2026-03-28')).toBe(true)
    expect(isScheduledOn(r, '2026-03-23')).toBe(true)
  })
})

// ── isDone ────────────────────────────────────────────────────────────────────

describe('isDone', () => {
  it('returns true when a completion exists', () => {
    const completions: Completion[] = [{ date: '2026-03-28', routineId: 'r1', done: true }]
    expect(isDone(completions, '2026-03-28', 'r1')).toBe(true)
  })

  it('returns false for done=false entry', () => {
    const completions: Completion[] = [{ date: '2026-03-28', routineId: 'r1', done: false }]
    expect(isDone(completions, '2026-03-28', 'r1')).toBe(false)
  })

  it('returns false when no matching entry', () => {
    expect(isDone([], '2026-03-28', 'r1')).toBe(false)
  })
})

// ── computeStats ──────────────────────────────────────────────────────────────

describe('computeStats', () => {
  it('returns empty array when no active routines', () => {
    const data = makeData([makeRoutine({ active: false })])
    expect(computeStats(data)).toHaveLength(0)
  })

  it('returns 100% consistency when all scheduled days are done', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const days7 = lastNDays(7)
    const completions = days7.map(d => ({ date: d, routineId: 'r1', done: true }))
    const data = makeData([r], completions)
    const stats = computeStats(data)
    expect(stats[0].consistency7).toBe(100)
  })

  it('returns 0% when nothing done', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const data = makeData([r])
    const stats = computeStats(data)
    expect(stats[0].consistency7).toBe(0)
  })

  it('rest days are excluded from scheduled count', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const days7 = lastNDays(7)
    // Mark today as a rest day, complete all other 6 days
    const restDay = days7[days7.length - 1]
    const completions = days7.filter(d => d !== restDay).map(d => ({ date: d, routineId: 'r1', done: true }))
    const data = makeData([r], completions, [restDay])
    const stats = computeStats(data)
    expect(stats[0].consistency7).toBe(100)
  })

  it('streak counts consecutive days', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const days = lastNDays(3)
    const completions = days.map(d => ({ date: d, routineId: 'r1', done: true }))
    const data = makeData([r], completions)
    const stats = computeStats(data)
    expect(stats[0].streak).toBe(3)
  })

  it('streak resets on a missed day', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const days = lastNDays(3)
    // complete today only
    const completions = [{ date: days[2], routineId: 'r1', done: true }]
    const data = makeData([r], completions)
    const stats = computeStats(data)
    expect(stats[0].streak).toBe(1)
  })

  it('trend is rising when this week > last week by more than 5', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const days14 = lastNDays(14)
    // Complete only the last 7 days (this week), none of the prior week
    const completions = days14.slice(7).map(d => ({ date: d, routineId: 'r1', done: true }))
    const data = makeData([r], completions)
    const stats = computeStats(data)
    expect(stats[0].trend).toBe('rising')
  })

  it('trend is dipping when this week < last week by more than 5', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const days14 = lastNDays(14)
    // Complete only the first 7 days (last week), none of the current week
    const completions = days14.slice(0, 7).map(d => ({ date: d, routineId: 'r1', done: true }))
    const data = makeData([r], completions)
    const stats = computeStats(data)
    expect(stats[0].trend).toBe('dipping')
  })

  it('trend is stable when difference is within 5%', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const data = makeData([r])  // 0% both weeks → diff = 0
    const stats = computeStats(data)
    expect(stats[0].trend).toBe('stable')
  })
})

// ── todayRoutines ─────────────────────────────────────────────────────────────

describe('todayRoutines', () => {
  it('returns only active routines scheduled today', () => {
    const r1 = makeRoutine({ id: 'r1', active: true, recurrence: 'daily' })
    const r2 = makeRoutine({ id: 'r2', active: false, recurrence: 'daily' })
    const data = makeData([r1, r2])
    const result = todayRoutines(data)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })
})

// ── detectAnchors ─────────────────────────────────────────────────────────────

describe('detectAnchors', () => {
  it('returns routines with >=80% 7-day consistency', () => {
    const stats = [
      { routineId: 'r1', consistency7: 85, consistency30: 80, consistency90: 80, streak: 5, trend: 'stable' as const },
      { routineId: 'r2', consistency7: 50, consistency30: 50, consistency90: 50, streak: 2, trend: 'stable' as const },
    ]
    expect(detectAnchors(stats)).toEqual(['r1'])
  })

  it('returns empty array when nothing qualifies', () => {
    expect(detectAnchors([])).toEqual([])
  })
})

// ── classifyDay ───────────────────────────────────────────────────────────────

describe('classifyDay', () => {
  it('returns rest for a rest day', () => {
    const data = makeData([makeRoutine()], [], ['2026-03-28'])
    expect(classifyDay(data, '2026-03-28', [])).toBe('rest')
  })

  it('returns recovery when no routines scheduled', () => {
    // Routine not active
    const r = makeRoutine({ active: false })
    const data = makeData([r])
    expect(classifyDay(data, '2026-03-28', [])).toBe('recovery')
  })

  it('returns full-streak when all routines done', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const completions: Completion[] = [{ date: '2026-03-28', routineId: 'r1', done: true }]
    const data = makeData([r], completions)
    expect(classifyDay(data, '2026-03-28', [])).toBe('full-streak')
  })

  it('returns anchors-held when anchors done but not all', () => {
    const r1 = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const r2 = makeRoutine({ id: 'r2', recurrence: 'daily' })
    const completions: Completion[] = [{ date: '2026-03-28', routineId: 'r1', done: true }]
    const data = makeData([r1, r2], completions)
    const stats = [
      { routineId: 'r1', consistency7: 85, consistency30: 85, consistency90: 85, streak: 5, trend: 'stable' as const },
      { routineId: 'r2', consistency7: 50, consistency30: 50, consistency90: 50, streak: 2, trend: 'stable' as const },
    ]
    expect(classifyDay(data, '2026-03-28', stats)).toBe('anchors-held')
  })

  it('returns recovery when nothing done', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    const data = makeData([r])
    expect(classifyDay(data, '2026-03-28', [])).toBe('recovery')
  })
})

// ── buildHeatmap ──────────────────────────────────────────────────────────────

describe('buildHeatmap', () => {
  it('returns -1 for days the routine is never scheduled', () => {
    // Only scheduled on Saturday (6)
    const r = makeRoutine({ id: 'r1', recurrence: 'specific-days', scheduledDays: [6] })
    const data = makeData([r])
    const heatmap = buildHeatmap(data)
    // Sunday (0) should be -1
    expect(heatmap['r1'][0]).toBe(-1)
    // Saturday (6) should be 0 (no completions)
    expect(heatmap['r1'][6]).toBe(0)
  })

  it('returns 100 for a day-of-week that is always completed', () => {
    const r = makeRoutine({ id: 'r1', recurrence: 'daily' })
    // Build completions for every Saturday in the last 90 days
    const days = lastNDays(90)
    const saturdays = days.filter(d => dayOfWeek(d) === 6)
    const completions = saturdays.map(d => ({ date: d, routineId: 'r1', done: true }))
    const data = makeData([r], completions)
    const heatmap = buildHeatmap(data)
    expect(heatmap['r1'][6]).toBe(100)
  })
})
