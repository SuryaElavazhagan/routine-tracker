import { v4 as uuidv4 } from 'uuid'
import type { AppData, Routine, Goal } from '../types'

const STORAGE_KEY = 'routine-tracker-data'

const DEFAULT_ROUTINES: Omit<Routine, 'id' | 'createdAt'>[] = []

const DEFAULT_GOALS: Omit<Goal, 'id' | 'createdAt'>[] = []

function buildDefault(): AppData {
  const now = new Date().toISOString()
  return {
    routines: DEFAULT_ROUTINES.map(r => ({ ...r, id: uuidv4(), createdAt: now })),
    goals: DEFAULT_GOALS.map(g => ({ ...g, id: uuidv4(), createdAt: now })),
    completions: [],
    hobbySessions: [],
    goalProgressSessions: [],
    restDays: [],
    dayNotes: {},
    meta: { version: 3, exportedAt: now },
  }
}

/** Migrate old data that may be missing new fields */
function migrate(data: AppData): AppData {
  return {
    ...data,
    // v3: add goalProgressSessions if missing
    goalProgressSessions: data.goalProgressSessions ?? [],
    // v3: add goalType: 'normal' to existing goals that don't have it
    goals: (data.goals ?? []).map(g => ({
      ...g,
      goalType: g.goalType ?? 'normal',
    })),
    routines: data.routines.map(r => {
      const withPriority = r.priority ? r : { ...r, priority: 'low' as const }
      // reminderFrequency defaults to 'daily' for existing routines that have a
      // reminderTime but were saved before this field existed
      if (withPriority.reminderTime && !withPriority.reminderFrequency) {
        return { ...withPriority, reminderFrequency: 'daily' as const }
      }
      return withPriority
    }),
    meta: { ...data.meta, version: 3 },
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
