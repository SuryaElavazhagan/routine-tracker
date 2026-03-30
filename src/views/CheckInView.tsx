import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useApp'
import { today, isScheduledOn, isDone, computeStats, classifyDay, detectAnchors } from '../utils/metrics'
import { isMilestoneNearEnd, currentActiveMilestone, daysUntilMilestoneEnd, goalProgress } from '../utils/milestones'
import { getPermission, requestPermission } from '../utils/notifications'
import type { TimeBlock } from '../types'

const BLOCKS: { key: TimeBlock; label: string }[] = [
  { key: 'morning',   label: 'Morning' },
  { key: 'work',      label: 'Work' },
  { key: 'evening',   label: 'Evening' },
  { key: 'wind-down', label: 'Wind-down' },
]

const DAY_QUALITY_LABELS: Record<string, string> = {
  'full-streak':  'Full streak day',
  'anchors-held': 'Anchors held',
  'recovery':     'Recovery day',
  'rest':         'Rest day',
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function HobbyPicker({ date }: { date: string }) {
  const { data, logHobbySession, clearHobbySession } = useApp()
  const session = data.hobbySessions.find(s => s.date === date)
  const goals = data.goals.filter(g => g.active)

  return (
    <div className="hobby-row">
      <div className="hobby-top">
        <div className="check-circle" style={{ borderColor: session ? 'var(--accent)' : undefined, background: session ? 'var(--accent)' : undefined }}>
          {session && <CheckIcon />}
        </div>
        <span className="routine-name" style={{ color: session ? 'var(--text-dim)' : undefined }}>Hobby time</span>
        <span className="hobby-badge">goal</span>
      </div>
      <div className="goal-chips">
        {goals.length === 0 && <span className="text-mute text-small">Add goals in Settings</span>}
        {goals.map(g => (
          <button
            key={g.id}
            className={`goal-chip${session?.goalId === g.id ? ' selected' : ''}`}
            onClick={() => {
              if (session?.goalId === g.id) clearHobbySession(date)
              else logHobbySession(g.id, date)
            }}
          >
            {g.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function GoalTimePicker({ date }: { date: string }) {
  const { data, logGoalProgressSession, clearGoalProgressSession, completeMilestone } = useApp()
  const session = data.goalProgressSessions.find(s => s.date === date)
  const goals = data.goals.filter(g => g.active)
  const [selectedGoalId, setSelectedGoalId] = useState<string>(session?.goalId ?? '')
  const [pct, setPct] = useState<number>(session?.progressPct ?? 0)

  const selectedGoal = goals.find(g => g.id === selectedGoalId)
  const activeMilestone = selectedGoal ? currentActiveMilestone(selectedGoal) : null

  function handleGoalSelect(goalId: string) {
    if (session?.goalId === goalId) {
      // deselect / clear
      clearGoalProgressSession(date)
      setSelectedGoalId('')
      setPct(0)
    } else {
      setSelectedGoalId(goalId)
      const existing = data.goalProgressSessions.find(s => s.date === date && s.goalId === goalId)
      const newPct = existing?.progressPct ?? 0
      setPct(newPct)
      logGoalProgressSession(goalId, date, newPct)
    }
  }

  function handlePctChange(newPct: number) {
    setPct(newPct)
    if (selectedGoalId) {
      logGoalProgressSession(selectedGoalId, date, newPct)
    }
  }

  const isDone = !!session

  return (
    <div className="hobby-row">
      <div className="hobby-top">
        <div className="check-circle" style={{ borderColor: isDone ? 'var(--accent)' : undefined, background: isDone ? 'var(--accent)' : undefined }}>
          {isDone && <CheckIcon />}
        </div>
        <span className="routine-name" style={{ color: isDone ? 'var(--text-dim)' : undefined }}>Goal time</span>
        <span className="hobby-badge">progress</span>
      </div>
      <div className="goal-chips">
        {goals.length === 0 && <span className="text-mute text-small">Add goals in Settings</span>}
        {goals.map(g => (
          <button
            key={g.id}
            className={`goal-chip${selectedGoalId === g.id && session ? ' selected' : ''}`}
            onClick={() => handleGoalSelect(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>
      {selectedGoalId && session && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="text-xs text-mute">Progress this session</span>
            <span className="text-xs" style={{ fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={e => handlePctChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          {pct === 100 && activeMilestone && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(124,106,247,0.1)', borderRadius: 8, border: '1px solid rgba(124,106,247,0.25)' }}>
              <div className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
                100% — milestone complete?
              </div>
              <div className="text-xs text-mute" style={{ marginBottom: 8 }}>
                Mark "{activeMilestone.label !== `Milestone ${activeMilestone.index}` ? activeMilestone.label : `Milestone ${activeMilestone.index}`}" as done?
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => completeMilestone(selectedGoalId, activeMilestone.id)}
              >
                Mark milestone done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CheckInView() {
  const { data, toggleCompletion, toggleRestDay, setDayNote } = useApp()
  const [noteValue, setNoteValue] = useState(() => data.dayNotes[today()] ?? '')
  const [notifPerm, setNotifPerm] = useState(getPermission)
  const t = today()
  const isRest = data.restDays.includes(t)

  const stats = useMemo(() => computeStats(data), [data])
  const quality = useMemo(() => classifyDay(data, t, stats), [data, t, stats])
  const anchors = useMemo(() => detectAnchors(stats), [stats])

  const scheduledToday = data.routines.filter(r => r.active && isScheduledOn(r, t))

  // Goals with milestones ending soon
  const nearMilestoneGoals = useMemo(
    () => data.goals.filter(g => g.active && isMilestoneNearEnd(g)),
    [data.goals],
  )

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // Check if any routines have reminder times set (so banner is relevant)
  const hasReminders = data.routines.some(r => r.active && r.reminderTime)

  async function enableNotifications() {
    const p = await requestPermission()
    setNotifPerm(p)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">{dateLabel}</div>
          <div style={{ marginTop: 4 }}>
            <span className={`day-quality ${quality}`}>{DAY_QUALITY_LABELS[quality]}</span>
          </div>
        </div>
      </div>

      {/* Notification permission banner */}
      {notifPerm !== 'granted' && notifPerm !== 'denied' && hasReminders && (
        <div className="card" style={{ borderColor: 'var(--amber)', background: 'rgba(240,180,41,0.07)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <BellIcon />
          <span className="text-small" style={{ flex: 1, color: 'var(--text-dim)' }}>Enable notifications to get reminders</span>
          <button className="btn btn-sm btn-primary" onClick={enableNotifications}>Enable</button>
        </div>
      )}

      {/* Near-milestone goal callouts */}
      {nearMilestoneGoals.map(g => {
        const active = currentActiveMilestone(g)
        const days = active ? daysUntilMilestoneEnd(g, active.index) : null
        const pct = goalProgress(g)
        return (
          <div key={g.id} className="card" style={{ borderColor: 'var(--accent)', background: 'rgba(124,106,247,0.07)', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Goal milestone ending soon</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{g.name}</div>
            <div className="text-xs text-mute" style={{ marginTop: 3 }}>
              {active ? `Milestone ${active.index}${active.label !== `Milestone ${active.index}` ? ` — ${active.label}` : ''}` : ''}
              {days !== null && days >= 0 && ` · ${days === 0 ? 'ends today' : `${days}d left`}`}
              {` · ${pct}% overall`}
            </div>
          </div>
        )
      })}

      {/* Rest day toggle */}
      <div
        className="rest-toggle"
        onClick={() => toggleRestDay(t)}
        role="button"
        aria-pressed={isRest}
      >
        <div className={`toggle-pill${isRest ? ' on' : ''}`} />
        <span>Rest day — remove from consistency calculations</span>
      </div>

      {isRest && (
        <div className="card" style={{ borderColor: 'var(--blue)', background: 'rgba(92,154,224,0.06)' }}>
          <span className="text-dim text-small">Rest day marked. Today won't count against any routines.</span>
        </div>
      )}

      {BLOCKS.map(block => {
        const routines = scheduledToday.filter(r => r.block === block.key && !r.isHobbySlot && !r.isGoalTimeSlot)
        const hobbyRoutine = scheduledToday.find(r => r.block === block.key && r.isHobbySlot)
        const goalTimeRoutine = scheduledToday.find(r => r.block === block.key && r.isGoalTimeSlot)
        if (routines.length === 0 && !hobbyRoutine && !goalTimeRoutine) return null
        return (
          <div key={block.key}>
            <div className="section-label">{block.label}</div>
            {routines.map(r => {
              const done = isDone(data.completions, t, r.id)
              const isAnchor = anchors.includes(r.id)
              const isHighPriority = r.priority === 'high'
              const highlightHigh = isHighPriority && !done

              return (
                <div
                  key={r.id}
                  className={`routine-row${done ? ' done' : ''}${highlightHigh ? ' high-priority' : ''}`}
                  onClick={() => toggleCompletion(r.id, t)}
                  role="button"
                  aria-pressed={done}
                >
                  <div className={`check-circle${done ? ' done' : ''}`} style={
                    highlightHigh ? { borderColor: 'var(--amber)' } : undefined
                  }>
                    {done && <CheckIcon />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className={`routine-name${done ? ' done' : ''}`}>{r.name}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      {isHighPriority && !done && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: 'var(--amber)', textTransform: 'uppercase' }}>high priority</span>
                      )}
                      {isAnchor && !done && (
                        <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>anchor</span>
                      )}
                      {r.reminderTime && (
                        <span style={{ fontSize: 10, color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <BellIcon /> {r.reminderTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {hobbyRoutine && <HobbyPicker date={t} />}
            {goalTimeRoutine && <GoalTimePicker date={t} />}
          </div>
        )
      })}

      {scheduledToday.length === 0 && (
        <div className="empty">No routines scheduled today.</div>
      )}

      <div className="divider" />

      {/* Day note */}
      <div className="form-group">
        <label className="form-label">Day note (optional)</label>
        <input
          className="form-input"
          value={noteValue}
          placeholder="One line about today…"
          onChange={e => setNoteValue(e.target.value)}
          onBlur={() => setDayNote(t, noteValue)}
        />
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
