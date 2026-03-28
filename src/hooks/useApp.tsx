import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { AppData, Routine, Goal, Completion, Milestone } from '../types'
import { loadData, saveData } from '../store/storage'
import { scheduleAllNotifications, scheduleRoutineNotification } from '../utils/notifications'
import { isScheduledOn, today } from '../utils/metrics'

interface AppContextValue {
  data: AppData
  toggleCompletion: (routineId: string, date: string) => void
  logHobbySession: (goalId: string, date: string) => void
  clearHobbySession: (date: string) => void
  addRoutine: (r: Omit<Routine, 'id' | 'createdAt'>) => void
  updateRoutine: (id: string, updates: Partial<Routine>) => void
  deleteRoutine: (id: string) => void
  reorderRoutines: (ids: string[]) => void
  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  completeMilestone: (goalId: string, milestoneId: string) => void
  toggleRestDay: (date: string) => void
  setDayNote: (date: string, note: string) => void
  setData: (d: AppData) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(() => loadData())

  // Schedule notifications on mount and whenever routines change
  useEffect(() => {
    const t = today()
    const todayRoutines = data.routines.filter(r => r.active && isScheduledOn(r, t) && r.reminderTime)
    scheduleAllNotifications(todayRoutines)
  }, [data.routines])

  const persist = useCallback((next: AppData) => {
    saveData(next)
    setDataState(next)
  }, [])

  const toggleCompletion = useCallback((routineId: string, date: string) => {
    setDataState(prev => {
      const existing = prev.completions.find(c => c.date === date && c.routineId === routineId)
      let completions: Completion[]
      if (existing) {
        completions = prev.completions.map(c =>
          c.date === date && c.routineId === routineId ? { ...c, done: !c.done } : c,
        )
      } else {
        completions = [...prev.completions, { date, routineId, done: true }]
      }
      const next = { ...prev, completions }
      saveData(next)
      return next
    })
  }, [])

  const logHobbySession = useCallback((goalId: string, date: string) => {
    setDataState(prev => {
      const hobbySessions = [...prev.hobbySessions.filter(s => s.date !== date), { date, goalId }]
      const next = { ...prev, hobbySessions }
      saveData(next)
      return next
    })
  }, [])

  const clearHobbySession = useCallback((date: string) => {
    setDataState(prev => {
      const hobbySessions = prev.hobbySessions.filter(s => s.date !== date)
      const next = { ...prev, hobbySessions }
      saveData(next)
      return next
    })
  }, [])

  const addRoutine = useCallback((r: Omit<Routine, 'id' | 'createdAt'>) => {
    setDataState(prev => {
      const newRoutine: Routine = { ...r, id: uuidv4(), createdAt: new Date().toISOString() }
      if (newRoutine.reminderTime) scheduleRoutineNotification(newRoutine)
      const next = { ...prev, routines: [...prev.routines, newRoutine] }
      saveData(next)
      return next
    })
  }, [])

  const updateRoutine = useCallback((id: string, updates: Partial<Routine>) => {
    setDataState(prev => {
      const next = { ...prev, routines: prev.routines.map(r => {
        if (r.id !== id) return r
        const updated = { ...r, ...updates }
        if (updates.reminderTime !== undefined) scheduleRoutineNotification(updated)
        return updated
      }) }
      saveData(next)
      return next
    })
  }, [])

  const deleteRoutine = useCallback((id: string) => {
    setDataState(prev => {
      const next = { ...prev, routines: prev.routines.filter(r => r.id !== id) }
      saveData(next)
      return next
    })
  }, [])

  const reorderRoutines = useCallback((ids: string[]) => {
    setDataState(prev => {
      const map = new Map(prev.routines.map(r => [r.id, r]))
      const reordered = ids.map(id => map.get(id)!).filter(Boolean)
      const rest = prev.routines.filter(r => !ids.includes(r.id))
      const next = { ...prev, routines: [...reordered, ...rest] }
      saveData(next)
      return next
    })
  }, [])

  const addGoal = useCallback((g: Omit<Goal, 'id' | 'createdAt'>) => {
    setDataState(prev => {
      const next = {
        ...prev,
        goals: [...prev.goals, { ...g, id: uuidv4(), createdAt: new Date().toISOString() }],
      }
      saveData(next)
      return next
    })
  }, [])

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setDataState(prev => {
      const next = { ...prev, goals: prev.goals.map(g => (g.id === id ? { ...g, ...updates } : g)) }
      saveData(next)
      return next
    })
  }, [])

  const deleteGoal = useCallback((id: string) => {
    setDataState(prev => {
      const next = { ...prev, goals: prev.goals.filter(g => g.id !== id) }
      saveData(next)
      return next
    })
  }, [])

  const completeMilestone = useCallback((goalId: string, milestoneId: string) => {
    setDataState(prev => {
      const goals = prev.goals.map(g => {
        if (g.id !== goalId) return g
        const milestones: Milestone[] = (g.milestones ?? []).map(m =>
          m.id === milestoneId
            ? { ...m, completedAt: m.completedAt ? undefined : today() }
            : m,
        )
        // advance currentMilestone to first incomplete
        const firstIncomplete = milestones.find(m => !m.completedAt)
        return { ...g, milestones, currentMilestone: firstIncomplete?.index ?? (g.milestoneCount ?? 1) }
      })
      const next = { ...prev, goals }
      saveData(next)
      return next
    })
  }, [])

  const toggleRestDay = useCallback((date: string) => {
    setDataState(prev => {
      const restDays = prev.restDays.includes(date)
        ? prev.restDays.filter(d => d !== date)
        : [...prev.restDays, date]
      const next = { ...prev, restDays }
      saveData(next)
      return next
    })
  }, [])

  const setDayNote = useCallback((date: string, note: string) => {
    setDataState(prev => {
      const dayNotes = { ...prev.dayNotes, [date]: note }
      const next = { ...prev, dayNotes }
      saveData(next)
      return next
    })
  }, [])

  const setData = useCallback((d: AppData) => {
    persist(d)
  }, [persist])

  return (
    <AppContext.Provider
      value={{
        data,
        toggleCompletion,
        logHobbySession,
        clearHobbySession,
        addRoutine,
        updateRoutine,
        deleteRoutine,
        reorderRoutines,
        addGoal,
        updateGoal,
        deleteGoal,
        completeMilestone,
        toggleRestDay,
        setDayNote,
        setData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
