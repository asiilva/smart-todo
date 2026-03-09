# Smart Todo — AI / LLM Integration Test Plan

> Tests for the AI provider abstraction and all LLM-powered features.
> Designed to be used by a dedicated agent working on `/apps/api/src/ai/`.
> Reference: [test-plan.md](./test-plan.md) for full context.

---

## 1. Test Infrastructure

### Setup
- Mock all external AI API calls (never call real APIs in tests)
- Use `jest.mock` for `@anthropic-ai/sdk` and `openai` SDKs
- Create fixture files with sample AI responses
- Test both success and failure scenarios for every AI call

### Tools
- **Jest** — test runner
- **jest.mock** — mock AI SDKs

---

## 2. Unit Tests

### 2.1 AI Provider Factory
- Return `ClaudeProvider` when `AI_PROVIDER=claude`
- Return `OpenAIProvider` when `AI_PROVIDER=openai`
- Throw descriptive error on unknown provider (e.g., `AI_PROVIDER=gemini`)
- Factory returns singleton (same instance on multiple calls)
- Factory reads from environment config
- Each provider instance has all 5 required methods

### 2.2 Claude Provider
- `estimateTaskDuration` — sends correct prompt, parses response into `EstimationResult`
- `estimateTaskDuration` — handles API timeout (returns fallback)
- `estimateTaskDuration` — handles rate limit (429) with retry
- `estimateTaskDuration` — handles 5xx error gracefully
- `parseTaskFromText` — extracts title, description, priority, category from text
- `parseTaskFromText` — handles short input ("buy groceries")
- `parseTaskFromText` — handles detailed input with context
- `transcribeAudio` — sends audio buffer, returns transcribed text
- `generateTechProfile` — parses resume text into structured profile
- `generateTechProfile` — handles minimal resume (just a few lines)
- `suggestDayPlan` — returns ordered tasks with reasoning

### 2.3 OpenAI Provider
- Same test cases as 2.2 but for OpenAI SDK
- `transcribeAudio` — uses Whisper API specifically
- Handles OpenAI-specific error formats

### 2.4 Estimation Service
- `estimate(taskId)` — fetches task + profile + history, calls AI, saves projected_duration
- `estimate(taskId)` — uses fallback duration when AI is unavailable
- `estimate(taskId)` — includes last 20 tasks in history context
- `estimate(taskId)` — sets `confidence: "fallback"` when using defaults
- `reEstimate(taskId)` — overwrites existing projected_duration with new estimate
- `parseText(text)` — delegates to AI provider and returns ParsedTask
- Calibration: correctly calculates avg projected/executed ratio from history
- Calibration: includes "user tends to underestimate by X%" in prompt when applicable

### 2.5 Prompt Templates
- Duration estimation prompt includes task title and description
- Duration estimation prompt includes user's tech profile (languages, proficiency)
- Duration estimation prompt includes historical accuracy data
- Duration estimation prompt requests JSON format with required fields
- Task parsing prompt handles various input formats
- Profile generation prompt produces all required fields
- All prompts include few-shot examples

### 2.6 Fallback Strategy
- Fallback returns correct default per category:
  - work: 60min, exercise: 45min, family: 60min, personal: 30min, errand: 30min, learning: 45min
- Fallback logs the AI failure (verify logger called)
- Fallback sets confidence to "fallback"
- Fallback does not throw — always returns a result

---

## 3. Integration Tests

### 3.1 Estimation Flow (mocked AI)
- Create task → estimation auto-triggers → task.projected_duration_minutes is set
- Create task with AI unavailable → fallback duration is set
- `POST /api/tasks/:id/re-estimate` — returns new estimation, updates task
- `POST /api/tasks/:id/re-estimate` — task not found returns 404

### 3.2 Profile Generation Flow (mocked AI)
- `POST /api/users/me/profile` with resume text → AI generates structured profile → saved to tech_profiles
- `POST /api/users/me/profile` with AI unavailable → profile saved with raw text only, structured_profile is null

### 3.3 Task Parsing Flow (mocked AI)
- Send free text → receive structured ParsedTask with all fields
- Send minimal text → receive ParsedTask with at least title
