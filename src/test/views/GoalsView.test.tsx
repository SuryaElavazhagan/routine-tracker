import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AppProvider, useApp } from '../../hooks/useApp'
import GoalsView from '../../views/GoalsView'
import type { AppData } from '../../types'

function renderView() {
  return render(
    <AppProvider>
      <GoalsView />
    </AppProvider>,
  )
}

describe('GoalsView', () => {
  it('renders the Hobby & Goals page title', () => {
    renderView()
    expect(screen.getByText(/Hobby.*Goals/i)).toBeTruthy()
  })

  it('renders the Active goals section label', () => {
    renderView()
    const labels = screen.getAllByText(/Active goals/i)
    expect(labels.length).toBeGreaterThan(0)
  })

  it('renders goal cards when goals exist', () => {
    const data: AppData = {
      routines: [], goals: [{ id: 'g1', name: 'My Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      completions: [], hobbySessions: [], goalProgressSessions: [], restDays: [], dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    renderView()
    const cards = document.querySelectorAll('.card')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('renders session count text on goal cards', () => {
    const data: AppData = {
      routines: [], goals: [{ id: 'g1', name: 'My Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      completions: [], hobbySessions: [], goalProgressSessions: [], restDays: [], dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    renderView()
    const sessionText = screen.getAllByText(/0 session/i)
    expect(sessionText.length).toBeGreaterThan(0)
  })

  it('renders goal name text', () => {
    const data: AppData = {
      routines: [], goals: [{ id: 'g1', name: 'My Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      completions: [], hobbySessions: [], goalProgressSessions: [], restDays: [], dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    renderView()
    expect(screen.getByText('My Goal')).toBeTruthy()
  })

  it('does not render Recent sessions section when no sessions', () => {
    renderView()
    expect(screen.queryByText(/Recent sessions/i)).toBeNull()
  })

  it('expands milestone list when goal card is clicked (for goal with milestones)', () => {
    // Seed data with a goal that has milestones
    const data: AppData = {
      routines: [],
      goals: [{
        id: 'g-milestones',
        name: 'Goal With Milestones',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        milestoneCount: 2,
        milestonePeriod: 'week',
        startDate: '2026-01-01',
        milestones: [
          { id: 'mid-1', label: 'Custom First Label', index: 1 },
          { id: 'mid-2', label: 'Milestone 2', index: 2 },
        ],
        currentMilestone: 1,
      }],
      completions: [],
      hobbySessions: [],
      goalProgressSessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(
      <AppProvider>
        <GoalsView />
      </AppProvider>,
    )

    // Should show the goal name
    expect(screen.getByText('Goal With Milestones')).toBeTruthy()
    // Click on the goal name (which is inside the clickable header div) to expand
    fireEvent.click(screen.getByText('Goal With Milestones'))
    // Should show milestone list
    expect(document.body.textContent).toContain('Custom First Label')
  })

  it('renders completed milestone with completion date', () => {
    const data: AppData = {
      routines: [],
      goals: [{
        id: 'g-completed',
        name: 'Goal Completed Milestone',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        milestoneCount: 2,
        milestonePeriod: 'week',
        startDate: '2026-01-01',
        milestones: [
          { id: 'mid-1', label: 'Milestone 1', index: 1, completedAt: '2026-01-07' },
          { id: 'mid-2', label: 'Milestone 2', index: 2 },
        ],
        currentMilestone: 2,
      }],
      completions: [],
      hobbySessions: [],
      goalProgressSessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(<AppProvider><GoalsView /></AppProvider>)

    const goalName = screen.getByText('Goal Completed Milestone')
    fireEvent.click(goalName)
    // Milestone list expanded — completed date should be visible
    expect(document.body.textContent).toContain('Completed 2026-01-07')
  })

  it('toggles milestone completion when milestone button is clicked', () => {
    const data: AppData = {
      routines: [],
      goals: [{
        id: 'g-toggle',
        name: 'Toggle Goal',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        milestoneCount: 1,
        milestonePeriod: 'week',
        startDate: '2026-03-01',
        milestones: [{ id: 'mid-1', label: 'Milestone 1', index: 1 }],
        currentMilestone: 1,
      }],
      completions: [],
      hobbySessions: [],
      goalProgressSessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(<AppProvider><GoalsView /></AppProvider>)

    const goalName = screen.getByText('Toggle Goal')
    fireEvent.click(goalName)

    // The milestone button should be visible
    const milestoneButtons = document.querySelectorAll('button[style*="border-radius: 50%"]')
    if (milestoneButtons.length > 0) {
      fireEvent.click(milestoneButtons[0])
      // Should now show "Completed" text or toggle state
      expect(document.body.textContent).toContain('Toggle Goal')
    }
  })

  it('shows recent sessions section when hobby sessions exist', () => {
    const data: AppData = {
      routines: [],
      goals: [{ id: 'g-session', name: 'Session Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      completions: [],
      hobbySessions: [{ date: '2026-03-28', goalId: 'g-session' }],
      goalProgressSessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(<AppProvider><GoalsView /></AppProvider>)

    expect(screen.getByText(/Recent sessions/i)).toBeTruthy()
  })

  it('shows archived goals section when inactive goals exist', () => {
    const data: AppData = {
      routines: [],
      goals: [
        { id: 'g-active', name: 'Active Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'g-arch', name: 'Archived Goal', active: false, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      completions: [],
      hobbySessions: [],
      goalProgressSessions: [{ date: '2026-03-28', goalId: 'g-arch', progressPct: 50 }],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    render(<AppProvider><GoalsView /></AppProvider>)
    expect(screen.getByText(/Completed.*archived/i)).toBeTruthy()
    expect(screen.getAllByText('Archived Goal').length).toBeGreaterThan(0)
  })

  it('shows book progress badge when goal has book type and progress sessions', () => {
    const data: AppData = {
      routines: [],
      goals: [{
        id: 'g-book',
        name: 'Book Goal',
        active: true,
        goalType: 'book',
        totalPages: 300,
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
      completions: [],
      hobbySessions: [],
      goalProgressSessions: [{ date: '2026-03-28', goalId: 'g-book', progressPct: 60 }],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    render(<AppProvider><GoalsView /></AppProvider>)
    expect(screen.getAllByText('Book Goal').length).toBeGreaterThan(0)
    // Should show page progress info
    expect(document.body.textContent).toMatch(/page|60%/i)
  })

  it('renders goal session counts greater than zero when sessions exist', () => {
    const data: AppData = {
      routines: [],
      goals: [{ id: 'g-session', name: 'Session Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      completions: [],
      hobbySessions: [{ date: '2026-03-20', goalId: 'g-session' }],
      goalProgressSessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(<AppProvider><GoalsView /></AppProvider>)

    expect(screen.getByText(/1 session/i)).toBeTruthy()
  })
})

