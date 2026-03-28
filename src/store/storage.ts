import { v4 as uuidv4 } from 'uuid'
import type { AppData, Routine, Goal } from '../types'

const STORAGE_KEY = 'routine-tracker-data'

const DEFAULT_ROUTINES: Omit<Routine, 'id' | 'createdAt'>[] = [
  { name: 'Bath / shower',     block: 'morning',    recurrence: 'daily',          scheduledDays: [0,1,2,3,4,5,6], priority: 'low',  active: true },
  { name: 'Brush teeth',       block: 'morning',    recurrence: 'daily',          scheduledDays: [0,1,2,3,4,5,6], priority: 'high', active: true },
  { name: 'Gym',               block: 'morning',    recurrence: 'daily',          scheduledDays: [0,1,2,3,4,5,6], priority: 'low',  active: true },
  { name: 'Breakfast',         block: 'morning',    recurrence: 'daily',          scheduledDays: [0,1,2,3,4,5,6], priority: 'low',  active: true },
  { name: 'Go to work',        block: 'work',       recurrence: 'specific-days',  scheduledDays: [1,2,3,4,5],     priority: 'low',  active: true },
  { name: 'Return from work',  block: 'work',       recurrence: 'specific-days',  scheduledDays: [1,2,3,4,5],     priority: 'low',  active: true },
  { name: 'Do the dishes',     block: 'evening',    recurrence: 'daily',          scheduledDays: [0,1,2,3,4,5,6], priority: 'low',  active: true },
  { name: 'Hobby time',        block: 'evening',    recurrence: 'daily',          scheduledDays: [0,1,2,3,4,5,6], priority: 'low',  active: true, isHobbySlot: true },
  { name: 'Sleep',             block: 'wind-down',  recurrence: 'daily',          scheduledDays: [0,1,2,3,4,5,6], priority: 'low',  active: true },
  { name: 'Plastic garbage',   block: 'evening',    recurrence: 'specific-days',  scheduledDays: [5],             priority: 'low',  active: true },
  { name: 'Food waste',        block: 'evening',    recurrence: 'specific-days',  scheduledDays: [0],             priority: 'low',  active: true },
  { name: 'Laundry',           block: 'evening',    recurrence: 'once-a-week',    scheduledDays: [],              priority: 'low',  active: true },
  { name: 'Clean apartment',   block: 'evening',    recurrence: 'once-a-week',    scheduledDays: [],              priority: 'low',  active: true },
]

const DEFAULT_GOALS: Omit<Goal, 'id' | 'createdAt'>[] = [
  { name: 'Read a book',       active: true },
  { name: 'Complete a course', active: true },
  { name: 'Learn a skill',     active: true },
]

function buildDefault(): AppData {
  const now = new Date().toISOString()
  return {
    routines: DEFAULT_ROUTINES.map(r => ({ ...r, id: uuidv4(), createdAt: now })),
    goals: DEFAULT_GOALS.map(g => ({ ...g, id: uuidv4(), createdAt: now })),
    completions: [],
    hobbySessions: [],
    restDays: [],
    dayNotes: {},
    meta: { version: 2, exportedAt: now },
  }
}

/** Migrate old data that may be missing new fields */
function migrate(data: AppData): AppData {
  return {
    ...data,
    routines: data.routines.map(r => {
      if (r.priority) return r
      return { ...r, priority: 'low' as const }
    }),
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      return migrate(parsed)
    }
  } catch {
    // corrupted — fall through to default
  }
  const d = buildDefault()
  saveData(d)
  return d
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportData(data: AppData): void {
  const blob = new Blob(
    [JSON.stringify({ ...data, meta: { ...data.meta, exportedAt: new Date().toISOString() } }, null, 2)],
    { type: 'application/json' },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `routine-backup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(json: string): AppData {
  const parsed = JSON.parse(json) as AppData
  if (!parsed.routines || !parsed.completions) throw new Error('Invalid backup file')
  const migrated = migrate(parsed)
  saveData(migrated)
  return migrated
}
