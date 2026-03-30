import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AppProvider, useApp } from '../../hooks/useApp'
import TrendsView from '../../views/TrendsView'
import type { AppData } from '../../types'
import { lastNDays } from '../../utils/metrics'

function renderView() {
  return render(
    <AppProvider>
      <TrendsView />
    </AppProvider>,
  )
}

describe('TrendsView', () => {
  it('renders the Trends page title', () => {
    renderView()
    expect(screen.getByText('Trends')).toBeTruthy()
  })

  it('renders window tab buttons (7d, 30d, 90d)', () => {
    renderView()
    expect(screen.getByText('7d')).toBeTruthy()
    expect(screen.getByText('30d')).toBeTruthy()
    expect(screen.getByText('90d')).toBeTruthy()
  })

  it('switches window to 30d on tab click', () => {
    renderView()
    const tab30 = screen.getByText('30d')
    fireEvent.click(tab30)
    expect(tab30.classList.contains('active')).toBe(true)
  })

  it('switches window to 90d on tab click', () => {
    renderView()
    const tab90 = screen.getByText('90d')
    fireEvent.click(tab90)
    expect(tab90.classList.contains('active')).toBe(true)
  })

  it('renders the heatmap table', () => {
    renderView()
    expect(document.querySelector('.heatmap-table')).not.toBeNull()
  })

  it('renders day-of-week labels in heatmap header', () => {
    renderView()
    expect(screen.getByText('Sun')).toBeTruthy()
    expect(screen.getByText('Mon')).toBeTruthy()
    expect(screen.getByText('Sat')).toBeTruthy()
  })

  it('renders per-routine consistency section label', () => {
    renderView()
    expect(screen.getByText(/Per-routine consistency/i)).toBeTruthy()
  })

  it('renders stat rows for active routines when seeded', () => {
    const data: AppData = {
      routines: [
        { id: 'r1', name: 'Brush teeth', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'high', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'r2', name: 'Gym', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'low', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      goals: [], completions: [], hobbySessions: [], restDays: [], dayNotes: {},
      goalProgressSessions: [],
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    render(<AppProvider><TrendsView /></AppProvider>)
    const rows = document.querySelectorAll('.stat-row')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('shows dip alert for a dipping routine', () => {
    // Seed data: complete all of last week, none of this week → dipping
    const days14 = lastNDays(14)
    const data: AppData = {
      routines: [{
        id: 'r-dip',
        name: 'Dipping Routine',
        block: 'morning',
        recurrence: 'daily',
        scheduledDays: [0,1,2,3,4,5,6],
        priority: 'low',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
      goals: [],
      completions: days14.slice(0, 7).map(d => ({ date: d, routineId: 'r-dip', done: true })),
      hobbySessions: [],
      restDays: [],
      dayNotes: {},
      goalProgressSessions: [],
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(
      <AppProvider>
        <TrendsView />
      </AppProvider>,
    )

    expect(screen.getAllByText(/dipping/i).length).toBeGreaterThan(0)
  })

  it('shows anchor callout for a high-consistency routine', () => {
    // Seed data: complete all of last 7 days → anchor (>=80%)
    const days7 = lastNDays(7)
    const data: AppData = {
      routines: [{
        id: 'r-anchor',
        name: 'Anchor Routine',
        block: 'morning',
        recurrence: 'daily',
        scheduledDays: [0,1,2,3,4,5,6],
        priority: 'low',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
      goals: [],
      completions: days7.map(d => ({ date: d, routineId: 'r-anchor', done: true })),
      hobbySessions: [],
      restDays: [],
      dayNotes: {},
      goalProgressSessions: [],
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(
      <AppProvider>
        <TrendsView />
      </AppProvider>,
    )

    expect(screen.getByText(/Your anchors/i)).toBeTruthy()
    expect(screen.getAllByText(/Anchor Routine/i).length).toBeGreaterThan(0)
  })
})
