import { v4 as uuidv4 } from 'uuid'
import type { Goal, Milestone, MilestonePeriod } from '../types'

/** Given a goal's config, generate (or regenerate) its milestone array */
export function buildMilestones(goal: Goal): Milestone[] {
  const count = goal.milestoneCount ?? 0
  if (count <= 0) return []

  // Preserve existing completions by index
  const existingByIndex = new Map<number, Milestone>()
  for (const m of goal.milestones ?? []) existingByIndex.set(m.index, m)

  return Array.from({ length: count }, (_, i) => {
    const idx = i + 1
    const existing = existingByIndex.get(idx)
    return {
      id: existing?.id ?? uuidv4(),
      label: existing?.label ?? `Milestone ${idx}`,
      index: idx,
      completedAt: existing?.completedAt,
    }
  })
}

/** Returns the start date of a specific milestone given goal start + period */
export function milestoneStartDate(goal: Goal, milestoneIndex: number): Date | null {
  if (!goal.startDate || !goal.milestonePeriod) return null
  const [y, mo, d] = goal.startDate.split('-').map(Number)
  const start = new Date(y, mo - 1, d)
  const i = milestoneIndex - 1 // 0-based offset
  const period = goal.milestonePeriod

  const result = new Date(start)
  if (period === 'day')   result.setDate(result.getDate() + i)
  if (period === 'week')  result.setDate(result.getDate() + i * 7)
  if (period === 'month') result.setMonth(result.getMonth() + i)
  if (period === 'year')  result.setFullYear(result.getFullYear() + i)
  return result
}

/** Returns the end date of a specific milestone */
export function milestoneEndDate(goal: Goal, milestoneIndex: number): Date | null {
  const start = milestoneStartDate(goal, milestoneIndex + 1)
  if (!start) return null
  const end = new Date(start)
  end.setDate(end.getDate() - 1)
  return end
}

const PERIOD_LABELS: Record<MilestonePeriod, string> = {
  day: 'day', week: 'week', month: 'month', year: 'year',
}

export function periodLabel(p: MilestonePeriod): string {
  return PERIOD_LABELS[p]
}

/** How many days until a milestone's end date */
export function daysUntilMilestoneEnd(goal: Goal, milestoneIndex: number): number | null {
  const end = milestoneEndDate(goal, milestoneIndex)
  if (!end) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / 86_400_000)
}

/** Returns the current active milestone for a goal (first incomplete) */
export function currentActiveMilestone(goal: Goal): Milestone | null {
  if (!goal.milestones?.length) return null
  return goal.milestones.find(m => !m.completedAt) ?? null
}

/** Is a goal's current milestone ending soon? (within 7 days) */
export function isMilestoneNearEnd(goal: Goal): boolean {
  const active = currentActiveMilestone(goal)
  if (!active) return false
  const days = daysUntilMilestoneEnd(goal, active.index)
  if (days === null) return false
  return days >= 0 && days <= 7
}

/** Overall goal progress 0–100 */
export function goalProgress(goal: Goal): number {
  const total = goal.milestoneCount ?? 0
  if (total === 0) return 0
  const done = (goal.milestones ?? []).filter(m => m.completedAt).length
  return Math.round((done / total) * 100)
}
