import { describe, it, expect, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppProvider, useApp } from '../../hooks/useApp'
import type { AppData } from '../../types'

// ── wrapper ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}

// ── seed helpers ──────────────────────────────────────────────────────────────

function seedData(overrides: Partial<AppData> = {}) {
  const base: AppData = {
    routines: [
      { id: 'r1', name: 'Brush teeth', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'high', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'r2', name: 'Gym', block: 'morning', recurrence: 'daily', scheduledDays: [0,1,2,3,4,5,6], priority: 'low', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    goals: [
      { id: 'g1', name: 'Read a book', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'g2', name: 'Learn a skill', active: true, createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    completions: [],
    hobbySessions: [],
    restDays: [],
    dayNotes: {},
    meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    ...overrides,
  }
  localStorage.setItem('routine-tracker-data', JSON.stringify(base))
}

// Suppress notification scheduling errors in test environment
beforeEach(() => {
  Object.defineProperty(globalThis.Notification, 'permission', {
    get: () => 'default',
    configurable: true,
  })
})

// ── useApp outside provider ───────────────────────────────────────────────────

describe('useApp', () => {
  it('throws when used outside AppProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useApp())).toThrow('useApp must be used within AppProvider')
    consoleSpy.mockRestore()
  })
})

// ── AppProvider initial data ──────────────────────────────────────────────────

describe('AppProvider', () => {
  it('loads default data on mount (empty store starts blank)', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    expect(result.current.data.routines).toEqual([])
    expect(result.current.data.goals).toEqual([])
  })

  it('loads seeded data from localStorage on mount', () => {
    seedData()
    const { result } = renderHook(() => useApp(), { wrapper })
    expect(result.current.data.routines.length).toBeGreaterThan(0)
    expect(result.current.data.goals.length).toBeGreaterThan(0)
  })
})

// ── toggleCompletion ──────────────────────────────────────────────────────────

describe('toggleCompletion', () => {
  beforeEach(() => seedData())

  it('adds a done completion when none exists', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const routineId = result.current.data.routines[0].id

    act(() => {
      result.current.toggleCompletion(routineId, '2026-03-28')
    })

    const c = result.current.data.completions.find(c => c.routineId === routineId && c.date === '2026-03-28')
    expect(c?.done).toBe(true)
  })

  it('toggles existing completion to false', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const routineId = result.current.data.routines[0].id

    act(() => result.current.toggleCompletion(routineId, '2026-03-28'))
    act(() => result.current.toggleCompletion(routineId, '2026-03-28'))

    const c = result.current.data.completions.find(c => c.routineId === routineId && c.date === '2026-03-28')
    expect(c?.done).toBe(false)
  })
})

// ── logHobbySession / clearHobbySession ───────────────────────────────────────

describe('logHobbySession', () => {
  beforeEach(() => seedData())

  it('adds a hobby session for the given date and goal', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const goalId = result.current.data.goals[0].id

    act(() => result.current.logHobbySession(goalId, '2026-03-28'))

    expect(result.current.data.hobbySessions).toEqual(
      expect.arrayContaining([{ date: '2026-03-28', goalId }]),
    )
  })

  it('replaces session for the same date', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const g1 = result.current.data.goals[0].id
    const g2 = result.current.data.goals[1]?.id ?? g1

    act(() => result.current.logHobbySession(g1, '2026-03-28'))
    act(() => result.current.logHobbySession(g2, '2026-03-28'))

    const sessions = result.current.data.hobbySessions.filter(s => s.date === '2026-03-28')
    expect(sessions).toHaveLength(1)
    expect(sessions[0].goalId).toBe(g2)
  })
})

describe('clearHobbySession', () => {
  beforeEach(() => seedData())

  it('removes the session for the given date', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const goalId = result.current.data.goals[0].id

    act(() => result.current.logHobbySession(goalId, '2026-03-28'))
    act(() => result.current.clearHobbySession('2026-03-28'))

    const sessions = result.current.data.hobbySessions.filter(s => s.date === '2026-03-28')
    expect(sessions).toHaveLength(0)
  })
})

// ── addRoutine / updateRoutine / deleteRoutine / reorderRoutines ──────────────

describe('addRoutine', () => {
  it('adds a new routine with generated id', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const before = result.current.data.routines.length

    act(() => result.current.addRoutine({
      name: 'New routine',
      block: 'morning',
      recurrence: 'daily',
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      priority: 'low',
      active: true,
    }))

    expect(result.current.data.routines).toHaveLength(before + 1)
    expect(result.current.data.routines.at(-1)?.name).toBe('New routine')
  })
})

describe('updateRoutine', () => {
  beforeEach(() => seedData())

  it('updates the named field of the matching routine', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const id = result.current.data.routines[0].id

    act(() => result.current.updateRoutine(id, { name: 'Updated name' }))

    const r = result.current.data.routines.find(r => r.id === id)
    expect(r?.name).toBe('Updated name')
  })
})

describe('deleteRoutine', () => {
  beforeEach(() => seedData())

  it('removes the routine with the given id', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const id = result.current.data.routines[0].id

    act(() => result.current.deleteRoutine(id))

    expect(result.current.data.routines.find(r => r.id === id)).toBeUndefined()
  })
})

describe('reorderRoutines', () => {
  beforeEach(() => seedData())

  it('reorders routines to match provided id order', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const ids = result.current.data.routines.map(r => r.id)
    const reversed = [...ids].reverse()

    act(() => result.current.reorderRoutines(reversed))

    expect(result.current.data.routines.map(r => r.id)).toEqual(reversed)
  })
})

// ── addGoal / updateGoal / deleteGoal ─────────────────────────────────────────

describe('addGoal', () => {
  it('adds a new goal', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const before = result.current.data.goals.length

    act(() => result.current.addGoal({ name: 'New goal', active: true }))

    expect(result.current.data.goals).toHaveLength(before + 1)
    expect(result.current.data.goals.at(-1)?.name).toBe('New goal')
  })
})

describe('updateGoal', () => {
  beforeEach(() => seedData())

  it('updates goal fields', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const id = result.current.data.goals[0].id

    act(() => result.current.updateGoal(id, { name: 'Updated goal' }))

    expect(result.current.data.goals.find(g => g.id === id)?.name).toBe('Updated goal')
  })
})

describe('deleteGoal', () => {
  beforeEach(() => seedData())

  it('removes the goal', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const id = result.current.data.goals[0].id

    act(() => result.current.deleteGoal(id))

    expect(result.current.data.goals.find(g => g.id === id)).toBeUndefined()
  })
})

// ── completeMilestone ─────────────────────────────────────────────────────────

describe('completeMilestone', () => {
  it('marks milestone as completed', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    // Add a goal with milestones
    act(() => result.current.addGoal({
      name: 'Goal with milestones',
      active: true,
      milestoneCount: 2,
      milestonePeriod: 'week',
      milestones: [
        { id: 'mid-1', label: 'M1', index: 1 },
        { id: 'mid-2', label: 'M2', index: 2 },
      ],
    }))

    const goalId = result.current.data.goals.at(-1)!.id

    act(() => result.current.completeMilestone(goalId, 'mid-1'))

    const goal = result.current.data.goals.find(g => g.id === goalId)!
    expect(goal.milestones![0].completedAt).toBeDefined()
    expect(goal.currentMilestone).toBe(2)
  })

  it('toggles milestone back to incomplete', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => result.current.addGoal({
      name: 'Goal',
      active: true,
      milestoneCount: 1,
      milestones: [{ id: 'mid-1', label: 'M1', index: 1, completedAt: '2026-01-01' }],
    }))

    const goalId = result.current.data.goals.at(-1)!.id
    act(() => result.current.completeMilestone(goalId, 'mid-1'))

    const goal = result.current.data.goals.find(g => g.id === goalId)!
    expect(goal.milestones![0].completedAt).toBeUndefined()
  })
})

// ── toggleRestDay ─────────────────────────────────────────────────────────────

describe('toggleRestDay', () => {
  it('adds a rest day', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => result.current.toggleRestDay('2026-03-28'))

    expect(result.current.data.restDays).toContain('2026-03-28')
  })

  it('removes an existing rest day', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => result.current.toggleRestDay('2026-03-28'))
    act(() => result.current.toggleRestDay('2026-03-28'))

    expect(result.current.data.restDays).not.toContain('2026-03-28')
  })
})

// ── setDayNote ────────────────────────────────────────────────────────────────

describe('setDayNote', () => {
  it('sets a note for a date', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => result.current.setDayNote('2026-03-28', 'Great day'))

    expect(result.current.data.dayNotes['2026-03-28']).toBe('Great day')
  })
})

// ── setData ───────────────────────────────────────────────────────────────────

describe('setData', () => {
  it('replaces all data', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    const newData: AppData = {
      routines: [],
      goals: [],
      completions: [],
      hobbySessions: [],
      restDays: [],
      dayNotes: {},
      meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
    }

    act(() => result.current.setData(newData))

    expect(result.current.data.routines).toEqual([])
    expect(result.current.data.goals).toEqual([])
  })
})
