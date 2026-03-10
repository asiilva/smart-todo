# Smart Todo — API Keys Implementation Plan

> This document covers API key authentication for external app and AI integrations.
> Designed to be used by a dedicated agent working on `/apps/api/src/auth/api-keys/`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.
>
> **Dependencies**: Requires Phase 1 (scaffolding) and basic auth module (JWT, user creation, organizations).

---

## 1. Overview

API keys allow external applications (AI agents, automation tools, CI/CD pipelines, third-party integrations) to authenticate with the Smart Todo API **without going through the browser-based JWT or OAuth flows**. Each API key is scoped to a user and organization, inheriting the user's role-based permissions.

### Use Cases
- AI assistants creating/managing tasks on behalf of a user
- CI/CD pipelines creating tasks from build events
- Custom scripts for bulk task operations
- Third-party app integrations (Zapier, n8n, custom webhooks)
- MCP (Model Context Protocol) servers exposing Smart Todo tools to AI agents

---

## 2. Database Schema

### 2.1 New Entity
- [ ] Create `api_keys` TypeORM entity:
  ```
  api_keys
  ├── id (uuid, PK)
  ├── user_id (FK → users.id, NOT NULL)
  ├── organization_id (FK → organizations.id, NOT NULL)
  ├── name (varchar, NOT NULL) — human-readable label (e.g., "Claude integration", "CI pipeline")
  ├── key_prefix (varchar(8), NOT NULL) — first 8 chars of the key, for display (e.g., "sk_live_a1b2...")
  ├── key_hash (varchar, NOT NULL) — bcrypt hash of the full API key
  ├── scopes (jsonb, NOT NULL, default: ["*"]) — permission scopes (e.g., ["tasks:read", "tasks:write", "timer:write"])
  ├── last_used_at (timestamp, nullable)
  ├── expires_at (timestamp, nullable) — optional expiration date
  ├── revoked_at (timestamp, nullable) — soft-revoke
  ├── created_at (timestamp, NOT NULL)
  ├── updated_at (timestamp, NOT NULL)
  ```
- [ ] Add indexes: `user_id`, `key_prefix`, `organization_id`
- [ ] Run migration

---

## 3. API Key Format

- Format: `sk_live_{random_64_hex_chars}` (e.g., `sk_live_a1b2c3d4e5f6...`)
- Prefix `sk_live_` makes it easy to identify and scan for leaked keys
- The full key is shown **only once** at creation time — only the hash is stored
- `key_prefix` stores the first 8 characters after `sk_live_` for identification in the UI

---

## 4. Available Scopes

| Scope | Description |
|-------|-------------|
| `*` | Full access (default) |
| `tasks:read` | Read tasks and boards |
| `tasks:write` | Create, update, delete, move tasks |
| `timer:read` | Read time entries |
| `timer:write` | Start/stop timers |
| `planner:read` | Read daily planner data |
| `planner:write` | Manage planner settings and protected blocks |
| `profile:read` | Read user profile |
| `insights:read` | Read estimation insights |

---

## 5. API Endpoints

### 5.1 Key Management (JWT-authenticated — web UI)
- [ ] `POST /api/api-keys` — create a new API key
  - Body: `{ name: string, scopes?: string[], expires_at?: string }`
  - Generate random key, hash with bcrypt, store hash + prefix
  - Return the **full key once** in the response (never again)
  - Response: `{ id, name, key: "sk_live_...", key_prefix, scopes, expires_at, created_at }`
- [ ] `GET /api/api-keys` — list user's API keys
  - Returns: `{ id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at }[]`
  - Never returns the full key
- [ ] `DELETE /api/api-keys/:id` — revoke an API key
  - Sets `revoked_at = now()` (soft delete)
  - Key immediately stops working
- [ ] `PUT /api/api-keys/:id` — update API key metadata
  - Updatable: `name`, `scopes`, `expires_at`
  - Cannot update the key itself

### 5.2 Authentication via API Key
- [ ] Accept API key in the `Authorization` header: `Authorization: Bearer sk_live_...`
- [ ] Also accept via `X-API-Key` header as an alternative
- [ ] Auth middleware detects API key format (starts with `sk_live_`) and routes to API key validation instead of JWT validation
- [ ] Validation flow:
  1. Extract key from header
  2. Derive prefix from key
  3. Look up active (not revoked, not expired) api_keys by prefix
  4. Verify full key against stored hash with bcrypt
  5. Update `last_used_at`
  6. Attach user + organization + scopes to the request context
- [ ] Scope enforcement middleware: check if the request's required scope is in the key's scopes list

---

## 6. Service Layer

### 6.1 API Key Service
- [ ] Implement `ApiKeyService` in `/apps/api/src/auth/api-keys/api-key.service.ts`
- [ ] `createKey(userId, orgId, name, scopes?, expiresAt?)` — generate key, hash, store, return full key
- [ ] `listKeys(userId)` — return all keys for user (without hashes)
- [ ] `revokeKey(keyId, userId)` — soft-revoke (set revoked_at)
- [ ] `updateKey(keyId, userId, updates)` — update name/scopes/expiration
- [ ] `validateKey(rawKey)` — look up by prefix, verify hash, check expiry/revocation, return user context
- [ ] `checkScope(keyScopes, requiredScope)` — verify the key has the required scope

### 6.2 Rate Limiting
- [ ] API key requests have separate rate limits from JWT-authenticated requests
- [ ] Default: 100 requests/minute per API key (configurable via env)
- [ ] Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 6.3 Error Handling
- [ ] `401 Unauthorized` — invalid, expired, or revoked key
- [ ] `403 Forbidden` — valid key but insufficient scopes
- [ ] `429 Too Many Requests` — rate limit exceeded
- [ ] Log all API key authentication events for security auditing

---

## 7. File Structure

```
/apps/api/src/auth/api-keys/
├── api-key.service.ts          # Key generation, validation, CRUD
├── api-key.controller.ts       # POST/GET/PUT/DELETE /api/api-keys
├── api-key.middleware.ts        # Auth middleware for API key detection + validation
├── api-key.scope.guard.ts      # Scope enforcement middleware
├── api-key.entity.ts           # TypeORM entity
├── api-key.types.ts            # ApiKeyCreateRequest, ApiKeyResponse, Scope types
└── api-key.rate-limiter.ts     # Per-key rate limiting
```

---

## 8. Configuration

```env
# .env
API_KEY_RATE_LIMIT_PER_MINUTE=100
API_KEY_BCRYPT_ROUNDS=12
```

---

## 9. Security Considerations

- API keys are hashed with bcrypt (same as passwords) — never stored in plain text
- Full key is shown only once at creation; users must regenerate if lost
- Revoked keys are soft-deleted and immediately rejected on validation
- Expired keys are rejected on validation
- API key usage is logged for audit trails
- Rate limiting prevents abuse
- Scopes follow principle of least privilege — external apps should request only what they need
- Key prefix allows identification without exposing the full key
