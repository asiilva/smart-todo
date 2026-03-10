# Smart Todo — Telegram Integration Test Plan

> Tests for the Telegram bot, webhook, account linking, and message handlers.
> Designed to be used by a dedicated agent working on `/apps/api/src/telegram/`.
> Reference: [test-plan.md](./test-plan.md) for full context.
>
> **Related**: [test-plan-telegram-notifications.md](./test-plan-telegram-notifications.md) — Telegram duration alert tests.

---

## 1. Test Infrastructure

### Setup
- Mock Telegram Bot API calls (never send real messages in tests)
- Mock AI provider for text parsing and audio transcription
- Use Supertest for webhook endpoint integration tests
- Create fixture files with sample Telegram update payloads

### Tools
- **Jest** — test runner
- **Supertest** — HTTP assertions for webhook endpoint
- **jest.mock** — mock grammy/telegram SDK and AI provider

---

## 2. Unit Tests

### 2.1 Link Service
- Generate 6-digit linking code for user
- Store code with user_id and expiration (10 min TTL)
- Validate correct code → return user_id
- Reject expired code
- Reject invalid/non-existent code
- Delete code after successful use (one-time use)
- Prevent generating new code if user already has active code (return existing)

### 2.2 Text Message Handler
- Receive text message from linked user → call `parseTaskFromText`
- Create task with parsed data (title, description, priority, category)
- Set scheduled_date to today
- Assign task to linked user
- Trigger AI estimation (sets projected_duration)
- Format and send confirmation reply with task details + estimated duration
- Handle AI parsing failure → create task with message as title, no category

### 2.3 Voice Message Handler
- Receive voice message → download audio file from Telegram
- Call `transcribeAudio` with audio buffer
- Call `parseTaskFromText` with transcribed text
- Create task with parsed data
- Reply includes transcribed text for user verification
- Handle transcription failure → reply with error message
- Handle empty transcription → reply asking user to try again

### 2.4 Command Handler
- `/list` — fetch today's tasks, format as numbered list with status indicators
- `/list` — empty list: "No tasks scheduled for today"
- `/done 3` — move task #3 to Done column, stop running timer
- `/done 3` — task not found: "Task not found"
- `/done` (no ID) — reply with usage: "/done <task-id>"
- `/status` — fetch board summary, format column counts
- `/today` — fetch planner data, format daily summary with time breakdown
- `/today` — include protected blocks and overbooking status
- `/help` — reply with command reference
- Unknown command → reply with "Unknown command. Try /help"

### 2.5 Unlinked User Handler
- Message from unknown chat_id → reply with welcome + linking instructions
- Voice from unknown chat_id → same welcome message
- Command from unknown chat_id → same welcome message (except `/link`)

### 2.6 Telegram Message Formatter
- Format task confirmation (text input) with correct emoji and layout
- Format task confirmation (voice input) includes transcribed text
- Format task list with status indicators (✅ done, 🔄 in progress, ⬜ todo)
- Format board status with column counts
- Format daily summary with time breakdown and protected blocks
- Handle long task titles (truncate if needed)

---

## 3. Integration Tests

### 3.1 Webhook Endpoint
- `POST /api/telegram/webhook` — valid text message from linked user → task created, 200 OK
- `POST /api/telegram/webhook` — valid voice message from linked user → task created, 200 OK
- `POST /api/telegram/webhook` — message from unlinked user → welcome reply, 200 OK
- `POST /api/telegram/webhook` — invalid webhook signature → 403 Forbidden
- `POST /api/telegram/webhook` — malformed payload → 400 Bad Request

### 3.2 Link Endpoints
- `POST /api/telegram/link` — authenticated user → returns 6-digit code (201)
- `POST /api/telegram/link` — unauthenticated → 401
- `DELETE /api/telegram/link` — authenticated + linked → unlinks account (204)
- `DELETE /api/telegram/link` — not linked → 404

### 3.3 Linking Flow (end-to-end with mocks)
- User calls `POST /api/telegram/link` → gets code
- Bot receives `/link <code>` → links account → confirms
- User sends text message → task is created → confirmation sent
- User sends voice message → transcribed → task created → confirmation sent

### 3.4 Command Flow (end-to-end with mocks)
- Linked user sends `/list` → receives formatted task list
- Linked user sends `/done 1` → task moves to Done → confirmation
- Linked user sends `/today` → receives daily planner summary
- Linked user sends `/status` → receives board overview
