import { View, Text } from 'react-native';

interface Props {
  value?: number;
  max?: number;
}

export function GradeBar({ value, max = 10 }: Props) {
  if (value == null) {
    return <Text className="text-slate-400 text-sm">—</Text>;
  }

  const pct = Math.min((value / max) * 100, 100);
  const color = value >= 7 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1 bg-slate-100 rounded-full h-2">
        <View className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </View>
      <Text className="text-sm font-semibold text-slate-700 w-8 text-right">
        {value.toFixed(1)}
      </Text>
    </View>
  );
}
