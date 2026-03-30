/**
 * Push / local notification helpers.
 *
 * Strategy: we use the Web Notifications API with a setTimeout scheduler.
 * Because there is no backend, we schedule notifications for the current day
 * only (on each app load).  The service worker can show persistent
 * notifications when the app is in the background, but scheduling persistence
 * across browser restarts requires a Push server — so we use the simpler
 * approach: schedule for today on each app open, which is good enough for a
 * morning/evening home-screen PWA.
 *
 * Bi-weekly frequency:
 * We use ISO week number parity to decide which week fires.
 * Week 0 of the routine's life = the week containing createdAt.
 * If (currentISOWeek - createdAtISOWeek) is even → fire week; odd → skip.
 * This gives a consistent every-other-week cadence anchored to when the
 * routine was created.
 */

import type { Routine } from '../types'

export type NotifPermission = 'granted' | 'denied' | 'default'

export function getPermission(): NotifPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission as NotifPermission
}

export async function requestPermission(): Promise<NotifPermission> {
  if (!('Notification' in window)) return 'denied'
  const result = await Notification.requestPermission()
  return result as NotifPermission
}

/** Returns HH and MM as numbers from "HH:MM" string */
function parseTime(t: string): { h: number; m: number } | null {
  const parts = t.split(':')
  if (parts.length !== 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return { h, m }
}

/** Returns ms until a given HH:MM today (negative if already past) */
function msUntilToday(h: number, m: number): number {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0)
  return target.getTime() - now.getTime()
}

/**
 * Returns the ISO week number (1-based) for a given date.
 * ISO weeks start on Monday; week 1 contains the year's first Thursday.
 */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Set to nearest Thursday: current date + 4 - current day (Mon=1 … Sun=7)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/**
 * Returns a monotonic "week index" — total weeks elapsed since the Unix epoch
 * (epoch Monday = 1970-01-05). Used to compare two dates by week parity
 * without year-boundary arithmetic.
 */
function weekIndex(date: Date): number {
  // Days since 1970-01-05 (first Monday of epoch), divided by 7
  const epochMonday = new Date('1970-01-05T00:00:00Z')
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.floor((date.getTime() - epochMonday.getTime()) / msPerWeek)
}

/**
 * Returns true if today is a "fire week" for a bi-weekly routine.
 * Uses the parity of (todayWeekIndex - createdAtWeekIndex):
 *   even difference → fire; odd difference → skip.
 */
export function isBiweeklyFireWeek(routine: Routine): boolean {
  const createdAt = new Date(routine.createdAt)
  const today = new Date()
  const diff = weekIndex(today) - weekIndex(createdAt)
  return diff % 2 === 0
}

// Track scheduled timer IDs so we can cancel on re-schedule
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function cancelAllNotifications() {
  for (const id of scheduledTimers.values()) clearTimeout(id)
  scheduledTimers.clear()
}

/** Cancel the pending notification timer for a single routine, if any. */
export function cancelRoutineNotification(routineId: string) {
  const existing = scheduledTimers.get(routineId)
  if (existing !== undefined) {
    clearTimeout(existing)
    scheduledTimers.delete(routineId)
  }
}

/** Schedule a local notification for a routine at its reminderTime today.
 *  Safe to call multiple times — cancels any previous timer for the same routine. */
export function scheduleRoutineNotification(routine: Routine) {
  if (!routine.reminderTime) return
  if (getPermission() !== 'granted') return

  // Bi-weekly: only fire on alternating weeks anchored to createdAt
  if (routine.reminderFrequency === 'biweekly' && !isBiweeklyFireWeek(routine)) return

  // Cancel any existing timer
  const existing = scheduledTimers.get(routine.id)
  if (existing !== undefined) clearTimeout(existing)

  const parsed = parseTime(routine.reminderTime)
  if (!parsed) return
  const ms = msUntilToday(parsed.h, parsed.m)
  if (ms < 0) return // already passed today

  const timer = setTimeout(() => {
    try {
      if ('serviceWorker' in navigator) {
        // Use registration.showNotification() — works even when controller is
        // null (e.g. first load before SW activates). `ready` always resolves
        // to the active SW registration.  This is the only path that works on
        // iOS Safari (which does not support `new Notification()` at all).
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(`Reminder: ${routine.name}`, {
            body: 'Tap to open your routines.',
            tag: `routine-${routine.id}`,
            icon: './icons/icon-192.png',
          })
        }).catch(() => {
          // SW not available — fall back to plain Notification (non-iOS)
          if (Notification.permission === 'granted') {
            new Notification(`Reminder: ${routine.name}`, {
              body: 'Tap to open your routines.',
              tag: `routine-${routine.id}`,
              icon: './icons/icon-192.png',
            })
          }
        })
      } else if (Notification.permission === 'granted') {
        new Notification(`Reminder: ${routine.name}`, {
          body: 'Tap to open your routines.',
          tag: `routine-${routine.id}`,
          icon: './icons/icon-192.png',
        })
      }
    } catch {
      // Notifications may be blocked; ignore silently
    }
    scheduledTimers.delete(routine.id)
  }, ms)

  scheduledTimers.set(routine.id, timer)
}

/** Call once on app load with today's scheduled routines. */
export function scheduleAllNotifications(routines: Routine[]) {
  cancelAllNotifications()
  if (getPermission() !== 'granted') return
  for (const r of routines) {
    if (r.active && r.reminderTime) scheduleRoutineNotification(r)
  }
}
