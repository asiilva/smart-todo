# Smart Todo — Google OAuth Integration Implementation Plan

> This document covers Google OAuth 2.0 authentication (signup + login via Google).
> Designed to be used by a dedicated agent working on `/apps/api/src/auth/google/`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.
>
> **Dependencies**: Requires Phase 1 (scaffolding) and basic auth module (JWT issuing, user creation).

---

## 1. Google OAuth Setup

### 1.1 Dependencies & Configuration
- [ ] Install `passport` and `passport-google-oauth20`
- [ ] Add environment variables to `.env.example`:
  ```
  GOOGLE_CLIENT_ID=your-google-client-id
  GOOGLE_CLIENT_SECRET=your-google-client-secret
  GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
  ```
- [ ] Configure Passport.js with Google OAuth 2.0 strategy
- [ ] Set OAuth scopes: `profile`, `email`

### 1.2 Database Changes
- [ ] Add `google_id` field to `users` table (nullable, unique)
- [ ] Run migration for the new field

---

## 2. OAuth Endpoints

### 2.1 Redirect to Google
- [ ] `GET /api/auth/google` — initiate OAuth flow
  - Trigger Passport Google strategy
  - Redirect user to Google consent screen
  - Request scopes: profile, email

### 2.2 OAuth Callback
- [ ] `GET /api/auth/google/callback` — handle Google's redirect back
  - Exchange authorization code for access token
  - Extract user profile from Google (name, email, google_id)
  - **User resolution logic**:
    1. If user with this `google_id` exists → log them in, issue JWT
    2. If no user with this `google_id` but a user with the same email exists → link accounts (set `google_id` on existing user), issue JWT
    3. If no user exists → create new user with name/email from Google, set `google_id`, create default organization, issue JWT
  - Redirect to frontend with JWT via secure cookie or URL parameter:
    - New user → redirect to `{FRONTEND_URL}/onboarding?token={jwt}`
    - Existing user → redirect to `{FRONTEND_URL}/board?token={jwt}`

---

## 3. OAuth Service

### 3.1 Core Service
- [ ] Implement `GoogleOAuthService` in `/apps/api/src/auth/google/google-oauth.service.ts`
- [ ] `findOrCreateUser(googleProfile)`:
  - Query user by `google_id`
  - If not found, query by `email`
  - If found by email, link account (update `google_id`)
  - If not found at all, create new user + organization
  - Return user object
- [ ] `issueTokens(user)` — generate access + refresh JWT (reuse from core auth service)
- [ ] `isNewUser(user)` — check if user was just created (for redirect logic)

### 3.2 Error Handling
- [ ] Handle invalid/expired authorization codes from Google
- [ ] Handle Google API downtime gracefully (show error page)
- [ ] Handle missing email in Google profile (rare but possible)
- [ ] Log OAuth events for debugging

---

## 4. Frontend Integration Points

> Frontend implementation details are in [implementation-plan-fe.md](./implementation-plan-fe.md) Phase 2.

- [ ] "Sign in with Google" button on login page → `window.location.href = '/api/auth/google'`
- [ ] "Sign up with Google" button on signup page → same redirect
- [ ] Frontend reads JWT from URL params or cookie after callback redirect
- [ ] Store token in auth context, redirect based on new/existing user

---

## 5. File Structure

```
/apps/api/src/auth/google/
├── google-oauth.service.ts       # findOrCreateUser, account linking logic
├── google-oauth.controller.ts    # GET /api/auth/google, GET /api/auth/google/callback
├── google-oauth.strategy.ts      # Passport Google OAuth 2.0 strategy config
└── google-oauth.types.ts         # GoogleProfile, OAuthCallbackResult types
```

---

## 6. Configuration

```env
# .env
GOOGLE_CLIENT_ID=your-client-id-from-google-cloud-console
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```
