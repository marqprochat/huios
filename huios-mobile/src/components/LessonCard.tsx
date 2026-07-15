import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppIcon } from './AppIcon';
import { StatusBadge } from './StatusBadge';
import type { Lesson } from '@/types';
import { formatLessonTime, getLessonTitle } from '@/utils/lesson';

interface Props { lesson: Lesson }

export function LessonCard({ lesson }: Props) {
  const router = useRouter();
  const hasCheckin = lesson.attendance?.checkInAt;
  const status = lesson.attendance?.status;
  const title = getLessonTitle(lesson);
  const timeLabel = lesson.startTime
    ? `${formatLessonTime(lesson.startTime)}${lesson.endTime ? ` – ${formatLessonTime(lesson.endTime)}` : ''}`
    : 'Horário não informado';
  const openCheckin = () => router.push(`/checkin/${lesson.id}`);

  return <View className="mb-3 rounded-card border border-slate-200 bg-surface p-4 shadow-card">
    <View className="mb-2 flex-row items-start justify-between">
      <Text className="mr-2 flex-1 font-semibold text-slate-800">{title}</Text>
      {status ? <StatusBadge status={status} /> : null}
    </View>
    <View className="mt-1 flex-row items-start gap-1.5"><AppIcon name="schedule" accessibilityLabel="Horário" color="#64748b" size={16} /><Text className="flex-1 text-xs text-slate-500">{new Date(lesson.date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} • {timeLabel}</Text></View>
    {lesson.locationName ? <View className="mt-1 flex-row items-start gap-1.5"><AppIcon name="location-on" accessibilityLabel="Local" color="#64748b" size={16} /><Text className="flex-1 text-xs text-slate-500">{lesson.locationName}</Text></View> : null}
    {!hasCheckin && status === 'PENDING' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Fazer check-in em ${title}`} className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-button bg-primary px-4 py-2" onPress={openCheckin}><AppIcon name="login" accessibilityLabel="Check-in" color="#fff" size={20} /><Text className="text-sm font-semibold text-white">Fazer Check-in</Text></TouchableOpacity> : null}
    {hasCheckin && !lesson.attendance?.checkOutAt ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Fazer check-out de ${title}`} className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-button bg-slate-700 px-4 py-2" onPress={openCheckin}><AppIcon name="logout" accessibilityLabel="Check-out" color="#fff" size={20} /><Text className="text-sm font-semibold text-white">Fazer Check-out</Text></TouchableOpacity> : null}
  </View>;
}
