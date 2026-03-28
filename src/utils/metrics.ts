import type { AppData, Routine, Completion, RoutineStats, TrendDirection, DayQuality } from '../types'

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function today(): string {
  return toDateString(new Date())
}

/** Days ago from today */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateString(d)
}

/** Returns YYYY-MM-DD strings for the last N days (inclusive of today) */
export function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) days.push(daysAgo(i))
  return days
}

/** Day of week 0-6 from a YYYY-MM-DD string */
export function dayOfWeek(date: string): number {
  // Parse manually to avoid timezone issues
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Whether a routine is scheduled on a given date */
export function isScheduledOn(routine: Routine, date: string): boolean {
  if (!routine.active) return false
  const dow = dayOfWeek(date)
  if (routine.recurrence === 'daily') return true
  if (routine.recurrence === 'specific-days') return routine.scheduledDays.includes(dow)
  if (routine.recurrence === 'once-a-week') return true // appears every day, user picks
  return false
}

/** Get completions set for fast lookup: "date:routineId" */
function buildCompletionSet(completions: Completion[]): Set<string> {
  return new Set(completions.filter(c => c.done).map(c => `${c.date}:${c.routineId}`))
}

export function isDone(completions: Completion[], date: string, routineId: string): boolean {
  return completions.some(c => c.date === date && c.routineId === routineId && c.done)
}

/** Consistency over a window: days done / days scheduled */
function consistencyOver(
  routine: Routine,
  days: string[],
  completionSet: Set<string>,
  restDays: string[],
): number {
  const restSet = new Set(restDays)
  const scheduled = days.filter(d => isScheduledOn(routine, d) && !restSet.has(d))
  if (scheduled.length === 0) return 0
  const done = scheduled.filter(d => completionSet.has(`${d}:${routine.id}`))
  return Math.round((done.length / scheduled.length) * 100)
}

/** Current consecutive streak */
function currentStreak(routine: Routine, completionSet: Set<string>, restDays: string[]): number {
  const restSet = new Set(restDays)
  let streak = 0
  let i = 0
  while (true) {
    const date = daysAgo(i)
    if (restSet.has(date)) { i++; continue }
    if (!isScheduledOn(routine, date)) { i++; if (i > 365) break; continue }
    if (completionSet.has(`${date}:${routine.id}`)) {
      streak++
      i++
    } else {
      break
    }
    if (i > 365) break
  }
  return streak
}

function trendFor(c7: number, c14to7: number): TrendDirection {
  const diff = c7 - c14to7
  if (diff > 5) return 'rising'
  if (diff < -5) return 'dipping'
  return 'stable'
}

export function computeStats(data: AppData): RoutineStats[] {
  const completionSet = buildCompletionSet(data.completions)
  const days7 = lastNDays(7)
  const days30 = lastNDays(30)
  const days90 = lastNDays(90)
  const days14to7 = lastNDays(14).slice(0, 7) // week before last

  return data.routines.filter(r => r.active).map(routine => {
    const c7 = consistencyOver(routine, days7, completionSet, data.restDays)
    const c30 = consistencyOver(routine, days30, completionSet, data.restDays)
    const c90 = consistencyOver(routine, days90, completionSet, data.restDays)
    const cPrev7 = consistencyOver(routine, days14to7, completionSet, data.restDays)
    const streak = currentStreak(routine, completionSet, data.restDays)
    const trend = trendFor(c7, cPrev7)

    return { routineId: routine.id, consistency7: c7, consistency30: c30, consistency90: c90, streak, trend }
  })
}

/** Routines scheduled today */
export function todayRoutines(data: AppData): Routine[] {
  const t = today()
  return data.routines.filter(r => r.active && isScheduledOn(r, t))
}

/** Anchors: routines with 7-day consistency >= 80% */
export function detectAnchors(stats: RoutineStats[]): string[] {
  return stats.filter(s => s.consistency7 >= 80).map(s => s.routineId)
}

/** Day quality classification */
export function classifyDay(data: AppData, date: string, stats: RoutineStats[]): DayQuality {
  if (data.restDays.includes(date)) return 'rest'
  const completionSet = buildCompletionSet(data.completions)
  const scheduled = data.routines.filter(r => r.active && isScheduledOn(r, date))
  if (scheduled.length === 0) return 'recovery'
  const doneCount = scheduled.filter(r => completionSet.has(`${date}:${r.id}`)).length
  const total = scheduled.length
  const anchors = detectAnchors(stats)
  const anchorsDone = scheduled.filter(r => anchors.includes(r.id) && completionSet.has(`${date}:${r.id}`))
  const anchorTotal = scheduled.filter(r => anchors.includes(r.id))

  if (doneCount === total) return 'full-streak'
  if (anchorTotal.length > 0 && anchorsDone.length === anchorTotal.length) return 'anchors-held'
  if (doneCount > 0) return 'recovery'
  return 'recovery'
}

/** Heatmap: for each routine, percentage done per day-of-week over 90 days */
export function buildHeatmap(data: AppData): Record<string, number[]> {
  const completionSet = buildCompletionSet(data.completions)
  const days = lastNDays(90)
  const result: Record<string, number[]> = {}

  for (const routine of data.routines.filter(r => r.active)) {
    const counts = Array(7).fill(0)
    const totals = Array(7).fill(0)
    for (const day of days) {
      if (!isScheduledOn(routine, day)) continue
      const dow = dayOfWeek(day)
      totals[dow]++
      if (completionSet.has(`${day}:${routine.id}`)) counts[dow]++
    }
    result[routine.id] = counts.map((c, i) => (totals[i] === 0 ? -1 : Math.round((c / totals[i]) * 100)))
  }
  return result
}
