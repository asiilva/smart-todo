# Smart Todo MVP -- Code Review Report

**Reviewer**: Staff Engineer Audit
**Date**: 2026-03-19
**Scope**: Full codebase review of `apps/api/src/`, `apps/desktop/src/`, `packages/shared/src/`, and `apps/api/prisma/schema.prisma`

---

## Executive Summary

The MVP is functional and covers the core value proposition: create tasks, get AI estimates, plan your day, track time, and compare projected vs actual. The code is cleanly structured, consistently formatted, and the architecture (monorepo, Electron + Express + PostgreSQL) is sound for a single-developer desktop tool. However, there are meaningful issues around type safety, security, error handling, and shared code usage that should be addressed before iterating further.

---

## 1. What's Working Well

- **Clean separation of concerns.** API routers are single-responsibility, each in its own directory. The Electron main/preload/renderer split follows best practices for context isolation.
- **Zod validation on every API endpoint.** All input is validated before touching the database. Schemas are co-located with routes, making them easy to find.
- **Ownership verification.** Every data-mutating endpoint checks that the authenticated user owns the resource via `verifyTaskOwnership` or direct userId comparison. This is consistent and well-implemented.
- **Prisma schema.** Proper use of `@map` for snake_case DB columns with camelCase TS fields. `@db.Date` annotation on `scheduledDate` and `dueDate` prevents timestamp precision issues. UUID primary keys throughout.
- **Claude CLI integration.** The `extractClaudeResult` function correctly handles the double-envelope problem (JSON envelope wrapping markdown code block wrapping JSON). The `isClaudeAvailable` check with graceful fallback is good UX.
- **Token refresh flow.** The axios interceptor that catches 401, refreshes the token, and retries the original request is correctly implemented.
- **System tray.** Already built despite being listed as out-of-scope. Falls back to an empty icon gracefully.
- **Celebration modal.** Nice touch for task completion. Shows projected vs actual with accuracy percentage. Auto-dismisses after 8 seconds.
- **Transaction usage.** Task move and delete operations correctly use `$transaction` to maintain position consistency.

---

## 2. Bugs and Correctness Issues

### 2.1 Hardcoded test credentials in LoginPage
**File**: `apps/desktop/src/renderer/pages/LoginPage.tsx`, lines 6-7
```typescript
const [email, setEmail] = useState('test@test.com');
const [password, setPassword] = useState('Test@1234');
```
Default state pre-fills login with test credentials. This must be removed before any release or demo. Even for dev convenience, this is a security risk if the app is ever screen-shared or demoed.

### 2.2 Timer auto-stop on Done uses stale data
**File**: `apps/desktop/src/renderer/pages/BoardPage.tsx`, lines 151-158
When a task is dragged to Done, the code calls `findTask(taskId)` to get the task for the celebration modal. But `findTask` reads from the current `board` state, which has not yet been refreshed after the move. The `executedDurationMinutes` shown in the celebration modal will be stale (missing the duration from the just-stopped timer).

### 2.3 Timer duration rounding loses precision
**File**: `apps/api/src/tasks/task.router.ts`, line 281
```typescript
const durationMinutes = Math.round(durationMs / 60000);
```
`Math.round` means a 29-second session rounds to 0 minutes. This silently discards short work sessions. Should use `Math.ceil` or track seconds instead.

### 2.4 Register navigates to /board, skipping onboarding
**File**: `apps/desktop/src/renderer/pages/RegisterPage.tsx`, line 18
After registration, the user is sent to `/board` instead of `/onboarding`. The onboarding flow (profile + availability setup) is never triggered. This route exists but is effectively dead code unless manually navigated to.

### 2.5 Planner route ordering bug
**File**: `apps/api/src/planner/planner.router.ts`
The `GET /:date` route is registered before `PUT /settings`. Express evaluates routes in registration order, so `PUT /settings` would try to match `/:date` first with `date = "settings"`. This currently works by coincidence because the `PUT` method does not match the `GET /:date` handler. However, if a `GET /settings` endpoint were ever added, it would be matched by `/:date` instead. This is fragile.

### 2.6 No `completedAt` timestamp set
When a task is moved to Done (auto-stop timer in BoardPage), the API never sets `task.completedAt`. The column in the schema exists but is never written to. This means you cannot query completed tasks by completion date.

### 2.7 Category dropdown does not load user's custom categories
**Files**: `CreateTaskModal.tsx`, `TaskDetailPanel.tsx`
Both components hardcode the 6 default categories in `<select>` options. If a user creates custom categories via the API, they will not appear in task creation or editing. The category CRUD API exists but the frontend never fetches from it.

---

## 3. Type Safety Issues

### 3.1 Shared types package is not imported anywhere
The `packages/shared/src/` package defines well-structured types (`Task`, `Board`, `Category`, `EstimationResult`, etc.) but **neither the API nor the desktop app imports from it**. Every component and router re-declares its own local interfaces. This means:
- Type drift is inevitable (and has already happened -- the shared `Task` type has `createdAt`/`updatedAt` fields that local interfaces omit).
- Changes to the API response shape will not trigger compile errors in the renderer.

### 3.2 `any` type usage
Several explicit `any` annotations and eslint-disable comments:
- `apps/api/src/tasks/task.router.ts` line 69: `Record<string, any>` for update data
- `apps/api/src/tasks/task.router.ts` lines 120, 193: `tx: any` for Prisma transaction client
- `apps/api/src/boards/board.router.ts` lines 162, 213, 236: `col: any`, `c: any`, `priority as any`
- `apps/api/src/users/user.router.ts` line 15: `structuredProfile: z.any().optional()`

The `tx: any` annotations for Prisma interactive transactions are the most impactful -- they suppress type checking on every database operation inside transactions.

### 3.3 AI client return types are untyped
**File**: `apps/desktop/src/renderer/services/ai-client.ts`
All methods return `Promise<any>` implicitly. The `EstimationResult` and `ParsedTask` types exist in shared but are not used. The `CreateTaskModal` accesses `result.data.suggestedPriority` without any type narrowing.

### 3.4 Preload API type declaration is disconnected
**File**: `apps/desktop/src/renderer/services/ai-client.ts`, lines 1-7
The `Window.electronAPI` type is declared locally here, importing from the preload. But the preload return types are all `Promise<any>` (from `ipcRenderer.invoke`). There is no end-to-end type contract between main process IPC handlers and renderer usage.

---

## 4. Missing Error Handling

### 4.1 Silent catch blocks throughout renderer
Multiple components swallow errors with empty catch blocks:
- `TaskDetailPanel.tsx`: `handleStartTimer`, `handleStopTimer`, `handleDelete`, `handleSave`, `loadTimeEntries` -- all catch and ignore.
- `OnboardingPage.tsx`: profile save and settings save both catch and ignore.
- `ProfilePage.tsx`: `loadDailySettings` catches and ignores.

Users will see no feedback when operations fail. At minimum, these should show toast notifications.

### 4.2 No error display on board load failure
**File**: `apps/desktop/src/renderer/pages/BoardPage.tsx`
If `loadBoard()` fails, it only `console.error`s. The user sees the "No board found" message, which is misleading -- the board may exist but the network request failed.

### 4.3 API does not validate UUID format on path params
Route handlers like `GET /boards/:id` and `PUT /tasks/:id` pass the param directly to Prisma without validating it is a UUID. Invalid UUIDs will cause Prisma to throw an unhandled error that becomes a generic 500. Should validate with Zod or a regex guard.

---

## 5. Security Concerns

### 5.1 Hardcoded JWT secrets
**Files**: `apps/api/src/middleware/auth.ts`, `apps/api/src/auth/auth.router.ts`
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret';
```
Fallback to a known string means the app is "secure" only when env vars are set. If deployed without them, all tokens are signed with a publicly known key. The app should **refuse to start** if JWT secrets are not configured in production.

### 5.2 CORS wildcard
**File**: `apps/api/src/app.ts`, line 17
```typescript
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
```
`credentials: true` with `origin: '*'` is invalid per the CORS spec (browsers will reject it), but it signals intent to accept any origin. For an Electron app talking to localhost, CORS should be locked to the specific origin.

### 5.3 No rate limiting
No rate limiting on auth endpoints. Brute-force login attempts are not throttled. For a local dev tool this is low risk, but it should be addressed before any networked deployment.

### 5.4 Refresh tokens are not revocable
Refresh tokens are stateless JWTs. There is no server-side token store, so logout does not actually invalidate the refresh token -- it just clears it from the client. Anyone who captured a refresh token can continue to mint access tokens for 7 days.

### 5.5 Token storage in memory only
**File**: `apps/desktop/src/main/ipc-handlers.ts`
Tokens are stored in a `Map<string, Buffer>`. This means tokens are lost on every app restart, forcing re-login. For safeStorage to be useful, the encrypted buffers should be persisted to disk (e.g., via `electron-store` or a file).

---

## 6. Architecture Concerns for Growth

### 6.1 Full board reload on every action
Every task create, update, move, delete, and timer action calls `loadBoard()` which fetches the entire board with all columns, all tasks, and all time entries. As the task count grows, this becomes an O(n) re-fetch on every interaction. Should move to optimistic updates or targeted re-fetches.

### 6.2 No pagination on tasks
`GET /boards/:id` returns all tasks across all columns. `GET /planner/:date` returns all tasks for a date. Neither supports pagination. This will degrade performance as task count grows into hundreds.

### 6.3 Category is stored as a string, not a foreign key
`Task.category` is a plain `String` field with a default of `"work"`. It is not a foreign key to the `Category` model. This means:
- Renaming a category does not update existing tasks.
- Deleting a category leaves orphaned category strings on tasks.
- Custom categories have no referential integrity with tasks.

### 6.4 Duplicate interface definitions everywhere
The `Task`, `Column`, `Board`, `TimeEntry` interfaces are defined independently in:
- `BoardPage.tsx`
- `PlannerPage.tsx`
- `TaskCard.tsx`
- `SortableTaskCard.tsx`
- `KanbanColumn.tsx`
- `CreateTaskModal.tsx`
- `TaskDetailPanel.tsx`
- `CelebrationModal.tsx`

Eight separate copies. Any API response shape change requires updating all of them.

### 6.5 No database indexes beyond defaults
The Prisma schema has no explicit indexes. Queries that filter by `userId`, `boardId`, `columnId`, `scheduledDate`, and `taskId` will do table scans as data grows. Critical indexes needed:
- `tasks(column_id, position)`
- `tasks(scheduled_date)` (used by planner raw SQL query)
- `time_entries(task_id, stopped_at)` (used to find active timer)
- `protected_time_blocks(user_id, recurring, day_of_week)`

### 6.6 `formatMinutes` is duplicated in 4 files
The same function appears in `TaskCard.tsx`, `TaskDetailPanel.tsx`, `PlannerPage.tsx`, and `CelebrationModal.tsx`. Should be extracted to a shared utility.

---

## 7. Code Quality Issues

### 7.1 No tests
There are zero test files in the entire codebase. No unit tests, no integration tests, no E2E tests. The `test-plan.md` exists in the repo but nothing has been implemented.

### 7.2 No API response type wrappers
API calls in the renderer use raw `apiClient.get/post/put/patch/delete` with no generic typing. Every `res.data` access is implicitly `any`.

### 7.3 `console.log` debug output in production paths
**File**: `apps/desktop/src/main/claude-cli.ts`
Multiple `console.log` statements print prompts, stdout chunks, and full output. These should use a proper logger with log levels, or be behind a debug flag.

### 7.4 BrowserRouter used in Electron
**File**: `apps/desktop/src/renderer/main.tsx`
`BrowserRouter` relies on the HTML5 History API, which does not work correctly when loading from `file://` protocol in production Electron builds. Should use `HashRouter` instead.

### 7.5 Category colors duplicated between API and renderer
Default category colors are defined in:
- `apps/api/src/auth/auth.router.ts` (DEFAULT_CATEGORIES)
- `apps/desktop/src/renderer/components/TaskCard.tsx` (categoryColors)
- `apps/desktop/src/renderer/pages/PlannerPage.tsx` (categoryColors)
- `packages/shared/src/types/category.ts` (DEFAULT_CATEGORIES, without colors on some)

These must be kept in sync manually.

### 7.6 `onOAuthCallback` in preload is dead code
**File**: `apps/desktop/src/preload/index.ts`, lines 28-33
There is no OAuth implementation. This handler listens for an event that is never emitted.

---

## 8. What's Missing from the MVP Plan

| Planned Feature | Status |
|----------------|--------|
| Onboarding flow triggered after registration | Built but unreachable (navigates to /board instead of /onboarding) |
| Task `completedAt` timestamp | Schema exists, never written |
| Custom categories in task create/edit UI | API exists, UI hardcodes defaults |
| Toast notifications on actions | Toast system exists, but most actions do not use it |
| Graceful handling when Claude CLI is not installed (on board page) | Only checked on Profile page, not on task creation |

---

## 9. Features Added Beyond Original Plan

| Feature | Notes |
|---------|-------|
| System tray | Originally listed as out-of-scope. Implemented with show/hide/quit menu. |
| Celebration modal | Originally listed as out-of-scope. Shows on task completion with accuracy stats. |
| Auto-start timer on drag to In Progress | Not in plan. Timer starts automatically when task enters "In Progress" column. |
| Auto-stop timer on drag to Done | Not in plan. Timer stops automatically when task enters "Done" column. |
| Profile requirement gate | Not in plan. Blocks task creation if no tech profile exists (with expiry date 2026-06-19). |
| Live timer display on task cards | Not in plan. Cards with active timers show a real-time elapsed counter updating every second. |
| Single-instance lock | Not in plan. Prevents multiple app instances via `requestSingleInstanceLock`. |
| Daily availability on Profile page | Not in plan. Profile page doubles as availability settings page. |

---

## 10. Recommendations for Next Iteration

### Immediate (before shipping to any user)
1. Remove hardcoded test credentials from LoginPage.
2. Fix RegisterPage to navigate to `/onboarding` instead of `/board`.
3. Use `HashRouter` instead of `BrowserRouter` for Electron production builds.
4. Make JWT secrets required (crash on startup if not set, at least in production).
5. Wire up shared types package -- import from `@smart-todo/shared` in both API and desktop.

### Short-term (next sprint)
1. Add database indexes for the critical query paths.
2. Fetch user's custom categories from API in CreateTaskModal and TaskDetailPanel.
3. Set `completedAt` when a task moves to Done.
4. Replace silent catch blocks with toast notifications.
5. Use `Math.ceil` instead of `Math.round` for timer duration to avoid discarding short sessions.
6. Extract `formatMinutes` and category color maps to shared utilities.
7. Validate UUID path params with a middleware or Zod check.

### Medium-term (before scaling)
1. Implement optimistic updates for drag-and-drop instead of full board reload.
2. Add pagination to task and time entry queries.
3. Convert `Task.category` from a string to a foreign key referencing `Category.id`.
4. Add tests -- at minimum, API integration tests for auth and task CRUD.
5. Persist encrypted tokens to disk so sessions survive app restarts.
6. Add rate limiting to auth endpoints.

---

## File Inventory

| Layer | File | Lines | Notes |
|-------|------|-------|-------|
| **API** | `src/app.ts` | 38 | Express setup, routes, error handler |
| | `src/lib/logger.ts` | 9 | Pino logger with pretty dev output |
| | `src/lib/prisma.ts` | 13 | Singleton Prisma client |
| | `src/middleware/auth.ts` | 36 | JWT verification middleware |
| | `src/middleware/error-handler.ts` | 19 | AppError class + global handler |
| | `src/auth/auth.router.ts` | 196 | Register, login, refresh |
| | `src/users/user.router.ts` | 100 | User profile CRUD |
| | `src/boards/board.router.ts` | 250 | Board + task creation |
| | `src/tasks/task.router.ts` | 321 | Task CRUD, move, timer |
| | `src/categories/category.router.ts` | 150 | Category CRUD |
| | `src/planner/planner.router.ts` | 288 | Daily plan, settings, protected blocks |
| | `prisma/schema.prisma` | 156 | 9 models, 1 enum |
| **Desktop** | `src/main/index.ts` | 75 | Electron main process |
| | `src/main/claude-cli.ts` | 152 | Claude CLI spawn + prompts |
| | `src/main/ipc-handlers.ts` | 150 | IPC bridge for AI + auth storage |
| | `src/main/tray.ts` | 48 | System tray |
| | `src/preload/index.ts` | 38 | Context bridge |
| | `src/renderer/App.tsx` | 61 | Routes + auth guard |
| | `src/renderer/main.tsx` | 30 | React entry |
| | `src/renderer/stores/auth-store.ts` | 77 | Zustand auth state |
| | `src/renderer/services/api-client.ts` | 53 | Axios + interceptors |
| | `src/renderer/services/ai-client.ts` | 47 | AI client wrapper |
| | `src/renderer/pages/LoginPage.tsx` | 67 | Login form |
| | `src/renderer/pages/RegisterPage.tsx` | 70 | Registration form |
| | `src/renderer/pages/OnboardingPage.tsx` | 121 | Profile + availability wizard |
| | `src/renderer/pages/ProfilePage.tsx` | 294 | Profile editor + availability |
| | `src/renderer/pages/BoardPage.tsx` | 305 | Kanban board |
| | `src/renderer/pages/PlannerPage.tsx` | 270 | Daily planner |
| | `src/renderer/components/TaskCard.tsx` | 120 | Task card with live timer |
| | `src/renderer/components/SortableTaskCard.tsx` | 40 | DnD wrapper |
| | `src/renderer/components/KanbanColumn.tsx` | 77 | Column with droppable |
| | `src/renderer/components/CreateTaskModal.tsx` | 230 | Task creation + AI estimate |
| | `src/renderer/components/TaskDetailPanel.tsx` | 270 | Side panel editor |
| | `src/renderer/components/CelebrationModal.tsx` | 112 | Completion celebration |
| | `src/renderer/components/Toast.tsx` | 66 | Toast notification system |
| | `src/renderer/components/ErrorBoundary.tsx` | 42 | React error boundary |
| | `src/renderer/components/Layout.tsx` | 58 | Sidebar + outlet |
| **Shared** | `src/index.ts` | 7 | Barrel export |
| | `src/types/auth.ts` | 25 | Auth types |
| | `src/types/user.ts` | 28 | User + profile types |
| | `src/types/board.ts` | 20 | Board + column types |
| | `src/types/task.ts` | 60 | Task + time entry types |
| | `src/types/category.ts` | 22 | Category types |
| | `src/types/planner.ts` | 29 | Planner types |
| | `src/types/ai.ts` | 16 | AI result types |

**Total**: ~4,100 lines of application code across 37 source files.
