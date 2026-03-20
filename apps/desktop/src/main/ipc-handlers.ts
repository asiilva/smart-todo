import { ipcMain, safeStorage } from 'electron';
import {
  isClaudeAvailable,
  estimateTask,
  parseTaskFromText,
  generateTechProfile,
  suggestDayPlan,
} from './claude-cli';

const TOKEN_KEY = 'smart-todo-auth-token';
const REFRESH_TOKEN_KEY = 'smart-todo-refresh-token';

const tokenStore = new Map<string, Buffer>();

export function registerIpcHandlers() {
  ipcMain.handle('ai:check-available', async () => {
    return isClaudeAvailable();
  });

  ipcMain.handle(
    'ai:estimate-task',
    async (_event, { taskTitle, taskDescription, userProfile, history }) => {
      console.log('[AI] estimate-task called:', { taskTitle, taskDescription });
      try {
        const result = await estimateTask(taskTitle, taskDescription, userProfile, history);
        console.log('[AI] estimate-task raw result:', result);
        const parsed = JSON.parse(result);
        console.log('[AI] estimate-task parsed:', parsed);
        return { success: true, data: parsed };
      } catch (error) {
        console.error('[AI] estimate-task error:', (error as Error).message);
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle('ai:parse-task', async (_event, { text }) => {
    try {
      const result = await parseTaskFromText(text);
      return { success: true, data: JSON.parse(result) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('ai:generate-profile', async (_event, { resumeText }) => {
    try {
      const result = await generateTechProfile(resumeText);
      return { success: true, data: JSON.parse(result) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(
    'ai:suggest-day-plan',
    async (_event, { tasks, profile, availability }) => {
      try {
        const result = await suggestDayPlan(
          JSON.stringify(tasks),
          JSON.stringify(profile),
          JSON.stringify(availability),
        );
        return { success: true, data: JSON.parse(result) };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  ipcMain.handle('auth:store-token', async (_event, { accessToken, refreshToken }) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        tokenStore.set(TOKEN_KEY, safeStorage.encryptString(accessToken));
        if (refreshToken) {
          tokenStore.set(REFRESH_TOKEN_KEY, safeStorage.encryptString(refreshToken));
        }
      } else {
        tokenStore.set(TOKEN_KEY, Buffer.from(accessToken));
        if (refreshToken) {
          tokenStore.set(REFRESH_TOKEN_KEY, Buffer.from(refreshToken));
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:get-token', async () => {
    try {
      const encryptedAccess = tokenStore.get(TOKEN_KEY);
      const encryptedRefresh = tokenStore.get(REFRESH_TOKEN_KEY);

      if (!encryptedAccess) {
        return { success: true, data: null };
      }

      const accessToken = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(encryptedAccess)
        : encryptedAccess.toString();

      const refreshToken = encryptedRefresh
        ? safeStorage.isEncryptionAvailable()
          ? safeStorage.decryptString(encryptedRefresh)
          : encryptedRefresh.toString()
        : null;

      return { success: true, data: { accessToken, refreshToken } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:clear-token', async () => {
    tokenStore.delete(TOKEN_KEY);
    tokenStore.delete(REFRESH_TOKEN_KEY);
    return { success: true };
  });
}
