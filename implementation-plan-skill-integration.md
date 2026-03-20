# Smart Todo — Skill Integration & Project Management Plan

## Overview

Integrate Smart Todo with local Claude Code skills for spec-driven development. Users pre-configure **projects** (name + local path) and **category planning settings** (enabled + skill name) in the Profile page. When creating a tech task, users select which projects are involved. From the task detail, users trigger **"Start Planning"** which executes the configured skill with full task context across all selected repos.

---

## Concepts

### Projects
A project is a local code repository the user works on.
- **Name**: display name (e.g., "Smart Todo", "Quadra Producers")
- **Path**: full local folder path (e.g., `/Users/alansilva/Documents/workspace/smart-todo`)
- Configured in the Profile page
- **Path validated** on save (must exist on disk)
- Selected per-task via multi-select dropdown

### Category Planning Settings
Each category can optionally have planning enabled:
- **Planning enabled**: tasks in this category follow spec-driven workflow
- **Skill name**: the Claude Code skill to execute (e.g., `implement`, `review-pr`)
- **Skill validated** on save (must be a real Claude Code skill)
- Only relevant for tech categories — non-tech categories (exercise, family, personal, errand) don't show planning config at all

### Planning Status
Tasks in planning-enabled categories have a planning lifecycle:
- **Not started** — task created, no planning yet
- **Planning** — skill is executing, generating spec/plan (green pulsing badge)
- **Planned** — planning complete, output stored in task notes
- Tasks can be re-planned (run the skill again)

---

## User Workflow

1. **Setup (once)**: Profile → add Projects (name + path) → configure Category Planning (toggle + skill name)
2. **Create task**: select a planning-enabled category → pick projects from multi-select
3. **Move to In Progress**: task appears in the In Progress column
4. **Start Planning**: click "Start Planning" button in task detail → Smart Todo executes the skill with all task context + all selected project paths
5. **While planning**: task card shows a green pulsing "PLANNING" badge
6. **Planning complete**: skill output (spec, plan, PR links, etc.) stored in task notes → badge changes to "PLANNED"
7. **Execute**: user works on the task (timer tracks time)
8. **Done**: move to Done → celebration modal

---

## Data Model Changes

### New: `projects` table
```
projects
├── id (uuid)
├── user_id (FK → users)
├── name (string) — display name
├── path (string) — full local folder path
├── created_at (timestamp)
├── updated_at (timestamp)
└── @@unique([user_id, name])
```

### New: `category_settings` table
```
category_settings
├── id (uuid)
├── category_id (FK → categories)
├── planning_enabled (boolean, default false)
├── skill_name (string, nullable) — Claude Code skill name
├── created_at (timestamp)
├── updated_at (timestamp)
└── @@unique([category_id])
```

### New: `task_projects` join table
```
task_projects
├── id (uuid)
├── task_id (FK → tasks)
├── project_id (FK → projects)
└── @@unique([task_id, project_id])
```

### Modified: `tasks` table — new field
```
planning_status (enum: none, planning, planned) — default 'none'
```

---

## API Changes

### Projects
- `GET /api/projects` — list user's projects
- `POST /api/projects` — create project (name, path) — **path validated via IPC**
- `PUT /api/projects/:id` — update project
- `DELETE /api/projects/:id` — delete project

### Category Settings
- `GET /api/categories/settings` — get all category settings for user (bulk)
- `PUT /api/categories/:id/settings` — update planning settings (planningEnabled, skillName) — **skill name validated via IPC**

### Task Changes
- Extend `POST /api/boards/:boardId/tasks` — accept `projectIds: string[]`
- Extend `PUT /api/tasks/:id` — accept `projectIds: string[]`
- Extend `PATCH /api/tasks/:id/planning-status` — set planning status (none, planning, planned)
- Task responses include `projects: Array<{ id, name, path }>` and `planningStatus`

---

## Electron IPC Changes

### New IPC Channels
- `skill:execute` — run a skill with task context across project paths
- `skill:validate` — check if a skill name exists (parse `claude /help` or similar)
- `path:validate` — check if a folder path exists (`fs.existsSync`)
- `path:pick` — open native folder picker dialog (`dialog.showOpenDialog`)

### Skill Execution Detail

```typescript
// skill-executor.ts
async function executeSkill(options: {
  skillName: string;
  taskTitle: string;
  taskDescription: string;
  taskNotes: string;
  projectPaths: string[];  // ALL selected project paths
}): Promise<string> {
  // Build a comprehensive prompt with all context
  const context = `
Task: ${options.taskTitle}
Description: ${options.taskDescription}
Notes: ${options.taskNotes}
Repositories involved:
${options.projectPaths.map(p => `- ${p}`).join('\n')}
  `;

  // Execute the skill in the first project's directory
  // (the skill itself can reference other repos from the context)
  const primaryPath = options.projectPaths[0];

  // Spawn: claude -p "/<skillName> <context>" --cwd <primaryPath>
  return callClaude({
    prompt: `/${options.skillName} ${context}`,
    cwd: primaryPath,
    timeout: 300_000,  // 5 min for planning tasks
  });
}
```

Multi-repo handling: The skill executes in the **primary project** directory, but the prompt includes all repo paths as context. The skill (e.g., `implement`) can then decide how to work across repos.

---

## UI Changes

### Profile Page — New Sections

**Projects Section** (below Daily Availability)
```
┌─────────────────────────────────────────────────────┐
│  PROJECTS                                  [+ Add]  │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ 📁 Smart Todo                        [Edit] [✕] ││
│  │    /Users/alansilva/.../smart-todo              ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │ 📁 Quadra Producers                  [Edit] [✕] ││
│  │    /Users/alansilva/.../quadra-producers        ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Add Project:                                       │
│  Name: [________________]                           │
│  Path: [________________] [📂 Browse]               │
│  [Save Project]                                     │
└─────────────────────────────────────────────────────┘
```

**Category Planning Section** (below Projects)
```
┌─────────────────────────────────────────────────────┐
│  CATEGORY PLANNING                                  │
│                                                     │
│  work          [✓ enabled]  Skill: [implement    ]  │
│  Backend       [✓ enabled]  Skill: [implement    ]  │
│  Dev Tooling   [✓ enabled]  Skill: [pr-create    ]  │
│  learning      [✓ enabled]  Skill: [implement    ]  │
│  ─────────────────────────────────────────────────  │
│  exercise      [ disabled]                          │
│  family        [ disabled]                          │
│  personal      [ disabled]                          │
│  errand        [ disabled]                          │
└─────────────────────────────────────────────────────┘
```

### Create Task Modal — Changes

When selected category has planning enabled:
```
┌──────────────────────────────────────────────────┐
│  New Task                                   ✕    │
│                                                  │
│  Title: [Fix auth token refresh             ]    │
│  Description: [                             ]    │
│  Category: [Backend ▼]                           │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ ⚡ Planning enabled · Skill: implement      ││
│  │                                              ││
│  │ Projects involved:                           ││
│  │ [✓] Smart Todo                               ││
│  │ [✓] Quadra Producers                         ││
│  │ [ ] Quadra AI                                ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  [AI Estimate]            [Cancel] [Create Task] │
└──────────────────────────────────────────────────┘
```

### Task Card — Planning Badge

```
┌──────────────────────────────────┐
│  BACKEND ●                       │
│  Fix auth token refresh          │
│  ⚡ implement  🟢 PLANNING       │  ← green pulsing badge
│  ⏱ 30m                          │
└──────────────────────────────────┘
```

States:
- No badge: planning not enabled for this category, or status is `none`
- `PLANNING` (green, pulsing): skill is currently executing
- `PLANNED` (green, static): planning complete, output in notes

### Task Detail Panel — Changes

When task has planning enabled:
```
┌──────────────────────────────────────┐
│  TASK DETAILS                    ✕   │
│                                      │
│  Fix auth token refresh              │
│                                      │
│  Description: [                   ]  │
│  Notes: [                         ]  │
│  ← notes will contain planning output│
│                                      │
│  Projects:                           │
│  📁 Smart Todo  📁 Quadra Producers  │
│                                      │
│  ⚡ Skill: implement                 │
│  [🚀 Start Planning]                │
│  ← or "Re-Plan" if already planned  │
│  ← or spinner + "Planning..." while │
│    skill is executing                │
│                                      │
│  ⏱ Time Tracking                    │
│  ...                                 │
└──────────────────────────────────────┘
```

**"Start Planning" button behavior:**
1. Click → button becomes "Planning..." with spinner
2. Task planning_status → `planning`
3. Card shows green pulsing "PLANNING" badge
4. Skill executes via IPC (may take minutes)
5. Output appended to task notes (prefixed with `--- Planning Output ---`)
6. Task planning_status → `planned`
7. Button becomes "Re-Plan" for subsequent runs

---

## Implementation Phases

### Phase A: Data Model + API (~2h estimated)
- [ ] Add `projects`, `category_settings`, `task_projects` to Prisma schema
- [ ] Add `planningStatus` enum + field to tasks
- [ ] Run migration
- [ ] Implement Projects CRUD endpoints (with path validation via IPC)
- [ ] Implement Category Settings endpoints (with skill validation via IPC)
- [ ] Extend task create/update to accept projectIds
- [ ] Add PATCH /tasks/:id/planning-status endpoint
- [ ] Include projects + planningStatus in task responses

### Phase B: Electron IPC — Validation + Execution (~1.5h estimated)
- [ ] `path:validate` — fs.existsSync check
- [ ] `path:pick` — dialog.showOpenDialog for folder picker
- [ ] `skill:validate` — spawn claude and check skill exists
- [ ] `skill:execute` — spawn claude with skill + context + cwd
- [ ] Preload: expose new IPC channels

### Phase C: Profile Page — Projects + Category Settings (~2h estimated)
- [ ] Projects section: list, add (with Browse button), edit, delete
- [ ] Path validation on save (via IPC)
- [ ] Category planning section: toggle per category + skill name input
- [ ] Skill name validation on save (via IPC)
- [ ] Save settings to API

### Phase D: Task Creation + Detail Integration (~2h estimated)
- [ ] CreateTaskModal: detect planning-enabled category, show project multi-select + skill badge
- [ ] TaskDetailPanel: show projects, skill name, "Start Planning" button
- [ ] TaskDetailPanel: planning execution with status updates
- [ ] TaskDetailPanel: append output to notes
- [ ] TaskCard: show planning badge (PLANNING pulsing / PLANNED static)

### Total estimated: ~7.5h

---

## Decisions Made

1. **Multi-repo**: Skill executes in the primary project directory; all repo paths are passed as context in the prompt so the skill can reference them.
2. **Skill output**: Stored in task notes field (appended with a separator). This keeps it simple and visible.
3. **Skill validation**: Yes — validated on save by checking available skills via Claude CLI.
4. **Path validation**: Yes — validated on save via `fs.existsSync` through IPC.
5. **Planning trigger**: Manual "Start Planning" button in task detail (not auto on In Progress), since the user may want to review/edit task details before planning.
6. **Planning badge**: Green pulsing while executing, green static when complete.
