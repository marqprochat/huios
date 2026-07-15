import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';
import { ApiError } from '@/services/api';
import { getMe } from '@/services/auth';

const TOKEN_KEY = 'huios_jwt';

let tokenStorageQueue: Promise<void> = Promise.resolve();

function enqueueTokenStorage(operation: () => Promise<void>): Promise<void> {
  const result = tokenStorageQueue.then(operation, operation);
  tokenStorageQueue = result.catch(() => undefined);
  return result;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  clearAuthIfToken: (token: string) => Promise<void>;
  hydrateProfile: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token, user) => {
    set({ token, user });
    await enqueueTokenStorage(() => SecureStore.setItemAsync(TOKEN_KEY, token));
  },

  clearAuth: async () => {
    set({ token: null, user: null });
    await enqueueTokenStorage(() => SecureStore.deleteItemAsync(TOKEN_KEY));
  },

  clearAuthIfToken: async (token) => {
    await enqueueTokenStorage(async () => {
      if (get().token !== token) return;

      await SecureStore.deleteItemAsync(TOKEN_KEY);
      if (get().token === token) {
        set({ token: null, user: null });
      }
    });
  },

  hydrateProfile: async () => {
    const hydrationToken = get().token;
    if (!hydrationToken) return;

    try {
      const user = await getMe();
      if (get().token === hydrationToken) {
        set({ user });
      }
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'http' &&
        (error.status === 401 || error.status === 403) &&
        get().token === hydrationToken) {
        await get().clearAuthIfToken(hydrationToken);
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
