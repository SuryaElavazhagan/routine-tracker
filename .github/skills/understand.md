# Routine Tracker — Project Understanding

A personal consistency companion for a neurodivergent user.
Core philosophy: **record what happened without judgment. The app is always on your side.**

---

## Repository Structure

```
routine-tracker/
├── index.html                  # SPA shell — mounts #root, Apple PWA meta tags
├── vite.config.ts              # Vite + Vitest + VitePWA config (PWA manifest lives here)
├── eslint.config.js
├── tsconfig.json               # Composite umbrella
├── tsconfig.app.json           # Strict ES2023 for app source
├── tsconfig.node.json          # For vite.config.ts itself
├── tsconfig.sw.json            # ES2017 + WebWorker — only compiles src/sw.ts
├── tsconfig.test.json          # Relaxed rules for test files
├── .github/
│   ├── workflows/
│   │   └── deploy.yml          # CI: test → build → deploy to GitHub Pages
│   └── skills/
│       └── understand.md       # This file
├── public/
│   ├── favicon.svg / favicon.png
│   ├── apple-touch-icon.png    # 180×180 — required for Safari "Add to Home Screen"
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.tsx                # React 19 createRoot entry
    ├── App.tsx                 # AppProvider wrapper + tab switcher + bottom nav
    ├── index.css               # Full hand-written CSS design system (~555 lines, dark theme)
    ├── sw.ts                   # Service worker: Workbox precache + push notifications
    ├── types/
    │   └── index.ts            # All shared TypeScript interfaces and union types
    ├── store/
    │   └── storage.ts          # localStorage adapter: loadData / saveData / exportData / importData / migrate
    ├── hooks/
    │   └── useApp.tsx          # AppContext — global state + all 14 mutations
    ├── utils/
    │   ├── metrics.ts          # Pure functions: consistency %, streaks, trends, heatmap, day quality
    │   ├── milestones.ts       # Pure functions: milestone date math, progress, near-end detection
    │   └── notifications.ts    # Web Notifications API: schedule / cancel per-routine reminders
    ├── views/
    │   ├── CheckInView.tsx     # "Today" tab — daily check-off, rest day, hobby picker, day note
    │   ├── TrendsView.tsx      # "Trends" tab — consistency stats, heatmap, anchor callouts
    │   ├── GoalsView.tsx       # "Goals" tab — milestone progress, hobby session log
    │   ├── SettingsView.tsx    # "Settings" tab — CRUD routines and goals via modal sheets
    │   └── ExportView.tsx      # "Backup" tab — export/import JSON
    ├── components/             # Currently empty — shared components inlined inside views for now
    └── test/
        ├── setup.ts            # Vitest globals: localStorage mock, Notification mock, URL mocks
        ├── hooks/
        │   └── useApp.test.tsx
        ├── store/
        │   └── storage.test.ts
        ├── utils/
        │   ├── metrics.test.ts
        │   ├── milestones.test.ts
        │   └── notifications.test.ts
        └── views/
            ├── CheckInView.test.tsx
            ├── TrendsView.test.tsx
            ├── GoalsView.test.tsx
            ├── SettingsView.test.tsx
            └── ExportView.test.tsx
```

---

## Tech Stack

| Concern | Solution |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript (strict) |
| Styling | Hand-written CSS custom properties, dark theme, mobile-first |
| State | React Context + useState — no external state library |
| Persistence | localStorage only — no backend, no API, no auth |
| PWA | vite-plugin-pwa + Workbox (injectManifest strategy) |
| Notifications | Web Notifications API + setTimeout scheduling |
| Testing | Vitest + @testing-library/react + jsdom |
| CI/CD | GitHub Actions → GitHub Pages |
| Routing | None — tab switching is a plain useState in App.tsx |

---

## Data Model (localStorage key: `routine-tracker-data`)

```ts
interface AppData {
  routines:      Routine[]                   // routine definitions
  goals:         Goal[]                      // long-term goals
  completions:   Completion[]                // { date, routineId, done }
  hobbySessions: HobbySession[]              // { date, goalId }
  restDays:      string[]                    // YYYY-MM-DD dates
  dayNotes:      Record<string, string>      // keyed by YYYY-MM-DD
  meta:          { version: number; exportedAt: string }
}
```

Schema is at version 2. Migration in `storage.ts:migrate()` patches routines missing a `priority` field.
All types are in `src/types/index.ts`.

---

## State Management

**Single React Context, no external library.**

`src/hooks/useApp.tsx` exports:
- `AppProvider` — wraps the whole app, holds `useState<AppData>`, exposes 14 mutations
- `useApp()` — consumer hook; throws if used outside `AppProvider`

Every mutation follows this exact pattern:
```ts
const next = { ...data, ... }
saveData(next)       // localStorage write first
setDataState(next)   // then React re-render
```

A `useEffect` in `AppProvider` re-schedules push notifications whenever `data.routines` changes.

---

## Five App Tabs

| Tab | View | What it does |
|---|---|---|
| Today | `CheckInView` | Mark routines done by time block, rest day toggle, hobby picker, day note |
| Trends | `TrendsView` | 7/30/90-day consistency %, streaks, trend badges, weekly heatmap, dip alerts |
| Goals | `GoalsView` | Long-term goal cards, milestone progress bars, hobby session log |
| Settings | `SettingsView` | Add/edit/delete routines and goals via bottom sheet modals |
| Backup | `ExportView` | Export JSON backup, import JSON to restore |

---

## Metrics Philosophy (important context for bugs)

The metrics system is intentionally designed to avoid judgment:
- **No single daily score** — avoids demoralising comparisons
- **Per-routine consistency** — `days done ÷ days scheduled × 100` over 7/30/90-day windows
- **Trend direction** — Rising / Stable / Dipping (more important than the raw number)
- **Dip alerts** — surfaced gently when a routine drops for 2+ consecutive periods
- **Day quality** — Full streak / Anchors held / Recovery day / Rest day (qualitative, not a score)
- **Anchor detection** — routines with high completion rates are highlighted positively
- **Streaks are secondary** — streak anxiety is real; not the headline metric
- **Rest days** — fully excluded from all consistency calculations

Pure calculation logic lives in `src/utils/metrics.ts` and `src/utils/milestones.ts`.
All functions are pure (no side effects) — easy to unit test in isolation.

---

## PWA / Offline

- Service worker: `src/sw.ts` compiled by Vite via `tsconfig.sw.json`
- Strategy: `injectManifest` — custom SW with Workbox `precacheAndRoute`
- All JS/CSS/HTML/PNG/SVG assets are precached → app works fully offline after first load
- Safari "Add to Home Screen" requires `<link rel="apple-touch-icon">` in `index.html`
  and `public/apple-touch-icon.png` (180×180) — both are present
- Push notification scheduling: setTimeout-based, cancelled and rescheduled on every routines change

---

## CI Pipeline

`.github/workflows/deploy.yml` — triggered on push to `main`:

```
test job          → npm run test:coverage   (coverage thresholds: 80% lines/functions/statements, 75% branches)
  ↓ (must pass)
build job         → tsc -b && vite build
  ↓
deploy job        → GitHub Pages
```

**A PR or push that breaks coverage thresholds will fail CI and not deploy.**

---

## Bug Fixing Guide

### 1. Identify the layer

| Symptom | Likely location |
|---|---|
| Wrong data saved / loaded / migrated | `src/store/storage.ts` |
| State not updating, mutation not persisting | `src/hooks/useApp.tsx` |
| Wrong consistency %, streak, trend, heatmap | `src/utils/metrics.ts` |
| Wrong milestone date, progress, near-end flag | `src/utils/milestones.ts` |
| Notification not firing / wrong time | `src/utils/notifications.ts` |
| UI showing wrong data or wrong routines | The relevant `src/views/*.tsx` |
| PWA not installing / offline not working | `src/sw.ts`, `vite.config.ts`, `index.html` |
| CI failing | `.github/workflows/deploy.yml`, `vite.config.ts` test config |

### 2. Understand the data flow

```
localStorage
    ↓ loadData() — src/store/storage.ts
AppProvider (useApp.tsx)
    ↓ useApp() hook
View component (views/*.tsx)
    ↓ user action
mutation in AppProvider
    ↓ saveData() → setDataState()
localStorage + React re-render
```

Metrics are **not stored** — they are computed from `completions` on every render by calling
functions in `metrics.ts` / `milestones.ts` directly inside view components.

### 3. Check the types first

All interfaces are in `src/types/index.ts`. Before touching any logic, confirm:
- The shape of the data you are working with
- What fields are optional vs required
- The union type values (e.g. `TimeBlock`, `Recurrence`, `RoutinePriority`, `ReminderFrequency`, `MilestonePeriod`)

### 4. Run the relevant tests

```bash
npm run test                          # run all tests once
npm run test:watch                    # watch mode during development
npm run test:coverage                 # full coverage report
npx vitest run src/test/utils/metrics.test.ts   # run a single file
```

Tests mirror the src structure under `src/test/`. The test setup file is `src/test/setup.ts` —
it mocks localStorage, Notification API, and URL object methods.

### 5. Fix → test → verify coverage

- Fix the bug in the source file
- Update or add the corresponding test in `src/test/`
- Run `npm run test:coverage` and confirm coverage thresholds still pass (80%/75%)
- Run `npm run build` to confirm TypeScript compiles and Vite builds without errors

### 6. Commit and push

The CI pipeline runs tests before building. A commit that breaks tests will not deploy.

```bash
git add .
git commit -m "fix: <describe what was wrong and what changed>"
git push
```

---

## Key Design Constraints (never violate these)

1. **No backend, no API calls, no auth** — everything is localStorage
2. **Fully offline after first load** — service worker must precache all assets
3. **No judgment framing** — missed routines are never shown as failures; use neutral language
4. **Mobile-first, dark theme** — primary device is iPhone in Safari; dark mode is default
5. **Streaks are not the headline** — do not promote streak counts above consistency trends
6. **Rest days excluded from all calculations** — `restDays` array must be checked everywhere metrics are computed
7. **Metrics are pure and computed on render** — never persist computed metrics to localStorage
8. **Coverage thresholds enforced in CI** — every new feature or fix must maintain ≥80% coverage
