import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  estimateTask: (data: {
    taskTitle: string;
    taskDescription: string;
    userProfile: string;
    history: string;
  }) => ipcRenderer.invoke('ai:estimate-task', data),

  parseTask: (data: { text: string }) => ipcRenderer.invoke('ai:parse-task', data),

  generateProfile: (data: { resumeText: string }) =>
    ipcRenderer.invoke('ai:generate-profile', data),

  suggestDayPlan: (data: { tasks: unknown; profile: unknown; availability: unknown }) =>
    ipcRenderer.invoke('ai:suggest-day-plan', data),

  checkClaudeAvailable: () => ipcRenderer.invoke('ai:check-available'),

  storeToken: (data: { accessToken: string; refreshToken?: string }) =>
    ipcRenderer.invoke('auth:store-token', data),

  getToken: () => ipcRenderer.invoke('auth:get-token'),

  clearToken: () => ipcRenderer.invoke('auth:clear-token'),

  onOAuthCallback: (callback: (data: { token: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { token: string }) =>
      callback(data);
    ipcRenderer.on('auth:oauth-callback', handler);
    return () => ipcRenderer.removeListener('auth:oauth-callback', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
