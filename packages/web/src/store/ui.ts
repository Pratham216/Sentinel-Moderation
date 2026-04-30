import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UiState {
  activeCommunityId: string | null;
  setActiveCommunity: (id: string | null) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeCommunityId: null,
  setActiveCommunity: (id) => set({ activeCommunityId: id }),
  theme: 'dark',
  setTheme: (t) => {
    document.documentElement.classList.toggle('light', t === 'light');
    set({ theme: t });
  },
  toggleTheme: () => {
    const t = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light', t === 'light');
    set({ theme: t });
  },
}));
