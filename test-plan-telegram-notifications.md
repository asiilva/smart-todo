# Smart Todo — Telegram Notifications Test Plan

> Tests for sending timer duration alerts (60% warning, 100% exceeded) via Telegram.
> Designed to be used by a dedicated agent working on `/apps/api/src/telegram/` and `/apps/api/src/notifications/`.
> Reference: [test-plan.md](./test-plan.md) for full context.

---

## 1. Test Infrastructure

### Setup
- Mock grammy bot instance (never send real Telegram messages in tests)
- Mock Telegram API responses (success, blocked, rate limited)
- Use existing notification service test infrastructure
- Create fixtures with linked Telegram users and notification preferences

### Tools
- **Jest** — test runner
- **Supertest** — HTTP assertions for preferences endpoint changes
- **jest.mock** — mock grammy bot `sendMessage`

---

## 2. Unit Tests

### 2.1 Telegram Notification Sender
- `sendDurationWarning` — sends correctly formatted 60% warning message to chat_id
- `sendDurationWarning` — message includes task title, elapsed time, and projected time
- `sendDurationExceeded` — sends correctly formatted 100% exceeded message to chat_id
- `sendDurationExceeded` — message includes task title, elapsed time, projected time, and actionable commands (/done, /list)
- `sendDurationWarning` — handles Telegram API error gracefully (does not throw)
- `sendDurationExceeded` — handles Telegram API 403 (bot blocked by user) gracefully
- `sendDurationExceeded` — handles Telegram API rate limit (429) gracefully

### 2.2 Notification Service (multi-channel dispatch)
- Timer at 60% — sends Web Push AND Telegram when both are enabled and available
- Timer at 60% — sends only Web Push when Telegram is not linked
- Timer at 60% — sends only Telegram when Web Push has no subscription
- Timer at 60% — sends neither when user has opted out of both channels
- Timer at 100% — sends Web Push AND Telegram when both are enabled and available
- Timer at 60% — skips Telegram when `telegram_notifications_enabled` is false
- Timer at 60% — skips Telegram when `telegram_duration_warning_enabled` is false
- Timer at 100% — skips Telegram when `telegram_duration_exceeded_enabled` is false
- Timer at 60% — skips Telegram when user has no telegram_links record
- Telegram send failure does not block Web Push notification from being sent
- Web Push send failure does not block Telegram notification from being sent
- Do not send duplicate Telegram notifications for the same timer session
- Handle tasks with no projected_duration (skip notification scheduling for both channels)

### 2.3 Notification Preferences
- Default Telegram notification preferences are all true for new users
- Updating `telegram_notifications_enabled` to false disables all Telegram duration alerts
- Updating `telegram_duration_warning_enabled` independently controls 60% Telegram alert
- Updating `telegram_duration_exceeded_enabled` independently controls 100% Telegram alert
- `telegram_linked` computed field returns true when telegram_links record exists
- `telegram_linked` computed field returns false when no telegram_links record
- Reject Telegram preference update when user has no linked Telegram account (400)

---

## 3. Integration Tests

### 3.1 Notification Preferences Endpoints
- `GET /api/notifications/preferences` — includes Telegram fields in response (200)
- `GET /api/notifications/preferences` — returns `telegram_linked: true` when Telegram is linked (200)
- `GET /api/notifications/preferences` — returns `telegram_linked: false` when Telegram is not linked (200)
- `PUT /api/notifications/preferences` — update Telegram notification preferences (200)
- `PUT /api/notifications/preferences` — update Telegram preferences when not linked (400)
- `PUT /api/notifications/preferences` — update both Push and Telegram preferences in one request (200)

### 3.2 Timer + Telegram Notification Flow (mocked Telegram API)
- Start timer on task (user has linked Telegram + Telegram notifications enabled):
  - At 60% threshold: verify `bot.api.sendMessage` called with correct chat_id and warning message
  - At 100% threshold: verify `bot.api.sendMessage` called with correct chat_id and exceeded message
- Start timer on task (user has linked Telegram + Telegram notifications disabled):
  - At 60% threshold: verify `bot.api.sendMessage` NOT called
- Start timer on task (user has no linked Telegram):
  - At 60% threshold: verify `bot.api.sendMessage` NOT called, Web Push still sent

### 3.3 Telegram Error Handling
- Telegram API returns 403 (bot blocked) during notification send:
  - Notification service does not throw
  - Web Push notification still sent if enabled
  - Error is logged
- Telegram API returns 429 (rate limited) during notification send:
  - Notification service does not throw
  - Error is logged
