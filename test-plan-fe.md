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
- Login page renders "Sign in with Google" button
- "Sign in with Google" button redirects to `GET /api/auth/google`
- Signup form renders all fields: name, email, password, confirm password, organization name
- Signup form validates all fields are required (shows errors for each missing field)
- Signup form validates email format
- Signup form validates password minimum 8 characters
- Signup form validates password and confirm password match (shows error when mismatched)
- Signup form validates organization name is required
- Signup form calls `POST /api/auth/register` with correct payload on submit
- Signup page renders "Sign up with Google" button
- "Sign up with Google" button redirects to `GET /api/auth/google`
- After successful signup (email/password), user is redirected to onboarding
- Auth provider handles OAuth callback redirect: reads JWT from URL params or cookie
- After successful Google OAuth callback, user is redirected to onboarding (new user) or board (existing user)
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
- Clicking a task card opens the task detail modal
- Task detail modal displays all fields: title, description, notes, category, priority, column, scheduled date
- Task detail modal shows projected vs executed duration and ratio
- Editing fields in detail modal and clicking Save updates the task
- Notes field accepts and persists free-form text
- Delete button in detail modal removes the task (with confirmation)
- Attachment section renders list of attachments with file name, size, and type icon
- Attachment remove button calls `DELETE /api/tasks/:id/attachments/:attachmentId` and removes from list
- Drag-and-drop upload zone accepts files and calls `POST /api/tasks/:id/attachments`
- Upload rejects files larger than 10MB (shows error)
- Task card shows paperclip icon with attachment count when attachments exist
- Task card hides paperclip icon when no attachments
- Task creation form validates required fields (title)
- Task creation form includes category selector and scheduled_date picker
- Drag-and-drop between columns updates task column and position (mock @dnd-kit/core + @dnd-kit/sortable)
- Drag-and-drop reorder within column updates task position (mock @dnd-kit/sortable)
- Start timer button shows play icon → toggles to stop on click
- Stop timer button updates executed_duration
- Running timer shows elapsed time
- Multiple tasks can have running timers simultaneously (parallel task execution)
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

### 2.4b Reports Components
- Reports page renders with period selector buttons (Today, Yesterday, This Week, This Month)
- Clicking period button fetches data for that period and updates list
- Category filter chips toggle on/off and filter displayed tasks
- View mode toggle switches between Full List and Grouped by Category
- Summary stats bar shows total tasks, total time, projected vs actual, accuracy percentage
- Full list view renders tasks in chronological order with title, category badge, durations, accuracy badge
- Grouped view renders category headers with subtotals (task count, hours, accuracy)
- Grouped view lists tasks under correct category header
- Empty state shown when no completed tasks in selected period
- Export button triggers CSV download or clipboard copy
- Accuracy badge: green when executed ≤ projected, yellow when 1-1.5x, red when > 1.5x

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

### 2.7 Notification Components
- Notification permission prompt renders with explanation text and "Enable Notifications" button
- Clicking "Enable Notifications" calls `Notification.requestPermission()`
- On permission granted: calls `pushManager.subscribe()` with VAPID public key and sends subscription to API
- On permission denied: shows dismissible banner explaining how to enable later
- Notification preferences page renders toggle switches for each notification type
- Toggling push_enabled off disables all notification toggles
- Toggling duration_warning_enabled calls `PUT /api/notifications/preferences` with correct payload
- Toggling duration_exceeded_enabled calls `PUT /api/notifications/preferences` with correct payload
- Preferences page loads current preferences from `GET /api/notifications/preferences`
- Unsubscribe button calls `pushSubscription.unsubscribe()` and `DELETE /api/notifications/subscribe`
- Service worker registration is called on app load (mock `navigator.serviceWorker.register`)

### 2.6 Telegram Components
- Link page displays generated linking code
- Link page shows bot instructions
- Linked account shows Telegram username
- Unlink button shows confirmation dialog
- Unlink button calls API and clears linked state

---

## 3. Cypress E2E Tests

### 3.1 Authentication Flow
- User registers a new account via signup form (fills name, email, password, confirm password, org name → submits → redirected to onboarding)
- User registers via "Sign up with Google" button (clicks → redirected to Google → returns with JWT → redirected to onboarding)
- User logs in with valid credentials (fills form → submits → redirected to board)
- User logs in via "Sign in with Google" button (clicks → redirected to Google → returns with JWT → redirected to board)
- User sees error on invalid credentials
- User sees validation errors on signup form (missing fields, password mismatch, short password)
- User is redirected to login when session expires (token removed → navigate → lands on /login)
- OAuth callback redirect is handled correctly (JWT extracted from URL params or cookie, stored in auth context)

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
- User drags task to "Done" → fireworks animation plays
- Column task counts update after drag
- User reorders tasks within a column
- User starts timer on a task → sees running time
- User stops timer → executed_duration updates on card
- Duration comparison badge changes color based on ratio
- User clicks task card → detail modal opens with all fields
- User edits title, description, and notes → saves → changes reflected on board
- User changes task column from detail modal → board updates
- User deletes a task (with confirmation)
- User uploads an attachment in detail modal → attachment appears in list
- User removes an attachment → attachment disappears from list
- Task card shows attachment count badge after upload
- Dragging task to Done column triggers celebration modal with fireworks
- Changing column to Done in task detail modal triggers celebration modal with fireworks
- Celebration modal displays randomized title, task name, and stats (estimated, actual, done today)
- Celebration modal dismisses on "Keep Going!" button click or overlay click
- Fireworks canvas renders behind the modal and cleans up after animation
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

### 3.5b Reports Flow
- User opens `/reports` → sees today's completed tasks with summary stats
- User clicks "This Week" → list updates to show week's completed tasks
- User clicks "This Month" → list updates to show month's completed tasks
- User selects "Work" and "Exercise" category chips → only those categories shown
- User toggles to "Grouped by Category" → tasks organized under category headers with subtotals
- User toggles back to "Full List" → flat chronological list restored
- Summary stats update when filters change
- Empty state shown when period has no completed tasks
- User clicks export → CSV data copied or downloaded

### 3.6 Notification Flow
- User logs in for the first time and sees notification permission prompt
- User grants permission → prompt disappears, subscription saved
- User denies permission → informational banner appears
- User opens settings → notification preferences page shows correct toggle states
- User disables duration warning → toggle updates, API called
- User re-enables duration warning → toggle updates, API called

### 3.7 Organization Management
- Owner invites a new member by email
- Admin removes a member
- Member cannot access admin/settings pages
- Role indicator shown next to member names
