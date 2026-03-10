# Smart Todo — Frontend Implementation Plan

> This document contains all frontend (Web) tasks extracted from the main implementation plan.
> Designed to be used by a dedicated agent working on `/apps/web`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.

---

## Phase 1: Frontend Scaffolding

### 1.1 Project Setup
- [ ] Initialize Next.js 14+ app in `/apps/web` with App Router
- [ ] Configure TypeScript (extends shared tsconfig)
- [ ] Configure ESLint + Prettier (extends shared config)
- [ ] Install and configure Tailwind CSS
- [ ] Set up path aliases (`@/components`, `@/lib`, `@/hooks`, `@/types`, `@/services`)
- [ ] Install core dependencies: @dnd-kit/core, @dnd-kit/sortable, zustand/react-query
- [ ] Set up API client (axios/fetch wrapper with base URL, auth headers, token refresh)
- [ ] Set up Jest + React Testing Library
- [ ] Set up Cypress

### 1.2 Shared Types
- [ ] Import/reference shared types from `/packages/shared` (User, Task, Board, Column, etc.)
- [ ] Define frontend-specific types (form states, UI states)

---

## Phase 2: Authentication Pages

### 2.1 Auth Infrastructure
- [ ] Auth context/provider:
  - Store access + refresh tokens (httpOnly cookies or secure localStorage)
  - Expose `user`, `login()`, `register()`, `logout()`, `isAuthenticated`
  - Auto-refresh token on 401 responses
  - Handle OAuth redirect return: read JWT from URL params or cookie after Google callback redirect
- [ ] Protected route wrapper (redirect to `/login` if unauthenticated)
- [ ] Public route wrapper (redirect to `/board` if already authenticated)

### 2.2 Auth Pages
- [ ] `GET /login` — Login page
  - Email + password form
  - Form validation (required fields, email format)
  - Error display (invalid credentials)
  - "Sign in with Google" button — redirects to `GET /api/auth/google`
  - Link to registration
- [ ] `GET /register` — Signup page
  - Form fields: name, email, password, confirm password, organization name
  - Password validation: minimum 8 characters, password and confirm password must match
  - Password strength indicator
  - Email format validation
  - All fields required
  - "Sign up with Google" button — redirects to `GET /api/auth/google`
  - On successful registration (either method) → redirect to onboarding flow
- [ ] Handle OAuth callback redirect:
  - After Google OAuth callback, frontend reads JWT from URL params or cookie
  - Store token in auth context and redirect to onboarding (new user) or board (existing user)
- [ ] Unit tests for auth components

---

## Phase 3: Profile & Onboarding Pages

### 3.1 Onboarding Flow
- [ ] `GET /onboarding` — Multi-step onboarding (shown after first registration)
  - Step 1: Welcome + explain the concept
  - Step 2: Write about your skills and experience (textarea)
  - Step 3: Upload resume (PDF/DOCX) — optional
  - Step 4: Review generated tech profile (skills, proficiency levels)
  - Step 5: Set daily availability (available_from, available_until)
  - Step 6: Create first protected time blocks (e.g., "Gym", "Family dinner")
- [ ] Progress indicator (step X of Y)
- [ ] Skip option for optional steps

### 3.2 Profile Page
- [ ] `GET /profile` — View/edit profile
  - Skills description editor
  - Resume upload/replace component
  - Display structured tech profile (skills with proficiency bars)
  - Daily availability settings
  - Protected time blocks management (add/edit/remove)
- [ ] Unit tests for profile components

---

## Phase 4: Kanban Board & Time Tracking UI

### 4.1 Board Layout
- [ ] `GET /board` — Main board page
  - Fetch board with columns and tasks from API
  - Render columns side by side (horizontal scroll on overflow)
  - Column headers with task count and total projected hours

### 4.2 Task Card Component
- [ ] Display: title, category badge (color-coded), priority indicator
- [ ] Display: projected_duration and executed_duration side by side
- [ ] Duration comparison badge:
  - Green: executed ≤ projected
  - Yellow: executed is 1-1.5x projected
  - Red: executed > 1.5x projected
  - Gray: not started yet
- [ ] Start/stop timer button (play/stop icon)
  - Show running time when active
  - Multiple tasks can have running timers simultaneously (parallel task execution)
  - Update executed_duration on stop
- [ ] Scheduled date indicator
- [ ] Click to open task detail panel

### 4.3 Drag & Drop (@dnd-kit)
- [ ] Install and configure @dnd-kit/core and @dnd-kit/sortable
- [ ] Set up DndContext with sensors (pointer + keyboard) at the board level
- [ ] Implement SortableContext per column for within-column reordering
- [ ] Drag tasks between columns (cards are draggable between columns; updates column + position via `PATCH /api/tasks/:id/move`)
- [ ] Drag to reorder within column (cards are reorderable within a column; updates position via API)
- [ ] Visual drop indicators (highlight target column and insertion point)
- [ ] Drag overlay for the card being moved

### 4.4 Task Creation
- [ ] "Add task" button per column (or global "+ New Task")
- [ ] Task creation modal/dialog:
  - Title (required)
  - Description (optional, textarea)
  - Category selector (work, exercise, family, personal, errand, learning)
  - Scheduled date picker (defaults to today)
  - Priority selector (low, medium, high, critical)
  - Labels/tags input
  - AI estimation loading indicator (auto-triggers on save)
  - AI suggestion chips (suggested priority, category) — accept/dismiss
- [ ] Quick-add: just type a title and hit enter (AI fills the rest)

### 4.5 Task Detail Panel
- [ ] Click on a task card to open detail modal/slide-over
- [ ] Editable fields: title, description, notes, priority, category, scheduled_date, due_date, column, labels
- [ ] **Notes field**: free-form textarea for links, reminders, or any useful information
- [ ] Read-only: projected_duration (with "Re-estimate" button), executed_duration, ratio badge
- [ ] Duration comparison display (projected vs executed vs ratio)
- [ ] Time entries list (start/stop history)
- [ ] Task history/activity log
- [ ] Save changes with visual confirmation
- [ ] Delete task (with confirmation)

### 4.5b Completion Celebration
- [ ] **Celebration modal** — full-screen overlay with animated modal when a task is moved to "Done"
  - Randomized congratulatory title and message (pool of 5+ variations)
  - Large emoji icons at the top
  - Completed task name highlighted
  - Stats row: estimated time, actual time (color-coded by accuracy), tasks done today count
  - "Keep Going!" dismiss button
  - Entrance animations: pop-in modal, bouncing emojis, staggered fade-up for text/stats
  - Animated gradient border
- [ ] **Fireworks canvas** behind the modal — multi-burst particle animation with trails and gravity
- [ ] Triggered from: drag-and-drop to Done column, column change to Done in detail modal
- [ ] Dismiss by clicking "Keep Going!" button or clicking outside the modal
- [ ] Responsive layout for mobile

### 4.6 Board Filtering & Search
- [ ] Filter bar: by category, priority, assignee, label
- [ ] Search by title/description
- [ ] "Today" quick filter (show only tasks scheduled for today)

### 4.7 Web Push Notifications
- [ ] Register service worker (`/public/sw.js`) on app load for push event handling
- [ ] Service worker listens for `push` events and displays browser notifications via `self.registration.showNotification()`
- [ ] Notification permission prompt: on first use after login, show a UI prompt explaining why notifications are useful, then call `Notification.requestPermission()`
- [ ] On permission grant: call `serviceWorkerRegistration.pushManager.subscribe()` with VAPID public key, then send the PushSubscription to `POST /api/notifications/subscribe`
- [ ] On permission deny: show a dismissible banner explaining how to enable notifications later
- [ ] Notification preferences page (under user settings):
  - Toggle: enable/disable push notifications
  - Toggle: duration warning (60%) notifications
  - Toggle: duration exceeded (100%) notifications
  - Calls `PUT /api/notifications/preferences`
- [ ] Handle notification click in service worker (focus/open the relevant task)
- [ ] Unsubscribe flow: call `pushSubscription.unsubscribe()` and `DELETE /api/notifications/subscribe`

### 4.8 Tests
- [ ] Unit tests for: TaskCard, TaskCreationModal, Board, FilterBar
- [ ] Unit tests for: notification permission prompt component, notification preferences UI
- [ ] Mock `Notification.requestPermission()` and `serviceWorkerRegistration.pushManager.subscribe()` in tests
- [ ] Cypress E2E: create task, drag between columns, start/stop timer

---

## Phase 5: Daily Planner & Insights UI

### 5.1 Daily Planner Page
- [ ] `GET /planner` — Daily planner view
  - Date picker/navigator (prev day, today, next day)
  - Fetch planner data for selected date from API
- [ ] Timeline visualization:
  - Vertical timeline from available_from to available_until
  - Tasks rendered as time blocks (positioned by order, sized by projected_duration)
  - Protected time blocks rendered as locked/shaded regions
  - Color-coded by category
- [ ] Day summary bar (always visible):
  - "6h work | 1h exercise | 2h family | 4h free"
  - Shows total projected vs total available
- [ ] Overbooking warning banner:
  - Appears when total projected hours > available hours
  - Shows how many hours over capacity
- [ ] Quick actions:
  - Drag tasks to reorder within planner
  - Click task to open detail panel
  - "Add to today" quick action from backlog

### 5.2 Protected Time Block Management
- [ ] Add new block: title, category, start_time, end_time, recurring (day picker) vs one-off (date picker)
- [ ] Edit/delete existing blocks
- [ ] Visual preview on timeline

### 5.3 Insights Dashboard
- [ ] `GET /insights` — Estimation accuracy page
- [ ] Overall accuracy metric (average projected/executed ratio)
- [ ] Trend chart: accuracy over time (line chart, weekly buckets)
- [ ] Category breakdown (bar chart: projected vs executed per category)
- [ ] Stats cards: "You overestimate exercise by 20%", "Work tasks are 90% accurate"
- [ ] Date range filter
- [ ] Empty state when no completed tasks

### 5.4 Tests
- [ ] Unit tests for: DailyPlanner, TimeBlock, DaySummaryBar, InsightsChart
- [ ] Cypress E2E: open planner, see overbooking warning, view insights

---

## Phase 6: Telegram Settings Page

### 6.1 Telegram Linking UI
- [ ] `GET /settings/telegram` — Telegram integration page
  - Generate linking code (calls API)
  - Display code with instructions ("Send `/link <code>` to @SmartTodoBot on Telegram")
  - Show linked account (Telegram username) when connected
  - Unlink button (with confirmation)
- [ ] Unit tests for Telegram settings components

---

## Phase 7: Frontend Polish

### 7.1 UX Improvements
- [ ] Loading skeletons for board, planner, insights
- [ ] Toast notification system (success/error/info)
- [ ] Error boundaries with fallback UI
- [ ] Empty states for: no tasks, no boards, no insights data
- [ ] Responsive design (mobile-first, must be fully usable on phones):
  - **Mobile (<=480px)**: columns stack vertically, single-column layout, collapsible column headers, touch-friendly tap targets (min 44px), native date pickers, full-width modals, planner sidebar stacks below timeline
  - **Tablet (481-768px)**: horizontal scroll with 2-3 visible columns, planner sidebar stacks below timeline
  - **Desktop (>768px)**: full board view with all columns, planner with sidebar
  - All features must work on mobile: board, planner, task creation, timer, notifications
  - Touch interactions: tap to open tasks, tap timer button, long-press for context menu
  - Tailwind responsive utilities (`sm:`, `md:`, `lg:`) for breakpoint management

### 7.2 Accessibility
- [ ] Keyboard navigation for board (arrow keys to move between tasks)
- [ ] ARIA labels on interactive elements
- [ ] Focus management for modals

### 7.3 Build & Deploy
- [ ] Dockerfile for Web
- [ ] Environment variable configuration (API URL, etc.)
- [ ] Production build optimization
