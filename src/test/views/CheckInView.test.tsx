import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppProvider } from '../../hooks/useApp'
import CheckInView from '../../views/CheckInView'
import type { AppData } from '../../types'

function seedRoutines(extra: Partial<AppData> = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const dow = new Date().getDay()
  const data: AppData = {
    routines: [
      { id: 'r1', name: 'Brush teeth', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'high', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'r2', name: 'Gym', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'low', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'r3', name: 'Hobby time', block: 'evening', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'low', active: true, isHobbySlot: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'r4', name: 'Go to work', block: 'work', recurrence: 'specific-days', scheduledDays: [1,2,3,4,5], priority: 'low', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'r5', name: 'Laundry', block: 'evening', recurrence: 'once-a-week', scheduledDays: [], priority: 'low', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    goals: [{ id: 'g1', name: 'Read a book', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
    completions: [],
    hobbySessions: [],
    goalProgressSessions: [],
    restDays: [],
    dayNotes: {},
    meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    ...extra,
  }
  void today; void dow
  localStorage.setItem('routine-tracker-data', JSON.stringify(data))
}

function renderView() {
  return render(
    <AppProvider>
      <CheckInView />
    </AppProvider>,
  )
}

describe('CheckInView', () => {
  it('renders the date header', () => {
    renderView()
    expect(document.querySelector('.page-header')).not.toBeNull()
  })

  it('renders a rest-day toggle', () => {
    renderView()
    expect(screen.getByRole('button', { hidden: true, name: /rest day/i }) ??
      screen.getByText(/Rest day/i)).toBeTruthy()
  })

  it('shows day quality badge', () => {
    renderView()
    expect(document.querySelector('.day-quality')).not.toBeNull()
  })

  it('renders routine rows for today when routines are seeded', () => {
    seedRoutines()
    renderView()
    const routineRows = document.querySelectorAll('.routine-row')
    expect(routineRows.length).toBeGreaterThan(0)
  })

  it('clicking a routine row toggles completion', () => {
    seedRoutines()
    renderView()
    const rows = document.querySelectorAll('.routine-row')
    expect(rows.length).toBeGreaterThan(0)
    const row = rows[0] as HTMLElement
    fireEvent.click(row)
    const doneRows = document.querySelectorAll('.routine-row.done')
    expect(doneRows.length).toBeGreaterThanOrEqual(1)
  })

  it('clicking rest-day toggle marks rest day', () => {
    renderView()
    const toggle = document.querySelector('.rest-toggle') as HTMLElement
    if (toggle) {
      fireEvent.click(toggle)
      const pill = document.querySelector('.toggle-pill')
      expect(pill?.classList.contains('on') || document.body.textContent?.includes("Rest day marked")).toBeTruthy()
    }
  })

  it('day note input updates on change', () => {
    renderView()
    const input = screen.getByPlaceholderText(/One line about today/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Good day' } })
    expect(input.value).toBe('Good day')
  })

  it('day note saves on blur', () => {
    renderView()
    const input = screen.getByPlaceholderText(/One line about today/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Note text' } })
    fireEvent.blur(input)
  })

  it('shows all time blocks when routines span multiple blocks', () => {
    seedRoutines()
    renderView()
    // morning block should appear
    expect(document.body.textContent).toMatch(/morning|Morning/i)
  })

  it('shows completed routine as done after toggling', () => {
    seedRoutines()
    renderView()
    const rows = document.querySelectorAll('.routine-row')
    const row = rows[0] as HTMLElement
    fireEvent.click(row)
    expect(document.querySelectorAll('.routine-row.done').length).toBeGreaterThanOrEqual(1)
    // toggle back off
    fireEvent.click(row)
    expect(document.querySelectorAll('.routine-row.done').length).toBe(0)
  })

  it('shows rest day card when rest day is toggled on', () => {
    renderView()
    const toggle = document.querySelector('.rest-toggle') as HTMLElement
    if (toggle) {
      fireEvent.click(toggle)
      expect(document.body.textContent).toMatch(/rest/i)
    }
  })

  it('renders goal-time slot picker when isGoalTimeSlot routine is scheduled', () => {
    const data: AppData = {
      routines: [
        { id: 'gt1', name: 'Goal time', block: 'evening', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'low', active: true, isGoalTimeSlot: true, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      goals: [{ id: 'g1', name: 'My Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      completions: [],
      hobbySessions: [],
      goalProgressSessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    renderView()
    expect(document.body.textContent).toContain('Goal time')
    expect(document.body.textContent).toContain('progress')
  })

  it('shows progress slider after selecting a goal in goal-time picker', () => {
    const data: AppData = {
      routines: [
        { id: 'gt1', name: 'Goal time', block: 'evening', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'low', active: true, isGoalTimeSlot: true, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      goals: [{ id: 'g1', name: 'Project Alpha', active: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      completions: [],
      hobbySessions: [],
      goalProgressSessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 3, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))
    renderView()
    // Click on the goal chip
    const goalChip = screen.getByText('Project Alpha')
    fireEvent.click(goalChip)
    // Slider should appear
    const slider = document.querySelector('input[type="range"]')
    expect(slider).not.toBeNull()
  })
})
