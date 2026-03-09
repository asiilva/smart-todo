# Smart Todo — Implementation Plan

> **Parallel Agent Strategy**: This plan is split into dedicated BE and FE documents for parallel execution.
> - [implementation-plan-be.md](./implementation-plan-be.md) — Backend agent works on `/apps/api`
> - [implementation-plan-fe.md](./implementation-plan-fe.md) — Frontend agent works on `/apps/web`
>
> **Phase 1** (scaffolding) runs sequentially to set up the monorepo.
> **Phases 2-6**: BE and FE tasks within each phase can run **in parallel** once the shared types in `/packages/shared` are defined.
> **Phase 7** (polish) runs in parallel by nature.

---

## Phase 1: Project Scaffolding & Infrastructure
> Foundation — get the monorepo, database, and CI running

### 1.1 Repository Setup
- [ ] Initialize monorepo structure (`/apps/web`, `/apps/api`, `/packages/shared`)
- [ ] Configure TypeScript (base tsconfig + per-app configs)
- [ ] Configure ESLint + Prettier (shared config)
- [ ] Set up `.env.example` files
- [ ] Create Docker Compose for local PostgreSQL
- [ ] Initialize git with conventional commits

### 1.2 Database Setup
- [ ] Install and configure Prisma in `/apps/api`
- [ ] Create initial schema (organizations, users, tech_profiles, boards, columns, tasks, task_history, telegram_links)
- [ ] Write seed script (default board columns, test organization)
- [ ] Run initial migration

### 1.3 CI Pipeline
- [ ] GitHub Actions: lint → test → build
- [ ] Separate jobs for `api` and `web`

---

## Phase 2: Authentication & Multi-Tenancy
> Users can register, log in, and belong to organizations

### 2.1 Auth Module (API)
- [ ] `POST /api/auth/register` — create user + organization (or join existing)
- [ ] `POST /api/auth/login` — return access + refresh JWT tokens
- [ ] `POST /api/auth/refresh` — rotate refresh token
- [ ] Auth middleware (verify JWT, attach user to request)
- [ ] Password hashing with bcrypt
- [ ] Input validation (zod schemas)
- [ ] Unit tests for auth service
- [ ] Integration tests for auth endpoints

### 2.2 Organization Module (API)
- [ ] `POST /api/organizations` — create organization
- [ ] `GET /api/organizations/:id` — get organization details
- [ ] `POST /api/organizations/:id/invite` — invite user by email
- [ ] `DELETE /api/organizations/:id/members/:userId` — remove member
- [ ] Role-based authorization middleware (owner, admin, member)
- [ ] Unit tests for organization service
- [ ] Integration tests for organization endpoints

### 2.3 Auth Pages (Web)
- [ ] Login page
- [ ] Registration page
- [ ] Auth context/provider (store JWT, handle refresh)
- [ ] Protected route wrapper
- [ ] Unit tests for auth components

---

## Phase 3: User Profiles & Tech Profiling
> Users describe their skills and upload resumes for AI analysis

### 3.1 Profile Module (API)
- [ ] `POST /api/users/me/profile` — accept text description + resume file (PDF/DOCX)
- [ ] `GET /api/users/me/profile` — return tech profile
- [ ] Resume file upload handling (Multer → cloud storage or local)
- [ ] Resume text extraction (pdf-parse for PDF, mammoth for DOCX)
- [ ] Unit tests for profile service
- [ ] Integration tests for profile endpoints

### 3.2 AI Tech Profile Generation
- [ ] Define `AIProvider` interface
- [ ] Implement `ClaudeProvider`
- [ ] Implement `OpenAIProvider`
- [ ] Implement `AIProviderFactory`
- [ ] `generateTechProfile(resumeText)` — parse resume into structured profile
- [ ] Unit tests for each provider (mocked API calls)
- [ ] Integration test for factory

### 3.3 Profile Pages (Web)
- [ ] Onboarding flow (after first registration)
- [ ] Profile page with skills description editor
- [ ] Resume upload component
- [ ] Display structured tech profile (skills, proficiency levels)
- [ ] Unit tests for profile components

---

## Phase 4: Task Management & Kanban Board
> Core product — create, view, and move tasks on a board

### 4.1 Board & Task Module (API)
- [ ] `GET /api/boards` — list boards for organization
- [ ] `POST /api/boards` — create board (with default columns)
- [ ] `GET /api/boards/:id` — get board with columns and tasks
- [ ] `POST /api/boards/:boardId/tasks` — create task (with projected_duration, category, scheduled_date)
- [ ] `PUT /api/tasks/:id` — update task
- [ ] `PATCH /api/tasks/:id/move` — move task (update column + position)
- [ ] `DELETE /api/tasks/:id`
- [ ] Position management (reorder within column)
- [ ] Unit tests for board/task services
- [ ] Integration tests for board/task endpoints

### 4.2 Time Tracking Module (API)
- [ ] `POST /api/tasks/:id/timer/start` — start timer (create time_entry)
- [ ] `POST /api/tasks/:id/timer/stop` — stop timer (complete time_entry, update executed_duration)
- [ ] `GET /api/tasks/:id/time-entries` — list time sessions for a task
- [ ] Auto-calculate `executed_duration_minutes` from time entries
- [ ] Unit tests for time tracking service
- [ ] Integration tests for timer endpoints

### 4.3 Kanban Board UI (Web)
- [ ] Board page layout (columns side by side)
- [ ] Task card component (show projected_duration, executed_duration, category badge)
- [ ] Drag-and-drop between columns (@dnd-kit)
- [ ] Drag-and-drop reorder within column
- [ ] Task creation modal/dialog (with category selector and scheduled_date)
- [ ] Task detail view/edit panel
- [ ] Start/stop timer button on task cards
- [ ] Duration comparison badge (projected vs executed)
- [ ] Filtering (by assignee, priority, label, category)
- [ ] Unit tests for board components
- [ ] Cypress E2E: create task, drag between columns, start/stop timer

---

## Phase 5: AI-Powered ETA Estimation & Daily Planner
> AI estimates task duration; daily planner helps balance the day

### 5.1 Estimation Service (API)
- [ ] `estimateTaskDuration(task, userProfile, history)` on AIProvider
- [ ] Prompt engineering: include task details + user tech profile + historical accuracy data
- [ ] Parse AI response into structured `EstimationResult` (duration, confidence, reasoning)
- [ ] Auto-trigger estimation on task creation (sets `projected_duration_minutes`)
- [ ] Allow manual re-estimation
- [ ] `parseTaskFromText(text)` — extract title, description, priority, category from free text
- [ ] Calibration: feed past projected vs executed data to improve estimates
- [ ] Unit tests (mocked AI responses)
- [ ] Integration tests

### 5.2 Daily Planner Module (API)
- [ ] `GET /api/planner/:date` — return tasks for date + protected blocks + availability
- [ ] `PUT /api/planner/settings` — set daily available hours (available_from, available_until)
- [ ] `POST /api/planner/protected-blocks` — create recurring/one-off protected time blocks
- [ ] `PUT /api/planner/protected-blocks/:id` — update block
- [ ] `DELETE /api/planner/protected-blocks/:id` — remove block
- [ ] Calculate remaining available hours for a day
- [ ] Overbooking detection (total projected > available hours)
- [ ] Unit tests for planner service
- [ ] Integration tests for planner endpoints

### 5.3 Insights Module (API)
- [ ] `GET /api/insights/accuracy` — projected vs executed duration statistics
- [ ] Filter by category, date range
- [ ] Calculate: average ratio, overestimate %, underestimate %
- [ ] Unit tests for insights service
- [ ] Integration tests

### 5.4 Estimation & Planner UI (Web)
- [ ] Show projected_duration and executed_duration on task cards
- [ ] Estimation loading state
- [ ] "Re-estimate" button on task detail
- [ ] AI suggestion chips (priority, category, labels) on task creation
- [ ] **Daily planner page**: timeline view of the day
- [ ] Time block visualization (color-coded by category)
- [ ] Day summary bar: "6h work | 1h exercise | 2h family | 4h free"
- [ ] Overbooking warning banner
- [ ] Protected time block management UI
- [ ] **Insights dashboard**: accuracy charts, trends by category
- [ ] Unit tests for planner and estimation UI components
- [ ] Cypress E2E: plan a day, see overbooking warning

---

## Phase 6: Telegram Integration
> Users create tasks by sending messages to a Telegram bot

### 6.1 Telegram Bot (API)
- [ ] Set up Telegram bot (BotFather registration)
- [ ] Webhook endpoint `POST /api/telegram/webhook`
- [ ] Account linking flow (`/link <code>` command)
- [ ] Handle text messages → `parseTaskFromText` → create task
- [ ] Handle voice messages → `transcribeAudio` → `parseTaskFromText` → create task
- [ ] Bot commands: `/list`, `/done <id>`, `/status`
- [ ] Confirmation message with estimated duration
- [ ] Unit tests for message handlers
- [ ] Integration tests for webhook flow

### 6.2 Telegram Settings (Web)
- [ ] Telegram linking page (show code, instructions)
- [ ] Display linked Telegram account
- [ ] Unlink button
- [ ] Unit tests

---

## Phase 7: Polish & Production Readiness
> Error handling, performance, observability

### 7.1 Backend Hardening
- [ ] Global error handler with structured error responses
- [ ] Rate limiting (express-rate-limit)
- [ ] Request logging (pino)
- [ ] Input sanitization
- [ ] CORS configuration
- [ ] Health check endpoint

### 7.2 Frontend Polish
- [ ] Loading skeletons
- [ ] Toast notifications
- [ ] Responsive design (mobile-friendly board)
- [ ] Dark mode (optional)
- [ ] Error boundaries

### 7.3 Deployment
- [ ] Dockerfiles for API and Web
- [ ] Docker Compose for full stack
- [ ] Environment configuration docs
- [ ] Database migration strategy for production

---

## Dependency Graph

```
Phase 1 (Scaffolding)
  └── Phase 2 (Auth & Multi-Tenancy)
        ├── Phase 3 (Profiles & Tech Profiling)
        │     └── Phase 5 (AI ETA Estimation)
        │           └── Phase 6 (Telegram Integration)
        └── Phase 4 (Kanban Board)
              └── Phase 5 (AI ETA Estimation)
Phase 7 (Polish) — can run in parallel from Phase 4 onward
```
