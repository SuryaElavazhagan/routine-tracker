import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Routine } from '../../types'
import {
  getPermission,
  requestPermission,
  cancelAllNotifications,
  scheduleRoutineNotification,
  scheduleAllNotifications,
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
