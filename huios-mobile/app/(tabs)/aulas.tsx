import { useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LessonCard } from '@/components/LessonCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { getAulas } from '@/services/aulas';
import { groupLessonsByDate, groupLessonsByPeriod } from '@/utils/academic';

export default function AulasScreen() {
  const [period, setPeriod] = useState<'upcoming' | 'previous'>('upcoming');
  const query = useQuery({ queryKey: ['aulas'], queryFn: getAulas });
  const lessons = groupLessonsByPeriod(query.data ?? [])[period];
  const groups = groupLessonsByDate(lessons);
  return <View className="flex-1 bg-slate-50"><ScreenHeader title="Aulas" subtitle={`${query.data?.length ?? 0} aulas no total`} />
    <View className="mx-4 mt-4 flex-row rounded-xl bg-slate-200 p-1" accessibilityRole="tablist">
      {([['upcoming','Próximas'],['previous','Anteriores']] as const).map(([key,label]) => <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: period === key }} onPress={() => setPeriod(key)} className={`min-h-11 flex-1 items-center justify-center rounded-lg ${period === key ? 'bg-white' : ''}`}><Text className={period === key ? 'font-semibold text-primary' : 'text-slate-600'}>{label}</Text></TouchableOpacity>)}
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor="#135bec" />}>
      {query.isLoading ? <LoadingSkeleton count={4} /> : query.isError ? <ErrorState message="Não foi possível carregar as aulas." onRetry={query.refetch} /> : lessons.length === 0 ? <EmptyState title={`Nenhuma aula ${period === 'upcoming' ? 'próxima' : 'anterior'}`} message="As aulas aparecerão aqui quando estiverem disponíveis." /> : Object.entries(groups).map(([date, items]) => <View key={date} className="mb-5"><Text className="mb-2 text-sm font-semibold text-slate-600">{new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</Text>{items.map(item => <LessonCard key={item.id} lesson={item} />)}</View>)}
    </ScrollView></View>;
}
