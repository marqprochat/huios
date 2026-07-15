import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-slate-100 bg-surface px-5 pb-4" style={{ paddingTop: insets.top + 8 }}>
      <Text className="text-2xl font-bold text-slate-900">{title}</Text>
      {subtitle ? <Text className="mt-0.5 text-sm leading-5 text-slate-500">{subtitle}</Text> : null}
    </View>
  );
}
