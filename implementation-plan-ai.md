# Smart Todo — AI / LLM Integration Implementation Plan

> This document covers the AI provider abstraction and all LLM-powered features.
> Designed to be used by a dedicated agent working on `/apps/api/src/ai/`.
> Reference: [implementation-plan.md](./implementation-plan.md) for full context.
>
> **Dependencies**: Requires Phase 1 (scaffolding) and basic task/profile types from `/packages/shared`.

---

## 1. AI Provider Abstraction (Factory Pattern)

### 1.1 Interface Definition
- [ ] Define `AIProvider` interface in `/apps/api/src/ai/ai-provider.interface.ts`:
  ```typescript
  interface AIProvider {
    estimateTaskDuration(task: TaskInput, userProfile: TechProfile, history: TaskHistory[]): Promise<EstimationResult>
    parseTaskFromText(text: string): Promise<ParsedTask>
    transcribeAudio(audioBuffer: Buffer): Promise<string>
    generateTechProfile(resumeText: string): Promise<TechProfile>
    suggestDayPlan(tasks: Task[], userProfile: TechProfile, availability: DailyAvailability): Promise<DayPlan>
  }
  ```
- [ ] Define result types:
  - `EstimationResult` (projected_duration_minutes, confidence: low/medium/high, reasoning: string)
  - `ParsedTask` (title, description, priority, category, labels)
  - `TechProfile` (languages[], frameworks[], domains[], years_of_experience)
  - `DayPlan` (ordered_tasks[], suggestions: string)

### 1.2 Claude Provider
- [ ] Implement `ClaudeProvider` in `/apps/api/src/ai/providers/claude.provider.ts`
- [ ] Use `@anthropic-ai/sdk`
- [ ] Implement all 5 interface methods
- [ ] Configure model selection via env (default: claude-sonnet-4-6)
- [ ] Handle rate limits with exponential backoff
- [ ] Handle API errors gracefully (timeout, 5xx, etc.)

### 1.3 OpenAI Provider
- [ ] Implement `OpenAIProvider` in `/apps/api/src/ai/providers/openai.provider.ts`
- [ ] Use `openai` SDK
- [ ] Implement all 5 interface methods
- [ ] Configure model selection via env (default: gpt-4o)
- [ ] Handle rate limits with exponential backoff
- [ ] Handle API errors gracefully
- [ ] Use Whisper API for `transcribeAudio`

### 1.4 Factory
- [ ] Implement `AIProviderFactory` in `/apps/api/src/ai/ai-provider.factory.ts`
- [ ] Read `AI_PROVIDER` from env config (`claude` | `openai`)
- [ ] Return singleton instance of the configured provider
- [ ] Throw descriptive error on unknown provider

---

## 2. Prompt Engineering

### 2.1 Task Duration Estimation Prompt
- [ ] Create prompt template in `/apps/api/src/ai/prompts/estimate-duration.ts`
- [ ] Include in prompt:
  - Task title and description
  - User's tech profile (languages, frameworks, proficiency levels, domains)
  - Historical accuracy data: last N completed tasks with projected vs executed durations
  - Calibration instruction: "This user tends to [over/under]estimate by X%"
- [ ] Request structured JSON response with duration_minutes, confidence, reasoning
- [ ] Include few-shot examples for consistent output format

### 2.2 Task Parsing Prompt
- [ ] Create prompt template in `/apps/api/src/ai/prompts/parse-task.ts`
- [ ] Extract from free text: title, description, priority, category, labels
- [ ] Handle both short inputs ("fix login bug") and detailed inputs
- [ ] Request structured JSON response

### 2.3 Tech Profile Generation Prompt
- [ ] Create prompt template in `/apps/api/src/ai/prompts/generate-profile.ts`
- [ ] Parse resume/description into: languages (with proficiency), frameworks, domains, years_of_experience
- [ ] Proficiency levels: beginner, intermediate, senior, expert
- [ ] Request structured JSON response

### 2.4 Day Plan Suggestion Prompt
- [ ] Create prompt template in `/apps/api/src/ai/prompts/suggest-day-plan.ts`
- [ ] Input: unordered tasks for the day + user profile + availability windows
- [ ] Output: suggested task order with reasoning (e.g., "tackle hard tasks first")

---

## 3. Estimation Service

### 3.1 Core Service
- [ ] Implement `EstimationService` in `/apps/api/src/ai/estimation.service.ts`
- [ ] `estimate(taskId)` — fetch task + assignee profile + history → call AI → save projected_duration
- [ ] `reEstimate(taskId)` — same flow but overwrites existing projected_duration
- [ ] `parseText(text)` — call AI to extract structured task data from free text
- [ ] Calibration logic: query last 20 completed tasks for the user, calculate avg projected/executed ratio

### 3.2 API Endpoints
- [ ] Wire estimation into `POST /api/boards/:boardId/tasks` (auto-trigger on create)
- [ ] `POST /api/tasks/:id/re-estimate` — manual re-estimation
- [ ] Return estimation result in task creation response

### 3.3 Fallback Strategy
- [ ] When AI is unavailable, use category-based defaults:
  - work: 60min, exercise: 45min, family: 60min, personal: 30min, errand: 30min, learning: 45min
- [ ] Log AI failures for monitoring
- [ ] Return `confidence: "fallback"` when using defaults

---

## 4. File Structure

```
/apps/api/src/ai/
├── ai-provider.interface.ts      # AIProvider interface + result types
├── ai-provider.factory.ts        # AIProviderFactory
├── estimation.service.ts         # EstimationService (orchestrates AI calls)
├── providers/
│   ├── claude.provider.ts        # ClaudeProvider
│   └── openai.provider.ts        # OpenAIProvider
└── prompts/
    ├── estimate-duration.ts      # Duration estimation prompt template
    ├── parse-task.ts             # Free text → task parsing prompt
    ├── generate-profile.ts       # Resume → tech profile prompt
    └── suggest-day-plan.ts       # Day plan suggestion prompt
```
