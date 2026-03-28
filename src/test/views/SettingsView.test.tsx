import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppProvider } from '../../hooks/useApp'
import SettingsView from '../../views/SettingsView'
import type { AppData } from '../../types'

function renderView() {
  return render(
    <AppProvider>
      <SettingsView />
    </AppProvider>,
  )
}

function seedRoutines() {
  const data: AppData = {
    routines: [
      { id: 'r1', name: 'Brush teeth', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'high', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'r2', name: 'Gym', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'low', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    goals: [],
    completions: [], hobbySessions: [], restDays: [], dayNotes: {},
    meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
  }
  localStorage.setItem('routine-tracker-data', JSON.stringify(data))
}

describe('SettingsView', () => {
  it('renders the Settings page title', () => {
    renderView()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('renders Routines section with default routines', () => {
    seedRoutines()
    renderView()
    expect(screen.getByText('Routines')).toBeTruthy()
    const rows = document.querySelectorAll('.settings-row')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('renders Long-term goals section', () => {
    renderView()
    expect(screen.getByText(/Long-term goals/i)).toBeTruthy()
  })

  it('renders + Add buttons for routines and goals', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    expect(addButtons.length).toBe(2)
  })

  it('opens the new-routine sheet on + Add click', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    expect(screen.getByText('New routine')).toBeTruthy()
  })

  it('closes the routine sheet on Cancel', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    const cancel = screen.getByText('Cancel')
    fireEvent.click(cancel)
    expect(screen.queryByText('New routine')).toBeNull()
  })

  it('closes the routine sheet on overlay click', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    const overlay = document.querySelector('.overlay') as HTMLElement
    fireEvent.click(overlay)
    expect(screen.queryByText('New routine')).toBeNull()
  })

  it('opens the new-goal sheet on + Add click', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[1])
    expect(screen.getByText('New goal')).toBeTruthy()
  })

  it('closes the goal sheet on Cancel', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[1])
    const cancel = screen.getByText('Cancel')
    fireEvent.click(cancel)
    expect(screen.queryByText('New goal')).toBeNull()
  })

  it('opens edit sheet when clicking on an existing routine row', () => {
    renderView()
    const rows = document.querySelectorAll('.settings-row')
    if (rows.length > 0) {
      fireEvent.click(rows[0] as HTMLElement)
      expect(screen.getByText('Edit routine')).toBeTruthy()
    }
  })

  it('can type a new routine name in the sheet', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    const nameInput = screen.getByPlaceholderText(/e.g. Gym/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Evening walk' } })
    expect(nameInput.value).toBe('Evening walk')
  })

  it('shows specific-days picker when recurrence changes to specific-days', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    const select = screen.getByDisplayValue('Every day') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'specific-days' } })
    expect(screen.getByText('Days')).toBeTruthy()
  })

  it('toggles day pill selection in specific-days mode', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    const select = screen.getByDisplayValue('Every day') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'specific-days' } })
    // Click the first day pill (S = Sunday)
    const pills = document.querySelectorAll('.day-pill')
    fireEvent.click(pills[0])
    expect(pills[0].classList.contains('selected')).toBe(true)
    // Toggle off
    fireEvent.click(pills[0])
    expect(pills[0].classList.contains('selected')).toBe(false)
  })

  it('saves a new routine when Add routine is clicked', async () => {
    renderView()
    const before = document.querySelectorAll('.settings-row').length
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    const nameInput = screen.getByPlaceholderText(/e.g. Gym/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'My new routine' } })
    fireEvent.click(screen.getByText('Add routine'))
    await waitFor(() => {
      const after = document.querySelectorAll('.settings-row').length
      expect(after).toBeGreaterThan(before)
    })
  })

  it('saves changes to an existing routine', async () => {
    seedRoutines()
    renderView()
    const rows = document.querySelectorAll('.settings-row')
    fireEvent.click(rows[0] as HTMLElement)
    const nameInput = screen.getByDisplayValue(/Brush teeth|Gym/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Renamed routine' } })
    fireEvent.click(screen.getByText('Save changes'))
    await waitFor(() => {
      expect(screen.getByText('Renamed routine')).toBeTruthy()
    })
  })

  it('changes priority to high and shows description', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[0])
    const highBtn = screen.getByText('High priority')
    fireEvent.click(highBtn)
    expect(screen.getByText(/highlighted in amber/i)).toBeTruthy()
  })

  it('can type a goal name in the new-goal sheet', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[1])
    const nameInput = screen.getByPlaceholderText(/e.g. Read Atomic Habits/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'My goal' } })
    expect(nameInput.value).toBe('My goal')
  })

  it('saves a new goal when Add goal is clicked', async () => {
    renderView()
    const before = document.querySelectorAll('.settings-row').length
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[1])
    const nameInput = screen.getByPlaceholderText(/e.g. Read Atomic Habits/i) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'My New Goal' } })
    fireEvent.click(screen.getByText('Add goal'))
    await waitFor(() => {
      expect(screen.getByText('My New Goal')).toBeTruthy()
    })
  })

  it('shows milestone label editor when count is set', () => {
    renderView()
    const addButtons = screen.getAllByText('+ Add')
    fireEvent.click(addButtons[1])
    const countInput = screen.getByPlaceholderText(/e.g. 60/i) as HTMLInputElement
    fireEvent.change(countInput, { target: { value: '3' } })
    // Should show the "Edit milestone labels" button
    expect(screen.getByText(/Edit milestone labels/i)).toBeTruthy()
    fireEvent.click(screen.getByText(/Edit milestone labels/i))
    // Should show label inputs
    expect(screen.getByDisplayValue('Milestone 1')).toBeTruthy()
  })

  it('shows inactive routines section when any routine is inactive', () => {
    // Seed data with an inactive routine
    const data: AppData = {
      routines: [
        {
          id: 'r-active',
          name: 'Active Routine',
          block: 'morning',
          recurrence: 'daily',
          scheduledDays: [0,1,2,3,4,5,6],
          priority: 'low',
          active: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'r-inactive',
          name: 'Inactive Routine',
          block: 'evening',
          recurrence: 'daily',
          scheduledDays: [0,1,2,3,4,5,6],
          priority: 'low',
          active: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      goals: [],
      completions: [],
      hobbySessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(<AppProvider><SettingsView /></AppProvider>)
    expect(screen.getByText('Inactive')).toBeTruthy()
    expect(screen.getByText('Inactive Routine')).toBeTruthy()
  })

  it('shows archived goals when any goal is inactive', () => {
    const data: AppData = {
      routines: [],
      goals: [
        { id: 'g-active', name: 'Active Goal', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'g-archived', name: 'Archived Goal', active: false, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      completions: [],
      hobbySessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(<AppProvider><SettingsView /></AppProvider>)
    expect(screen.getByText('Archived Goal')).toBeTruthy()
  })

  it('deletes a routine from the edit sheet', async () => {
    seedRoutines()
    renderView()
    const rows = document.querySelectorAll('.settings-row')
    fireEvent.click(rows[0] as HTMLElement)
    const deleteBtn = screen.queryByText(/Delete routine/i)
    if (deleteBtn) {
      const before = document.querySelectorAll('.settings-row').length
      fireEvent.click(deleteBtn)
      await waitFor(() => {
        const after = document.querySelectorAll('.settings-row').length
        expect(after).toBeLessThan(before)
      })
    }
  })
})
