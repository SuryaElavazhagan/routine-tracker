import { describe, it, expect, vi } from 'vitest'
import type { AppData } from '../../types'
import { loadData, saveData, exportData, importData } from '../../store/storage'

// ── helpers ──────────────────────────────────────────────────────────────────

function minimalData(): AppData {
  return {
    routines: [],
    goals: [],
    completions: [],
    hobbySessions: [],
    restDays: [],
    dayNotes: {},
    meta: { version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
  }
}

// ── loadData ──────────────────────────────────────────────────────────────────

describe('loadData', () => {
  it('returns default data when localStorage is empty', () => {
    const data = loadData()
    expect(data.routines.length).toBeGreaterThan(0)
    expect(data.goals.length).toBeGreaterThan(0)
    expect(data.completions).toEqual([])
  })

  it('persists default data to localStorage on first load', () => {
    loadData()
    const raw = localStorage.getItem('routine-tracker-data')
    expect(raw).not.toBeNull()
  })

  it('loads and migrates existing data from localStorage', () => {
    // Simulate old data missing the priority field
    const old: AppData = {
      ...minimalData(),
      routines: [{
        id: 'r1',
        name: 'Old',
        block: 'morning',
        recurrence: 'daily',
        scheduledDays: [],
        // priority intentionally omitted to test migration
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      } as any],
    }
    localStorage.setItem('routine-tracker-data', JSON.stringify(old))
    const data = loadData()
    expect(data.routines[0].priority).toBe('low')
  })

  it('returns fresh default data when localStorage contains corrupted JSON', () => {
    localStorage.setItem('routine-tracker-data', '{invalid json')
    const data = loadData()
    expect(data.routines.length).toBeGreaterThan(0)
  })
})

// ── saveData ──────────────────────────────────────────────────────────────────

describe('saveData', () => {
  it('writes serialized data to localStorage', () => {
    const data = minimalData()
    saveData(data)
    const raw = localStorage.getItem('routine-tracker-data')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.routines).toEqual([])
    expect(parsed.completions).toEqual([])
  })
})

// ── exportData ────────────────────────────────────────────────────────────────

describe('exportData', () => {
  it('creates a blob URL and triggers anchor click', () => {
    const data = minimalData()
    const clickMock = vi.fn()
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickMock,
    } as any)

    exportData(data)

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(clickMock).toHaveBeenCalled()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled()

    createElementSpy.mockRestore()
  })

  it('updates exportedAt in the exported meta', () => {
    const data = minimalData()
    let capturedBlob: Blob | undefined
    ;(globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementationOnce((b: Blob) => {
      capturedBlob = b
      return 'blob:mock'
    })

    const anchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor as any)

    exportData(data)

    // The blob should contain valid JSON with a fresh exportedAt
    expect(capturedBlob).toBeDefined()
    capturedBlob!.text().then(text => {
      const parsed = JSON.parse(text)
      expect(parsed.meta.exportedAt).not.toBe('2026-01-01T00:00:00.000Z')
    })
  })
})

// ── importData ────────────────────────────────────────────────────────────────

describe('importData', () => {
  it('parses valid JSON, migrates, saves, and returns data', () => {
    const data: AppData = {
      ...minimalData(),
      routines: [{
        id: 'r1',
        name: 'Imported',
        block: 'morning',
        recurrence: 'daily',
        scheduledDays: [],
        priority: 'low',
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      }],
    }
    const result = importData(JSON.stringify(data))
    expect(result.routines[0].name).toBe('Imported')
    // Should also save to localStorage
    const raw = localStorage.getItem('routine-tracker-data')
    expect(raw).not.toBeNull()
  })

  it('throws on invalid JSON', () => {
    expect(() => importData('{bad json')).toThrow()
  })

  it('throws when required fields are missing', () => {
    expect(() => importData(JSON.stringify({ meta: {} }))).toThrow('Invalid backup file')
  })
})
