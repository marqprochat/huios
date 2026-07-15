import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/auth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { getAuthRedirect } from './auth-redirect';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

function AuthGuard() {
  const { token, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  usePushNotifications();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const destination = getAuthRedirect({ token, isLoading, inAuthGroup });
    if (destination) router.replace(destination);
  }, [token, isLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="checkin/[id]"
              options={{ headerShown: true, title: 'Check-in', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen
              name="provas/[id]"
              options={{ headerShown: true, title: 'Prova', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen
              name="frequencia"
              options={{ headerShown: true, title: 'Frequência', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen
              name="boletim"
              options={{ headerShown: true, title: 'Boletim', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen
              name="perfil"
              options={{ headerShown: true, title: 'Perfil', headerBackTitle: 'Voltar' }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
