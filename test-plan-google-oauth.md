# Smart Todo — Google OAuth Integration Test Plan

> Tests for Google OAuth 2.0 authentication (signup + login via Google).
> Designed to be used by a dedicated agent working on `/apps/api/src/auth/google/`.
> Reference: [test-plan.md](./test-plan.md) for full context.

---

## 1. Test Infrastructure

### Setup
- Mock Google OAuth responses (never call real Google APIs in tests)
- Mock Passport.js Google strategy for unit tests
- Use Supertest for endpoint integration tests
- Create fixture files with sample Google profile payloads

### Tools
- **Jest** — test runner
- **Supertest** — HTTP assertions for integration tests
- **jest.mock** — mock passport-google-oauth20 strategy

---

## 2. Unit Tests

### 2.1 Google OAuth Service
- `findOrCreateUser` — create new user from Google profile when no user exists with that google_id or email
- `findOrCreateUser` — return existing user when user with matching google_id is found
- `findOrCreateUser` — link accounts when user with same email exists but no google_id (set google_id on existing user)
- `findOrCreateUser` — populate name and email from Google profile for new users
- `findOrCreateUser` — create default organization for new Google users
- `findOrCreateUser` — handle Google profile with missing name (fallback to email prefix)
- `findOrCreateUser` — handle Google profile with missing email (reject with error)
- `issueTokens` — return valid access + refresh JWT for Google-authenticated user
- `isNewUser` — return true for just-created users
- `isNewUser` — return false for existing users (login or account link)
- Reject invalid or expired OAuth authorization codes

### 2.2 Google OAuth Strategy
- Strategy uses correct client ID and secret from env
- Strategy uses correct callback URL from env
- Strategy requests profile and email scopes
- Strategy calls `findOrCreateUser` with extracted Google profile

---

## 3. Integration Tests

### 3.1 OAuth Endpoints
- `GET /api/auth/google` — redirects to Google consent screen with correct scope and client_id (302)
- `GET /api/auth/google/callback` with valid code — new Google user:
  - Creates user with name and email from Google profile
  - Sets google_id on user
  - Creates default organization
  - Redirects to `{FRONTEND_URL}/onboarding?token={jwt}` (302)
- `GET /api/auth/google/callback` with valid code — existing Google user:
  - Finds user by google_id
  - Issues JWT
  - Redirects to `{FRONTEND_URL}/board?token={jwt}` (302)
- `GET /api/auth/google/callback` with valid code — account linking:
  - User registered with email/password
  - Google OAuth with same email
  - Sets google_id on existing user (does not create duplicate)
  - Issues JWT for the existing user
- `GET /api/auth/google/callback` with invalid code — returns error (400)
- `GET /api/auth/google/callback` with expired code — returns error (400)

### 3.2 Post-OAuth Verification
- After Google signup: user exists in DB with google_id set and correct name/email
- After Google signup: user belongs to a newly created organization
- After account linking: user has both password_hash and google_id
- After Google login: no duplicate user created
- JWT issued after Google OAuth contains correct user ID and organization ID
