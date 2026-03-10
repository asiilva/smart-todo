# Smart Todo — Telegram Notifications Implementation Plan

> This document covers sending timer notifications (60% warning, 100% exceeded) via Telegram,
> mirroring the same alerts that are sent via Web Push.
> Designed to be used by a dedicated agent working on `/apps/api/src/telegram/` and `/apps/api/src/notifications/`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.
>
> **Dependencies**: Requires Telegram bot setup ([implementation-plan-telegram.md](./implementation-plan-telegram.md)),
> notification service ([implementation-plan-be.md](./implementation-plan-be.md) Phase 4.3), and time tracking module.

---

## 1. Overview

When a user has a linked Telegram account and starts a timer on a task, the system should send duration alerts via Telegram **in addition to** (or instead of) Web Push notifications. This gives users real-time "time is up" alerts even when they're away from the browser — on their phone, in a meeting, etc.

### Notification Flow
1. User starts a timer on a task (`POST /api/tasks/:id/timer/start`)
2. Notification service schedules threshold checks (existing behavior)
3. At 60% of `projected_duration_minutes`:
   - Send Web Push notification (existing)
   - Send Telegram message to linked account (**new**)
4. At 100% of `projected_duration_minutes`:
   - Send Web Push notification (existing)
   - Send Telegram message to linked account (**new**)

---

## 2. Database Changes

### 2.1 Notification Preferences Update
- [ ] Add `telegram_notifications_enabled` (boolean, default: true) to `notification_preferences` entity
- [ ] Add `telegram_duration_warning_enabled` (boolean, default: true) to `notification_preferences` entity
- [ ] Add `telegram_duration_exceeded_enabled` (boolean, default: true) to `notification_preferences` entity
- [ ] Run migration for new columns

---

## 3. Notification Service Changes

### 3.1 Extend Notification Dispatcher
- [ ] Refactor the notification service to support multiple delivery channels (Web Push + Telegram)
- [ ] When a timer threshold is reached, the service should:
  1. Check if user has Web Push enabled + subscription → send push notification
  2. Check if user has a linked Telegram account + Telegram notifications enabled → send Telegram message
  3. Either, both, or neither can be active — they're independent channels
- [ ] Each channel respects its own per-type preferences:
  - Web Push: `push_enabled` + `duration_warning_enabled` / `duration_exceeded_enabled`
  - Telegram: `telegram_notifications_enabled` + `telegram_duration_warning_enabled` / `telegram_duration_exceeded_enabled`

### 3.2 Telegram Notification Sender
- [ ] Implement `TelegramNotificationSender` in `/apps/api/src/telegram/telegram-notification.sender.ts`
- [ ] `sendDurationWarning(chatId, task)` — send 60% warning message:
  ```
  ⚠️ Time Warning
  "Fix login bug" is at 60% of estimated time
  ⏱ 36min elapsed / 60min projected

  💡 Consider wrapping up or re-estimating.
  ```
- [ ] `sendDurationExceeded(chatId, task)` — send 100% exceeded message:
  ```
  🚨 Time Exceeded
  "Fix login bug" has exceeded the projected time
  ⏱ 60min elapsed / 60min projected

  ⏹ Stop timer: /done <taskId>
  📋 View tasks: /list
  ```
- [ ] Use the grammy bot instance to send messages (reuse from bot.ts)
- [ ] Handle Telegram API errors gracefully (bot blocked by user, chat not found, rate limits)
- [ ] If Telegram send fails, do not block the Web Push notification

### 3.3 Lookup Integration
- [ ] Use `findTelegramLinkByUserId(userId)` to get the user's chat_id
- [ ] If no Telegram link exists, skip Telegram notification silently

---

## 4. API Changes

### 4.1 Notification Preferences Endpoints (extend existing)
- [ ] `GET /api/notifications/preferences` — include Telegram notification fields in response:
  ```json
  {
    "push_enabled": true,
    "duration_warning_enabled": true,
    "duration_exceeded_enabled": true,
    "telegram_notifications_enabled": true,
    "telegram_duration_warning_enabled": true,
    "telegram_duration_exceeded_enabled": true,
    "telegram_linked": true
  }
  ```
- [ ] `PUT /api/notifications/preferences` — accept Telegram notification fields in body
- [ ] `telegram_linked` is a computed read-only field (true if user has a telegram_links record)

### 4.2 Validation
- [ ] Updating Telegram notification preferences when no Telegram account is linked → return 400 with message "Link your Telegram account first"
- [ ] Validate new fields with zod schema

---

## 5. Frontend Changes

### 5.1 Notification Preferences Page (extend existing)
- [ ] Add "Telegram Notifications" section below "Push Notifications" section
- [ ] Show section only when Telegram account is linked (`telegram_linked: true`)
- [ ] Toggle: enable/disable Telegram notifications
- [ ] Toggle: Telegram duration warning (60%)
- [ ] Toggle: Telegram duration exceeded (100%)
- [ ] When Telegram is not linked, show message: "Link your Telegram account to receive notifications there" with link to `/settings/telegram`

---

## 6. File Structure (new/modified files)

```
/apps/api/src/telegram/
├── telegram-notification.sender.ts   # NEW — Send duration alerts via Telegram
├── ...existing files...

/apps/api/src/notifications/
├── notification.service.ts           # MODIFIED — Dispatch to Web Push + Telegram channels
├── notification.types.ts             # MODIFIED — Add Telegram preference types
```

---

## 7. Configuration

No new env variables required — reuses `TELEGRAM_BOT_TOKEN` from the Telegram bot setup.

---

## 8. Edge Cases

- User has Telegram linked but has opted out of Telegram notifications → skip Telegram, still send Web Push if enabled
- User has Telegram linked and Web Push enabled → both channels fire independently
- User has only Telegram linked (no push subscription) → only Telegram notification sent
- User has neither → no notifications sent (timer still runs normally)
- Telegram bot is blocked by user → catch 403 error, log it, optionally mark link as inactive
- Multiple tasks with running timers → each task's notifications are independent per channel
- User unlinks Telegram while a timer is running → next threshold check finds no link, skips Telegram
