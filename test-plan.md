# Smart Todo — Test Plan

> **Parallel Agent Strategy**: This plan is split into dedicated BE and FE test documents.
> - [test-plan-be.md](./test-plan-be.md) — Backend tests (Jest + Supertest + testcontainers)
> - [test-plan-fe.md](./test-plan-fe.md) — Frontend tests (Jest + RTL + Cypress)

---

## 1. Testing Strategy Overview

| Layer              | Tool                        | Scope                                      |
|--------------------|-----------------------------|---------------------------------------------|
| Unit (API)         | Jest                        | Services, utilities, factories, middleware   |
| Integration (API)  | Jest + Supertest            | API endpoints with real DB (test container)  |
| Unit (Web)         | Jest + React Testing Library| Components, hooks, utilities                 |
| E2E (Web)          | Cypress                     | Full user flows through the browser          |

---

## 2. Backend Unit Tests

### 2.1 Auth Service
- Hash password correctly
- Verify password against hash
- Generate valid JWT access token
- Generate valid JWT refresh token
- Reject expired tokens
- Reject malformed tokens

### 2.2 Organization Service
- Create organization with owner
- Add member to organization
- Remove member from organization
- Prevent non-admin from managing members
- Prevent removing the last owner

### 2.3 Profile Service
- Extract text from PDF resume
- Extract text from DOCX resume
- Store tech profile for user
- Reject unsupported file types
- Handle empty resume gracefully

### 2.4 AI Provider Factory
- Return ClaudeProvider when configured for claude
- Return OpenAIProvider when configured for openai
- Throw on unknown provider
- Each provider implements all required interface methods

### 2.5 AI Estimation (mocked API calls)
- Parse estimation response into structured result
- Handle AI API errors gracefully
- Include user tech profile in prompt
- Include task details in prompt
- Include historical accuracy data in prompt for calibration
- Return confidence level with estimate
- Extract category suggestion from AI response

### 2.6 Task Service
- Create task with valid data (projected_duration, category, scheduled_date)
- Assign position correctly (append to end of column)
- Reorder tasks within column
- Move task between columns
- Prevent assigning to user outside organization

### 2.7 Time Tracking Service
- Start timer creates a time_entry with started_at
- Stop timer sets stopped_at and calculates duration
- Cannot start timer if one is already running for the same task
- executed_duration_minutes is sum of all time_entries
- Stopping timer on task in "Done" column keeps entry valid

### 2.8 Daily Planner Service
- Calculate available hours for a date (availability - protected blocks)
- Detect overbooking (total projected_duration > available hours)
- Return tasks ordered by position for a given date
- Handle recurring protected blocks (expand by day_of_week)
- Handle one-off protected blocks (match specific_date)

### 2.9 Insights Service
- Calculate average projected/executed ratio
- Filter accuracy stats by category
- Filter accuracy stats by date range
- Handle edge case: no completed tasks yet
- Correct overestimation/underestimation percentages

### 2.10 Telegram Handler
- Parse text message into task data
- Handle voice message (mock transcription)
- Reject messages from unlinked accounts
- Execute bot commands (/list, /done, /status)

---

## 3. Backend Integration Tests

### 3.1 Auth Endpoints
- `POST /api/auth/register` — success, duplicate email, missing fields
- `POST /api/auth/login` — success, wrong password, nonexistent user
- `POST /api/auth/refresh` — success, expired token, invalid token

### 3.2 Organization Endpoints
- `POST /api/organizations` — success, missing name
- `GET /api/organizations/:id` — success, not found, unauthorized
- `POST /api/organizations/:id/invite` — success, already member, unauthorized
- `DELETE /api/organizations/:id/members/:userId` — success, unauthorized

### 3.3 Profile Endpoints
- `POST /api/users/me/profile` — text only, with PDF, with DOCX
- `GET /api/users/me/profile` — exists, not yet created

### 3.4 Board & Task Endpoints
- `POST /api/boards` — success, creates default columns
- `GET /api/boards/:id` — returns columns and tasks in order
- `POST /api/boards/:boardId/tasks` — success, triggers AI estimation, sets projected_duration
- `PUT /api/tasks/:id` — update fields, unauthorized user
- `PATCH /api/tasks/:id/move` — move between columns, reorder
- `DELETE /api/tasks/:id` — success, not found

### 3.5 Time Tracking Endpoints
- `POST /api/tasks/:id/timer/start` — success, already running error
- `POST /api/tasks/:id/timer/stop` — success, no running timer error
- `GET /api/tasks/:id/time-entries` — returns entries sorted by started_at

### 3.6 Daily Planner Endpoints
- `GET /api/planner/:date` — returns tasks, protected blocks, availability, remaining hours
- `PUT /api/planner/settings` — success, invalid times
- `POST /api/planner/protected-blocks` — create recurring, create one-off
- `DELETE /api/planner/protected-blocks/:id` — success, not found

### 3.7 Insights Endpoints
- `GET /api/insights/accuracy` — returns stats with completed tasks
- `GET /api/insights/accuracy?category=work` — filtered results
- `GET /api/insights/accuracy` — empty result when no completed tasks

### 3.8 Telegram Webhook
- `POST /api/telegram/webhook` — text message creates task
- `POST /api/telegram/webhook` — voice message creates task
- `POST /api/telegram/webhook` — unlinked user receives error message

---

## 4. Frontend Unit Tests

### 4.1 Auth Components
- Login form validates required fields
- Login form calls API on submit
- Registration form validates email format and password strength
- Auth provider stores token and exposes user state
- Protected route redirects unauthenticated users

### 4.2 Board Components
- Board renders correct number of columns
- Task card displays title, priority, projected_duration, executed_duration, category badge
- Task creation form validates required fields (includes category and scheduled_date)
- Drag-and-drop updates task position (mock dnd-kit)
- Start/stop timer button toggles correctly
- Duration comparison badge shows over/under estimate
- Filter controls update displayed tasks (including by category)

### 4.3 Daily Planner Components
- Planner renders timeline for selected date
- Time blocks are color-coded by category
- Day summary bar shows correct hour breakdown
- Overbooking warning appears when day exceeds availability
- Protected time blocks render as locked/shaded regions
- Adding a task to a full day triggers warning

### 4.4 Insights Components
- Accuracy chart renders with correct data
- Category filter updates displayed stats
- Empty state shown when no completed tasks

### 4.5 Profile Components
- Profile form accepts text description
- Resume upload component accepts PDF/DOCX
- Tech profile display renders skills with proficiency levels
- Onboarding flow progresses through steps

### 4.6 Telegram Components
- Link page displays linking code
- Linked account shows Telegram username
- Unlink button calls API

---

## 5. Cypress E2E Tests

### 5.1 Authentication Flow
- User registers a new account
- User logs in with valid credentials
- User is redirected to login when session expires

### 5.2 Onboarding Flow
- New user completes profile setup after registration
- User uploads resume and sees generated tech profile

### 5.3 Board Interaction
- User creates a new task via modal (with category and scheduled date)
- Task appears in correct column with projected_duration
- User drags task from "To Do" to "In Progress"
- User reorders tasks within a column
- User starts/stops timer on a task
- executed_duration updates after stopping timer
- User edits task details
- User deletes a task

### 5.4 Daily Planner Flow
- User opens daily planner for today
- Day shows tasks and protected time blocks
- User sees day summary bar with hour breakdown
- User adds a task that causes overbooking — warning appears
- User sets up a recurring protected block (e.g., "Gym 6-7am")

### 5.5 Insights Flow
- User views estimation accuracy dashboard
- User filters by category
- Chart reflects historical projected vs executed data

### 5.6 Organization Management
- Owner invites a new member
- Admin removes a member
- Member cannot access admin settings

---

## 6. Test Infrastructure

### 6.1 API Test Setup
- Use `testcontainers` for PostgreSQL in integration tests
- Run Prisma migrations before test suite
- Seed database with test data per test file
- Clean up between test suites (truncate tables)
- Mock AI provider responses for deterministic tests

### 6.2 Web Test Setup
- Mock API calls with MSW (Mock Service Worker)
- Provide test wrappers with auth context and router
- Use Cypress intercept for E2E API mocking

### 6.3 Coverage Targets
- Backend unit: 80%+
- Backend integration: key flows covered
- Frontend unit: 70%+
- E2E: critical user journeys covered
