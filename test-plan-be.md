# Smart Todo — Backend Test Plan

> Backend core tests (auth, orgs, profiles, tasks, planner, insights).
> Designed to be used by a dedicated agent working on `/apps/api`.
> Reference: [test-plan.md](./test-plan.md) for full context.
>
> **AI and Telegram tests are in separate docs:**
> - [test-plan-ai.md](./test-plan-ai.md) — AI provider, estimation, prompt tests
> - [test-plan-telegram.md](./test-plan-telegram.md) — Telegram bot, webhook, handler tests

---

## 1. Test Infrastructure

### Setup
- Use `testcontainers` for PostgreSQL in integration tests
- Run Prisma migrations before test suite
- Seed database with test data per test file
- Clean up between test suites (truncate tables)
- Mock AI provider responses for deterministic tests

### Tools
- **Jest** — test runner
- **Supertest** — HTTP assertions for integration tests
- **testcontainers** — PostgreSQL container for integration tests

### Coverage Target
- Unit: 80%+
- Integration: all critical flows covered

---

## 2. Unit Tests

### 2.1 Auth Service
- Hash password correctly with bcrypt
- Verify password against hash
- Generate valid JWT access token (15min expiry)
- Generate valid JWT refresh token (7d expiry)
- Reject expired tokens
- Reject malformed tokens
- Reject tokens with invalid signature

### 2.2 Organization Service
- Create organization with owner role assigned
- Add member to organization
- Remove member from organization
- Prevent non-admin from managing members
- Prevent removing the last owner
- Prevent duplicate membership

### 2.3 Profile Service
- Extract text from PDF resume (pdf-parse)
- Extract text from DOCX resume (mammoth)
- Store tech profile for user
- Reject unsupported file types (only PDF/DOCX)
- Handle empty resume gracefully
- Update existing profile on re-upload

### 2.4 Task Service
- Create task with valid data (projected_duration, category, scheduled_date)
- Assign position correctly (append to end of column)
- Reorder tasks within column (update positions of affected tasks)
- Move task between columns (update old + new column positions)
- Prevent assigning to user outside organization
- Validate category enum values
- Set scheduled_date defaults to today if not provided

### 2.5 Time Tracking Service
- Start timer creates a time_entry with started_at = now
- Stop timer sets stopped_at and calculates duration_minutes
- Cannot start timer if one is already running for the same task
- Cannot stop timer if none is running
- executed_duration_minutes equals SUM of all completed time_entries
- Multiple start/stop sessions accumulate correctly
- Stopping timer on task in "Done" column keeps entry valid

### 2.6 Daily Planner Service
- Calculate available hours for a date (available_until - available_from - protected blocks)
- Detect overbooking when total projected_duration > available hours
- Return tasks ordered by position for a given date
- Handle recurring protected blocks (expand by day_of_week matching)
- Handle one-off protected blocks (match specific_date)
- Return `is_overbooked: true/false` with hours over/under
- Handle date with no tasks (return empty with full availability)
- Handle date with no protected blocks

### 2.7 Insights Service
- Calculate average projected/executed ratio
- Filter accuracy stats by category
- Filter accuracy stats by date range
- Handle edge case: no completed tasks yet (return empty/zero stats)
- Calculate overestimation percentage correctly
- Calculate underestimation percentage correctly
- Return per-category breakdown
- Only include tasks that have both projected and executed durations

---

## 3. Integration Tests

### 3.1 Auth Endpoints
- `POST /api/auth/register` — success (creates user + org), duplicate email (409), missing fields (400)
- `POST /api/auth/login` — success (returns tokens), wrong password (401), nonexistent user (401)
- `POST /api/auth/refresh` — success (returns new token pair), expired token (401), invalid token (401)

### 3.2 Organization Endpoints
- `POST /api/organizations` — success, missing name (400)
- `GET /api/organizations/:id` — success, not found (404), unauthorized (403)
- `POST /api/organizations/:id/invite` — success, already member (409), unauthorized (403)
- `DELETE /api/organizations/:id/members/:userId` — success, unauthorized (403), self-remove last owner (400)

### 3.3 Profile Endpoints
- `POST /api/users/me/profile` — text only (200), with PDF (200), with DOCX (200), unsupported file (400)
- `GET /api/users/me/profile` — exists (200), not yet created (404)

### 3.4 Board & Task Endpoints
- `POST /api/boards` — success (creates default columns), unauthorized (401)
- `GET /api/boards/:id` — returns columns and tasks ordered by position
- `POST /api/boards/:boardId/tasks` — success (triggers AI estimation, sets projected_duration), missing title (400)
- `PUT /api/tasks/:id` — update fields (200), unauthorized user (403)
- `PATCH /api/tasks/:id/move` — move between columns (200), reorder within column (200)
- `DELETE /api/tasks/:id` — success (204), not found (404)

### 3.5 Time Tracking Endpoints
- `POST /api/tasks/:id/timer/start` — success (201), already running (409)
- `POST /api/tasks/:id/timer/stop` — success (200), no running timer (400)
- `GET /api/tasks/:id/time-entries` — returns entries sorted by started_at

### 3.6 Daily Planner Endpoints
- `GET /api/planner/:date` — returns tasks + protected blocks + availability + remaining hours + is_overbooked
- `PUT /api/planner/settings` — success (200), invalid times (400)
- `POST /api/planner/protected-blocks` — create recurring (201), create one-off (201)
- `PUT /api/planner/protected-blocks/:id` — success (200), not found (404)
- `DELETE /api/planner/protected-blocks/:id` — success (204), not found (404)

### 3.7 Insights Endpoints
- `GET /api/insights/accuracy` — returns stats when completed tasks exist
- `GET /api/insights/accuracy?category=work` — filtered results
- `GET /api/insights/accuracy` — empty result when no completed tasks

> **Note**: AI provider/estimation tests → [test-plan-ai.md](./test-plan-ai.md)
> **Note**: Telegram webhook/handler tests → [test-plan-telegram.md](./test-plan-telegram.md)
