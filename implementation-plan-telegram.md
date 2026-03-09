# Smart Todo — Telegram Integration Implementation Plan

> This document covers the Telegram bot integration for task creation via text/voice.
> Designed to be used by a dedicated agent working on `/apps/api/src/telegram/`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.
>
> **Dependencies**: Requires Phase 2 (auth/users), Phase 4 (task service), and AI provider (for text parsing and audio transcription).

---

## 1. Bot Setup

### 1.1 Telegram Bot Registration
- [ ] Document BotFather setup steps (bot token, webhook URL)
- [ ] Store `TELEGRAM_BOT_TOKEN` in env config
- [ ] Store `TELEGRAM_WEBHOOK_URL` in env config (e.g., `https://api.smarttodo.com/api/telegram/webhook`)

### 1.2 Bot Framework
- [ ] Install `grammy` (or `node-telegram-bot-api`) as Telegram SDK
- [ ] Initialize bot instance in `/apps/api/src/telegram/bot.ts`
- [ ] Configure webhook mode (not polling) for production
- [ ] Register bot commands with BotFather: list, done, status, today, link

---

## 2. Account Linking

### 2.1 Linking Flow
- [ ] `POST /api/telegram/link` — authenticated endpoint that generates a one-time 6-digit linking code
  - Store code in DB/cache with user_id, expires in 10 minutes
- [ ] Bot `/link <code>` command handler:
  - Look up code → find user_id → create `telegram_links` record (user_id, chat_id, username)
  - Delete used code
  - Reply: "Account linked! You can now create tasks by sending me messages."
- [ ] Handle expired/invalid codes: "Invalid or expired code. Generate a new one from the app."
- [ ] Handle already-linked accounts: "Your Telegram is already linked to an account."

### 2.2 Unlinking
- [ ] `DELETE /api/telegram/link` — authenticated endpoint to unlink Telegram
- [ ] Delete `telegram_links` record for user
- [ ] Bot `/unlink` command: unlink from Telegram side

### 2.3 Lookup Helper
- [ ] `findUserByChatId(chatId)` — query telegram_links → return user or null
- [ ] Used by all message handlers to identify the sender

---

## 3. Message Handlers

### 3.1 Webhook Endpoint
- [ ] `POST /api/telegram/webhook` — receives Telegram updates
- [ ] Validate webhook signature (Telegram secret token)
- [ ] Route to appropriate handler based on update type (message, command, voice)

### 3.2 Text Message → Task
- [ ] Receive text message from linked user
- [ ] Call `AIProvider.parseTaskFromText(message.text)` to extract: title, description, priority, category
- [ ] Create task via TaskService (assigned to linked user, scheduled_date = today)
- [ ] Auto-trigger AI estimation (sets projected_duration)
- [ ] Reply with confirmation:
  ```
  ✅ Task created: "Fix login bug"
  📁 Category: work
  ⏱ Estimated: 2h 30min
  📋 Added to your board in "To Do"
  ```

### 3.3 Voice Message → Task
- [ ] Receive voice message from linked user
- [ ] Download voice file from Telegram (OGG format)
- [ ] Convert OGG to supported format if needed (ffmpeg or direct API support)
- [ ] Call `AIProvider.transcribeAudio(audioBuffer)` to get text
- [ ] Call `AIProvider.parseTaskFromText(transcribedText)` to extract task data
- [ ] Create task via TaskService
- [ ] Reply with confirmation (include transcribed text for verification):
  ```
  🎤 Heard: "I need to review the pull request for the auth module"
  ✅ Task created: "Review auth module PR"
  📁 Category: work
  ⏱ Estimated: 45min
  ```

### 3.4 Unlinked User Handler
- [ ] When message comes from unknown chat_id:
  ```
  👋 Welcome! To use Smart Todo Bot, you need to link your account.
  1. Go to Smart Todo → Settings → Telegram
  2. Generate a linking code
  3. Send me: /link <your-code>
  ```

---

## 4. Bot Commands

### 4.1 `/list` — List Today's Tasks
- [ ] Fetch tasks scheduled for today (from TaskService)
- [ ] Format as numbered list with status indicators:
  ```
  📋 Today's tasks:
  1. ✅ Morning standup (15min)
  2. 🔄 Fix login bug (2h 30min — 1h 15min elapsed)
  3. ⬜ Review auth PR (45min)
  4. ⬜ Write unit tests (1h 30min)

  Total: 4h 60min projected | 1h 15min done
  ```

### 4.2 `/done <id>` — Complete a Task
- [ ] Parse task ID from command
- [ ] Move task to "Done" column via TaskService
- [ ] Stop any running timer
- [ ] Reply: "✅ 'Fix login bug' marked as done! (projected: 2h 30min, actual: 2h 10min)"

### 4.3 `/status` — Board Overview
- [ ] Fetch board summary for user's organization
- [ ] Format:
  ```
  📊 Board status:
  Backlog: 5 tasks
  To Do: 3 tasks (4h 30min)
  In Progress: 2 tasks (3h)
  Review: 1 task (30min)
  Done: 8 tasks today
  ```

### 4.4 `/today` — Daily Summary
- [ ] Fetch planner data for today
- [ ] Format:
  ```
  📅 Today's plan:
  Available: 7:00 AM — 10:00 PM (15h)
  🏋️ Gym: 6:00 — 7:00 AM (protected)
  👨‍👩‍👧 Family dinner: 6:00 — 8:00 PM (protected)

  📊 Time breakdown:
  💼 Work: 6h | 🏋️ Exercise: 1h | 👨‍👩‍👧 Family: 2h | ✨ Free: 6h

  Status: ✅ Day looks balanced!
  ```

### 4.5 `/help` — Command Reference
- [ ] Reply with list of available commands and usage

---

## 5. File Structure

```
/apps/api/src/telegram/
├── bot.ts                    # Bot instance initialization
├── webhook.controller.ts     # POST /api/telegram/webhook
├── link.controller.ts        # POST/DELETE /api/telegram/link
├── link.service.ts           # Linking code generation + validation
├── handlers/
│   ├── text-message.handler.ts    # Text → task creation
│   ├── voice-message.handler.ts   # Voice → transcribe → task creation
│   ├── command.handler.ts         # /list, /done, /status, /today, /help
│   └── unlinked-user.handler.ts   # Welcome message for new users
├── formatters/
│   └── telegram-message.formatter.ts  # Format task/board data for Telegram
└── types.ts                  # Telegram-specific types
```

---

## 6. Configuration

```env
# .env
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=random-secret-for-webhook-validation
TELEGRAM_LINK_CODE_TTL_MINUTES=10
```
