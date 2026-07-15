import { Pressable, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
interface ErrorStateProps { message: string; onRetry: () => void; title?: string }
export function ErrorState({ message, onRetry, title = 'Não foi possível carregar' }: ErrorStateProps) {
  return <View className="items-center rounded-card border border-danger-soft bg-surface px-5 py-8">
    <AppIcon name="error-outline" accessibilityLabel="Erro" color="#b91c1c" size={30} />
    <Text className="mt-3 text-center text-base font-semibold text-slate-900">{title}</Text>
    <Text className="mt-1 text-center text-sm leading-5 text-slate-600">{message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Tentar novamente" className="mt-4 min-h-11 min-w-11 flex-row items-center justify-center gap-2 rounded-button bg-primary px-5 py-2" onPress={onRetry}>
      <AppIcon name="refresh" accessibilityLabel="Recarregar" color="#fff" size={20} /><Text className="font-semibold text-white">Tentar novamente</Text>
    </Pressable>
  </View>;
}
