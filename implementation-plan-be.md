# Smart Todo — Backend Implementation Plan

> This document contains the core backend (API) tasks: auth, organizations, profiles, boards, tasks, planner, insights.
> Designed to be used by a dedicated agent working on `/apps/api`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.
>
> **AI and Telegram are in separate docs for parallel agent execution:**
> - [implementation-plan-ai.md](./implementation-plan-ai.md) — AI provider, estimation, prompts
> - [implementation-plan-telegram.md](./implementation-plan-telegram.md) — Telegram bot, webhook, handlers

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
  - `users` (id, email, password_hash, name, google_id nullable unique, organization_id, role, created_at, updated_at)
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
- [ ] `POST /api/auth/register` — create user with name, email, password, confirm password, organization name; hash password, create organization, issue JWT
- [ ] `POST /api/auth/login` — validate credentials, return access + refresh JWT tokens
- [ ] `POST /api/auth/refresh` — validate refresh token, rotate and return new pair
- [ ] Auth middleware (verify JWT, attach user to request context)
- [ ] Password hashing with bcrypt (salt rounds: 12)
- [ ] Input validation with zod schemas (password min 8 chars, email format, required fields)

### 2.2 Google OAuth 2.0
- [ ] Install and configure Passport.js with `passport-google-oauth20` strategy
- [ ] Add Google OAuth config: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` to `.env`
- [ ] `GET /api/auth/google` — redirect user to Google OAuth 2.0 consent screen (scope: profile, email)
- [ ] `GET /api/auth/google/callback` — handle OAuth callback:
  - Exchange authorization code for access token
  - Extract user profile from Google (name, email, google_id)
  - If user with this `google_id` exists: log them in, issue JWT
  - If no user with this `google_id` but a user with the same email exists: link accounts (set `google_id` on existing user), issue JWT
  - If no user exists: create new user with name and email from Google profile, set `google_id`, create a default organization, issue JWT
  - Redirect to frontend with JWT (via URL parameter or secure cookie)
- [ ] Add `google_id` (nullable, unique) field to users table
- [ ] Unit tests for Google OAuth service (new user, existing user, account linking)
- [ ] Integration tests for Google OAuth endpoints

### 2.3 Auth Tests
- [ ] Unit tests for auth service
- [ ] Integration tests for auth endpoints

### 2.4 Organization Module
- [ ] `POST /api/organizations` — create organization
- [ ] `GET /api/organizations/:id` — get organization details (members list)
- [ ] `POST /api/organizations/:id/invite` — invite user by email
- [ ] `DELETE /api/organizations/:id/members/:userId` — remove member
- [ ] Role-based authorization middleware (owner, admin, member)
- [ ] Unit tests for organization service
- [ ] Integration tests for organization endpoints

---

## Phase 3: User Profiles

### 3.1 Profile Module
- [ ] `POST /api/users/me/profile` — accept text description + resume file (PDF/DOCX)
- [ ] `GET /api/users/me/profile` — return structured tech profile
- [ ] `PUT /api/users/me` — update user details
- [ ] Resume file upload handling (Multer → local/cloud storage)
- [ ] Resume text extraction (pdf-parse for PDF, mammoth for DOCX)
- [ ] Call AI provider to generate structured tech profile (see [implementation-plan-ai.md](./implementation-plan-ai.md))
- [ ] Unit tests for profile service
- [ ] Integration tests for profile endpoints

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

### 4.3 Web Push Notification Module
- [ ] Generate VAPID key pair (`web-push.generateVAPIDKeys()`) and store in `.env`
- [ ] Install and configure `web-push` library
- [ ] Add Prisma schema:
  - `push_subscriptions` (id, user_id, endpoint, p256dh_key, auth_key, created_at)
  - `notification_preferences` (id, user_id, push_enabled, duration_warning_enabled, duration_exceeded_enabled, created_at, updated_at)
- [ ] Run migration for new tables
- [ ] `POST /api/notifications/subscribe` — save browser PushSubscription (endpoint, keys) for authenticated user
- [ ] `DELETE /api/notifications/subscribe` — remove push subscription for authenticated user
- [ ] `GET /api/notifications/preferences` — return user's notification preferences
- [ ] `PUT /api/notifications/preferences` — update notification preferences (opt-in/opt-out per type)
- [ ] Notification service:
  - When a timer is started (`POST /api/tasks/:id/timer/start`), schedule notification checks
  - At 80% of `projected_duration_minutes`, send push notification: "Warning: '<task title>' is at 80% of estimated time (<elapsed>min / <projected>min projected)"
  - At 100% of `projected_duration_minutes`, send push notification: "Alert: '<task title>' has exceeded the projected time (<projected>min / <projected>min projected)"
  - Skip notifications if user has opted out or no push subscription exists
  - Handle expired/invalid subscriptions gracefully (remove on 410 response)
- [ ] Input validation with zod schemas for notification endpoints
- [ ] Unit tests for notification service (timer threshold logic, push payload construction)
- [ ] Integration tests for notification endpoints (subscribe, unsubscribe, preferences CRUD)

---

## Phase 5: Daily Planner & Insights

> **Note**: AI estimation service is in [implementation-plan-ai.md](./implementation-plan-ai.md).
> This phase covers the planner and insights modules that consume estimation results.

### 5.1 Daily Planner Module
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

> Fully covered in [implementation-plan-telegram.md](./implementation-plan-telegram.md).
> A separate agent handles bot setup, webhook, account linking, and message handlers.

---

## Phase 7: Backend Hardening

- [ ] Global error handler with structured JSON error responses
- [ ] Rate limiting (express-rate-limit) on auth and AI endpoints
- [ ] Input sanitization (prevent XSS in task descriptions)
- [ ] Request validation middleware (zod for all endpoints)
- [ ] Dockerfile for API
- [ ] Health check with DB connectivity check
