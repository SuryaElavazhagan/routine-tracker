import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import { lastNDays } from '../utils/metrics'
import { currentActiveMilestone, goalProgress, milestoneStartDate, milestoneEndDate, daysUntilMilestoneEnd } from '../utils/milestones'

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
    </div>
  )
}

function MilestoneList({ goalId }: { goalId: string }) {
  const { data, completeMilestone } = useApp()
  const goal = data.goals.find(g => g.id === goalId)
  if (!goal?.milestones?.length) return null

  const milestones = [...goal.milestones].sort((a, b) => a.index - b.index)

  return (
    <div style={{ marginTop: 10 }}>
      {milestones.map(m => {
        const start = milestoneStartDate(goal, m.index)
        const end = milestoneEndDate(goal, m.index)
        const daysLeft = daysUntilMilestoneEnd(goal, m.index)
        const isActive = !m.completedAt && (goal.currentMilestone === m.index || milestones.find(x => !x.completedAt)?.index === m.index)

        return (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--border)',
              opacity: m.completedAt ? 0.5 : 1,
            }}
          >
            {/* Completion toggle */}
            <button
              onClick={() => completeMilestone(goalId, m.id)}
              style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${m.completedAt ? 'var(--green)' : isActive ? 'var(--accent)' : 'var(--border)'}`,
                background: m.completedAt ? 'var(--green)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginTop: 2,
              }}
            >
              {m.completedAt && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text-dim)' }}>
                  #{m.index} {m.label !== `Milestone ${m.index}` ? m.label : ''}
                </span>
                {isActive && !m.completedAt && (
                  <span style={{ fontSize: 10, background: 'rgba(124,106,247,0.2)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>current</span>
                )}
                {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && !m.completedAt && (
                  <span style={{ fontSize: 10, background: 'rgba(240,180,41,0.15)', color: 'var(--amber)', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>
                    {daysLeft === 0 ? 'today!' : `${daysLeft}d left`}
                  </span>
                )}
              </div>
              {(start || end) && (
                <div className="text-xs text-mute" style={{ marginTop: 2 }}>
                  {start ? start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  {start && end ? ' – ' : ''}
                  {end ? end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </div>
              )}
              {m.completedAt && (
                <div className="text-xs" style={{ color: 'var(--green)', marginTop: 2 }}>Completed {m.completedAt}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function GoalsView() {
  const { data } = useApp()
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)

  const activeGoals = data.goals.filter(g => g.active)
  const inactiveGoals = data.goals.filter(g => !g.active)

  // Hobby sessions per goal
  const sessionsByGoal = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const s of data.hobbySessions) {
      const arr = map.get(s.goalId) ?? []
      arr.push(s.date)
      map.set(s.goalId, arr)
    }
    return map
  }, [data.hobbySessions])

  // Goal-time progress sessions per goal (most recent per day, sum of pct for display)
  const progressSessionsByGoal = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const s of data.goalProgressSessions) {
      const arr = map.get(s.goalId) ?? []
      arr.push(s.progressPct)
      map.set(s.goalId, arr)
    }
    return map
  }, [data.goalProgressSessions])

  const recentDays = new Set(lastNDays(30))
  const recentHobbySessions = data.hobbySessions.filter(s => recentDays.has(s.date))
  const recentProgressSessions = data.goalProgressSessions.filter(s => recentDays.has(s.date))

  // Combined session log (both types) sorted by date desc
  const allSessions = useMemo(() => {
    const hobby = data.hobbySessions.map(s => ({ ...s, type: 'hobby' as const, progressPct: undefined as number | undefined }))
    const progress = data.goalProgressSessions.map(s => ({ ...s, type: 'goal-time' as const }))
    return [...hobby, ...progress].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40)
  }, [data.hobbySessions, data.goalProgressSessions])

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Hobby &amp; Goals</div>
      </div>

      <p className="page-sub">
        Every day you mark hobby or goal time, you pick which goal you worked on.
        Sessions accumulate — no pressure, just progress.
      </p>

      <div className="section-label">Active goals</div>
      {activeGoals.length === 0 && (
        <div className="empty">No active goals — add some in Settings.</div>
      )}
      {activeGoals.map(g => {
        const hobbySessions = sessionsByGoal.get(g.id) ?? []
        const progressPcts = progressSessionsByGoal.get(g.id) ?? []
        const recentHobby = recentHobbySessions.filter(s => s.goalId === g.id).length
        const recentProgress = recentProgressSessions.filter(s => s.goalId === g.id).length
        const totalSessions = hobbySessions.length + progressPcts.length
        const recentTotal = recentHobby + recentProgress
        const pct = goalProgress(g)
        const active = currentActiveMilestone(g)
        const hasMilestones = (g.milestoneCount ?? 0) > 0
        const expanded = expandedGoal === g.id
        const goalType = g.goalType ?? 'normal'

        // Book/course progress: average of all progressPct sessions
        const avgProgress = progressPcts.length > 0
          ? Math.round(progressPcts.reduce((a, b) => a + b, 0) / progressPcts.length)
          : null

        return (
          <div key={g.id} className="card" style={{ padding: '14px 16px', marginBottom: 10 }}>
            {/* Header row */}
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: hasMilestones ? 'pointer' : 'default' }}
              onClick={() => hasMilestones && setExpandedGoal(expanded ? null : g.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div>
                  {goalType !== 'normal' && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-mute)', background: 'var(--surface2)', padding: '1px 6px', borderRadius: 99, textTransform: 'uppercase' }}>
                      {goalType}
                    </span>
                  )}
                </div>
                <div className="text-xs text-mute" style={{ marginTop: 3 }}>
                  {totalSessions} session{totalSessions !== 1 ? 's' : ''}
                  {recentTotal > 0 && ` · ${recentTotal} in last 30 days`}
                  {hasMilestones && ` · ${(g.milestones ?? []).filter(m => m.completedAt).length}/${g.milestoneCount} milestones`}
                  {g.endDate && ` · ends ${g.endDate}`}
                </div>

                {/* Book/course specific progress */}
                {goalType === 'book' && g.totalPages && avgProgress !== null && (
                  <div className="text-xs" style={{ color: 'var(--accent)', marginTop: 3 }}>
                    Avg session progress: {avgProgress}% · {Math.round(g.totalPages * avgProgress / 100)}/{g.totalPages} pages
                  </div>
                )}
                {goalType === 'course' && g.totalLessons && avgProgress !== null && (
                  <div className="text-xs" style={{ color: 'var(--accent)', marginTop: 3 }}>
                    Avg session progress: {avgProgress}% · {Math.round(g.totalLessons * avgProgress / 100)}/{g.totalLessons} lessons
                  </div>
                )}

                {hasMilestones && (
                  <>
                    <ProgressBar pct={pct} />
                    {active && (
                      <div className="text-xs" style={{ color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                        Current: #{active.index}{active.label !== `Milestone ${active.index}` ? ` — ${active.label}` : ''}
                      </div>
                    )}
                  </>
                )}
              </div>

              {hasMilestones && (
                <span style={{ color: 'var(--text-mute)', fontSize: 18, lineHeight: 1, marginTop: 2 }}>
                  {expanded ? '∧' : '∨'}
                </span>
              )}
            </div>

            {/* Expanded milestones */}
            {expanded && <MilestoneList goalId={g.id} />}
          </div>
        )
      })}

      {/* Recent session log */}
      {allSessions.length > 0 && (
        <>
          <div className="section-label">Recent sessions</div>
          <div className="card">
            {allSessions.map((s, i) => {
              const goal = data.goals.find(g => g.id === s.goalId)
              const date = new Date(s.date + 'T00:00:00')
              const label = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <div key={i} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-dim text-small">{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.type === 'goal-time' && s.progressPct !== undefined && (
                      <span className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.progressPct}%</span>
                    )}
                    <span style={{ fontSize: 14 }}>{goal?.name ?? 'Unknown goal'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {inactiveGoals.length > 0 && (
        <>
          <div className="section-label">Completed / archived goals</div>
          {inactiveGoals.map(g => {
            const hobbySessions = sessionsByGoal.get(g.id) ?? []
            const progressPcts = progressSessionsByGoal.get(g.id) ?? []
            const totalSessions = hobbySessions.length + progressPcts.length
            const pct = goalProgress(g)
            return (
              <div key={g.id} className="goal-row" style={{ opacity: 0.5 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, textDecoration: 'line-through' }}>{g.name}</div>
                  <div className="text-xs text-mute" style={{ marginTop: 2 }}>
                    {totalSessions} total sessions
                    {(g.milestoneCount ?? 0) > 0 && ` · ${pct}% milestones done`}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
