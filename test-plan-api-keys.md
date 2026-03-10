# Smart Todo — API Keys Test Plan

> Tests for API key authentication and management.
> Designed to be used by a dedicated agent working on `/apps/api/src/auth/api-keys/`.
> Reference: [test-plan.md](./test-plan.md) for full context.

---

## 1. Test Infrastructure

### Setup
- Use test database with seeded users and organizations
- Generate real API keys during tests (use the service, not mocks)
- Clean up keys between test suites

### Tools
- **Jest** — test runner
- **Supertest** — HTTP assertions for integration tests

---

## 2. Unit Tests

### 2.1 API Key Service
- `createKey` — generates key with `sk_live_` prefix and 64 hex chars
- `createKey` — stores bcrypt hash, never stores plain key
- `createKey` — stores correct key_prefix (first 8 chars after prefix)
- `createKey` — default scopes are `["*"]` when none provided
- `createKey` — custom scopes are stored correctly
- `createKey` — optional expires_at is stored correctly
- `createKey` — returns full key only in creation response
- `validateKey` — returns user context for valid key
- `validateKey` — rejects revoked key (401)
- `validateKey` — rejects expired key (401)
- `validateKey` — rejects key with invalid hash (401)
- `validateKey` — rejects key with unknown prefix (401)
- `validateKey` — updates last_used_at on successful validation
- `revokeKey` — sets revoked_at timestamp
- `revokeKey` — revoked key fails validation immediately
- `revokeKey` — only key owner can revoke their key
- `updateKey` — updates name successfully
- `updateKey` — updates scopes successfully
- `updateKey` — updates expires_at successfully
- `updateKey` — only key owner can update their key
- `listKeys` — returns all keys for user without hashes
- `listKeys` — includes revoked keys (with revoked_at set)
- `listKeys` — returns key_prefix, not full key

### 2.2 Scope Guard
- `checkScope` — `["*"]` grants access to any scope
- `checkScope` — `["tasks:read"]` grants access to `tasks:read`
- `checkScope` — `["tasks:read"]` denies access to `tasks:write`
- `checkScope` — `["tasks:read", "timer:write"]` grants access to both
- `checkScope` — empty scopes deny all access

### 2.3 Auth Middleware (API Key Detection)
- Detects API key from `Authorization: Bearer sk_live_...` header
- Detects API key from `X-API-Key: sk_live_...` header
- Falls through to JWT validation for non-API-key tokens
- Attaches user, organization, and scopes to request context
- Returns 401 for invalid API key
- Returns 401 for missing auth header

### 2.4 Rate Limiter
- Allows requests within rate limit
- Returns 429 when rate limit exceeded
- Rate limit is per API key (different keys have independent limits)
- Rate limit resets after window expires
- Response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers

---

## 3. Integration Tests

### 3.1 Key Management Endpoints (JWT-authenticated)
- `POST /api/api-keys` — success: creates key, returns full key with id and prefix (201)
- `POST /api/api-keys` — with custom scopes (201)
- `POST /api/api-keys` — with expiration date (201)
- `POST /api/api-keys` — missing name (400)
- `POST /api/api-keys` — invalid scopes (400)
- `POST /api/api-keys` — unauthenticated (401)
- `GET /api/api-keys` — returns list of user's keys without full key values (200)
- `GET /api/api-keys` — empty list for user with no keys (200)
- `GET /api/api-keys` — unauthenticated (401)
- `DELETE /api/api-keys/:id` — success: sets revoked_at (200)
- `DELETE /api/api-keys/:id` — not found (404)
- `DELETE /api/api-keys/:id` — cannot revoke another user's key (403)
- `DELETE /api/api-keys/:id` — unauthenticated (401)
- `PUT /api/api-keys/:id` — update name (200)
- `PUT /api/api-keys/:id` — update scopes (200)
- `PUT /api/api-keys/:id` — cannot update another user's key (403)

### 3.2 API Key Authentication on Resource Endpoints
- `GET /api/boards` with valid API key (via `Authorization: Bearer`) — returns boards (200)
- `GET /api/boards` with valid API key (via `X-API-Key`) — returns boards (200)
- `POST /api/boards/:boardId/tasks` with API key scoped to `tasks:write` — creates task (201)
- `POST /api/boards/:boardId/tasks` with API key scoped to `tasks:read` — forbidden (403)
- `GET /api/boards/:id` with API key scoped to `tasks:read` — returns board (200)
- `POST /api/tasks/:id/timer/start` with API key scoped to `timer:write` — starts timer (201)
- `POST /api/tasks/:id/timer/start` with API key scoped to `tasks:write` (no timer scope) — forbidden (403)
- `GET /api/planner/:date` with API key scoped to `planner:read` — returns planner data (200)
- `GET /api/insights/accuracy` with API key scoped to `insights:read` — returns insights (200)
- Request with revoked API key — unauthorized (401)
- Request with expired API key — unauthorized (401)
- Request with malformed API key — unauthorized (401)

### 3.3 Rate Limiting
- Multiple requests within limit succeed (200)
- Exceeding rate limit returns 429 with retry-after information
- Different API keys have independent rate limits

### 3.4 Audit & Security
- `last_used_at` updates after a successful API-key-authenticated request
- API key from user in org A cannot access org B resources
- API key inherits user's organization role (member cannot manage org via API key)
