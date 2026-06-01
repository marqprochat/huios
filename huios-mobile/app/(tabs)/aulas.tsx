import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LessonCard } from '@/components/LessonCard';
import { getAulas } from '@/services/aulas';
import type { Lesson } from '@/types';

function groupByDate(lessons: Lesson[]): Record<string, Lesson[]> {
  return lessons.reduce((acc, lesson) => {
    const date = lesson.date?.split('T')[0] ?? 'sem-data';
    acc[date] = acc[date] ? [...acc[date], lesson] : [lesson];
    return acc;
  }, {} as Record<string, Lesson[]>);
}

export default function AulasScreen() {
  const { data: aulas = [], isLoading, refetch } = useQuery({
    queryKey: ['aulas'],
    queryFn: getAulas,
  });

  const grouped = groupByDate([...aulas].sort((a, b) => a.date?.localeCompare(b.date ?? '') ?? 0));
  const sortedDates = Object.keys(grouped).sort();

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Aulas" subtitle={`${aulas.length} aulas no total`} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#135bec" />}
      >
        {sortedDates.length === 0 && !isLoading && (
          <Text className="text-center text-slate-400 mt-10">Nenhuma aula encontrada.</Text>
        )}
        {sortedDates.map((date) => (
          <View key={date} className="mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
            {grouped[date].map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
