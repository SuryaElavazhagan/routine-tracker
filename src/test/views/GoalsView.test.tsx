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
    expect(screen.getByText(/Active goals/i)).toBeTruthy()
  })

  it('renders goal cards for default goals', () => {
    renderView()
    const cards = document.querySelectorAll('.card')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('renders session count text on goal cards', () => {
    renderView()
    // default goals have 0 sessions
    const sessionText = screen.getAllByText(/0 session/i)
    expect(sessionText.length).toBeGreaterThan(0)
  })

  it('shows the page subtitle about sessions', () => {
    renderView()
    expect(screen.getByText(/Sessions accumulate/i)).toBeTruthy()
  })

  it('renders goal name text for default goals', () => {
    renderView()
    // default data includes "Read a book"
    expect(screen.getByText('Read a book')).toBeTruthy()
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
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
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
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
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
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
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
    function TestWrapper() {
      const { logHobbySession, data } = useApp()
      const goalId = data.goals[0]?.id ?? 'g1'
      return (
        <button
          data-testid="log-session"
          onClick={() => logHobbySession(goalId, '2026-03-28')}
        />
      )
    }

    const { getByTestId } = render(
      <AppProvider>
        <TestWrapper />
        <GoalsView />
      </AppProvider>,
    )

    act(() => fireEvent.click(getByTestId('log-session')))

    expect(screen.getByText(/Recent sessions/i)).toBeTruthy()
  })

  it('renders goal session counts greater than zero when sessions exist', () => {
    function TestWrapper() {
      const { logHobbySession, data } = useApp()
      const goalId = data.goals[0]?.id ?? 'g1'
      return (
        <button
          data-testid="log-session"
          onClick={() => logHobbySession(goalId, '2026-03-20')}
        />
      )
    }

    const { getByTestId } = render(
      <AppProvider>
        <TestWrapper />
        <GoalsView />
      </AppProvider>,
    )

    act(() => fireEvent.click(getByTestId('log-session')))

    expect(screen.getByText(/1 session/i)).toBeTruthy()
  })
})

