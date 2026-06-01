import { View, Text } from 'react-native';

interface Props {
  status: 'OK' | 'NEEDS_JUSTIFICATION' | 'AUTO_FAILED' | 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING';
}

const config: Record<Props['status'], { label: string; className: string }> = {
  OK: { label: 'OK', className: 'bg-emerald-100 text-emerald-700' },
  PRESENT: { label: 'Presente', className: 'bg-emerald-100 text-emerald-700' },
  NEEDS_JUSTIFICATION: { label: 'Justificar', className: 'bg-amber-100 text-amber-700' },
  EXCUSED: { label: 'Justificada', className: 'bg-blue-100 text-blue-700' },
  PENDING: { label: 'Pendente', className: 'bg-slate-100 text-slate-600' },
  ABSENT: { label: 'Ausente', className: 'bg-red-100 text-red-700' },
  AUTO_FAILED: { label: 'Reprovado', className: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? config.PENDING;
  return (
    <View className={`rounded-full px-2 py-0.5 ${className.split(' ')[0]}`}>
      <Text className={`text-xs font-semibold ${className.split(' ')[1]}`}>{label}</Text>
    </View>
  );
}
