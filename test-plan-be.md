# Smart Todo — Backend Test Plan

> Backend core tests (auth, orgs, profiles, tasks, planner, insights).
> Designed to be used by a dedicated agent working on `/apps/api`.
> Reference: [test-plan.md](./test-plan.md) for full context.
>
> **These test concerns are in separate docs:**
> - [test-plan-ai.md](./test-plan-ai.md) — AI provider, estimation, prompt tests
> - [test-plan-telegram.md](./test-plan-telegram.md) — Telegram bot, webhook, handler tests
> - [test-plan-google-oauth.md](./test-plan-google-oauth.md) — Google OAuth service and endpoint tests
> - [test-plan-api-keys.md](./test-plan-api-keys.md) — API key authentication and management tests

---

## 1. Test Infrastructure

### Setup
- Use `testcontainers` for PostgreSQL in integration tests
- Run TypeORM migrations before test suite
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
- Registration rejects weak passwords (less than 8 characters)
- Registration rejects mismatched password and confirm password
- Registration rejects missing required fields (name, email, password, organization name)

### 2.1b Google OAuth Service

> Fully covered in [test-plan-google-oauth.md](./test-plan-google-oauth.md).
> Includes findOrCreateUser scenarios, account linking, token issuance, and strategy config tests.

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
- Create task with valid data (projected_duration, category, scheduled_date, notes)
- Assign position correctly (append to end of column)
- Reorder tasks within column (update positions of affected tasks)
- Move task between columns (update old + new column positions)
- Prevent assigning to user outside organization
- Validate category exists in organization's categories
- Set scheduled_date defaults to today if not provided

### 2.4a Categories Service
- Return default categories for a new organization (6 defaults seeded)
- Create custom category with name and color
- Reject duplicate category name within same organization
- Reject creating category without name or color
- Update custom category name
- Update custom category color
- Reject updating a default category
- Delete custom category
- Reject deleting a default category
- Return all categories (defaults + custom) for an organization

### 2.4b Attachment Service
- Store attachment metadata (file_name, file_url, file_size_bytes, mime_type, uploaded_by)
- Reject files larger than 10MB
- Delete attachment removes file from storage and DB record
- Validate task ownership before allowing upload
- Validate task ownership before allowing delete
- Return attachment list for a task

### 2.5 Time Tracking Service
- Start timer creates a time_entry with started_at = now
- Stop timer sets stopped_at and calculates duration_minutes
- Cannot start timer if one is already running for the same task
- **Can** start timers on multiple different tasks simultaneously (parallel task execution)
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

### 2.8 Notification Service
- Schedule notification check when timer starts on a task with a projected_duration
- Calculate 60% threshold correctly (e.g., 36min for a 60min projected task)
- Calculate 100% threshold correctly
- Construct correct push payload for duration warning (60%)
- Construct correct push payload for duration exceeded (100%)
- Skip notification when user has opted out of push notifications
- Skip notification when user has no push subscription
- Skip duration warning notification when `duration_warning_enabled` is false
- Skip duration exceeded notification when `duration_exceeded_enabled` is false
- Do not send duplicate notifications for the same timer session
- Handle tasks with no projected_duration (skip notification scheduling)
- Remove expired push subscriptions on 410 response from push service

### 2.7 Insights Service
- Calculate average projected/executed ratio
- Filter accuracy stats by category
- Filter accuracy stats by date range
- Handle edge case: no completed tasks yet (return empty/zero stats)
- Calculate overestimation percentage correctly
- Calculate underestimation percentage correctly
- Return per-category breakdown
- Only include tasks that have both projected and executed durations

### 2.7b Reports Service
- Return completed tasks filtered by day period (single date boundary)
- Return completed tasks filtered by yesterday period (previous day boundary)
- Return completed tasks filtered by week period (Mon–Sun boundary)
- Return completed tasks filtered by month period (1st–last day boundary)
- Return completed tasks filtered by custom date range (from/to)
- Filter by single category
- Filter by multiple comma-separated categories
- Return flat task list when no group_by specified
- Return tasks grouped by category with per-category subtotals when group_by=category
- Calculate summary: total_tasks, total_projected, total_executed, accuracy_percentage
- Handle empty result (no completed tasks in period)
- Only include tasks that have completed_at within the requested range

---

## 3. Integration Tests

### 3.1 Auth Endpoints
- `POST /api/auth/register` — success (creates user + org, returns JWT), duplicate email (409), missing fields (400), weak password under 8 chars (400), password mismatch (400)
- `POST /api/auth/login` — success (returns tokens), wrong password (401), nonexistent user (401)
- `POST /api/auth/refresh` — success (returns new token pair), expired token (401), invalid token (401)
- Google OAuth endpoint tests → [test-plan-google-oauth.md](./test-plan-google-oauth.md)

### 3.2 Organization Endpoints
- `POST /api/organizations` — success, missing name (400)
- `GET /api/organizations/:id` — success, not found (404), unauthorized (403)
- `POST /api/organizations/:id/invite` — success, already member (409), unauthorized (403)
- `DELETE /api/organizations/:id/members/:userId` — success, unauthorized (403), self-remove last owner (400)

### 3.3 Profile Endpoints
- `POST /api/users/me/profile` — text only (200), with PDF (200), with DOCX (200), unsupported file (400)
- `GET /api/users/me/profile` — exists (200), not yet created (404)

### 3.3b Categories Endpoints
- `GET /api/categories` — returns default + custom categories for organization (200), unauthenticated (401)
- `POST /api/categories` — success with name + color (201), duplicate name (409), missing name (400), missing color (400), unauthenticated (401)
- `PUT /api/categories/:id` — update custom category (200), reject update on default (403), not found (404)
- `DELETE /api/categories/:id` — delete custom category (204), reject delete on default (403), not found (404)

### 3.4 Board & Task Endpoints
- `POST /api/boards` — success (creates default columns), unauthorized (401)
- `GET /api/boards/:id` — returns columns and tasks ordered by position
- `POST /api/boards/:boardId/tasks` — success (triggers AI estimation, sets projected_duration), missing title (400)
- `PUT /api/tasks/:id` — update fields including notes (200), unauthorized user (403)
- `PATCH /api/tasks/:id/move` — move between columns (200), reorder within column (200)
- `DELETE /api/tasks/:id` — success (204), not found (404)

### 3.4b Attachment Endpoints
- `POST /api/tasks/:id/attachments` — success with valid file (201), file too large >10MB (400), unauthorized (401), task not found (404)
- `GET /api/tasks/:id/attachments` — returns attachment list (200), empty list (200), unauthorized (401)
- `DELETE /api/tasks/:id/attachments/:attachmentId` — success (204), not found (404), unauthorized (401/403)

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

### 3.7b Reports Endpoints
- `GET /api/reports/completed?period=day&date=2026-03-10` — returns today's completed tasks with summary (200)
- `GET /api/reports/completed?period=week&date=2026-03-10` — returns week's completed tasks (200)
- `GET /api/reports/completed?period=month&date=2026-03-10` — returns month's completed tasks (200)
- `GET /api/reports/completed?from=2026-03-01&to=2026-03-10` — returns custom range (200)
- `GET /api/reports/completed?period=day&category=work,exercise` — filtered by categories (200)
- `GET /api/reports/completed?period=day&group_by=category` — returns grouped response (200)
- `GET /api/reports/completed` — defaults to today when no period/date given (200)
- `GET /api/reports/completed?period=day` — empty result when no completed tasks (200, empty tasks array)
- `GET /api/reports/completed` — unauthenticated (401)

### 3.8 Notification Endpoints
- `POST /api/notifications/subscribe` — success (201, saves push subscription), missing fields (400), duplicate subscription (409 or upsert), unauthenticated (401)
- `DELETE /api/notifications/subscribe` — success (204), no subscription found (404), unauthenticated (401)
- `GET /api/notifications/preferences` — returns preferences (200), returns defaults when no preferences set (200), unauthenticated (401)
- `PUT /api/notifications/preferences` — update preferences (200), invalid body (400), unauthenticated (401)
- Push delivery: starting a timer on a task with projected_duration triggers notification at 60% and 100% elapsed time (mocked web-push, verify `webpush.sendNotification` called with correct payload)

> **Note**: AI provider/estimation tests → [test-plan-ai.md](./test-plan-ai.md)
> **Note**: Telegram webhook/handler tests → [test-plan-telegram.md](./test-plan-telegram.md)
