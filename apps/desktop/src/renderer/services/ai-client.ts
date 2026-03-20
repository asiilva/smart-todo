import type { ElectronAPI } from '../../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export const aiClient = {
  async estimateTask(
    taskTitle: string,
    taskDescription: string,
    userProfile: string,
    history: string,
  ) {
    const result = await window.electronAPI.estimateTask({
      taskTitle,
      taskDescription,
      userProfile,
      history,
    });
    if (!result.success) throw new Error(result.error || 'AI estimation failed');
    return result.data;
  },

  async parseTask(text: string) {
    const result = await window.electronAPI.parseTask({ text });
    if (!result.success) throw new Error(result.error || 'Task parsing failed');
    return result.data;
  },

  async generateProfile(resumeText: string) {
    const result = await window.electronAPI.generateProfile({ resumeText });
    if (!result.success) throw new Error(result.error || 'Profile generation failed');
    return result.data;
  },

  async suggestDayPlan(tasks: unknown, profile: unknown, availability: unknown) {
    const result = await window.electronAPI.suggestDayPlan({ tasks, profile, availability });
    if (!result.success) throw new Error(result.error || 'Day plan suggestion failed');
    return result.data;
  },

  async checkAvailable() {
    return window.electronAPI.checkClaudeAvailable();
  },
};
