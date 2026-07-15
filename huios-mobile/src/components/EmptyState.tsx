import { Text, View } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';
interface EmptyStateProps { title: string; message: string; icon?: AppIconName; accessibilityLabel?: string }
export function EmptyState({ title, message, icon = 'inbox', accessibilityLabel }: EmptyStateProps) {
  return <View className="items-center rounded-card border border-slate-200 bg-surface px-5 py-8">
    <View className="mb-3 rounded-full bg-primary-soft p-3"><AppIcon name={icon} accessibilityLabel={accessibilityLabel ?? title} color="#135bec" size={28} /></View>
    <Text className="text-center text-base font-semibold text-slate-900">{title}</Text>
    <Text className="mt-1 max-w-sm text-center text-sm leading-5 text-slate-500">{message}</Text>
  </View>;
}
