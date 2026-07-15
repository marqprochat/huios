import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';
import { ApiError } from '@/services/api';
import { getMe } from '@/services/auth';

const TOKEN_KEY = 'huios_jwt';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrateProfile: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, user });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null });
  },

  hydrateProfile: async () => {
    if (!get().token) return;

    try {
      const user = await getMe();
      set({ user });
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'http' &&
        (error.status === 401 || error.status === 403)) {
        await get().clearAuth();
      }
    }
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        set({ token });
        await get().hydrateProfile();
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
