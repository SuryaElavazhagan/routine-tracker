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

// Track scheduled timer IDs so we can cancel on re-schedule
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function cancelAllNotifications() {
  for (const id of scheduledTimers.values()) clearTimeout(id)
  scheduledTimers.clear()
}

/** Schedule a local notification for a routine at its reminderTime today.
 *  Safe to call multiple times — cancels any previous timer for the same routine. */
export function scheduleRoutineNotification(routine: Routine) {
  if (!routine.reminderTime) return
  if (getPermission() !== 'granted') return

  // Cancel any existing timer
  const existing = scheduledTimers.get(routine.id)
  if (existing !== undefined) clearTimeout(existing)

  const parsed = parseTime(routine.reminderTime)
  if (!parsed) return
  const ms = msUntilToday(parsed.h, parsed.m)
  if (ms < 0) return // already passed today

  const timer = setTimeout(() => {
    try {
      // Try service worker notification first (works in background on mobile)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: `Reminder: ${routine.name}`,
          body: 'Tap to open your routines.',
          tag: `routine-${routine.id}`,
        })
      } else {
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
