# Routine Tracker

[![Tests](https://github.com/SuryaElavazhagan/routine-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/SuryaElavazhagan/routine-tracker/actions/workflows/deploy.yml)
![Tests passing](https://img.shields.io/badge/tests-169%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-88%25-brightgreen)

A personal consistency companion — a PWA built for neurodivergent users that records what happened without judgment.

## Features

- **Daily check-in** — tick off routines grouped by time block (morning, work, evening, wind-down)
- **Trends** — per-routine consistency over 7 / 30 / 90 days, streaks, trend badges, weekly heatmap
- **Goals & milestones** — long-term goals split into dated checkpoints with progress tracking
- **Hobby time** — log which goal you worked on each day
- **Offline-first PWA** — installs to iPhone home screen via Safari, works fully offline
- **Backup & restore** — export/import JSON for iCloud Drive backup; no backend, no account

## Tech stack

- React 19 + TypeScript + Vite 8
- localStorage only — all data stays on device
- `vite-plugin-pwa` with Workbox for service worker + offline support
- Vitest + Testing Library for unit/integration tests (169 tests, ≥80% coverage)
- GitHub Actions → GitHub Pages for CI/CD

## Development

```bash
npm install
npm run dev          # dev server at http://localhost:5173
npm run build        # production build
npm run test         # run tests
npm run test:coverage  # run tests with coverage report
```

## Deployment

Pushes to `main` run the test suite first, then build and deploy to GitHub Pages automatically via `.github/workflows/deploy.yml`.
