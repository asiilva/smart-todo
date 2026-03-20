# Smart Todo — Backlog

## Technical Debt
- [ ] Wire up `@smart-todo/shared` types across API + desktop (eliminate remaining local types)
- [ ] Implement reports endpoint (enables historical accuracy in AI estimations)
- [ ] Persist tokens to disk (sessions survive app restarts — use electron-store or file in userData)
- [ ] Optimistic updates for drag-and-drop (stop full board reload on every action)
- [ ] Convert Task.category from string to FK referencing Category.id
- [ ] Add tests (API integration tests at minimum)
- [ ] Rate limiting on auth endpoints
- [ ] Revocable refresh tokens (server-side token store)

## UI Polish
- [ ] Custom category creation UI (API exists, no UI yet)
- [ ] Protected time blocks creation UI in planner
- [ ] Task search/filter on board
- [ ] Keyboard shortcuts (Cmd+N new task, etc.)

## Post-MVP Features
- [ ] Multi-tenancy / organizations / invites / roles
- [ ] Reports & Insights dashboards
- [ ] Telegram bot integration
- [ ] Web Push notifications (duration alerts 60%/100%)
- [ ] Task sessions (persistent Claude context per task, multiple agents)
- [ ] Production deployment (Digital Ocean, auto-updates)
- [ ] Google OAuth
- [ ] API keys for external integrations
