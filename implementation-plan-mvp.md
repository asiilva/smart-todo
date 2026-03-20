# Smart Todo — MVP Plan

## Core Value

**"See if your day is realistic before you commit to it."**

A tech professional creates tasks, gets AI-powered time estimates via local Claude CLI, sees their day as time blocks, and tracks actual vs projected time. The feedback loop is: **plan → estimate → execute → compare**.

---

## MVP Scope

### In Scope

| Feature | Description |
|---------|-------------|
| Auth | Register/login with email + password, JWT tokens, single-user (no orgs/invites) |
| Kanban Board | Create tasks, drag between columns (Backlog → To Do → In Progress → Review → Done), reorder within columns |
| AI Estimation | Claude CLI estimates task duration on creation, suggests priority and category |
| Daily Planner | Today's tasks as time blocks, total projected vs available hours, overbooked warning |
| Timer | Start/stop per task, track executed duration, parallel timers allowed |
| Electron Shell | App launches, loads renderer, spawns Claude CLI, secure token storage |

### Out of Scope (post-MVP)

- Multi-tenancy / organizations / invites / roles
- Google OAuth
- Telegram integration
- Web Push notifications
- Reports & insights dashboards
- API keys
- Resume upload / parsing (use plain text skill description instead)
- Task attachments
- Auto-updates
- System tray
- Completion celebration modal
- CSV export

---

## Architecture (simplified for MVP)

```
┌─────────────────────────────────────┐
│          User's Machine             │
│                                     │
│  ┌─────────────┐   ┌─────────────┐ │
│  │  Electron    │──▶│ Claude CLI  │ │
│  │  (UI +       │   │ (local)     │ │
│  │  Orchestrator)│  └─────────────┘ │
│  └──────┬───────┘                   │
└─────────┼───────────────────────────┘
          │ HTTPS
          ▼
┌─────────────────────────────────────┐
│       Server (local Docker or DO)   │
│                                     │
│  ┌─────────────┐   ┌─────────────┐ │
│  │  Express API │──▶│ PostgreSQL  │ │
│  └─────────────┘   └─────────────┘ │
└─────────────────────────────────────┘
```

For MVP, the API + PostgreSQL can run locally via Docker Compose. Digital Ocean deployment is post-MVP.

---

## Database Schema (MVP subset)

```
users
├── id, email, password_hash, name
├── created_at, updated_at

tech_profiles
├── id, user_id, raw_text, structured_profile (JSONB)
├── created_at, updated_at

boards
├── id, user_id, name
├── created_at, updated_at

columns
├── id, board_id, name, position
├── created_at, updated_at

tasks
├── id, column_id, title, description, notes
├── projected_duration_minutes, executed_duration_minutes
├── priority, category, position
├── labels (JSONB), scheduled_date, due_date
├── started_at, completed_at
├── created_at, updated_at

time_entries
├── id, task_id, user_id
├── started_at, stopped_at, duration_minutes

categories
├── id, user_id, name, color, is_default
├── created_at

daily_settings
├── id, user_id, available_from, available_until
├── created_at, updated_at

protected_time_blocks
├── id, user_id, title, category
├── day_of_week, specific_date, start_time, end_time, recurring
├── created_at
```

Dropped from full schema: organizations, task_attachments, task_history, push_subscriptions, notification_preferences, api_keys, telegram_links.

---

## API Endpoints (MVP subset)

**Auth**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

**Users / Profiles**
- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users/me/profile` (plain text skills description)
- `GET /api/users/me/profile`

**Categories**
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

**Boards**
- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:id`

**Tasks**
- `GET /api/boards/:boardId/tasks`
- `POST /api/boards/:boardId/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/move`
- `DELETE /api/tasks/:id`

**Time Tracking**
- `POST /api/tasks/:id/timer/start`
- `POST /api/tasks/:id/timer/stop`
- `GET /api/tasks/:id/time-entries`

**Daily Planner**
- `GET /api/planner/:date`
- `PUT /api/planner/settings`
- `POST /api/planner/protected-blocks`
- `PUT /api/planner/protected-blocks/:id`
- `DELETE /api/planner/protected-blocks/:id`

---

## Phase Plan

### Phase 1: Scaffolding — estimated ~14h | actual: ~9min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| Initialize monorepo with workspaces (`apps/desktop`, `apps/api`, `packages/shared`) | ~1h | ~2min | [x] |
| Scaffold Electron app with Vite + React + TypeScript + Tailwind | ~2h | ~2min | [x] |
| Configure electron-builder (DMG target for dev testing) | ~1h | ~1min | [x] |
| Set up preload script with context bridge | ~1h | ~1min | [x] |
| Scaffold Express API with TypeScript | ~1.5h | ~2min | [x] |
| Set up Prisma + PostgreSQL schema (MVP subset) and migrations | ~2h | ~1min | [x] |
| Docker Compose for local dev (PostgreSQL + API) | ~1h | ~0.5min | [x] |
| Shared types package | ~1h | ~0.5min | [x] |
| ESLint + Prettier config | ~0.5h | ~0.5min | [x] |
| CI: GitHub Actions (lint, test, build) | ~2h | ~0.5min | [x] |

### Phase 2: Auth — estimated ~8h | actual: ~1min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| API: Register endpoint (email, password, name) with bcrypt + JWT | ~2h | ~0.5min | [x] |
| API: Login endpoint with JWT access (15min) + refresh (7d) tokens | ~1.5h | ~0.5min | [x] |
| API: Refresh token endpoint | ~1h | ~0.5min | [x] |
| API: Auth middleware (authenticate, get current user) | ~0.5h | ~0.5min | [x] |
| Electron: Login page | ~1h | scaffolded in P1 | [x] |
| Electron: Register page | ~1h | scaffolded in P1 | [x] |
| Electron: Secure token storage (safeStorage) + auth context/provider | ~1h | scaffolded in P1 | [x] |

### Phase 3: Claude CLI + User Profile — estimated ~8h | actual: ___
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| Electron: Claude CLI integration (`claude-cli.ts` — spawn, stdin, timeout) | ~2h | | [ ] |
| Electron: IPC handlers for AI operations | ~1.5h | | [ ] |
| Electron: First-launch Claude CLI availability check | ~0.5h | | [ ] |
| API: Profile CRUD (plain text skills description + structured JSONB) | ~1.5h | | [ ] |
| Electron: Simple onboarding (text description of skills → Claude generates structured profile) | ~2h | | [ ] |
| Electron: Profile page (view/edit skills) | ~0.5h | | [ ] |

### Phase 4: Task Management + Kanban — estimated ~18h | actual: ___
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| API: Board + Column CRUD with defaults (auto-create 5 columns) | ~2h | | [ ] |
| API: Task CRUD with position management | ~3h | | [ ] |
| API: Category CRUD (defaults + custom) | ~1.5h | | [ ] |
| API: Time tracking (start/stop, time_entries, update executed_duration) | ~2h | | [ ] |
| Electron: Kanban board with @dnd-kit drag-and-drop | ~4h | | [ ] |
| Electron: Task card component (title, priority badge, category color, timer) | ~1.5h | | [ ] |
| Electron: Task creation modal with AI estimation (IPC → Claude CLI → API persist) | ~2h | | [ ] |
| Electron: Task detail panel (edit fields, view time entries) | ~2h | | [ ] |

### Phase 5: Daily Planner — estimated ~10h | actual: ___
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| API: Daily planner endpoint (tasks for date + time blocks + availability) | ~2h | | [ ] |
| API: Daily settings CRUD (available_from/until) | ~1h | | [ ] |
| API: Protected time blocks CRUD | ~1.5h | | [ ] |
| Electron: Planner page with visual timeline | ~3h | | [ ] |
| Electron: Day summary bar (projected vs available, category breakdown) | ~1.5h | | [ ] |
| Electron: Overbooked warning | ~1h | | [ ] |

### Phase 6: Polish — estimated ~6h | actual: ___
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| Electron: Loading states and error handling | ~1.5h | | [ ] |
| Electron: Empty states (no tasks, no board) | ~1h | | [ ] |
| Electron: Toast notifications for actions (task created, timer started, etc.) | ~1h | | [ ] |
| API: Input validation with Zod on all endpoints | ~1.5h | | [ ] |
| API: Global error handler + structured logging | ~1h | | [ ] |

### Total MVP effort — estimated: ~64h | actual: ___

---

## Verification

1. **App launches** — Electron opens, shows login screen
2. **Register + login** — create account, get JWT, persist session
3. **Claude CLI check** — app detects Claude CLI on first launch
4. **Create task** — enter title/description → Claude estimates duration → task appears on board
5. **Kanban** — drag task between columns, reorder within columns
6. **Timer** — start timer on task, stop it, see executed vs projected
7. **Planner** — navigate to planner, see today's tasks as time blocks, see overbooked warning when day is full
8. **Profile** — enter skills description, Claude generates structured profile

---

## Post-MVP Roadmap

After MVP is validated, layer in features from the full plan:

1. **Multi-tenancy** — organizations, invites, roles
2. **Reports & Insights** — accuracy tracking, category breakdown, trends
3. **Telegram** — bot integration, voice messages
4. **Notifications** — Web Push duration alerts (60%/100%)
5. **Task sessions** — persistent Claude context per task, multiple agents
6. **Production deployment** — Digital Ocean, auto-updates, system tray
7. **Google OAuth** — sign in with Google
8. **API keys** — external integrations
