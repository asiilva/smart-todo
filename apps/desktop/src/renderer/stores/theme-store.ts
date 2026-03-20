import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: localStorage.getItem('theme') === 'dark',
  toggle: () => {
    const next = !get().isDark;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDark: next });
  },
}));

// Initialize on load
if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}
