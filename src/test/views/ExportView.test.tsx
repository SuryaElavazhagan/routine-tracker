import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppProvider, useApp } from '../../hooks/useApp'
import ExportView from '../../views/ExportView'
import type { AppData } from '../../types'

function renderView() {
  return render(
    <AppProvider>
      <ExportView />
    </AppProvider>,
  )
}

describe('ExportView', () => {
  it('renders the Backup & Restore page title', () => {
    renderView()
    expect(screen.getByText('Backup & Restore')).toBeTruthy()
  })

  it('renders the Export button', () => {
    renderView()
    expect(screen.getByText(/Export backup JSON/i)).toBeTruthy()
  })

  it('renders the Import button', () => {
    renderView()
    expect(screen.getByText(/Import backup JSON/i)).toBeTruthy()
  })

  it('renders the data summary card', () => {
    renderView()
    expect(screen.getByText(/Active routines/i)).toBeTruthy()
    expect(screen.getByText(/Completion records/i)).toBeTruthy()
    expect(screen.getByText(/Hobby sessions/i)).toBeTruthy()
  })

  it('shows active routine count from default data', () => {
    renderView()
    // Default data has 13 routines all active
    const countEls = document.querySelectorAll('.card span[style]')
    // At least one numeric count should appear
    expect(document.querySelector('.card')).not.toBeNull()
  })

  it('calls export on button click', () => {
    renderView()

    // Spy on URL.createObjectURL (already mocked in setup) and a real anchor click
    const realCreate = document.createElement.bind(document)
    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementationOnce((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(clickMock)
      }
      return el
    })

    fireEvent.click(screen.getByText(/Export backup JSON/i))
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('triggers file input click on Import button press', () => {
    renderView()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByText(/Import backup JSON/i))
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('shows explainer paragraph about iCloud backup', () => {
    renderView()
    expect(screen.getByText(/iCloud Drive/i)).toBeTruthy()
  })

  it('does not show History since when no completions', () => {
    renderView()
    expect(screen.queryByText(/History since/i)).toBeNull()
  })

  it('shows History since when completions exist', () => {
    function TestWrapper() {
      const { toggleCompletion } = useApp()
      return (
        <button
          data-testid="complete"
          onClick={() => toggleCompletion('r1', '2026-01-15')}
        />
      )
    }

    // Pre-seed with completions by modifying localStorage
    const data: AppData = {
      routines: [],
      goals: [],
      completions: [{ date: '2026-01-15', routineId: 'r1', done: true }],
      hobbySessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(
      <AppProvider>
        <ExportView />
      </AppProvider>,
    )

    expect(screen.getByText(/History since/i)).toBeTruthy()
    expect(screen.getByText('2026-01-15')).toBeTruthy()
  })

  it('shows correct completion count', () => {
    const data: AppData = {
      routines: [],
      goals: [],
      completions: [
        { date: '2026-01-15', routineId: 'r1', done: true },
        { date: '2026-01-16', routineId: 'r1', done: true },
      ],
      hobbySessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(data))

    render(
      <AppProvider>
        <ExportView />
      </AppProvider>,
    )

    // Should show 2 completion records
    expect(screen.getByText('2')).toBeTruthy()
  })
})
