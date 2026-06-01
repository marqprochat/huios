import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAulas } from '@/services/aulas';
import { getBoletim } from '@/services/boletim';
import { getPresenca } from '@/services/presenca';
import { getProvas } from '@/services/provas';
import { LessonCard } from '@/components/LessonCard';
import { GradeBar } from '@/components/GradeBar';
import { useAuthStore } from '@/store/auth';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const today = new Date().toISOString().split('T')[0];

  const {
    data: aulas = [],
    isLoading: loadingAulas,
    refetch: refetchAulas,
  } = useQuery({ queryKey: ['aulas'], queryFn: getAulas });

  const { data: grades = [] } = useQuery({ queryKey: ['boletim'], queryFn: getBoletim });
  const { data: presenca = [] } = useQuery({ queryKey: ['presenca'], queryFn: getPresenca });
  const { data: provas = [] } = useQuery({ queryKey: ['provas'], queryFn: getProvas });

  const todayLessons = aulas.filter((a) => a.date?.startsWith(today));
  const pendingExams = provas.filter((p) => !p.submission);

  const totalLessons = presenca.reduce((acc, p) => acc + p.totalLessons, 0);
  const totalAbsences = presenca.reduce((acc, p) => acc + p.absences, 0);
  const attendanceRate = totalLessons > 0
    ? Math.round(((totalLessons - totalAbsences) / totalLessons) * 100)
    : 100;

  const recentGrades = grades.slice(0, 3);

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={loadingAulas} onRefresh={refetchAulas} tintColor="#135bec" />
      }
    >
      {/* Header */}
      <View className="bg-primary px-5 pb-6" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-white/70 text-sm">Bem-vindo,</Text>
        <Text className="text-white text-2xl font-bold mt-0.5">
          {user?.student?.name?.split(' ')[0] ?? 'Aluno'}
        </Text>
        <Text className="text-white/60 text-xs mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {/* Stats Row */}
      <View className="flex-row mx-4 -mt-5 gap-3">
        <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <Text className="text-xs text-slate-500">Frequência</Text>
          <Text
            className={`text-2xl font-bold mt-1 ${attendanceRate >= 75 ? 'text-emerald-600' : 'text-red-500'}`}
          >
            {attendanceRate}%
          </Text>
          <Text className="text-xs text-slate-400">mín. 75%</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <Text className="text-xs text-slate-500">Provas Pendentes</Text>
          <Text className="text-2xl font-bold mt-1 text-amber-500">{pendingExams.length}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/provas')}>
            <Text className="text-xs text-primary">Ver todas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Lessons */}
      <View className="mx-4 mt-6">
        <Text className="text-base font-bold text-slate-800 mb-3">Aulas de Hoje</Text>
        {todayLessons.length === 0 ? (
          <View className="bg-white rounded-2xl border border-slate-100 p-6 items-center">
            <Text className="text-slate-400 text-sm">Nenhuma aula hoje 🎉</Text>
          </View>
        ) : (
          todayLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
        )}
      </View>

      {/* Recent Grades */}
      {recentGrades.length > 0 && (
        <View className="mx-4 mt-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-slate-800">Notas Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/presenca')}>
              <Text className="text-xs text-primary">Ver boletim</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white rounded-2xl border border-slate-100 p-4 gap-4">
            {recentGrades.map((grade) => (
              <View key={grade.disciplineId}>
                <Text className="text-sm text-slate-700 mb-2">{grade.disciplineName}</Text>
                <GradeBar value={grade.finalGrade ?? grade.value} />
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
