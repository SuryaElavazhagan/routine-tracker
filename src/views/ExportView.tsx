import { useRef } from 'react'
import { useApp } from '../hooks/useApp'
import { exportData, importData } from '../store/storage'

export default function ExportView() {
  const { data, setData } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    exportData(data)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const json = ev.target?.result as string
        const restored = importData(json)
        setData(restored)
        alert('Backup restored successfully.')
      } catch {
        alert('Could not read backup file. Make sure it is a valid routine-backup JSON.')
      }
    }
    reader.readAsText(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const routineCount = data.routines.filter(r => r.active).length
  const completionCount = data.completions.length
  const sessionCount = data.hobbySessions.length
  const earliest = data.completions.length > 0
    ? [...data.completions].sort((a, b) => a.date.localeCompare(b.date))[0].date
    : null

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Backup &amp; Restore</div>
      </div>

      <p className="page-sub">
        Your data lives in this browser only. Export a JSON file and save it to iCloud Drive to back up.
        When you get a new phone, import the file to restore everything.
      </p>

      {/* Summary */}
      <div className="card">
        <div className="section-label" style={{ margin: '0 0 10px' }}>What's stored</div>
        <div className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span className="text-dim text-small">Active routines</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{routineCount}</span>
        </div>
        <div className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span className="text-dim text-small">Completion records</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{completionCount}</span>
        </div>
        <div className="flex-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span className="text-dim text-small">Hobby sessions</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{sessionCount}</span>
        </div>
        {earliest && (
          <div className="flex-between" style={{ padding: '6px 0' }}>
            <span className="text-dim text-small">History since</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{earliest}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-primary btn-full" onClick={handleExport} style={{ marginBottom: 12 }}>
          Export backup JSON
        </button>
        <p className="text-xs text-mute" style={{ textAlign: 'center', marginBottom: 24 }}>
          Saves a file named routine-backup-YYYY-MM-DD.json
        </p>

        <button className="btn btn-secondary btn-full" onClick={() => fileRef.current?.click()}>
          Import backup JSON
        </button>
        <p className="text-xs text-mute" style={{ textAlign: 'center', marginTop: 6 }}>
          Overwrites all current data with the backup file
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
