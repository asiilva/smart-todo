import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const result = await window.electronAPI.getToken();
    if (result.success && result.data?.accessToken) {
      config.headers.Authorization = `Bearer ${result.data.accessToken}`;
    }
  } catch {
    // No token available
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokenResult = await window.electronAPI.getToken();
        if (tokenResult.success && tokenResult.data?.refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: tokenResult.data.refreshToken,
          });

          const { accessToken, refreshToken } = response.data.tokens;
          await window.electronAPI.storeToken({ accessToken, refreshToken });

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        await window.electronAPI.clearToken();
        window.location.hash = '/login';
      }
    }

    return Promise.reject(error);
  },
);
