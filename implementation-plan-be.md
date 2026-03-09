# Smart Todo — Backend Implementation Plan

> This document contains all backend (API) tasks extracted from the main implementation plan.
> Designed to be used by a dedicated agent working on `/apps/api`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.

---

## Phase 1: Backend Scaffolding

### 1.1 Project Setup
- [ ] Initialize `/apps/api` with TypeScript
- [ ] Configure tsconfig for API
- [ ] Configure ESLint + Prettier (extends shared config)
- [ ] Set up `.env.example` with DB connection, JWT secret, AI API keys
- [ ] Create Docker Compose for local PostgreSQL

### 1.2 Database Setup
- [ ] Install and configure Prisma
- [ ] Create initial schema:
  - `organizations` (id, name, slug, created_at, updated_at)
  - `users` (id, email, password_hash, name, organization_id, role, created_at, updated_at)
  - `tech_profiles` (id, user_id, raw_text, resume_url, structured_profile JSONB, created_at, updated_at)
  - `boards` (id, organization_id, name, created_at, updated_at)
  - `columns` (id, board_id, name, position, created_at, updated_at)
  - `tasks` (id, column_id, title, description, projected_duration_minutes, executed_duration_minutes, priority, category, assignee_id, position, labels JSONB, scheduled_date, due_date, started_at, completed_at, created_at, updated_at)
  - `time_entries` (id, task_id, user_id, started_at, stopped_at, duration_minutes)
  - `task_history` (id, task_id, field_changed, old_value, new_value, changed_by, created_at)
  - `daily_settings` (id, user_id, available_from, available_until, created_at, updated_at)
  - `protected_time_blocks` (id, user_id, title, category, day_of_week, specific_date, start_time, end_time, recurring, created_at)
  - `telegram_links` (id, user_id, telegram_chat_id, telegram_username, linked_at)
- [ ] Write seed script (default board columns, test organization, test user)
- [ ] Run initial migration

### 1.3 Server Bootstrap
- [ ] Express/Fastify app setup with middleware chain
- [ ] Error handling middleware
- [ ] Request logging (pino)
- [ ] CORS configuration
- [ ] Health check endpoint `GET /api/health`

---

## Phase 2: Authentication & Multi-Tenancy

### 2.1 Auth Module
- [ ] `POST /api/auth/register` — create user + organization (or join existing)
- [ ] `POST /api/auth/login` — validate credentials, return access + refresh JWT tokens
- [ ] `POST /api/auth/refresh` — validate refresh token, rotate and return new pair
- [ ] Auth middleware (verify JWT, attach user to request context)
- [ ] Password hashing with bcrypt (salt rounds: 12)
- [ ] Input validation with zod schemas
- [ ] Unit tests for auth service
- [ ] Integration tests for auth endpoints

### 2.2 Organization Module
- [ ] `POST /api/organizations` — create organization
- [ ] `GET /api/organizations/:id` — get organization details (members list)
- [ ] `POST /api/organizations/:id/invite` — invite user by email
- [ ] `DELETE /api/organizations/:id/members/:userId` — remove member
- [ ] Role-based authorization middleware (owner, admin, member)
- [ ] Unit tests for organization service
- [ ] Integration tests for organization endpoints

---

## Phase 3: User Profiles & AI Provider

### 3.1 Profile Module
- [ ] `POST /api/users/me/profile` — accept text description + resume file (PDF/DOCX)
- [ ] `GET /api/users/me/profile` — return structured tech profile
- [ ] `PUT /api/users/me` — update user details
- [ ] Resume file upload handling (Multer → local/cloud storage)
- [ ] Resume text extraction (pdf-parse for PDF, mammoth for DOCX)
- [ ] Unit tests for profile service
- [ ] Integration tests for profile endpoints

### 3.2 AI Provider (Factory Pattern)
- [ ] Define `AIProvider` interface:
  ```
  estimateTaskDuration(task, userProfile, history): EstimationResult
  parseTaskFromText(text): ParsedTask
  transcribeAudio(audioBuffer): string
  generateTechProfile(resumeText): TechProfile
  suggestDayPlan(tasks, userProfile, availability): DayPlan
  ```
- [ ] Implement `ClaudeProvider`
- [ ] Implement `OpenAIProvider`
- [ ] Implement `AIProviderFactory` (reads from env config)
- [ ] `generateTechProfile(resumeText)` — parse resume into structured profile
- [ ] Unit tests for each provider (mocked API calls)
- [ ] Integration test for factory

---

## Phase 4: Tasks, Boards & Time Tracking

### 4.1 Board & Task Module
- [ ] `GET /api/boards` — list boards for organization
- [ ] `POST /api/boards` — create board (auto-create default columns: Backlog, To Do, In Progress, Review, Done)
- [ ] `GET /api/boards/:id` — get board with columns and tasks (ordered by position)
- [ ] `POST /api/boards/:boardId/tasks` — create task (with projected_duration, category, scheduled_date)
- [ ] `PUT /api/tasks/:id` — update task fields
- [ ] `PATCH /api/tasks/:id/move` — move task (update column + reorder positions)
- [ ] `DELETE /api/tasks/:id`
- [ ] Position management logic (reorder within column, handle gaps)
- [ ] Unit tests for board/task services
- [ ] Integration tests for board/task endpoints

### 4.2 Time Tracking Module
- [ ] `POST /api/tasks/:id/timer/start` — create time_entry with started_at (reject if already running)
- [ ] `POST /api/tasks/:id/timer/stop` — set stopped_at, calculate duration_minutes, update task.executed_duration_minutes
- [ ] `GET /api/tasks/:id/time-entries` — list time sessions for a task
- [ ] Auto-calculate `executed_duration_minutes` as SUM of all completed time_entries
- [ ] Unit tests for time tracking service
- [ ] Integration tests for timer endpoints

---

## Phase 5: AI Estimation, Daily Planner & Insights

### 5.1 Estimation Service
- [ ] `estimateTaskDuration(task, userProfile, history)` implementation
- [ ] Prompt engineering: craft prompts with task details + user tech profile + historical projected vs executed data
- [ ] Parse AI response into `EstimationResult` (projected_duration_minutes, confidence, reasoning)
- [ ] Auto-trigger estimation on task creation (sets projected_duration_minutes)
- [ ] `POST /api/tasks/:id/re-estimate` — manual re-estimation endpoint
- [ ] `parseTaskFromText(text)` — extract title, description, priority, category from free text
- [ ] Calibration logic: query past tasks to build accuracy context for AI
- [ ] Unit tests (mocked AI responses)
- [ ] Integration tests

### 5.2 Daily Planner Module
- [ ] `GET /api/planner/:date` — return: scheduled tasks, protected blocks, availability, total projected hours, remaining hours
- [ ] `PUT /api/planner/settings` — set daily availability (available_from, available_until)
- [ ] `POST /api/planner/protected-blocks` — create recurring/one-off protected time block
- [ ] `PUT /api/planner/protected-blocks/:id` — update block
- [ ] `DELETE /api/planner/protected-blocks/:id` — remove block
- [ ] Calculate remaining available hours: (available_until - available_from) - protected_blocks - scheduled_tasks
- [ ] Overbooking detection: return `is_overbooked: true` when total projected > available
- [ ] Unit tests for planner service
- [ ] Integration tests for planner endpoints

### 5.3 Insights Module
- [ ] `GET /api/insights/accuracy` — projected vs executed duration statistics
- [ ] Query params: `?category=work&from=2026-01-01&to=2026-03-01`
- [ ] Calculate: average ratio, overestimate %, underestimate %, total tasks analyzed
- [ ] Return per-category breakdown
- [ ] Unit tests for insights service
- [ ] Integration tests

---

## Phase 6: Telegram Bot

### 6.1 Bot Setup & Handlers
- [ ] Set up Telegram bot (BotFather registration)
- [ ] Webhook endpoint `POST /api/telegram/webhook`
- [ ] `POST /api/telegram/link` — generate one-time linking code
- [ ] Account linking flow: user sends `/link <code>` to bot → link telegram_chat_id to user
- [ ] Handle text messages → `parseTaskFromText` → create task → reply with projected_duration
- [ ] Handle voice messages → `transcribeAudio` → `parseTaskFromText` → create task
- [ ] Bot commands: `/list`, `/done <id>`, `/status`, `/today` (daily summary)
- [ ] Unit tests for message handlers
- [ ] Integration tests for webhook flow

---

## Phase 7: Backend Hardening

- [ ] Global error handler with structured JSON error responses
- [ ] Rate limiting (express-rate-limit) on auth and AI endpoints
- [ ] Input sanitization (prevent XSS in task descriptions)
- [ ] Request validation middleware (zod for all endpoints)
- [ ] Dockerfile for API
- [ ] Health check with DB connectivity check
