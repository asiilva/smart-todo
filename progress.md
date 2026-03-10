# Smart Todo — Progress Tracker

## Status Legend
- ⬜ Not started
- 🟡 In progress
- ✅ Completed
- ❌ Blocked

---

## Phase 1: Project Scaffolding & Infrastructure — ⬜
| Task | Status | Notes |
|------|--------|-------|
| Monorepo structure | ⬜ | |
| TypeScript config | ⬜ | |
| ESLint + Prettier | ⬜ | |
| Docker Compose (PostgreSQL) | ⬜ | |
| TypeORM entities + migration | ⬜ | |
| Seed script | ⬜ | |
| CI pipeline | ⬜ | |

## Phase 2: Authentication & Multi-Tenancy — ⬜
| Task | Status | Notes |
|------|--------|-------|
| Auth endpoints (register/login/refresh) | ⬜ | Register accepts name, email, password, confirm password, org name |
| JWT middleware | ⬜ | |
| Google OAuth 2.0 setup (passport-google-oauth20) | ⬜ | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL in .env |
| `GET /api/auth/google` — redirect to Google consent screen | ⬜ | |
| `GET /api/auth/google/callback` — handle callback, create/find user, issue JWT | ⬜ | Link accounts if same email exists |
| Add `google_id` field to users table | ⬜ | Nullable, unique |
| Organization CRUD | ⬜ | |
| Role-based authorization | ⬜ | |
| Signup page (`/register`) with form fields + validation | ⬜ | Name, email, password, confirm password, org name; password min 8 chars |
| "Sign up with Google" button on signup page | ⬜ | Redirects to `GET /api/auth/google` |
| "Sign in with Google" button on login page | ⬜ | Redirects to `GET /api/auth/google` |
| Handle OAuth callback redirect on frontend | ⬜ | Read JWT from URL params or cookie |
| Auth pages (web) | ⬜ | |
| Auth tests — backend (unit + integration) | ⬜ | Includes Google OAuth tests |
| API key management endpoints (CRUD) | ⬜ | POST/GET/PUT/DELETE /api/api-keys |
| API key auth middleware + scope enforcement | ⬜ | Bearer sk_live_... or X-API-Key header |
| API key rate limiting | ⬜ | Per-key rate limits, separate from JWT |
| API key tests (unit + integration) | ⬜ | |
| Auth tests — frontend (unit + E2E) | ⬜ | Includes signup form validation + Google OAuth button tests |

## Phase 3: User Profiles & Tech Profiling — ⬜
| Task | Status | Notes |
|------|--------|-------|
| Profile endpoints | ⬜ | |
| Resume upload + text extraction | ⬜ | |
| AI Provider interface | ⬜ | |
| ClaudeProvider implementation | ⬜ | |
| OpenAIProvider implementation | ⬜ | |
| AIProviderFactory | ⬜ | |
| Tech profile generation | ⬜ | |
| Profile pages (web) | ⬜ | |
| Profile tests | ⬜ | |

## Phase 4: Task Management & Kanban Board — ⬜
| Task | Status | Notes |
|------|--------|-------|
| Board CRUD endpoints | ⬜ | |
| Task CRUD endpoints (with projected/executed duration, category) | ⬜ | |
| Task positioning logic | ⬜ | |
| Time tracking module (start/stop timer, time_entries) | ⬜ | |
| Kanban board UI | ⬜ | |
| Drag-and-drop | ⬜ | |
| Task creation modal (category, scheduled_date) | ⬜ | |
| Start/stop timer UI on task cards | ⬜ | |
| Duration comparison badge (projected vs executed) | ⬜ | |
| Filtering + search (by category) | ⬜ | |
| Board tests (unit + integration + E2E) | ⬜ | |
| VAPID key generation + web-push setup | ⬜ | |
| Push subscription endpoints (subscribe/unsubscribe) | ⬜ | |
| Notification preferences endpoints (GET/PUT) | ⬜ | |
| Notification service (80%/100% duration alerts) | ⬜ | |
| Service worker registration (FE) | ⬜ | |
| Notification permission prompt UI (FE) | ⬜ | |
| Notification preferences settings page (FE) | ⬜ | |
| Notification tests (unit + integration) | ⬜ | |

## Phase 5: AI ETA Estimation & Daily Planner — ⬜
| Task | Status | Notes |
|------|--------|-------|
| Estimation service (with historical calibration) | ⬜ | |
| Prompt engineering | ⬜ | |
| Task text parsing | ⬜ | |
| Daily planner endpoints | ⬜ | |
| Protected time blocks (recurring + one-off) | ⬜ | |
| Daily availability settings | ⬜ | |
| Overbooking detection | ⬜ | |
| Insights module (accuracy stats) | ⬜ | |
| Daily planner UI (timeline view) | ⬜ | |
| Day summary bar (hours by category) | ⬜ | |
| Insights dashboard UI | ⬜ | |
| Estimation + planner tests | ⬜ | |

## Phase 6: Telegram Integration — ⬜
| Task | Status | Notes |
|------|--------|-------|
| Bot setup + webhook | ⬜ | |
| Account linking flow | ⬜ | |
| Text message → task | ⬜ | |
| Voice message → task | ⬜ | |
| Bot commands | ⬜ | |
| Telegram settings page (web) | ⬜ | |
| Telegram tests | ⬜ | |

## Phase 7: Polish & Production Readiness — ⬜
| Task | Status | Notes |
|------|--------|-------|
| Error handling + logging | ⬜ | |
| Rate limiting | ⬜ | |
| Responsive design | ⬜ | |
| Dockerfiles | ⬜ | |
| Deployment docs | ⬜ | |
