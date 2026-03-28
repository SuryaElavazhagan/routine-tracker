export type TimeBlock = 'morning' | 'work' | 'evening' | 'wind-down'

export type Recurrence = 'daily' | 'specific-days' | 'once-a-week'

export type RoutinePriority = 'low' | 'high'

export interface Routine {
  id: string
  name: string
  block: TimeBlock
  recurrence: Recurrence
  /** days of week: 0=Sun…6=Sat; used when recurrence=specific-days */
  scheduledDays: number[]
  /** HH:MM — push notification reminder time */
  reminderTime?: string
  /** low (default) or high */
  priority: RoutinePriority
  active: boolean
  createdAt: string
  /** marks this routine as the hobby slot */
  isHobbySlot?: boolean
}

export type MilestonePeriod = 'day' | 'week' | 'month' | 'year'

export interface Milestone {
  id: string
  label: string
  /** 1-based index in the goal's milestone sequence */
  index: number
  completedAt?: string  // ISO date YYYY-MM-DD when user marks it done
}

export interface Goal {
  id: string
  name: string
  active: boolean
  createdAt: string
  /** ISO date string for goal start */
  startDate?: string
  /** ISO date string for goal end (overall deadline) */
  endDate?: string
  /** total number of milestones to split the goal into */
  milestoneCount?: number
  /** duration unit for each milestone */
  milestonePeriod?: MilestonePeriod
  /** per-milestone records */
  milestones?: Milestone[]
  /** index (1-based) of the currently active milestone */
  currentMilestone?: number
}

export interface Completion {
  date: string      // YYYY-MM-DD
  routineId: string
  done: boolean
}

export interface HobbySession {
  date: string      // YYYY-MM-DD
  goalId: string
}

export interface AppData {
  routines: Routine[]
  goals: Goal[]
  completions: Completion[]
  hobbySessions: HobbySession[]
  restDays: string[]
  dayNotes: Record<string, string>
  meta: { version: number; exportedAt: string }
}

export type TrendDirection = 'rising' | 'stable' | 'dipping'

export interface RoutineStats {
  routineId: string
  consistency7: number
  consistency30: number
  consistency90: number
  streak: number
  trend: TrendDirection
}

export type DayQuality = 'full-streak' | 'anchors-held' | 'recovery' | 'rest'
