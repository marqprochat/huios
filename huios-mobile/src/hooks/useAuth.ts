import { useAuthStore } from '@/store/auth';
import { loginAluno } from '@/services/auth';
import { removePushToken } from '@/services/notifications';
import * as SecureStore from 'expo-secure-store';

const PUSH_TOKEN_KEY = 'huios_push_token';

export function useAuth() {
  const { token, user, isLoading, setAuth, clearAuth, hydrateProfile } = useAuthStore();

  async function login(email: string, password: string) {
    const { token: newToken, user: newUser } = await loginAluno(email, password);
    await setAuth(newToken, newUser);
    await hydrateProfile();
  }

  async function logout() {
    try {
      const pushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
      if (pushToken) {
        await removePushToken(pushToken);
        await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
      }
    } catch {
      // ignore push token cleanup errors
    }
    await clearAuth();
  }

  return { token, user, isLoading, login, logout, hydrateProfile };
}
