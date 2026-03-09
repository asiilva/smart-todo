# Smart Todo — Frontend Test Plan

> Frontend-specific tests extracted from the main test plan.
> Designed to be used by a dedicated agent working on `/apps/web`.
> Reference: [test-plan.md](./test-plan.md) for full context.

---

## 1. Test Infrastructure

### Setup
- Mock API calls with **MSW** (Mock Service Worker)
- Provide test wrappers with auth context and router
- Use Cypress intercept for E2E API mocking

### Tools
- **Jest** + **React Testing Library** — unit/component tests
- **Cypress** — E2E browser tests
- **MSW** — API mocking

### Coverage Target
- Unit: 70%+
- E2E: all critical user journeys covered

---

## 2. Unit / Component Tests

### 2.1 Auth Components
- Login form renders email + password fields
- Login form validates required fields (shows errors)
- Login form calls API on submit with correct payload
- Registration form validates email format
- Registration form validates password strength (min length, etc.)
- Auth provider stores token and exposes `user` state
- Auth provider calls refresh on 401 response
- Protected route redirects unauthenticated users to `/login`
- Public route redirects authenticated users to `/board`

### 2.2 Board Components
- Board renders correct number of columns with headers
- Column header shows task count and total projected hours
- Task card displays title, priority indicator, category badge (color-coded)
- Task card displays projected_duration and executed_duration side by side
- Duration comparison badge:
  - Green when executed ≤ projected
  - Yellow when executed is 1-1.5x projected
  - Red when executed > 1.5x projected
  - Gray when not started
- Task creation form validates required fields (title)
- Task creation form includes category selector and scheduled_date picker
- Drag-and-drop updates task position (mock @dnd-kit)
- Start timer button shows play icon → toggles to pause on click
- Stop timer button updates executed_duration
- Running timer shows elapsed time
- Filter bar filters tasks by category
- Filter bar filters tasks by priority
- Search input filters by title/description
- "Today" quick filter shows only today's tasks

### 2.3 Daily Planner Components
- Planner renders timeline for selected date
- Date navigator: prev/next day buttons, today button
- Time blocks are color-coded by category:
  - Work: blue, Exercise: green, Family: purple, Personal: orange, Errand: gray, Learning: teal
- Day summary bar shows correct hour breakdown per category
- Day summary bar shows total projected vs total available hours
- Overbooking warning appears when projected > available
- Overbooking warning shows hours over capacity
- Protected time blocks render as locked/shaded regions
- Protected time blocks cannot be dragged
- Empty planner shows "No tasks scheduled" state

### 2.4 Insights Components
- Accuracy chart renders with correct data points
- Overall accuracy metric displays correctly
- Category breakdown bar chart renders per-category data
- Category filter updates displayed stats
- Date range filter updates chart data
- Stats cards display correct over/underestimation messages
- Empty state shown when no completed tasks exist
- Trend line chart shows weekly accuracy buckets

### 2.5 Profile Components
- Profile form renders text description textarea
- Resume upload component accepts PDF/DOCX only
- Resume upload shows file name after selection
- Resume upload rejects non-PDF/DOCX files (shows error)
- Tech profile display renders skills with proficiency bars
- Onboarding flow progresses through steps (1→2→3→4→5→6)
- Onboarding skip button advances to next step
- Onboarding completion redirects to `/board`
- Daily availability time pickers work correctly
- Protected time block form validates start < end

### 2.6 Telegram Components
- Link page displays generated linking code
- Link page shows bot instructions
- Linked account shows Telegram username
- Unlink button shows confirmation dialog
- Unlink button calls API and clears linked state

---

## 3. Cypress E2E Tests

### 3.1 Authentication Flow
- User registers a new account (fills form → submits → redirected to onboarding)
- User logs in with valid credentials (fills form → submits → redirected to board)
- User sees error on invalid credentials
- User is redirected to login when session expires (token removed → navigate → lands on /login)

### 3.2 Onboarding Flow
- New user sees onboarding after registration
- User fills in skills description → advances
- User uploads resume → sees generated tech profile
- User sets daily availability
- User creates first protected time block
- User completes onboarding → redirected to board

### 3.3 Board Interaction
- User creates a new task via modal (with title, category, scheduled date)
- Task appears in correct column with projected_duration badge
- AI estimation loading indicator appears during creation
- User drags task from "To Do" to "In Progress"
- Column task counts update after drag
- User reorders tasks within a column
- User starts timer on a task → sees running time
- User stops timer → executed_duration updates on card
- Duration comparison badge changes color based on ratio
- User opens task detail panel → edits description → saves
- User deletes a task (with confirmation)
- User filters by category → only matching tasks shown
- User uses "Today" filter → only today's tasks shown

### 3.4 Daily Planner Flow
- User opens `/planner` → sees today's timeline
- Day shows scheduled tasks as colored time blocks
- Day shows protected time blocks as shaded regions
- Day summary bar shows correct category breakdown
- User navigates to tomorrow → planner updates
- User adds a task that causes overbooking → warning banner appears
- Warning shows "2h over capacity" (or similar)
- User sets up a recurring protected block (e.g., "Gym 6-7am Mon/Wed/Fri")

### 3.5 Insights Flow
- User opens `/insights` → sees estimation accuracy dashboard
- Overall accuracy metric is displayed
- Category breakdown chart renders
- User filters by category → chart updates
- User changes date range → chart updates
- Stats cards show meaningful messages

### 3.6 Organization Management
- Owner invites a new member by email
- Admin removes a member
- Member cannot access admin/settings pages
- Role indicator shown next to member names
