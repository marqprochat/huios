import { Pressable, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';
interface MenuRowProps { icon: AppIconName; label: string; description: string; onPress: () => void; danger?: boolean }
export function MenuRow({ icon, label, description, onPress, danger = false }: MenuRowProps) {
  const color = danger ? '#b91c1c' : '#135bec';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${description}`} className="min-h-11 flex-row items-center rounded-card border border-slate-200 bg-surface px-4 py-3" onPress={onPress}>
    <View className={`mr-3 rounded-full p-2 ${danger ? 'bg-danger-soft' : 'bg-primary-soft'}`}><AppIcon name={icon} accessibilityLabel={label} color={color} /></View>
    <View className="min-w-0 flex-1"><Text className={`font-semibold ${danger ? 'text-danger' : 'text-slate-900'}`}>{label}</Text><Text className="mt-0.5 text-sm leading-5 text-slate-500">{description}</Text></View>
    <AppIcon name="chevron-right" accessibilityLabel={`Abrir ${label}`} color="#64748b" />
  </Pressable>;
}
