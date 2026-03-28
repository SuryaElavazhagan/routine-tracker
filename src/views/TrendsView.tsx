import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useApp'
import { computeStats, buildHeatmap, detectAnchors } from '../utils/metrics'
import type { RoutineStats, TrendDirection } from '../types'

type Window = '7' | '30' | '90'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function heatColor(pct: number): string {
  if (pct < 0) return 'rgba(255,255,255,0.03)'
  if (pct === 0) return 'rgba(255,255,255,0.06)'
  if (pct < 30) return 'rgba(92,154,224,0.15)'
  if (pct < 60) return 'rgba(124,106,247,0.25)'
  if (pct < 80) return 'rgba(76,175,130,0.25)'
  return 'rgba(76,175,130,0.5)'
}

function trendLabel(t: TrendDirection) {
  if (t === 'rising')  return '↑ Rising'
  if (t === 'dipping') return '↓ Dipping'
  return '→ Stable'
}

function numColor(n: number) {
  if (n >= 80) return 'good'
  if (n >= 50) return 'mid'
  return 'low'
}

export default function TrendsView() {
  const { data } = useApp()
  const [window, setWindow] = useState<Window>('7')

  const stats = useMemo(() => computeStats(data), [data])
  const heatmap = useMemo(() => buildHeatmap(data), [data])
  const anchors = useMemo(() => detectAnchors(stats), [stats])
  const dipping = stats.filter(s => s.trend === 'dipping')

  const routineMap = new Map(data.routines.map(r => [r.id, r]))

  function getConsistency(s: RoutineStats) {
    if (window === '7')  return s.consistency7
    if (window === '30') return s.consistency30
    return s.consistency90
  }

  const activeStats = stats.filter(s => routineMap.get(s.routineId)?.active)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Trends</div>
      </div>

      {/* Dip alerts */}
      {dipping.length > 0 && (
        <div>
          {dipping.map(s => {
            const r = routineMap.get(s.routineId)
            if (!r) return null
            return (
              <div key={s.routineId} className="dip-alert">
                <span>⚠</span>
                <span><strong>{r.name}</strong> has been dipping — consistency this week is lower than last week.</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Anchor callouts */}
      {anchors.length > 0 && (
        <div>
          <div className="section-label">Your anchors</div>
          {anchors.map(id => {
            const r = routineMap.get(id)
            if (!r) return null
            return (
              <div key={id} className="anchor-callout">
                <span>★</span>
                <span>You almost never miss <strong>{r.name}</strong>.</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Per-routine consistency */}
      <div className="section-label" style={{ marginTop: anchors.length > 0 ? 8 : 0 }}>Per-routine consistency</div>
      <div className="window-tabs">
        {(['7','30','90'] as Window[]).map(w => (
          <button key={w} className={`window-tab${window === w ? ' active' : ''}`} onClick={() => setWindow(w)}>
            {w}d
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="stat-row-header">
          <span>Routine</span>
          <span>{window}d %</span>
          <span>streak</span>
          <span style={{ gridColumn: 'span 2', textAlign: 'center' }}>trend</span>
        </div>
        {activeStats.length === 0 && <div className="empty">No data yet.</div>}
        {activeStats.map(s => {
          const r = routineMap.get(s.routineId)
          if (!r) return null
          const c = getConsistency(s)
          return (
            <div key={s.routineId} className="stat-row">
              <span className="stat-label">{r.name}</span>
              <span className={`stat-num ${numColor(c)}`}>{c}%</span>
              <span className={`stat-num ${numColor(s.streak > 0 ? 80 : 0)}`}>{s.streak}d</span>
              <span className={`trend-badge ${s.trend}`} style={{ gridColumn: 'span 2', justifySelf: 'center' }}>
                {trendLabel(s.trend)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Heatmap */}
      <div className="section-label">Weekly pattern heatmap (last 90 days)</div>
      <div className="card" style={{ padding: '12px 8px' }}>
        <div className="heatmap-grid">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Routine</th>
                {DOW_LABELS.map(d => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.routines.filter(r => r.active).map(r => {
                const row = heatmap[r.id] ?? Array(7).fill(-1)
                return (
                  <tr key={r.id}>
                    <td className="row-label" title={r.name}>{r.name}</td>
                    {row.map((pct, i) => (
                      <td key={i}>
                        <div
                          className="heatmap-cell"
                          style={{ background: heatColor(pct), color: pct >= 60 ? 'white' : 'var(--text-dim)' }}
                        >
                          {pct >= 0 ? `${pct}` : ''}
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-mute" style={{ marginTop: 8, textAlign: 'center' }}>
          % of times done on that day of week
        </div>
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
