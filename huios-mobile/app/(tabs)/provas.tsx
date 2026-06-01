import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getProvas } from '@/services/provas';

function formatDeadline(deadline?: string) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Prazo encerrado';
  if (diff === 0) return 'Encerra hoje';
  return `${diff} dia${diff > 1 ? 's' : ''} restante${diff > 1 ? 's' : ''}`;
}

export default function ProvasScreen() {
  const router = useRouter();
  const { data: provas = [], isLoading, refetch } = useQuery({
    queryKey: ['provas'],
    queryFn: getProvas,
  });

  const pending = provas.filter((p) => !p.submission);
  const done = provas.filter((p) => p.submission);

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Provas" subtitle={`${pending.length} pendente${pending.length !== 1 ? 's' : ''}`} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#135bec" />}
      >
        {pending.length > 0 && (
          <View className="mb-6">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Pendentes
            </Text>
            {pending.map((exam) => {
              const countdown = formatDeadline(exam.deadline);
              const isExpired = exam.deadline && new Date(exam.deadline) < new Date();
              return (
                <View key={exam.id} className="bg-white rounded-2xl border border-slate-100 p-4 mb-3">
                  <Text className="font-semibold text-slate-800 mb-1">{exam.title}</Text>
                  {exam.discipline && (
                    <Text className="text-xs text-slate-500 mb-2">{exam.discipline.name}</Text>
                  )}
                  <View className="flex-row justify-between items-center">
                    {countdown && (
                      <Text className={`text-xs ${isExpired ? 'text-red-500' : 'text-amber-600'}`}>
                        ⏱ {countdown}
                      </Text>
                    )}
                    {exam.durationMinutes && (
                      <Text className="text-xs text-slate-400">{exam.durationMinutes} min</Text>
                    )}
                  </View>
                  {!isExpired && (
                    <TouchableOpacity
                      className="mt-3 bg-primary rounded-xl py-2.5 items-center"
                      onPress={() => router.push(`/provas/${exam.id}`)}
                    >
                      <Text className="text-white font-semibold text-sm">Iniciar Prova</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {done.length > 0 && (
          <View>
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Realizadas
            </Text>
            {done.map((exam) => (
              <View key={exam.id} className="bg-white rounded-2xl border border-slate-100 p-4 mb-3 opacity-70">
                <Text className="font-semibold text-slate-800 mb-1">{exam.title}</Text>
                {exam.discipline && (
                  <Text className="text-xs text-slate-500 mb-2">{exam.discipline.name}</Text>
                )}
                {exam.submission?.score != null && (
                  <Text className="text-sm font-bold text-emerald-600">
                    Nota: {exam.submission.score.toFixed(1)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {provas.length === 0 && !isLoading && (
          <Text className="text-center text-slate-400 mt-10">Nenhuma prova disponível.</Text>
        )}
      </ScrollView>
    </View>
  );
}
