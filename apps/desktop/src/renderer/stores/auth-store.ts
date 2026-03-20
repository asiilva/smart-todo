import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { apiClient } = await import('../services/api-client');
    const response = await apiClient.post('/auth/login', { email, password });
    const { user, tokens } = response.data;

    await window.electronAPI.storeToken({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    set({ user, isAuthenticated: true });
  },

  register: async (data) => {
    const { apiClient } = await import('../services/api-client');
    const response = await apiClient.post('/auth/register', data);
    const { user, tokens } = response.data;

    await window.electronAPI.storeToken({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await window.electronAPI.clearToken();
    set({ user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const result = await window.electronAPI.getToken();
      if (result.success && result.data) {
        const { apiClient } = await import('../services/api-client');
        const response = await apiClient.get('/users/me');
        set({ user: response.data, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: true }),
}));
