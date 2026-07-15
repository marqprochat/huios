import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuRow } from '@/components/MenuRow';
import type { AppIconName } from '@/components/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName, getInitials } from '@/utils/user';

export const MORE_DESTINATIONS: ReadonlyArray<{
  label: string;
  description: string;
  route: Href;
  icon: AppIconName;
}> = [
  { label: 'Frequência', description: 'Acompanhe presenças e faltas', route: '/frequencia', icon: 'fact-check' },
  { label: 'Boletim', description: 'Consulte suas notas por disciplina', route: '/boletim', icon: 'school' },
  { label: 'Perfil', description: 'Veja seus dados acadêmicos e pessoais', route: '/perfil', icon: 'person' },
];

export default function MaisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const name = getDisplayName(user);

  function confirmLogout() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="border-b border-slate-100 bg-surface px-5 pb-5" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-2xl font-bold text-slate-900">Mais</Text>
        <View className="mt-4 min-w-0 flex-row items-center">
          <View className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary" accessible accessibilityRole="image" accessibilityLabel={`Iniciais de ${name}`}>
            <Text className="text-base font-bold text-white">{getInitials(user)}</Text>
          </View>
          <View className="ml-3 min-w-0 flex-1">
            <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>{name}</Text>
            <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={2}>{user?.email ?? 'E-mail não informado'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
        <View className="gap-3">
          {MORE_DESTINATIONS.map((item) => (
            <MenuRow key={item.label} {...item} onPress={() => router.push(item.route)} />
          ))}
        </View>
        <View className="mt-6 border-t border-slate-200 pt-6">
          <MenuRow icon="logout" label="Sair da conta" description="Encerre sua sessão neste dispositivo" danger onPress={confirmLogout} />
        </View>
      </ScrollView>
    </View>
  );
}
