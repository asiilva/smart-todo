# Smart Todo — Electron Desktop App Plan

## Context

Smart Todo is a **command center for orchestrating parallel Claude-powered work**. The user runs many tasks simultaneously — most executed via Claude CLI prompts — and needs a rich, interactive UI to plan, track, and manage all workstreams without overcommitting. Non-technical tickets (exercise, family, errands) only need duration estimation.

The original plan targeted a web-based stack (Next.js + Express). This pivots to an **Electron desktop app** that:

- Runs locally on macOS/Windows as the UI and orchestrator
- Spawns the **local Claude Code CLI** for all AI tasks (hard requirement for v1)
- Talks to a **remote backend API on Digital Ocean** for CRUD, auth, and persistence
- Keeps **all original features**: multi-tenancy, Telegram, Google OAuth, Web Push, API keys, Kanban, planner, reports

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│          User's Machine             │
│                                     │
│  ┌─────────────┐   ┌─────────────┐ │
│  │  Electron    │──▶│ Claude CLI  │ │
│  │  (UI +       │   │ (local)     │ │
│  │  Orchestrator)│  └─────────────┘ │
│  └──────┬───────┘                   │
└─────────┼───────────────────────────┘
          │ HTTPS
          ▼
┌─────────────────────────────────────┐
│       Digital Ocean Server          │
│                                     │
│  ┌─────────────┐   ┌─────────────┐ │
│  │  Express/    │──▶│ PostgreSQL  │ │
│  │  Fastify API │   │             │ │
│  └─────────────┘   └─────────────┘ │
│  ┌─────────────┐                    │
│  │ Telegram Bot │                   │
│  └─────────────┘                    │
└─────────────────────────────────────┘
```

**Data flow for AI tasks:**
1. User creates/updates a task in Electron UI
2. Electron spawns local `claude` CLI with the prompt
3. Claude CLI returns AI result (estimated duration, parsed task, etc.)
4. Electron sends the task + AI results to the remote API to persist

---

## Updated Monorepo Structure

```
/
├── apps/
│   ├── desktop/              # NEW: Electron app (UI + orchestrator)
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── index.ts              # Main process entry
│   │   │   │   ├── claude-cli.ts         # Claude CLI spawn/communication
│   │   │   │   ├── ipc-handlers.ts       # IPC bridge (renderer ↔ main)
│   │   │   │   ├── updater.ts            # Auto-updates (electron-updater)
│   │   │   │   └── tray.ts               # System tray
│   │   │   ├── preload/
│   │   │   │   └── index.ts              # Context bridge
│   │   │   └── renderer/                 # React app (was apps/web)
│   │   │       ├── pages/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       ├── services/             # API client (calls remote API)
│   │   │       ├── ai/                   # IPC calls to main process for Claude CLI
│   │   │       └── ...
│   │   ├── resources/                    # Icons (icns, ico, png)
│   │   ├── electron-builder.yml
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                  # Backend API (deployed to Digital Ocean)
│       ├── src/
│       │   ├── auth/         # JWT, Google OAuth
│       │   ├── organizations/
│       │   ├── users/
│       │   ├── boards/
│       │   ├── tasks/
│       │   ├── categories/
│       │   ├── time-tracking/
│       │   ├── planner/
│       │   ├── insights/
│       │   ├── reports/
│       │   ├── notifications/ # Web Push
│       │   ├── api-keys/
│       │   ├── telegram/
│       │   └── app.ts
│       ├── package.json
│       └── Dockerfile
├── packages/
│   └── shared/               # Shared TypeScript types
├── package.json              # Root workspace
└── docker-compose.yml        # PostgreSQL + API for local dev
```

**Key structural change:** The frontend moves INTO the Electron app (`apps/desktop/src/renderer/`) instead of being a separate `apps/web`. No standalone Next.js app — the renderer IS the UI, built with React + Vite (better Electron compatibility than Next.js static export).

---

## What Changes vs Original Plan

| Area | Original | New |
|------|----------|-----|
| Frontend | Next.js (App Router), standalone web app | React + Vite inside Electron renderer |
| Backend hosting | Self-contained, runs alongside frontend | Deployed to Digital Ocean separately |
| AI provider | Claude API + OpenAI API (server-side) | Local Claude CLI (spawned by Electron main process) |
| Database | Local PostgreSQL (Docker) | Remote PostgreSQL on Digital Ocean |
| Auth | JWT (standard web) | JWT (Electron stores tokens in secure storage) |
| Packaging | Vercel/Docker deployment | electron-builder → DMG/NSIS/AppImage |
| Telegram | Webhook mode | Webhook on Digital Ocean (no change to API) |
| Google OAuth | Browser redirect | Electron opens system browser for OAuth, deep-link callback |

## What Stays the Same

- Database schema (all entities, migrations, seeds)
- REST API design (all endpoints, request/response formats)
- All UI components and behavior (Kanban, planner, reports, etc.)
- Multi-tenancy with organizations and roles
- Telegram bot logic (runs server-side on Digital Ocean)
- Web Push notifications (Electron's Chromium supports them)
- API key management
- Shared TypeScript types
- Test plans (adapted for new structure)

---

## Implementation Details

### 1. Electron Main Process (`apps/desktop/src/main/`)

**`index.ts`** — Entry point:
- Create BrowserWindow loading the Vite-built renderer
- Register IPC handlers
- On first launch: check Claude CLI availability, show setup wizard if missing
- System tray setup

**`claude-cli.ts`** — Claude CLI integration:
- `callClaude(prompt: string): Promise<string>` — spawns `claude -p "<prompt>" --output-format json`
- For long prompts, pipe via stdin to avoid arg length limits
- 60s timeout with descriptive errors
- Verifies `claude` is in PATH on startup
- Methods:
  - `estimateTask(taskData, userProfile, history) -> EstimationResult`
  - `parseTaskFromText(text) -> ParsedTask`
  - `generateTechProfile(resumeText) -> TechProfile`
  - `suggestDayPlan(tasks, profile, availability) -> DayPlan`

**`ipc-handlers.ts`** — IPC bridge:
- `ai:estimate-task` — renderer requests AI estimation → main spawns CLI → returns result
- `ai:parse-task` — renderer sends text → main spawns CLI → returns parsed task
- `ai:generate-profile` — renderer sends resume text → main spawns CLI → returns tech profile
- `ai:suggest-day-plan` — renderer sends context → main spawns CLI → returns plan
- `ai:check-available` — check if Claude CLI is installed
- `auth:store-token` — securely store JWT using `safeStorage`
- `auth:get-token` — retrieve stored JWT

**`updater.ts`** — Auto-updates via electron-updater + GitHub Releases

**`tray.ts`** — System tray with Show/Hide/Quit

### 2. Electron Renderer (`apps/desktop/src/renderer/`)

**React + Vite + TypeScript + Tailwind CSS** (not Next.js — Vite is simpler for Electron renderers, no SSR complexity).

- All UI components from the original frontend plan
- `services/api-client.ts` — Axios/fetch wrapper pointing to `https://api.smarttodo.com` (configurable)
- `services/ai-client.ts` — Calls main process via IPC for AI tasks:
  ```typescript
  // Renderer calls:
  const result = await window.electronAPI.estimateTask(taskData);
  // This goes through preload → IPC → main process → claude CLI
  ```
- Auth: JWT stored securely via Electron's `safeStorage` API (not localStorage)
- Google OAuth: opens system browser via `shell.openExternal()`, receives callback via custom protocol (`smarttodo://oauth/callback`)

### 3. Remote API (`apps/api/`)

**Unchanged from original plan** except:
- No AI provider code — AI runs client-side via Claude CLI
- Remove `/apps/api/src/ai/` directory entirely from the API
- API receives AI results as part of request payloads (e.g., `POST /tasks` body includes `projected_duration` from client-side AI)
- Deployed via Docker on Digital Ocean (Dockerfile + docker-compose with PostgreSQL)
- Telegram bot runs in webhook mode on the server (publicly accessible)
- Google OAuth callback configured for the custom protocol redirect

### 4. Preload Script (`apps/desktop/src/preload/`)

Exposes safe APIs via `contextBridge`:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  estimateTask: (data) => ipcRenderer.invoke('ai:estimate-task', data),
  parseTask: (text) => ipcRenderer.invoke('ai:parse-task', text),
  generateProfile: (text) => ipcRenderer.invoke('ai:generate-profile', text),
  suggestDayPlan: (data) => ipcRenderer.invoke('ai:suggest-day-plan', data),
  checkClaudeAvailable: () => ipcRenderer.invoke('ai:check-available'),
  storeToken: (token) => ipcRenderer.invoke('auth:store-token', token),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
});
```

### 5. Google OAuth in Electron

1. User clicks "Sign in with Google" in Electron
2. Electron opens system browser via `shell.openExternal('https://api.smarttodo.com/auth/google')`
3. User authenticates with Google
4. Google redirects to API callback
5. API generates JWT, redirects to `smarttodo://oauth/callback?token=<jwt>`
6. Electron registers custom protocol handler, receives the token
7. Token stored via `safeStorage`

### 6. Audio Transcription (Telegram Voice)

Telegram voice messages are handled server-side (the bot runs on Digital Ocean). The server can use a cloud transcription API or ship Whisper. This doesn't involve the Electron app at all.

---

## Updated Phase Plan

### Phase 1: Project Scaffolding & Infrastructure
- [ ] Initialize monorepo with workspaces (`apps/desktop`, `apps/api`, `packages/shared`)
- [ ] Scaffold Electron app with Vite + React + TypeScript + Tailwind
- [ ] Configure electron-builder (DMG, NSIS, AppImage targets)
- [ ] Set up preload script with context bridge
- [ ] Scaffold Express/Fastify API with TypeScript
- [ ] Set up Prisma + PostgreSQL schema and migrations
- [ ] Docker Compose for local dev (PostgreSQL + API)
- [ ] Dockerfile for API (Digital Ocean deployment)
- [ ] Shared types package
- [ ] ESLint + Prettier config
- [ ] CI: GitHub Actions (lint, test, build)

### Phase 2: Authentication & Multi-Tenancy
- [ ] API: Auth endpoints (register, login, refresh) with JWT
- [ ] API: Organization CRUD + invite + role-based auth
- [ ] API: Google OAuth (passport-google-oauth20)
- [ ] Electron: Login/Register pages
- [ ] Electron: Secure token storage (safeStorage)
- [ ] Electron: Custom protocol handler for OAuth callback (`smarttodo://`)
- [ ] Electron: Auth context/provider with auto-refresh
- [ ] Electron: Protected route wrappers

### Phase 3: User Profiles & Tech Profiling
- [ ] API: Profile CRUD endpoints
- [ ] API: Resume upload + text extraction (pdf-parse, mammoth)
- [ ] Electron: Claude CLI integration (`claude-cli.ts`)
- [ ] Electron: IPC handlers for AI operations
- [ ] Electron: First-launch Claude CLI check + setup instructions
- [ ] Electron: Onboarding flow (skills, resume, profile review, availability)
- [ ] Electron: Profile page

### Phase 4: Task Management & Kanban Board
- [ ] API: Category CRUD (defaults + custom)
- [ ] API: Board + Task CRUD with position management
- [ ] API: Task attachments (upload, list, delete)
- [ ] API: Time tracking (start/stop, time_entries)
- [ ] API: Web Push (VAPID, subscriptions, preferences, service worker)
- [ ] Electron: Kanban board with @dnd-kit drag-and-drop
- [ ] Electron: Task cards, creation modal, detail panel
- [ ] Electron: AI estimation integration (IPC → Claude CLI → API persist)
- [ ] Electron: Timer UI with start/stop
- [ ] Electron: Custom category creation (name + color picker)
- [ ] Electron: Completion celebration modal
- [ ] Electron: Notification permission flow + preferences

### Phase 5: AI ETA Estimation & Daily Planner
- [ ] Electron: Estimation prompt engineering (reuse prompt templates)
- [ ] Electron: Task text parsing via Claude CLI
- [ ] API: Daily planner endpoints (settings, protected blocks, overbooking)
- [ ] API: Insights endpoints (accuracy, category breakdown)
- [ ] API: Reports endpoints (period/category filters, grouped, export)
- [ ] Electron: Planner page (timeline, time blocks, day summary)
- [ ] Electron: Insights dashboard (accuracy, trends, charts)
- [ ] Electron: Reports page (filters, list/grouped views, CSV export)

### Phase 6: Telegram Integration
- [ ] API: Telegram bot (webhook mode on Digital Ocean)
- [ ] API: Account linking flow (6-digit code)
- [ ] API: Text message → task handler (server-side AI or simple parsing)
- [ ] API: Voice message → transcribe → task handler
- [ ] API: Bot commands (/list, /done, /status, /today, /help)
- [ ] API: Telegram duration alerts (60%/100%)
- [ ] Electron: Telegram settings page (link/unlink)

### Phase 7: Polish & Production
- [ ] Electron: Auto-updates (electron-updater + GitHub Releases)
- [ ] Electron: System tray (Show/Hide/Quit)
- [ ] Electron: First-run setup wizard
- [ ] Electron: Loading skeletons, toasts, error boundaries, empty states
- [ ] Electron: Responsive layout (sidebar collapse, etc.)
- [ ] API: Global error handling + logging
- [ ] API: Rate limiting
- [ ] API: Dockerized deployment to Digital Ocean
- [ ] CI: Build + publish Electron app for macOS/Windows/Linux

---

## Verification

1. **Electron launches** — app opens, shows login screen
2. **Auth flow** — register, login, Google OAuth all work with remote API
3. **Claude CLI** — create a task, see AI estimation run locally and persist to server
4. **Kanban** — drag-and-drop, timer, completion celebration all work
5. **Planner/Reports** — data loads from remote API, displays correctly
6. **Telegram** — link account, send message, task appears in board
7. **Packaging** — `npm run package` produces installable DMG/EXE/AppImage
8. **Auto-update** — app detects and installs update from GitHub Releases

---

## Note on Telegram AI

Since AI runs locally in Electron but Telegram bot runs on Digital Ocean, Telegram message→task parsing on the server needs a solution:
- **Option A:** Server does basic text parsing without AI (extract title, default duration)
- **Option B:** Server has a lightweight Claude/OpenAI API call just for Telegram (separate from the desktop AI)
- **Option C:** Server queues the message; next time Electron is online, it processes via local CLI

Recommend **Option A for v1** — keep server parsing simple, users can refine tasks in the desktop app where AI is available.
