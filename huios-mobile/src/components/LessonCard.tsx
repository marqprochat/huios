import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBadge } from './StatusBadge';
import type { Lesson } from '@/types';

interface Props {
  lesson: Lesson;
}

export function LessonCard({ lesson }: Props) {
  const router = useRouter();
  const hasCheckin = lesson.attendance?.checkInAt;
  const status = lesson.attendance?.status;

  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-semibold text-slate-800 flex-1 mr-2" numberOfLines={2}>
          {lesson.title}
        </Text>
        {status && <StatusBadge status={status} />}
      </View>

      {lesson.discipline && (
        <Text className="text-xs text-slate-500 mb-1">{lesson.discipline.name}</Text>
      )}

      <Text className="text-xs text-slate-500">
        {new Date(lesson.date).toLocaleDateString('pt-BR')} • {lesson.startTime} – {lesson.endTime}
      </Text>

      {lesson.locationName && (
        <Text className="text-xs text-slate-400 mt-1">📍 {lesson.locationName}</Text>
      )}

      {!hasCheckin && status === 'PENDING' && (
        <TouchableOpacity
          className="mt-3 bg-primary rounded-xl py-2 items-center"
          onPress={() => router.push(`/checkin/${lesson.id}`)}
        >
          <Text className="text-white font-semibold text-sm">Fazer Check-in</Text>
        </TouchableOpacity>
      )}

      {hasCheckin && !lesson.attendance?.checkOutAt && (
        <TouchableOpacity
          className="mt-3 bg-slate-700 rounded-xl py-2 items-center"
          onPress={() => router.push(`/checkin/${lesson.id}`)}
        >
          <Text className="text-white font-semibold text-sm">Fazer Check-out</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
