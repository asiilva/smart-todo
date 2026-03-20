# MVP Critical Fixes — 2026-03-19

## Immediate Fixes (from staff engineer review)

- [x] 1. Remove hardcoded test credentials from LoginPage
- [x] 2. Fix RegisterPage → navigate to /onboarding instead of /board
- [x] 3. Switch BrowserRouter to HashRouter for Electron production builds
- [x] 4. Make JWT secrets required in production (crash on startup)
- [x] 5. Set completedAt when task moves to Done (clear when moved out)
- [x] 6. Fix timer rounding (Math.ceil instead of Math.round)
- [x] 7. Fetch custom categories from API in CreateTaskModal + TaskDetailPanel
- [x] 8. Replace silent catch blocks with toast notifications
- [x] 9. Add database indexes for critical query paths
- [x] 10. Remove dead OAuth code from preload
- [x] 11. Extract shared utilities (formatMinutes, categoryColors)

## Review
All 11 items verified:
- API type-checks clean
- Electron main process type-checks clean
- No regressions introduced
- Indexes added to schema (migration needed on next `prisma migrate dev`)
