import { Text, View } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';

type MetricStatus = 'neutral' | 'positive' | 'warning' | 'danger';
interface MetricCardBaseProps { icon: AppIconName; label: string; value: string; supportingText?: string }
export type MetricCardProps = MetricCardBaseProps & (
  | { status?: 'neutral'; statusLabel?: string }
  | { status: Exclude<MetricStatus, 'neutral'>; statusLabel: string }
);
const statusStyles: Record<MetricStatus, { icon: string; text: string }> = {
  neutral: { icon: '#135bec', text: 'text-slate-600' }, positive: { icon: '#15803d', text: 'text-success' },
  warning: { icon: '#a16207', text: 'text-warning' }, danger: { icon: '#b91c1c', text: 'text-danger' },
};

export function MetricCard({ icon, label, value, status = 'neutral', statusLabel, supportingText }: MetricCardProps) {
  const styles = statusStyles[status];
  return <View className="min-w-40 flex-1 rounded-card border border-slate-200 bg-surface p-4 shadow-card">
    <View className="mb-3 flex-row items-center gap-2"><AppIcon name={icon} accessibilityLabel={label} color={styles.icon} /><Text className="flex-1 text-sm font-medium text-slate-600">{label}</Text></View>
    <Text className="text-2xl font-bold text-slate-900">{value}</Text>
    {statusLabel ? <Text className={`mt-1 text-xs font-semibold ${styles.text}`}>{statusLabel}</Text> : null}
    {supportingText ? <Text className="mt-1 text-xs text-slate-500">{supportingText}</Text> : null}
  </View>;
}
