import { spawn } from 'child_process';

const CLI_TIMEOUT_MS = 60_000;

export interface ClaudeCliOptions {
  prompt: string;
  timeout?: number;
}

export async function callClaude(options: ClaudeCliOptions): Promise<string> {
  const { prompt, timeout = CLI_TIMEOUT_MS } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', '--output-format', 'json'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

export async function isClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

export async function estimateTask(
  taskTitle: string,
  taskDescription: string,
  userProfile: string,
  history: string,
): Promise<string> {
  const prompt = `You are a task estimation assistant. Analyze this task and provide a time estimate.

Task: ${taskTitle}
Description: ${taskDescription || 'No description provided'}

User Profile: ${userProfile}

Historical accuracy data: ${history || 'No history available'}

Respond with valid JSON only:
{
  "projectedDurationMinutes": <number>,
  "confidence": <0-1>,
  "reasoning": "<brief explanation>",
  "suggestedPriority": "<low|medium|high|critical>",
  "suggestedCategory": "<category>",
  "suggestedLabels": ["<label>"]
}`;

  return callClaude({ prompt });
}

export async function parseTaskFromText(text: string): Promise<string> {
  const prompt = `Parse the following text into a structured task. Extract the title, description, priority, category, and any labels.

Text: "${text}"

Respond with valid JSON only:
{
  "title": "<task title>",
  "description": "<optional description>",
  "priority": "<low|medium|high|critical>",
  "category": "<work|exercise|family|personal|errand|learning>",
  "labels": ["<label>"]
}`;

  return callClaude({ prompt });
}

export async function generateTechProfile(resumeText: string): Promise<string> {
  const prompt = `Analyze the following resume/profile text and extract a structured technical profile.

Text: "${resumeText}"

Respond with valid JSON only:
{
  "languages": [{"name": "<lang>", "proficiency": "<beginner|intermediate|senior|expert>"}],
  "frameworks": [{"name": "<framework>", "proficiency": "<beginner|intermediate|senior|expert>"}],
  "domains": ["<domain>"],
  "yearsOfExperience": <number>
}`;

  return callClaude({ prompt });
}

export async function suggestDayPlan(
  tasks: string,
  profile: string,
  availability: string,
): Promise<string> {
  const prompt = `You are a daily planning assistant. Given the user's tasks, profile, and availability, suggest an optimal schedule.

Tasks: ${tasks}
User Profile: ${profile}
Availability: ${availability}

Respond with valid JSON only:
{
  "scheduledTasks": [{"taskId": "<id>", "startTime": "HH:mm", "endTime": "HH:mm"}],
  "suggestions": ["<suggestion>"],
  "warnings": ["<warning if overbooked>"]
}`;

  return callClaude({ prompt });
}
