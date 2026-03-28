import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock URL.createObjectURL / revokeObjectURL (used in exportData)
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
globalThis.URL.revokeObjectURL = vi.fn()

// Mock Notification API
class MockNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(async () => MockNotification.permission)
  constructor(public title: string, public options?: NotificationOptions) {}
}
Object.defineProperty(globalThis, 'Notification', {
  value: MockNotification,
  writable: true,
})

// Reset localStorage before each test
beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})
