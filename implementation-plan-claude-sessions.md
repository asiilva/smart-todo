# Smart Todo — Task-Scoped Claude Sessions Plan

## Overview

Each task that integrates with Claude maintains **persistent conversation context** from start to finish. A task can have **multiple concurrent agents**, each with its own Claude CLI session. Context is preserved across interactions until the task is completed.

---

## Architecture

```
Task "Update commit push skill"
├── Agent 1: "Research current skill code"  → Claude session abc123
├── Agent 2: "Write new push logic"         → Claude session def456
└── Agent 3: "Write tests"                  → Claude session ghi789
```

- Claude CLI already persists conversations locally (`~/.claude/`)
- Each conversation has a session ID
- Smart Todo maps session IDs to tasks and manages their lifecycle

---

## Session Lifecycle

1. **Task created** → first Claude session starts (estimation, planning)
2. **Task in progress** → user spawns agents, each gets a persistent session
3. **Interactions** → each follow-up uses `--resume <sessionId>` to continue with full context
4. **Task done** → sessions archived, summary extracted for insights

---

## Data Model

### New: `task_sessions` table

```
task_sessions
├── id (uuid)
├── task_id (FK → tasks)
├── agent_name (string — e.g., "Research", "Implement", "Test")
├── session_id (string — Claude CLI session ID)
├── status (enum: active, paused, completed, failed)
├── summary (text — extracted on completion)
├── started_at (timestamp)
├── completed_at (timestamp, nullable)
└── created_at (timestamp)
```

A task has many sessions. Sessions can run concurrently.

### Shared types (`packages/shared`)

```typescript
interface TaskSession {
  id: string;
  taskId: string;
  agentName: string;
  sessionId: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  summary?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}
```

---

## Claude CLI Integration

### `claude-cli.ts` — New methods

```typescript
// Start a new session and return the session ID
startSession(prompt: string): Promise<{ sessionId: string; output: string }>

// Resume an existing session with a follow-up prompt
resumeSession(sessionId: string, prompt: string): Promise<string>

// List local Claude sessions (for recovery/sync)
listSessions(): Promise<Array<{ id: string; timestamp: string }>>
```

### CLI commands used

```bash
# Start new session — capture session ID from output
claude -p "prompt" --output-format json

# Resume existing session with full context
claude --resume <sessionId> -p "follow-up prompt" --output-format json
```

### IPC Handlers — New channels

```typescript
'session:start'    → startSession(taskId, agentName, prompt)
'session:resume'   → resumeSession(sessionId, prompt)
'session:pause'    → mark session as paused
'session:complete' → mark session as completed, extract summary
'session:list'     → list sessions for a task
```

---

## UI — Task Detail Panel

The task detail panel gets an **Agents** tab:

```
┌─────────────────────────────────────────┐
│ Task: Update commit push skill          │
├──────┬──────────┬────────┬──────────────┤
│ Info │ Agents   │ Time   │ History      │
├──────┴──────────┴────────┴──────────────┤
│                                         │
│ ● Research (active)         [Resume]    │
│   Session: abc123                       │
│   Last: "Found 3 files that need..."    │
│                                         │
│ ● Implementation (active)   [Resume]    │
│   Session: def456                       │
│   Last: "Updated push logic in..."      │
│                                         │
│ ○ Tests (completed)         [View]      │
│   Session: ghi789                       │
│   Summary: "Added 12 test cases..."     │
│                                         │
│              [+ New Agent]              │
└─────────────────────────────────────────┘
```

- **Active agents** show last output snippet and a Resume button
- **Completed agents** show summary and a View button for full history
- **+ New Agent** button lets user name and prompt a new parallel session

---

## Workflow Example

**Task: "Update commit push skill"**

1. User creates task → AI estimates duration (first session, ephemeral)
2. User starts working → clicks **+ New Agent** → names it "Research" → prompt: "Analyze the current commit push skill and identify what needs to change"
3. Claude responds with analysis → context saved in session `abc123`
4. User clicks **+ New Agent** → "Implement" → prompt: "Based on the spec, rewrite the push logic" (separate session `def456`)
5. Both agents run in parallel, each maintaining their own context
6. User clicks **Resume** on Research agent → "Now check if there are any tests for this" → Claude continues with full prior context
7. All agents complete → task moves to Done → summaries extracted

---

## Phase Integration

This feature spans multiple phases — ~16h additional effort:

- **Phase 1:** Add `task_sessions` to Prisma schema — ~1h
- **Phase 3:** Implement `startSession`/`resumeSession` in `claude-cli.ts` + IPC handlers — ~4h
- **Phase 4:** Add Agents tab to task detail panel, session management UI — ~8h
- **Phase 5:** Use session context for better estimation (feed prior session summaries as history) — ~3h

---

## Non-Technical Tasks

Tasks that don't need Claude (exercise, family, errands) simply skip the agent system. They only use the one-shot estimation prompt — no persistent session needed.
