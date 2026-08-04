import { useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AppIcon } from '@/components/AppIcon';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getProvaTeacherEvaluation, getProvas, submitProvaTeacherEvaluation } from '@/services/provas';
import { formatExamAvailability, formatExamDeadline } from '@/utils/academic';

export default function ProvasScreen() {
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const router = useRouter();
  const query = useQuery({ queryKey: ['provas'], queryFn: getProvas });
  const [evaluation, setEvaluation] = useState<{ examId: string; disciplineName: string; teacherName: string } | null>(null);
  const [ratings, setRatings] = useState({ clarity: '', engagement: '', mastery: '', observations: '' });
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);
  const exams = (query.data ?? []).filter(item => tab === 'done' ? item.attemptStatus === 'SUBMITTED' || Boolean(item.submission?.submittedAt) : item.attemptStatus !== 'SUBMITTED' && !item.submission?.submittedAt);
  async function openExam(exam: (typeof exams)[number]) {
    try {
      const result = await getProvaTeacherEvaluation(exam.id);
      if (result.available) {
        setRatings({ clarity: '', engagement: '', mastery: '', observations: '' });
        setEvaluation({ examId: exam.id, disciplineName: result.disciplineName, teacherName: result.teacherName });
      } else router.push(`/provas/${exam.id}`);
    } catch (error) { Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível verificar a avaliação.'); }
  }
  async function finishEvaluation() {
    if (!evaluation || !ratings.clarity || !ratings.engagement || !ratings.mastery) return;
    setSubmittingEvaluation(true);
    try {
      await submitProvaTeacherEvaluation(evaluation.examId, ratings);
      const examId = evaluation.examId;
      setEvaluation(null);
      router.push(`/provas/${examId}`);
    } catch (error) { Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível enviar a avaliação.'); }
    finally { setSubmittingEvaluation(false); }
  }
  return <View className="flex-1 bg-slate-50">
    <ScreenHeader title="Provas" subtitle={`${(query.data ?? []).filter(item => item.attemptStatus !== 'SUBMITTED' && !item.submission?.submittedAt).length} pendentes`} />
    <View className="mx-4 mt-4 flex-row rounded-xl bg-slate-200 p-1" accessibilityRole="tablist">
      {([['pending', 'Pendentes'], ['done', 'Realizadas']] as const).map(([key, label]) => <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} className={`min-h-11 flex-1 items-center justify-center rounded-lg ${tab === key ? 'bg-white' : ''}`}><Text className={tab === key ? 'font-semibold text-primary' : 'text-slate-600'}>{label}</Text></TouchableOpacity>)}
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isLoading ? <LoadingSkeleton count={3} /> : query.isError ? <ErrorState message="Não foi possível carregar as provas." onRetry={query.refetch} /> : exams.length === 0 ? <EmptyState title={tab === 'pending' ? 'Nenhuma prova pendente' : 'Nenhuma prova realizada'} message="As avaliações aparecerão aqui." /> : exams.map(exam => {
        const availability = formatExamAvailability(exam);
        return <View key={exam.id} className="mb-3 rounded-2xl border border-slate-100 bg-white p-4">
          <Text className="text-base font-bold text-slate-900">{exam.title}</Text>
          <Text className="mt-1 text-sm text-slate-500">{exam.discipline?.name ?? 'Disciplina não informada'}</Text>
          <View className="mt-3 flex-row items-center gap-2"><AppIcon name="schedule" size={16} /><Text className={availability === 'Disponível' ? 'text-sm text-amber-700' : 'text-sm text-slate-600'}>{availability === 'Disponível' ? formatExamDeadline(exam.deadline) : availability}</Text></View>
          {exam.durationMinutes != null && <View className="mt-2 flex-row items-center gap-2"><AppIcon name="timer" size={16} /><Text className="text-sm text-slate-600">{exam.durationMinutes} min</Text></View>}
          {exam.attemptStatus === 'SUBMITTED' || exam.submission?.submittedAt ? <Text className="mt-3 font-bold text-emerald-700">Nota: {exam.submission?.gradeScore?.toFixed(1) ?? 'Aguardando correção'}</Text> : availability === 'Disponível' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${exam.attemptStatus === 'STARTED' ? 'Continuar' : 'Iniciar'} ${exam.title}`} onPress={() => openExam(exam)} className="mt-4 min-h-11 items-center justify-center rounded-xl bg-primary"><Text className="font-semibold text-white">{exam.attemptStatus === 'STARTED' ? 'Continuar' : 'Iniciar'}</Text></TouchableOpacity>}
        </View>;
      })}
    </ScrollView>
    <Modal visible={Boolean(evaluation)} transparent animationType="slide" onRequestClose={() => setEvaluation(null)}>
      <View className="flex-1 justify-end bg-black/40"><View className="rounded-t-3xl bg-white p-6">
        <Text className="text-xl font-bold text-slate-900">Avalie seu professor</Text>
        <Text className="mt-2 text-sm text-slate-600">Antes de iniciar a prova de {evaluation?.disciplineName}, avalie {evaluation?.teacherName}.</Text>
        {(['clarity', 'engagement', 'mastery'] as const).map((key, index) => <View key={key} className="mt-4"><Text className="mb-2 font-semibold text-slate-700">{['Clareza da explicação', 'Engajamento e metodologia', 'Domínio do conteúdo'][index]}</Text><View className="flex-row gap-2">{['EXCELENTE', 'BOA', 'REGULAR', 'RUIM'].map(value => <TouchableOpacity key={value} onPress={() => setRatings(prev => ({ ...prev, [key]: value }))} className={`flex-1 rounded-lg border p-2 ${ratings[key] === value ? 'border-primary bg-primary' : 'border-slate-200'}`}><Text className={`text-center text-xs ${ratings[key] === value ? 'text-white' : 'text-slate-600'}`}>{value}</Text></TouchableOpacity>)}</View></View>)}
        <TextInput value={ratings.observations} onChangeText={observations => setRatings(prev => ({ ...prev, observations }))} placeholder="Observações (opcional)" multiline className="mt-4 min-h-20 rounded-xl border border-slate-200 p-3 text-slate-700" />
        <TouchableOpacity disabled={submittingEvaluation || !ratings.clarity || !ratings.engagement || !ratings.mastery} onPress={finishEvaluation} className={`mt-4 min-h-12 items-center justify-center rounded-xl ${ratings.clarity && ratings.engagement && ratings.mastery ? 'bg-primary' : 'bg-slate-300'}`}><Text className="font-bold text-white">{submittingEvaluation ? 'Enviando...' : 'Enviar e iniciar prova'}</Text></TouchableOpacity>
        <TouchableOpacity disabled={submittingEvaluation} onPress={() => setEvaluation(null)} className="mt-3 min-h-10 items-center justify-center"><Text className="font-semibold text-slate-500">Cancelar</Text></TouchableOpacity>
      </View></View>
    </Modal>
  </View>;
}
