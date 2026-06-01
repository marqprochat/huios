import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-white border-b border-slate-100 px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
      <Text className="text-2xl font-bold text-slate-900">{title}</Text>
      {subtitle && <Text className="text-sm text-slate-500 mt-0.5">{subtitle}</Text>}
    </View>
  );
}
