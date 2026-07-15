import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/auth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { getAuthRedirect } from './auth-redirect';
import { ROOT_NAVIGATION_SETTINGS, returnFromSecondaryScreen } from './secondary-navigation';

export const unstable_settings = ROOT_NAVIGATION_SETTINGS;

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
  const router = useRouter();

  const secondaryOptions = (title: string) => ({
    headerShown: true,
    title,
    headerBackVisible: false,
    headerLeft: ({ tintColor }: { tintColor?: string }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar para Mais"
        hitSlop={8}
        onPress={() => returnFromSecondaryScreen(router)}
        style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' as const }}
      >
        <MaterialIcons name="arrow-back" size={24} color={tintColor ?? '#135bec'} accessible={false} />
      </Pressable>
    ),
  });

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
              options={secondaryOptions('Frequência')}
            />
            <Stack.Screen
              name="boletim"
              options={secondaryOptions('Boletim')}
            />
            <Stack.Screen
              name="perfil"
              options={secondaryOptions('Perfil')}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
