import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAccessToken } from '../lib/api-client';
import type { User } from '@rootlink/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, accessToken) => {
        // The access token is intentionally kept in-memory ONLY (via the
        // api-client module variable) — it is never written to
        // sessionStorage/localStorage, so it cannot be read by an XSS
        // payload that runs after this tab is reloaded (audit fix #2).
        setAccessToken(accessToken);
        set({ user, isAuthenticated: true, isLoading: false });
      },

      setUser: (user) => {
        set({ user });
      },

      clearAuth: () => {
        setAccessToken(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'rootlink-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
      ),
      // Only `user` and `isAuthenticated` are persisted. On reload, the
      // access token is absent from memory; the first authenticated request
      // will 401 and apiFetch's auto-refresh flow will silently obtain a new
      // access token from the httpOnly refresh-token cookie (or, if that
      // cookie is missing/expired, redirect to /login).
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    },
  ),
);
