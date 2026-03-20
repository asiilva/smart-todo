# Smart Todo -- MVP Plan (Updated 2026-03-19)

> This document has been updated post-implementation to reflect what was actually built, features added beyond the original scope, known issues, and real effort numbers.

## Core Value

**"See if your day is realistic before you commit to it."**

A tech professional creates tasks, gets AI-powered time estimates via local Claude CLI, sees their day as time blocks, and tracks actual vs projected time. The feedback loop is: **plan -> estimate -> execute -> compare**.

---

## MVP Scope

### In Scope (Delivered)

| Feature | Description | Notes |
|---------|-------------|-------|
| Auth | Register/login with email + password, JWT access (15min) + refresh (7d) tokens, single-user | Working. Default board, columns, categories, and daily settings created on registration. |
| Kanban Board | Create tasks, drag between columns (Backlog/To Do/In Progress/Review/Done), reorder within columns | Working. Uses @dnd-kit with DragOverlay for visual feedback. |
| AI Estimation | Claude CLI estimates task duration on creation, suggests priority and category | Working. Double-unwraps Claude CLI JSON envelope + markdown code block. |
| Daily Planner | Today's tasks as time blocks, total projected vs available hours, overbooked warning | Working. Uses raw SQL for date comparison to avoid Prisma timezone issues. |
| Timer | Start/stop per task, track executed duration | Working. Includes live elapsed counter on task cards. |
| Electron Shell | App launches, loads renderer, spawns Claude CLI, secure token storage (safeStorage) | Working. Context isolation enabled, sandbox mode on. |
| System Tray | Show/hide/quit menu, click to focus | Added beyond original plan. Graceful fallback if tray icon is missing. |
| Celebration Modal | Shows on task completion with projected vs actual comparison and accuracy % | Added beyond original plan. Auto-dismisses after 8 seconds. |
| Auto Timer Start/Stop | Timer auto-starts when task dragged to In Progress, auto-stops when dragged to Done | Added beyond original plan. |
| Profile Requirement Gate | Blocks task creation until user fills out tech profile (expires 2026-06-19) | Added beyond original plan. |
| Live Timer Display | Task cards with active timers show real-time elapsed counter (updates every second) | Added beyond original plan. |
| Single-Instance Lock | Prevents multiple app windows from opening simultaneously | Added beyond original plan. |

### Out of Scope (Confirmed Post-MVP)

- Multi-tenancy / organizations / invites / roles
- Google OAuth
- Telegram integration
- Web Push notifications
- Reports & insights dashboards
- API keys
- Resume upload / parsing (uses plain text skill description instead)
- Task attachments
- Auto-updates
- CSV export

---

## Architecture (As Built)

```
+-------------------------------------+
|          User's Machine             |
|                                     |
|  +--------------+   +------------+ |
|  |  Electron     |-->| Claude CLI | |
|  |  Main Process |   | (local)    | |
|  |  (IPC bridge, |   +------------+ |
|  |   tray, safe  |                  |
|  |   storage)    |                  |
|  +------+--------+                  |
|         |                           |
|  +------v--------+                  |
|  | Vite Renderer  |                 |
|  | (React, DnD,   |                |
|  |  Zustand,      |                |
|  |  React Query,  |                |
|  |  Tailwind)     |                |
|  +------+---------+                |
+---------|--------------------------+
          | HTTP (localhost:3001)
          v
+---------+-------------------------+
|       Local Docker                |
|                                   |
|  +-------------+  +------------+ |
|  | Express API  |->| PostgreSQL | |
|  | (Zod, Prisma,|  +------------+ |
|  |  JWT, bcrypt) |                |
|  +--------------+                 |
+-----------------------------------+
```

### Key Technical Decisions Made During Implementation

1. **Vite for renderer** -- Used instead of webpack for faster HMR.
2. **@tanstack/react-query** -- Used for server state management alongside Zustand for client state (auth).
3. **lucide-react** -- Icon library used throughout the UI.
4. **pino** -- Structured logging on API side with pino-pretty for dev.
5. **Raw SQL for planner date queries** -- Prisma's date handling caused timezone conversion issues; raw SQL with `::date` cast was the fix.
6. **In-memory token storage** -- Tokens are encrypted with safeStorage but stored in a Map (lost on restart). Disk persistence was deferred.

---

## Database Schema (As Built)

```
users
  id (uuid), email (unique), password_hash, name
  created_at, updated_at

tech_profiles
  id (uuid), user_id (unique FK->users), raw_text, structured_profile (JSONB)
  created_at, updated_at

boards
  id (uuid), user_id (FK->users), name
  created_at, updated_at

columns
  id (uuid), board_id (FK->boards), name, position (int)
  created_at, updated_at

tasks
  id (uuid), column_id (FK->columns), title, description, notes
  projected_duration_minutes (int?), executed_duration_minutes (int, default 0)
  priority (enum: low/medium/high/critical), category (string, default "work")
  position (int), labels (JSONB, default [])
  scheduled_date (date?), due_date (date?)
  started_at (timestamp?), completed_at (timestamp?)  <-- NOTE: completed_at is never written
  created_at, updated_at

time_entries
  id (uuid), task_id (FK->tasks), user_id (FK->users)
  started_at (timestamp), stopped_at (timestamp?), duration_minutes (int?)

daily_settings
  id (uuid), user_id (unique FK->users)
  available_from (string "HH:mm"), available_until (string "HH:mm")
  created_at, updated_at

protected_time_blocks
  id (uuid), user_id (FK->users), title, category (string)
  day_of_week (int?), specific_date (date?), start_time (string), end_time (string)
  recurring (boolean)
  created_at

categories
  id (uuid), user_id (FK->users), name, color, is_default (boolean)
  @@unique([user_id, name])
  created_at
```

### Schema Notes
- No explicit database indexes beyond PKs and unique constraints. Needs indexes on `tasks(column_id, position)`, `tasks(scheduled_date)`, `time_entries(task_id, stopped_at)`.
- `task.category` is a plain string, not a FK to `categories`. Custom categories lack referential integrity with tasks.
- `task.completed_at` exists in schema but is never populated by application code.

---

## API Endpoints (As Built)

**Auth**
- `POST /api/auth/register` -- Creates user + default board/columns/categories/settings
- `POST /api/auth/login` -- Returns JWT access + refresh tokens
- `POST /api/auth/refresh` -- Rotates tokens

**Users / Profiles**
- `GET /api/users/me` -- Current user info
- `PUT /api/users/me` -- Update name
- `POST /api/users/me/profile` -- Create/update tech profile (upsert)
- `GET /api/users/me/profile` -- Get tech profile

**Categories**
- `GET /api/categories` -- List user's categories
- `POST /api/categories` -- Create custom category (with duplicate name check)
- `PUT /api/categories/:id` -- Update (blocks default categories)
- `DELETE /api/categories/:id` -- Delete (blocks default categories)

**Boards**
- `GET /api/boards` -- List user's boards
- `POST /api/boards` -- Create board with 5 default columns
- `GET /api/boards/:id` -- Board with columns + tasks + time entries
- `GET /api/boards/:boardId/tasks` -- Tasks grouped by column
- `POST /api/boards/:boardId/tasks` -- Create task in column

**Tasks**
- `PUT /api/tasks/:id` -- Update task fields
- `PATCH /api/tasks/:id/move` -- Move to column/position (with transaction)
- `DELETE /api/tasks/:id` -- Delete task + time entries (with transaction)
- `POST /api/tasks/:id/timer/start` -- Start timer (creates time_entry)
- `POST /api/tasks/:id/timer/stop` -- Stop timer (updates duration)
- `GET /api/tasks/:id/time-entries` -- List time entries

**Daily Planner**
- `GET /api/planner/:date` -- Tasks + protected blocks + settings + summary
- `PUT /api/planner/settings` -- Update availability hours
- `POST /api/planner/protected-blocks` -- Create protected block
- `PUT /api/planner/protected-blocks/:id` -- Update protected block
- `DELETE /api/planner/protected-blocks/:id` -- Delete protected block

---

## Phase Plan (Actual Results)

### Phase 1: Scaffolding -- estimated ~14h | actual: ~9min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| Initialize monorepo with workspaces (`apps/desktop`, `apps/api`, `packages/shared`) | ~1h | ~2min | Done |
| Scaffold Electron app with Vite + React + TypeScript + Tailwind | ~2h | ~2min | Done |
| Configure electron-builder (DMG target for dev testing) | ~1h | ~1min | Done |
| Set up preload script with context bridge | ~1h | ~1min | Done |
| Scaffold Express API with TypeScript | ~1.5h | ~2min | Done |
| Set up Prisma + PostgreSQL schema (MVP subset) and migrations | ~2h | ~1min | Done |
| Docker Compose for local dev (PostgreSQL + API) | ~1h | ~0.5min | Done |
| Shared types package | ~1h | ~0.5min | Done (but not imported by API or desktop) |
| ESLint + Prettier config | ~0.5h | ~0.5min | Done |
| CI: GitHub Actions (lint, test, build) | ~2h | ~0.5min | Done |

### Phase 2: Auth -- estimated ~8h | actual: ~1min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| API: Register endpoint with bcrypt + JWT + default data seeding | ~2h | ~0.5min | Done |
| API: Login endpoint with JWT access (15min) + refresh (7d) tokens | ~1.5h | ~0.5min | Done |
| API: Refresh token endpoint | ~1h | ~0.5min | Done |
| API: Auth middleware (authenticate, get current user) | ~0.5h | scaffolded in P1 | Done |
| Electron: Login page | ~1h | scaffolded in P1 | Done |
| Electron: Register page | ~1h | scaffolded in P1 | Done |
| Electron: Secure token storage (safeStorage) + auth context/provider | ~1h | scaffolded in P1 | Done (in-memory only) |

### Phase 3: Claude CLI + User Profile -- estimated ~8h | actual: ~2min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| Electron: Claude CLI integration (spawn, stdin, timeout) | ~2h | scaffolded in P1 | Done |
| Electron: IPC handlers for AI operations | ~1.5h | scaffolded in P1 | Done |
| Electron: First-launch Claude CLI availability check | ~0.5h | ~0.5min | Done (Profile page only) |
| API: Profile CRUD (plain text + structured JSONB) | ~1.5h | done in P2 | Done |
| Electron: Simple onboarding (text -> Claude generates structured profile) | ~2h | ~1min | Built but unreachable (registration skips it) |
| Electron: Profile page (view/edit skills + daily availability settings) | ~0.5h | ~0.5min | Done |

### Phase 4: Task Management + Kanban -- estimated ~18h | actual: ~6min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| API: Board + Column CRUD with defaults (auto-create 5 columns) | ~2h | ~1min | Done |
| API: Task CRUD with position management | ~3h | ~1min | Done |
| API: Category CRUD (defaults + custom) | ~1.5h | ~1min | Done (UI doesn't use custom categories) |
| API: Time tracking (start/stop, time_entries, update executed_duration) | ~2h | ~1min | Done |
| Electron: Kanban board with @dnd-kit drag-and-drop | ~4h | ~1min | Done |
| Electron: Task card component (title, priority, category, live timer) | ~1.5h | ~0.5min | Done |
| Electron: Task creation modal with AI estimation | ~2h | ~0.5min | Done |
| Electron: Task detail panel (edit fields, timer control, time entries) | ~2h | ~0.5min | Done |

### Phase 5: Daily Planner -- estimated ~10h | actual: ~3min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| API: Daily planner endpoint (tasks + blocks + availability + summary) | ~2h | ~1min | Done |
| API: Daily settings CRUD (available_from/until) | ~1h | ~0.5min | Done |
| API: Protected time blocks CRUD | ~1.5h | ~0.5min | Done |
| Electron: Planner page with date nav, summary bar, category breakdown | ~3h | ~1min | Done |
| Electron: Overbooked warning | ~1h | included above | Done |

### Phase 6: Polish -- estimated ~6h | actual: ~1min
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| Electron: Loading states and error handling | ~1.5h | built into all pages | Done (loading states yes; error handling incomplete) |
| Electron: Empty states (no tasks, no board) | ~1h | built into BoardPage/PlannerPage | Done |
| Electron: Toast notifications | ~1h | ~0.5min | Done (system built, but most actions don't use it) |
| API: Input validation with Zod on all endpoints | ~1.5h | done in P2-P5 | Done |
| API: Global error handler + structured logging | ~1h | done in P1 | Done |

### Unplanned Work (added during implementation)
| Task | Actual | Status |
|------|--------|--------|
| System tray integration | ~0.5min | Done |
| Celebration modal on task completion | ~0.5min | Done |
| Auto-start/stop timer on column change | ~0.5min | Done |
| Live elapsed timer on task cards | ~0.5min | Done |
| Profile requirement gate before task creation | ~0.5min | Done |
| Single-instance app lock | ~0.5min | Done |
| Daily availability settings on Profile page | ~0.5min | Done |
| Claude CLI JSON envelope unwrapping | ~1min | Done (bug found and fixed during testing) |
| Planner timezone fix (raw SQL) | ~1min | Done (Prisma date comparison was off by timezone offset) |

### Total MVP effort -- estimated: ~64h | actual: ~25min (including unplanned work)

---

## Known Issues Discovered During Testing

1. **LoginPage has hardcoded test credentials** (`test@test.com` / `Test@1234`) pre-filled in state.
2. **RegisterPage navigates to `/board` instead of `/onboarding`**, making the onboarding wizard unreachable.
3. **`BrowserRouter` will break in production Electron builds** -- `file://` protocol doesn't support History API. Need `HashRouter`.
4. **Token storage is in-memory only** -- sessions lost on app restart.
5. **`completedAt` is never set** -- tasks moved to Done do not get a completion timestamp.
6. **Category dropdowns are hardcoded** -- custom categories created via API don't appear in UI.
7. **Celebration modal shows stale data** -- `executedDurationMinutes` doesn't include the just-stopped timer session.
8. **Timer rounds short sessions to 0** -- `Math.round(29s / 60) = 0 minutes`.
9. **Silent error swallowing** -- many renderer catch blocks are empty, giving no user feedback.
10. **JWT secrets fall back to known strings** -- app runs "insecure by default" if env vars are missing.
11. **Shared types package is unused** -- every component declares its own local interfaces.

---

## Verification Checklist

1. **App launches** -- Electron opens, shows login screen. PASS
2. **Register + login** -- create account, get JWT, persist session (until restart). PASS
3. **Claude CLI check** -- app detects Claude CLI on Profile page. PASS (not checked elsewhere)
4. **Create task** -- enter title/description, get AI estimate, task appears on board. PASS
5. **Kanban** -- drag task between columns, reorder within columns. PASS
6. **Timer** -- start timer on task, stop it, see executed vs projected. PASS
7. **Planner** -- navigate to planner, see today's tasks as time blocks, see overbooked warning. PASS
8. **Profile** -- enter skills description, Claude generates structured profile. PASS
9. **Auto-timer** -- drag to In Progress starts timer, drag to Done stops timer + shows celebration. PASS
10. **Profile gate** -- cannot create task without tech profile (until 2026-06-19). PASS

---

## Post-MVP Roadmap

After MVP is validated, layer in features from the full plan:

1. **Critical fixes** -- Remove test credentials, fix onboarding flow, switch to HashRouter, add DB indexes
2. **Shared types adoption** -- Wire up `@smart-todo/shared` imports across API and desktop
3. **Reports & Insights** -- accuracy tracking, category breakdown, trends
4. **Multi-tenancy** -- organizations, invites, roles
5. **Telegram** -- bot integration, voice messages
6. **Notifications** -- Web Push duration alerts (60%/100%)
7. **Production deployment** -- Digital Ocean, auto-updates, persistent token storage
8. **Google OAuth** -- sign in with Google
9. **API keys** -- external integrations
