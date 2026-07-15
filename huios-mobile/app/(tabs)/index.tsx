import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LessonCard } from '@/components/LessonCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { MetricCard } from '@/components/MetricCard';
import { AppIcon } from '@/components/AppIcon';
import { getAulas } from '@/services/aulas';
import { getPresenca } from '@/services/presenca';
import { getProvas } from '@/services/provas';
import { useAuthStore } from '@/store/auth';
import { getDisplayName, getInitials } from '@/utils/user';
import type { AbsenceSummary, Enrollment, Exam, Lesson } from '@/types';

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const cardHorizontalMargin = 32;
const cardGap = 12;
const metricCardMinWidth = 160;

export function getSaoPauloDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function formatLessonTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

export function sortLessonsByStartTime(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((left, right) => {
    const leftTime = new Date(left.startTime).getTime();
    const rightTime = new Date(right.startTime).getTime();
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) return leftTime - rightTime;
    return left.startTime.localeCompare(right.startTime);
  });
}

export const shouldStackCards = (screenWidth: number): boolean =>
  (screenWidth - cardHorizontalMargin - cardGap) / 2 < metricCardMinWidth;

export function getAttendanceMetric(items: AbsenceSummary[]): {
  value: string; status: 'neutral' | 'positive' | 'danger'; statusLabel: string;
} {
  const totalLessons = items.reduce((sum, item) => sum + item.totalLessons, 0);
  if (totalLessons === 0) return { value: '—', status: 'neutral', statusLabel: 'Sem dados' };
  const totalAbsences = items.reduce((sum, item) => sum + item.absences, 0);
  const rate = Math.round(((totalLessons - totalAbsences) / totalLessons) * 100);
  return {
    value: `${rate}%`, status: rate >= 75 ? 'positive' : 'danger',
    statusLabel: rate >= 75 ? 'Dentro da meta' : 'Abaixo da meta',
  };
}

export function getActiveEnrollmentLabel(enrollments: Enrollment[] = []): string {
  const enrollment = enrollments.find((item) => item.status === 'CURSANDO');
  return enrollment
    ? `${enrollment.courseClass.course.name} • ${enrollment.courseClass.name}`
    : 'Matrícula ativa não encontrada';
}

export function countActionableExams(exams: Exam[], now = new Date()): number {
  const nowTime = now.getTime();
  return exams.filter((exam) => {
    if (exam.submission || !exam.startDate || !exam.deadline) return false;
    const start = new Date(exam.startDate).getTime();
    const end = new Date(exam.deadline).getTime();
    return !Number.isNaN(start) && !Number.isNaN(end) && start <= nowTime && nowTime <= end;
  }).length;
}

const formatToday = () => new Date().toLocaleDateString('pt-BR', {
  timeZone: SAO_PAULO_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long',
});

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const displayName = getDisplayName(user);
  const firstName = displayName.split(/\s+/)[0];
  const enrollmentLabel = getActiveEnrollmentLabel(user?.student?.enrollments);
  const today = getSaoPauloDateKey(new Date());

  const aulasQuery = useQuery({ queryKey: ['aulas'], queryFn: getAulas });
  const presencaQuery = useQuery({ queryKey: ['presenca'], queryFn: getPresenca });
  const provasQuery = useQuery({ queryKey: ['provas'], queryFn: getProvas });
  const todayLessons = sortLessonsByStartTime((aulasQuery.data ?? [])
    .filter((lesson) => getSaoPauloDateKey(new Date(lesson.date)) === today));
  const normalizedTodayLessons = todayLessons.map((lesson) => ({
    ...lesson, startTime: formatLessonTime(lesson.startTime), endTime: formatLessonTime(lesson.endTime),
  }));
  const actionableExams = countActionableExams(provasQuery.data ?? []);
  const attendance = getAttendanceMetric(presencaQuery.data ?? []);
  const metricsLoading = presencaQuery.isLoading || provasQuery.isLoading;
  const metricsError = presencaQuery.isError || provasQuery.isError;
  const refreshing = aulasQuery.isFetching || presencaQuery.isFetching || provasQuery.isFetching;
  const metricsStacked = shouldStackCards(width);

  const refreshAll = () => {
    void Promise.all([aulasQuery.refetch(), presencaQuery.refetch(), provasQuery.refetch()]);
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#135bec" />}
    >
      <View className="bg-primary px-5 pb-10" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold text-white">Olá, {firstName}</Text>
            <Text className="mt-1 text-sm capitalize text-white/80">{formatToday()}</Text>
          </View>
          <View
            accessible
            accessibilityLabel={`Avatar de ${displayName}`}
            className="h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-white/20"
          >
            <Text className="text-lg font-bold text-white">{getInitials(user)}</Text>
          </View>
        </View>
        <View className="mt-5 flex-row items-start gap-2">
          <AppIcon name="school" accessibilityLabel="Matrícula" color="#fff" size={18} />
          <Text className="min-w-0 flex-1 text-sm leading-5 text-white/90">{enrollmentLabel}</Text>
        </View>
      </View>

      <View className="mx-4 -mt-5">
        {metricsLoading ? <LoadingSkeleton count={2} /> : metricsError ? (
          <ErrorState message="Não foi possível carregar seu resumo acadêmico." onRetry={() => {
            void presencaQuery.refetch(); void provasQuery.refetch();
          }} />
        ) : (
          <View className={`${metricsStacked ? 'flex-col' : 'flex-row'} gap-3`}>
            <MetricCard
              icon="how-to-reg"
              label="Frequência geral"
              value={attendance.value}
              status={attendance.status}
              statusLabel={attendance.statusLabel}
              supportingText="Mínimo recomendado: 75%"
            />
            <MetricCard
              icon="assignment"
              label="Provas pendentes"
              value={String(actionableExams)}
              status={actionableExams > 0 ? 'warning' : 'positive'}
              statusLabel={actionableExams > 0 ? 'Requer atenção' : 'Tudo em dia'}
            />
          </View>
        )}
      </View>

      <View className="mx-4 mt-6">
        <Text className="mb-3 text-lg font-bold text-slate-900">Aulas de hoje</Text>
        {aulasQuery.isLoading ? <LoadingSkeleton count={2} /> : aulasQuery.isError ? (
          <ErrorState
            message="Não foi possível carregar as aulas de hoje."
            onRetry={() => { void aulasQuery.refetch(); }}
          />
        ) : normalizedTodayLessons.length === 0 ? (
          <EmptyState title="Nenhuma aula hoje" message="Sua agenda está livre por enquanto." icon="event-available" />
        ) : normalizedTodayLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
      </View>

      <View className="mx-4 mt-6">
        <Text className="mb-3 text-lg font-bold text-slate-900">Acesso rápido</Text>
        <View className={`${metricsStacked ? 'flex-col' : 'flex-row'} gap-3`}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver provas"
            className="min-h-11 flex-1 flex-row items-center gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card"
            onPress={() => router.push('/(tabs)/provas')}
          >
            <View className="rounded-full bg-primary-soft p-2"><AppIcon name="assignment" color="#135bec" /></View>
            <Text className="flex-1 font-semibold text-primary">Ver provas</Text>
            <AppIcon name="chevron-right" color="#135bec" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver boletim"
            className="min-h-11 flex-1 flex-row items-center gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-card"
            onPress={() => router.push('/boletim')}
          >
            <View className="rounded-full bg-primary-soft p-2"><AppIcon name="analytics" color="#135bec" /></View>
            <Text className="flex-1 font-semibold text-primary">Ver boletim</Text>
            <AppIcon name="chevron-right" color="#135bec" />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
