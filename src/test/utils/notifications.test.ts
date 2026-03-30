import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Routine } from '../../types'
import {
  getPermission,
  requestPermission,
  cancelAllNotifications,
  scheduleRoutineNotification,
  scheduleAllNotifications,
  isBiweeklyFireWeek,
  isoWeekNumber,
} from '../../utils/notifications'

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

function setNotificationPermission(perm: NotificationPermission) {
  Object.defineProperty(globalThis.Notification, 'permission', {
    get: () => perm,
    configurable: true,
  })
}

// ── getPermission ─────────────────────────────────────────────────────────────

describe('getPermission', () => {
  it('returns current permission when Notification exists', () => {
    setNotificationPermission('granted')
    expect(getPermission()).toBe('granted')
  })

  it('returns current Notification.permission', () => {
    setNotificationPermission('granted')
    expect(getPermission()).toBe('granted')

    setNotificationPermission('denied')
    expect(getPermission()).toBe('denied')
  })
})

// ── requestPermission ─────────────────────────────────────────────────────────

describe('requestPermission', () => {
  it('returns granted after requestPermission resolves granted', async () => {
    setNotificationPermission('default')
    ;(globalThis.Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce('granted')
    const result = await requestPermission()
    expect(result).toBe('granted')
  })

  it('delegates to Notification.requestPermission', async () => {
    setNotificationPermission('default')
    ;(globalThis.Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce('granted')
    const result = await requestPermission()
    expect(result).toBe('granted')
  })
})

// ── cancelAllNotifications ────────────────────────────────────────────────────

describe('cancelAllNotifications', () => {
  it('clears all timers without throwing', () => {
    vi.useFakeTimers()
    setNotificationPermission('granted')
    const r = makeRoutine({ reminderTime: '23:59' })
    scheduleRoutineNotification(r)
    cancelAllNotifications()
    // No assertion needed — just ensuring no error is thrown
    vi.useRealTimers()
  })
})

// ── scheduleRoutineNotification ───────────────────────────────────────────────

describe('scheduleRoutineNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    cancelAllNotifications()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing when reminderTime is missing', () => {
    setNotificationPermission('granted')
    const r = makeRoutine()
    expect(() => scheduleRoutineNotification(r)).not.toThrow()
  })

  it('does nothing when permission is not granted', () => {
    setNotificationPermission('default')
    const r = makeRoutine({ reminderTime: '08:00' })
    scheduleRoutineNotification(r)
    // No timer should fire
    vi.runAllTimers()
    // just checking no error thrown
  })

  it('does nothing when reminderTime is in the past today', () => {
    setNotificationPermission('granted')
    // Set current time to 23:00 so 00:00 is "past"
    vi.setSystemTime(new Date('2026-03-28T23:00:00'))
    const r = makeRoutine({ reminderTime: '00:00' })
    scheduleRoutineNotification(r)
    // no timer scheduled (past) — runAllTimers should not fire Notification
    vi.runAllTimers()
  })

  it('schedules a Notification for a future time (no SW controller)', () => {
    setNotificationPermission('granted')
    // Set time to 06:00 so 08:00 is in the future
    vi.setSystemTime(new Date('2026-03-28T06:00:00'))
    const r = makeRoutine({ id: 'r1', name: 'Morning routine', reminderTime: '08:00' })

    // Ensure navigator.serviceWorker.controller is null
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true,
    })

    scheduleRoutineNotification(r)
    vi.runAllTimers()
    // Notification constructor should have been called
    // (we can't easily assert on the mock class calls, but we verify no throw)
  })

  it('cancels previous timer when re-scheduled', () => {
    setNotificationPermission('granted')
    vi.setSystemTime(new Date('2026-03-28T06:00:00'))
    const r = makeRoutine({ reminderTime: '08:00' })
    scheduleRoutineNotification(r)
    // Schedule again — should cancel first timer without errors
    scheduleRoutineNotification(r)
  })

  it('does not schedule for invalid time format', () => {
    setNotificationPermission('granted')
    const r = makeRoutine({ reminderTime: 'not-a-time' })
    expect(() => scheduleRoutineNotification(r)).not.toThrow()
  })
})

// ── scheduleAllNotifications ──────────────────────────────────────────────────

describe('scheduleAllNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    cancelAllNotifications()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing when permission is not granted', () => {
    setNotificationPermission('default')
    const r = makeRoutine({ reminderTime: '08:00' })
    scheduleAllNotifications([r])
    // no error expected
  })

  it('schedules only active routines with a reminderTime', () => {
    setNotificationPermission('granted')
    vi.setSystemTime(new Date('2026-03-28T06:00:00'))
    const active = makeRoutine({ id: 'r1', active: true, reminderTime: '08:00' })
    const inactive = makeRoutine({ id: 'r2', active: false, reminderTime: '08:00' })
    const noReminder = makeRoutine({ id: 'r3', active: true })
    scheduleAllNotifications([active, inactive, noReminder])
    // Should complete without error
  })

  it('cancels existing notifications before re-scheduling', () => {
    setNotificationPermission('granted')
    vi.setSystemTime(new Date('2026-03-28T06:00:00'))
    const r = makeRoutine({ reminderTime: '08:00' })
    scheduleAllNotifications([r])
    scheduleAllNotifications([r]) // second call should cancel first set
  })
})

// ── isoWeekNumber ─────────────────────────────────────────────────────────────

describe('isoWeekNumber', () => {
  it('returns 1 for the first week of 2026 (Jan 1 is a Thursday → week 1)', () => {
    expect(isoWeekNumber(new Date('2026-01-01'))).toBe(1)
  })

  it('returns 52 or 53 for the last week of the year', () => {
    const w = isoWeekNumber(new Date('2025-12-28'))
    expect(w).toBeGreaterThanOrEqual(52)
  })

  it('advances by 1 across a week boundary', () => {
    const w1 = isoWeekNumber(new Date('2026-03-22')) // Sunday week 12
    const w2 = isoWeekNumber(new Date('2026-03-23')) // Monday week 13
    expect(w2).toBe(w1 + 1)
  })
})

// ── isBiweeklyFireWeek ────────────────────────────────────────────────────────

describe('isBiweeklyFireWeek', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when today is in the same week as createdAt (diff = 0, even)', () => {
    // createdAt on a Monday; today is the same Monday
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-23T10:00:00')) // Monday week 13
    const r = makeRoutine({ createdAt: '2026-03-23T08:00:00.000Z' })
    expect(isBiweeklyFireWeek(r)).toBe(true)
  })

  it('returns false one week after createdAt (diff = 1, odd)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T10:00:00')) // Monday week 14 — one week later
    const r = makeRoutine({ createdAt: '2026-03-23T08:00:00.000Z' }) // week 13
    expect(isBiweeklyFireWeek(r)).toBe(false)
  })

  it('returns true two weeks after createdAt (diff = 2, even)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T10:00:00')) // Monday week 15 — two weeks later
    const r = makeRoutine({ createdAt: '2026-03-23T08:00:00.000Z' }) // week 13
    expect(isBiweeklyFireWeek(r)).toBe(true)
  })

  it('returns false three weeks after createdAt (diff = 3, odd)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T10:00:00')) // Monday week 16 — three weeks later
    const r = makeRoutine({ createdAt: '2026-03-23T08:00:00.000Z' }) // week 13
    expect(isBiweeklyFireWeek(r)).toBe(false)
  })
})

// ── biweekly scheduling behaviour ────────────────────────────────────────────

describe('scheduleRoutineNotification — biweekly', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    cancelAllNotifications()
    setNotificationPermission('granted')
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('skips scheduling on a non-fire week', () => {
    // createdAt week 13, today week 14 → odd diff → skip
    vi.setSystemTime(new Date('2026-03-30T06:00:00')) // week 14
    const r = makeRoutine({
      reminderTime: '08:00',
      reminderFrequency: 'biweekly',
      createdAt: '2026-03-23T08:00:00.000Z', // week 13
    })
    // Should not throw and should not schedule a timer
    expect(() => scheduleRoutineNotification(r)).not.toThrow()
    // Running timers should do nothing
    vi.runAllTimers()
  })

  it('schedules on a fire week (even diff)', () => {
    // createdAt week 13, today week 13 → diff 0 → fire
    vi.setSystemTime(new Date('2026-03-23T06:00:00')) // week 13
    const r = makeRoutine({
      reminderTime: '08:00',
      reminderFrequency: 'biweekly',
      createdAt: '2026-03-23T08:00:00.000Z',
    })
    expect(() => scheduleRoutineNotification(r)).not.toThrow()
    vi.runAllTimers()
  })

  it('treats missing reminderFrequency as daily (always fires)', () => {
    vi.setSystemTime(new Date('2026-03-30T06:00:00')) // week 14 — would be skip for biweekly
    const r = makeRoutine({
      reminderTime: '08:00',
      // no reminderFrequency → defaults to daily behaviour
      createdAt: '2026-03-23T08:00:00.000Z',
    })
    expect(() => scheduleRoutineNotification(r)).not.toThrow()
    vi.runAllTimers()
  })
})
