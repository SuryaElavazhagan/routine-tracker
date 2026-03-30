export type TimeBlock = 'morning' | 'work' | 'evening' | 'wind-down'

export type Recurrence = 'daily' | 'specific-days' | 'once-a-week'

export type RoutinePriority = 'low' | 'high'

/** How often the reminder notification fires */
export type ReminderFrequency = 'daily' | 'biweekly'

export interface Routine {
  id: string
  name: string
  block: TimeBlock
  recurrence: Recurrence
  /** days of week: 0=Sun…6=Sat; used when recurrence=specific-days */
  scheduledDays: number[]
  /** HH:MM — push notification reminder time */
  reminderTime?: string
  /** How often the reminder fires: every day (default) or every two weeks */
  reminderFrequency?: ReminderFrequency
  /** low (default) or high */
  priority: RoutinePriority
  active: boolean
  createdAt: string
  /** marks this routine as the hobby slot */
  isHobbySlot?: boolean
  /** marks this routine as the goal-time slot (tracks progress % per session) */
  isGoalTimeSlot?: boolean
}

export type MilestonePeriod = 'day' | 'week' | 'month' | 'year'

export interface Milestone {
  id: string
  label: string
  /** 1-based index in the goal's milestone sequence */
  index: number
  completedAt?: string  // ISO date YYYY-MM-DD when user marks it done
}

/** Type of goal — affects what unit of progress is tracked */
export type GoalType = 'normal' | 'book' | 'course'

export interface Goal {
  id: string
  name: string
  active: boolean
  createdAt: string
  /** Type of goal; defaults to 'normal' if absent */
  goalType?: GoalType
  /** For book goals: total pages */
  totalPages?: number
  /** For course goals: total lessons */
  totalLessons?: number
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

/** Records a goal-time slot session with progress percentage */
export interface GoalProgressSession {
  date: string        // YYYY-MM-DD
  goalId: string
  progressPct: number // 0–100
}

export interface AppData {
  routines: Routine[]
  goals: Goal[]
  completions: Completion[]
  hobbySessions: HobbySession[]
  goalProgressSessions: GoalProgressSession[]
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
