# Smart Todo — Product Specification

## 1. Vision

Smart Todo is a multi-tenant task management platform that helps people **plan their day realistically**. It uses AI to estimate how long each task will take based on the user's personal skill profile, tracks projected vs actual duration, and gives a clear picture of how the day is shaping up — so users can balance work, exercise, and family time without overcommitting.

Users can create tasks via web UI or Telegram (text/audio). The system leverages user profiles (including uploaded resumes) to personalize time estimates based on individual skill levels.

---

## 2. Business Context

### Problem
People constantly overcommit their days. They pile up tasks without a realistic sense of how long things will take, and end up sacrificing exercise, family time, or personal well-being. Existing tools (Trello, Jira, simple todo lists) don't help with this — they track *what* to do but not *how long it will realistically take you specifically*.

### Solution
An AI-powered task board that:
- Accepts task input from multiple channels (web, Telegram text, Telegram voice)
- Automatically estimates task duration (**projected_duration**) based on the user's technical profile
- Tracks **executed_duration** (actual time spent) so users learn from past estimates
- Provides a **daily planner view** showing time blocks and remaining available hours
- Helps users protect time for non-work activities (exercise, family, rest)
- Positions tasks in the appropriate board column/row automatically
- Supports multi-tenant organizations with role-based access

### Target Users
- Professionals who want to plan realistic days
- Software developers and technical workers
- Anyone who struggles to balance work with personal life

---

## 3. Core Features

### 3.1 Authentication & Multi-Tenancy
- JWT-based authentication (access + refresh tokens)
- User registration with email/password
- Users belong to exactly one organization
- Organization management (create, invite members, remove members)
- Roles: `owner`, `admin`, `member`

### 3.2 User Profile & Tech Profiling
- During registration (or onboarding), users provide:
  - A written description of their skills and experience
  - An optional resume upload (PDF/DOCX)
- The system parses the resume and generates a structured **tech profile**:
  - Programming languages (with proficiency level: beginner/intermediate/senior/expert)
  - Frameworks and libraries
  - Domain expertise (frontend, backend, devops, data, etc.)
  - Years of experience
- The tech profile is stored and used by the AI to personalize ETA estimates

### 3.3 Task Management (Kanban Board)
- Board columns: `Backlog`, `To Do`, `In Progress`, `Review`, `Done`
- Task properties:
  - Title
  - Description
  - **projected_duration_minutes** (AI-generated estimate of how long it will take)
  - **executed_duration_minutes** (actual time spent, tracked by user)
  - Priority (`low`, `medium`, `high`, `critical`)
  - Category (`work`, `exercise`, `family`, `personal`, `errand`, `learning`)
  - Assignee
  - Column/status
  - Position (row order within column)
  - Labels/tags
  - Scheduled date (which day this task is planned for)
  - Due date (optional hard deadline)
  - Started at / Completed at (timestamps for time tracking)
  - Created at / Updated at
- Drag-and-drop repositioning (cards are draggable between columns and reorderable within columns using @dnd-kit)
- Task CRUD operations
- Filtering and search
- **Time tracking**: start/stop timer on a task to track executed_duration

### 3.4 Daily Planner View
- Shows all tasks scheduled for a given day
- Visual timeline/time-block layout of the day
- Displays total **projected hours** vs **available hours** in the day
- Color-coded by category (work, exercise, family, etc.)
- Warns when the day is overbooked
- Shows a summary: "6h work | 1h exercise | 2h family | 2h free"
- Users set their daily availability (e.g., "I'm available from 7am to 10pm = 15h")
- Protected time blocks (e.g., recurring "Family dinner 6-8pm", "Gym 6-7am")

### 3.5 AI-Powered ETA Estimation
- When a task is created, the AI analyzes:
  - Task title and description
  - Assigned user's tech profile
  - **Historical data** (past tasks: projected vs executed durations) to improve accuracy over time
- Returns a **projected_duration** (e.g., "2 hours", "30 minutes", "3 days")
- AI also suggests:
  - Priority level
  - Category
  - Appropriate board column
  - Labels/tags
- Over time, the AI **calibrates** its estimates by comparing projected vs executed durations
- The AI provider is abstracted behind a **factory pattern** so the system can use Claude or OpenAI interchangeably

### 3.6 Estimation Accuracy & Insights
- Dashboard showing estimation accuracy over time
- Metrics: average overestimation/underestimation ratio
- Breakdown by category (e.g., "You underestimate exercise tasks by 20%")
- Trend chart: is the AI getting better at estimating for this user?

### 3.7 Web Push Notifications
- When a user starts a timer on a task, the system monitors elapsed time against the task's **projected_duration_minutes**
- At **80%** of projected time, the system sends a browser push notification:
  - Example: "Warning: 'Fix login bug' is at 80% of estimated time (48min / 60min projected)"
- At **100%** of projected time, the system sends a second notification:
  - Example: "Alert: 'Fix login bug' has exceeded the projected time (60min / 60min projected)"
- Uses the **Web Push API** (browser notifications via service workers)
- Backend sends push notifications using the **web-push** library (VAPID keys)
- Users must grant notification permission in the browser (prompted on first use after login)
- Notification preferences are stored per user (opt-in/opt-out)
- Notification types:
  - **Duration warning** (80% of projected time reached)
  - **Duration exceeded** (100% of projected time reached)

### 3.5 Telegram Integration
- Users link their Telegram account to Smart Todo
- Supported input methods:
  - **Text message** → parsed into task title + description
  - **Voice message** → transcribed (via AI) then parsed into task
- The bot confirms task creation and shows the estimated duration
- Basic bot commands: `/list`, `/done <id>`, `/status`, `/today` (daily summary with hours breakdown)

---

## 4. Technical Architecture

### 4.1 Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: Zustand or React Query for server state
- **Drag & Drop**: @dnd-kit/core
- **Testing**: Jest + React Testing Library (unit/integration), Cypress (E2E)

### 4.2 Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js or Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken + bcrypt)
- **File Upload**: Multer (resume uploads)
- **Telegram Bot**: node-telegram-bot-api or grammy
- **Push Notifications**: web-push (VAPID-based Web Push API)
- **Testing**: Jest (unit/integration)

### 4.3 AI Integration (Factory Pattern)
```
AIProvider (interface)
├── ClaudeProvider (implements AIProvider)
└── OpenAIProvider (implements AIProvider)

AIProviderFactory
└── create(provider: 'claude' | 'openai'): AIProvider
```

The `AIProvider` interface exposes:
- `estimateTaskDuration(task, userProfile, history): EstimationResult`
- `parseTaskFromText(text): ParsedTask`
- `transcribeAudio(audioBuffer): string`
- `generateTechProfile(resumeText): TechProfile`
- `suggestDayPlan(tasks, userProfile, availability): DayPlan`

### 4.4 Database Schema (High-Level)

**organizations**
- id, name, slug, created_at, updated_at

**users**
- id, email, password_hash, name, organization_id, role, created_at, updated_at

**tech_profiles**
- id, user_id, raw_text, resume_url, structured_profile (JSONB), created_at, updated_at

**boards**
- id, organization_id, name, created_at, updated_at

**columns**
- id, board_id, name, position, created_at, updated_at

**tasks**
- id, column_id, title, description, projected_duration_minutes, executed_duration_minutes, priority, category, assignee_id, position, labels (JSONB), scheduled_date, due_date, started_at, completed_at, created_at, updated_at

**time_entries**
- id, task_id, user_id, started_at, stopped_at, duration_minutes
- *(tracks individual start/stop sessions for a task)*

**task_history**
- id, task_id, field_changed, old_value, new_value, changed_by, created_at

**daily_settings**
- id, user_id, available_from (time), available_until (time), created_at, updated_at

**protected_time_blocks**
- id, user_id, title, category, day_of_week (nullable, for recurring), specific_date (nullable, for one-off), start_time, end_time, recurring (boolean), created_at

**push_subscriptions**
- id, user_id, endpoint, p256dh_key, auth_key, created_at

**notification_preferences**
- id, user_id, push_enabled (boolean), duration_warning_enabled (boolean), duration_exceeded_enabled (boolean), created_at, updated_at

**telegram_links**
- id, user_id, telegram_chat_id, telegram_username, linked_at

### 4.5 API Design (REST)

**Auth**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

**Organizations**
- `POST /api/organizations`
- `GET /api/organizations/:id`
- `POST /api/organizations/:id/invite`
- `DELETE /api/organizations/:id/members/:userId`

**Users / Profiles**
- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users/me/profile` (upload resume / set tech description)
- `GET /api/users/me/profile`

**Boards**
- `GET /api/boards`
- `POST /api/boards`
- `GET /api/boards/:id`

**Tasks**
- `GET /api/boards/:boardId/tasks`
- `POST /api/boards/:boardId/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/move` (change column/position)
- `DELETE /api/tasks/:id`

**Time Tracking**
- `POST /api/tasks/:id/timer/start`
- `POST /api/tasks/:id/timer/stop`
- `GET /api/tasks/:id/time-entries`

**Daily Planner**
- `GET /api/planner/:date` (get daily plan: tasks, time blocks, availability)
- `PUT /api/planner/settings` (set daily availability hours)
- `POST /api/planner/protected-blocks` (create protected time block)
- `PUT /api/planner/protected-blocks/:id`
- `DELETE /api/planner/protected-blocks/:id`

**Insights**
- `GET /api/insights/accuracy` (projected vs executed stats)
- `GET /api/insights/accuracy?category=work` (filtered by category)

**Notifications**
- `POST /api/notifications/subscribe` (register push subscription from browser)
- `DELETE /api/notifications/subscribe` (unregister push subscription)
- `GET /api/notifications/preferences` (get notification preferences)
- `PUT /api/notifications/preferences` (update notification preferences)

**Telegram**
- `POST /api/telegram/link` (generate linking code)
- `POST /api/telegram/webhook` (Telegram webhook endpoint)

---

## 5. Non-Functional Requirements

- **Security**: Passwords hashed with bcrypt, JWT with short-lived access tokens (15min) and refresh tokens (7 days), input sanitization, rate limiting
- **Performance**: Board loads in < 1s, AI estimation responds in < 5s
- **Scalability**: Stateless backend, connection pooling for PostgreSQL
- **Observability**: Structured logging (pino/winston), error tracking
- **Push Notifications**: Notifications delivered via Web Push API with VAPID authentication; service worker registered on the frontend to receive push events; users must explicitly grant permission
- **Responsive Design**: The application must be fully usable on mobile phones, tablets, and desktops. Key breakpoints:
  - **Desktop** (>768px): Full board view with columns side by side, planner with sidebar
  - **Tablet** (481-768px): Horizontal scroll on board columns, planner sidebar stacks below timeline
  - **Mobile** (<=480px): Columns stack vertically, single-column layout, touch-friendly tap targets (min 44px), swipe-friendly navigation
  - All features (board, planner, task creation, timer, notifications) must work on mobile
  - Touch interactions: tap to open tasks, tap timer button, native date pickers
  - Mobile board: columns stack vertically with collapsible headers
- **CI/CD**: GitHub Actions for lint, test, build
