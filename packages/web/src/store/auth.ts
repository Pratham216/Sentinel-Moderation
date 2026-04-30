import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken } from '@/lib/api';

interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string; name: string; globalRole: string; avatarUrl?: string } | null;
  setAuth: (token: string, user: AuthState['user']) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (token, user) => {
        setAccessToken(token);
        set({ accessToken: token, user });
      },
      clearAuth: () => {
        setAccessToken(null);
        set({ accessToken: null, user: null });
      },
    }),
    {
      name: 'nebula-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
      },
    }
  )
);
