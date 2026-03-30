import { useState } from 'react'
import { useApp } from '../hooks/useApp'
import { buildMilestones, periodLabel, calcMilestoneCount } from '../utils/milestones'
import type { Routine, TimeBlock, Recurrence, RoutinePriority, ReminderFrequency, Goal, MilestonePeriod, GoalType } from '../types'

const BLOCKS: { key: TimeBlock; label: string }[] = [
  { key: 'morning',   label: 'Morning' },
  { key: 'work',      label: 'Work' },
  { key: 'evening',   label: 'Evening' },
  { key: 'wind-down', label: 'Wind-down' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MILESTONE_PERIODS: { key: MilestonePeriod; label: string }[] = [
  { key: 'day',   label: 'Days' },
  { key: 'week',  label: 'Weeks' },
  { key: 'month', label: 'Months' },
  { key: 'year',  label: 'Years' },
]

function recurrenceLabel(r: Routine): string {
  if (r.recurrence === 'daily') return 'Every day'
  if (r.recurrence === 'once-a-week') return 'Once a week'
  if (r.scheduledDays.length === 0) return 'No days set'
  return r.scheduledDays.map(d => DAYS[d]).join(', ')
}

// ─────────────────────────────────────────────────────
// Routine Sheet
// ─────────────────────────────────────────────────────
interface RoutineSheetProps {
  routine?: Routine
  onClose: () => void
}

type RoutineKind = 'regular' | 'hobby' | 'goal-time'

function RoutineSheet({ routine, onClose }: RoutineSheetProps) {
  const { addRoutine, updateRoutine, deleteRoutine } = useApp()
  const [name, setName] = useState(routine?.name ?? '')
  const [block, setBlock] = useState<TimeBlock>(routine?.block ?? 'morning')
  const [recurrence, setRecurrence] = useState<Recurrence>(routine?.recurrence ?? 'daily')
  const [days, setDays] = useState<number[]>(routine?.scheduledDays ?? [])
  const [reminderTime, setReminderTime] = useState(routine?.reminderTime ?? '')
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>(routine?.reminderFrequency ?? 'daily')
  const [priority, setPriority] = useState<RoutinePriority>(routine?.priority ?? 'low')

  function getKind(): RoutineKind {
    if (routine?.isGoalTimeSlot) return 'goal-time'
    if (routine?.isHobbySlot) return 'hobby'
    return 'regular'
  }
  const [kind, setKind] = useState<RoutineKind>(getKind)

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  function save() {
    if (!name.trim()) return
    const payload: Omit<Routine, 'id' | 'createdAt'> = {
      name: name.trim(),
      block,
      recurrence,
      scheduledDays: recurrence === 'daily' ? [0,1,2,3,4,5,6] : days,
      priority,
      active: routine?.active ?? true,
      ...(reminderTime ? { reminderTime, reminderFrequency } : {}),
      ...(kind === 'hobby' ? { isHobbySlot: true } : {}),
      ...(kind === 'goal-time' ? { isGoalTimeSlot: true } : {}),
    }
    if (routine) updateRoutine(routine.id, payload)
    else addRoutine(payload)
    onClose()
  }

  const isSpecial = routine?.isHobbySlot || routine?.isGoalTimeSlot

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-body">
        <div className="sheet-handle" />
        <div className="sheet-title">{routine ? 'Edit routine' : 'New routine'}</div>

        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gym" autoFocus />
        </div>

        {/* Routine kind — only for new routines (can't change existing special routines) */}
        {!routine && (
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['regular', 'hobby', 'goal-time'] as RoutineKind[]).map(k => (
                <button
                  key={k}
                  className={`goal-chip${kind === k ? ' selected' : ''}`}
                  onClick={() => setKind(k)}
                >
                  {k === 'regular' ? 'Regular' : k === 'hobby' ? 'Hobby slot' : 'Goal-time slot'}
                </button>
              ))}
            </div>
            {kind === 'hobby' && (
              <p className="text-xs text-mute" style={{ marginTop: 6 }}>
                When done, lets you pick which goal you worked on that day.
              </p>
            )}
            {kind === 'goal-time' && (
              <p className="text-xs text-mute" style={{ marginTop: 6 }}>
                When done, lets you pick a goal and log how much progress you made (0–100%).
              </p>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Time block</label>
          <select className="form-select" value={block} onChange={e => setBlock(e.target.value as TimeBlock)}>
            {BLOCKS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Recurrence</label>
          <select className="form-select" value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)}>
            <option value="daily">Every day</option>
            <option value="specific-days">Specific days of week</option>
            <option value="once-a-week">Once a week (any day)</option>
          </select>
        </div>

        {recurrence === 'specific-days' && (
          <div className="form-group">
            <label className="form-label">Days</label>
            <div className="day-pill-row">
              {DAYS.map((d, i) => (
                <button key={i} className={`day-pill${days.includes(i) ? ' selected' : ''}`} onClick={() => toggleDay(i)}>
                  {d[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Priority</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['low', 'high'] as RoutinePriority[]).map(p => (
              <button
                key={p}
                className={`goal-chip${priority === p ? ' selected' : ''}`}
                style={priority === p && p === 'high' ? { background: 'var(--amber)', borderColor: 'var(--amber)', color: '#000' } : undefined}
                onClick={() => setPriority(p)}
              >
                {p === 'high' ? 'High priority' : 'Low priority (default)'}
              </button>
            ))}
          </div>
          {priority === 'high' && (
            <p className="text-xs text-mute" style={{ marginTop: 6 }}>
              High-priority routines are highlighted in amber on the Today screen when not yet done.
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Reminder notification (optional)</label>
          <input
            className="form-input"
            type="time"
            value={reminderTime}
            onChange={e => setReminderTime(e.target.value)}
          />
          {reminderTime && (
            <div style={{ marginTop: 8 }}>
              <label className="form-label">Reminder frequency</label>
              <select
                className="form-select"
                value={reminderFrequency}
                onChange={e => setReminderFrequency(e.target.value as ReminderFrequency)}
              >
                <option value="daily">Every day this routine is scheduled</option>
                <option value="biweekly">Every two weeks</option>
              </select>
            </div>
          )}
          <p className="text-xs text-mute" style={{ marginTop: 4 }}>
            {reminderFrequency === 'biweekly' && reminderTime
              ? 'You\'ll get a push notification at this time once every two weeks. Requires notification permission.'
              : 'You\'ll get a push notification at this time each day this routine is scheduled. Requires notification permission.'}
          </p>
        </div>
        </div>{/* end sheet-body */}

        <div className="sheet-footer">
        <button className="btn btn-primary btn-full" onClick={save}>
          {routine ? 'Save changes' : 'Add routine'}
        </button>

        {routine && !isSpecial && (
          <button
            className="btn btn-danger btn-full"
            style={{ marginTop: 10 }}
            onClick={() => { deleteRoutine(routine.id); onClose() }}
          >
            Delete routine
          </button>
        )}

        <button className="btn btn-secondary btn-full" style={{ marginTop: 10 }} onClick={onClose}>
          Cancel
        </button>
        </div>{/* end sheet-footer */}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Goal Sheet
// ─────────────────────────────────────────────────────
interface GoalSheetProps {
  goal?: Goal
  onClose: () => void
}

function GoalSheet({ goal, onClose }: GoalSheetProps) {
  const { addGoal, updateGoal, deleteGoal } = useApp()
  const [name, setName] = useState(goal?.name ?? '')
  const [goalType, setGoalType] = useState<GoalType>(goal?.goalType ?? 'normal')
  const [totalPages, setTotalPages] = useState(String(goal?.totalPages ?? ''))
  const [totalLessons, setTotalLessons] = useState(String(goal?.totalLessons ?? ''))
  const [startDate, setStartDate] = useState(goal?.startDate ?? '')
  const [endDate, setEndDate] = useState(goal?.endDate ?? '')
  const [milestonePeriod, setMilestonePeriod] = useState<MilestonePeriod>(goal?.milestonePeriod ?? 'month')

  // Auto-calculate milestone count from dates + period
  const autoCount = startDate && endDate ? calcMilestoneCount(startDate, endDate, milestonePeriod) : 0
  // Use existing milestones to preserve labels/completions when editing
  const [milestoneLabels, setMilestoneLabels] = useState<string[]>(() => {
    if (!goal?.milestones) return []
    return goal.milestones.map(m => m.label)
  })
  const [showMilestoneLabels, setShowMilestoneLabels] = useState(false)

  // Sync label array when autoCount changes
  function labelsForCount(count: number): string[] {
    return Array.from({ length: count }, (_, i) => milestoneLabels[i] ?? `Milestone ${i + 1}`)
  }

  function save() {
    if (!name.trim()) return

    const parsedPages = parseInt(totalPages, 10)
    const parsedLessons = parseInt(totalLessons, 10)

    const baseGoal: Omit<Goal, 'id' | 'createdAt'> = {
      name: name.trim(),
      active: goal?.active ?? true,
      goalType,
      ...(goalType === 'book' && !isNaN(parsedPages) && parsedPages > 0 ? { totalPages: parsedPages } : {}),
      ...(goalType === 'course' && !isNaN(parsedLessons) && parsedLessons > 0 ? { totalLessons: parsedLessons } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }

    if (autoCount > 0) {
      const existingMilestones = goal?.milestones ?? []
      const labels = labelsForCount(autoCount)

      const draft: Goal = {
        ...baseGoal,
        id: goal?.id ?? '',
        createdAt: goal?.createdAt ?? '',
        milestoneCount: autoCount,
        milestonePeriod,
        milestones: existingMilestones,
      }
      const generated = buildMilestones(draft)
      const milestones = generated.map((m, i) => ({ ...m, label: labels[i] ?? m.label }))
      const currentMilestone = milestones.find(m => !m.completedAt)?.index ?? autoCount

      const finalGoal = { ...baseGoal, milestoneCount: autoCount, milestonePeriod, milestones, currentMilestone }
      if (goal) updateGoal(goal.id, finalGoal)
      else addGoal(finalGoal)
    } else {
      if (goal) updateGoal(goal.id, { ...baseGoal, milestoneCount: undefined, milestonePeriod: undefined, milestones: undefined })
      else addGoal(baseGoal)
    }
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-body">
        <div className="sheet-handle" />
        <div className="sheet-title">{goal ? 'Edit goal' : 'New goal'}</div>

        <div className="form-group">
          <label className="form-label">Goal name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Read Atomic Habits" autoFocus />
        </div>

        {/* Goal type */}
        <div className="form-group">
          <label className="form-label">Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['normal', 'book', 'course'] as GoalType[]).map(t => (
              <button
                key={t}
                className={`goal-chip${goalType === t ? ' selected' : ''}`}
                onClick={() => setGoalType(t)}
              >
                {t === 'normal' ? 'General' : t === 'book' ? 'Book' : 'Course'}
              </button>
            ))}
          </div>
        </div>

        {/* Book-specific fields */}
        {goalType === 'book' && (
          <div className="form-group">
            <label className="form-label">Total pages</label>
            <input
              className="form-input"
              type="number"
              min="1"
              value={totalPages}
              onChange={e => setTotalPages(e.target.value)}
              placeholder="e.g. 320"
            />
          </div>
        )}

        {/* Course-specific fields */}
        {goalType === 'course' && (
          <div className="form-group">
            <label className="form-label">Total lessons</label>
            <input
              className="form-input"
              type="number"
              min="1"
              value={totalLessons}
              onChange={e => setTotalLessons(e.target.value)}
              placeholder="e.g. 48"
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Start date</label>
            <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End date</label>
            <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="divider" />

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Milestones</div>
          <p className="text-xs text-mute" style={{ marginBottom: 10 }}>
            Set start and end dates above, then choose a period. Milestone count is calculated automatically.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Each milestone is 1…</label>
          <select className="form-select" value={milestonePeriod} onChange={e => setMilestonePeriod(e.target.value as MilestonePeriod)}>
            {MILESTONE_PERIODS.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Auto-calculated count display */}
        {autoCount > 0 ? (
          <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(124,106,247,0.08)', borderRadius: 8, border: '1px solid rgba(124,106,247,0.2)' }}>
            <span className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {autoCount} milestone{autoCount !== 1 ? 's' : ''} calculated automatically
            </span>
            <span className="text-xs text-mute"> ({periodLabel(milestonePeriod)} each, from {startDate} to {endDate})</span>
          </div>
        ) : (startDate || endDate) ? (
          <div style={{ marginBottom: 14 }}>
            <p className="text-xs text-mute">Set both start and end dates to auto-calculate milestones.</p>
          </div>
        ) : null}

        {autoCount > 0 && (
          <div style={{ marginBottom: 14 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowMilestoneLabels(v => !v)}
              style={{ marginBottom: 8 }}
            >
              {showMilestoneLabels ? 'Hide' : 'Edit'} milestone labels ({autoCount})
            </button>
            {showMilestoneLabels && (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                {labelsForCount(autoCount).map((lbl, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span className="text-xs text-mute" style={{ width: 28, flexShrink: 0 }}>#{i + 1}</span>
                    <input
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: 13 }}
                      value={lbl}
                      onChange={e => {
                        const updated = [...milestoneLabels]
                        updated[i] = e.target.value
                        setMilestoneLabels(updated)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>{/* end sheet-body */}

        <div className="sheet-footer">
        <button className="btn btn-primary btn-full" onClick={save}>
          {goal ? 'Save changes' : 'Add goal'}
        </button>

        {goal && (
          <>
            <button
              className="btn btn-secondary btn-full"
              style={{ marginTop: 10 }}
              onClick={() => { updateGoal(goal.id, { active: !goal.active }); onClose() }}
            >
              {goal.active ? 'Archive goal' : 'Restore goal'}
            </button>
            <button
              className="btn btn-danger btn-full"
              style={{ marginTop: 10 }}
              onClick={() => { deleteGoal(goal.id); onClose() }}
            >
              Delete goal
            </button>
          </>
        )}

        <button className="btn btn-secondary btn-full" style={{ marginTop: 10 }} onClick={onClose}>
          Cancel
        </button>
        </div>{/* end sheet-footer */}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
// Main Settings view
// ─────────────────────────────────────────────────────
export default function SettingsView() {
  const { data } = useApp()
  const [routineSheet, setRoutineSheet] = useState<Routine | null | 'new'>(null)
  const [goalSheet, setGoalSheet] = useState<Goal | null | 'new'>(null)

  const blockOrder: TimeBlock[] = ['morning', 'work', 'evening', 'wind-down']
  const sortedRoutines = [...data.routines].sort(
    (a, b) => blockOrder.indexOf(a.block) - blockOrder.indexOf(b.block),
  )

  function routineKindBadge(r: Routine): string {
    if (r.isGoalTimeSlot) return ' · goal-time'
    if (r.isHobbySlot) return ' · hobby'
    return ''
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Settings</div>
      </div>

      {/* Routines section */}
      <div className="flex-between">
        <div className="section-label" style={{ margin: 0 }}>Routines</div>
        <button className="btn btn-primary btn-sm" onClick={() => setRoutineSheet('new')}>+ Add</button>
      </div>
      <div style={{ marginTop: 10 }}>
        {sortedRoutines.filter(r => r.active).map(r => (
          <div key={r.id} className="settings-row" onClick={() => setRoutineSheet(r)}>
            <div className="settings-row-text">
              <div className="settings-row-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.name}
                {r.priority === 'high' && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', letterSpacing: 0.5 }}>HIGH</span>
                )}
              </div>
              <div className="settings-row-sub">
                {r.block} · {recurrenceLabel(r)}{routineKindBadge(r)}
                {r.reminderTime && ` · reminder ${r.reminderTime}${r.reminderFrequency === 'biweekly' ? ' (biweekly)' : ''}`}
              </div>
            </div>
            <span className="text-mute">›</span>
          </div>
        ))}
        {sortedRoutines.filter(r => !r.active).length > 0 && (
          <div className="section-label" style={{ marginTop: 12 }}>Inactive</div>
        )}
        {sortedRoutines.filter(r => !r.active).map(r => (
          <div key={r.id} className="settings-row" style={{ opacity: 0.5 }} onClick={() => setRoutineSheet(r)}>
            <div className="settings-row-text">
              <div className="settings-row-name">{r.name}</div>
              <div className="settings-row-sub">{r.block} · inactive</div>
            </div>
            <span className="text-mute">›</span>
          </div>
        ))}
      </div>

      {/* Goals section */}
      <div className="flex-between" style={{ marginTop: 24 }}>
        <div className="section-label" style={{ margin: 0 }}>Long-term goals</div>
        <button className="btn btn-primary btn-sm" onClick={() => setGoalSheet('new')}>+ Add</button>
      </div>
      <div style={{ marginTop: 10 }}>
        {data.goals.filter(g => g.active).map(g => {
          const done = (g.milestones ?? []).filter(m => m.completedAt).length
          const total = g.milestoneCount ?? 0
          return (
            <div key={g.id} className="settings-row" onClick={() => setGoalSheet(g)}>
              <div className="settings-row-text">
                <div className="settings-row-name">{g.name}</div>
                <div className="settings-row-sub">
                  {g.goalType && g.goalType !== 'normal' ? `${g.goalType} · ` : ''}
                  {total > 0
                    ? `${done}/${total} milestones · ${g.milestonePeriod ? `1 ${periodLabel(g.milestonePeriod)} each` : ''}`
                    : 'No milestones set'}
                  {g.endDate && ` · ends ${g.endDate}`}
                </div>
              </div>
              <span className="text-mute">›</span>
            </div>
          )
        })}
        {data.goals.filter(g => !g.active).map(g => (
          <div key={g.id} className="settings-row" style={{ opacity: 0.5 }} onClick={() => setGoalSheet(g)}>
            <div className="settings-row-text">
              <div className="settings-row-name" style={{ textDecoration: 'line-through' }}>{g.name}</div>
              <div className="settings-row-sub">archived</div>
            </div>
            <span className="text-mute">›</span>
          </div>
        ))}
      </div>

      <div style={{ height: 16 }} />

      {/* Sheets */}
      {routineSheet !== null && (
        <RoutineSheet
          routine={routineSheet === 'new' ? undefined : routineSheet}
          onClose={() => setRoutineSheet(null)}
        />
      )}
      {goalSheet !== null && (
        <GoalSheet
          goal={goalSheet === 'new' ? undefined : goalSheet}
          onClose={() => setGoalSheet(null)}
        />
      )}
    </div>
  )
}
