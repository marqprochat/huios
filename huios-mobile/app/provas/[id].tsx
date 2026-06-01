import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProvaQuestions, submitProva } from '@/services/provas';

export default function ProvaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['prova-questions', id],
    queryFn: () => getProvaQuestions(id),
    enabled: !!id,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const current = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;
  const allAnswered = questions.every((q) => answers[q.id]);

  async function handleSubmit() {
    if (!allAnswered) {
      Alert.alert('Atenção', 'Responda todas as questões antes de enviar.');
      return;
    }
    Alert.alert('Confirmar', 'Deseja enviar a prova? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar', onPress: async () => {
          setSubmitting(true);
          try {
            const result = await submitProva(id, answers) as { score?: number };
            await qc.invalidateQueries({ queryKey: ['provas'] });
            setScore(result?.score ?? null);
            setFinished(true);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao enviar prova';
            Alert.alert('Erro', msg);
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#135bec" />
      </View>
    );
  }

  if (finished) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-6xl mb-4">🎉</Text>
        <Text className="text-2xl font-bold text-slate-800 mb-2">Prova enviada!</Text>
        {score != null && (
          <Text className="text-lg text-slate-600 mb-6">
            Sua nota: <Text className="font-bold text-primary">{score.toFixed(1)}</Text>
          </Text>
        )}
        <TouchableOpacity
          className="bg-primary rounded-2xl px-8 py-3"
          onPress={() => router.replace('/(tabs)/provas')}
        >
          <Text className="text-white font-bold">Voltar para Provas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!current) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-400">Nenhuma questão disponível.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Progress bar */}
      <View className="bg-white border-b border-slate-100 px-4 py-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-xs text-slate-500">
            Questão {currentIndex + 1} de {questions.length}
          </Text>
          <Text className="text-xs text-slate-500">
            {Object.keys(answers).length} respondida{Object.keys(answers).length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View className="bg-slate-100 rounded-full h-2">
          <View className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Question */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Questão {currentIndex + 1}
          </Text>
          <Text className="text-slate-800 text-base leading-relaxed">{current.text}</Text>
        </View>

        {/* Alternatives */}
        {current.alternatives.map((alt, idx) => {
          const selected = answers[current.id] === alt.id;
          return (
            <TouchableOpacity
              key={alt.id}
              className={`rounded-2xl border p-4 mb-3 flex-row items-start gap-3 ${
                selected
                  ? 'bg-primary border-primary'
                  : 'bg-white border-slate-100'
              }`}
              onPress={() => setAnswers((prev) => ({ ...prev, [current.id]: alt.id }))}
            >
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mt-0.5 ${
                selected ? 'border-white bg-white' : 'border-slate-300'
              }`}>
                {selected && <View className="w-3 h-3 rounded-full bg-primary" />}
              </View>
              <Text className={`flex-1 text-sm leading-relaxed ${selected ? 'text-white font-medium' : 'text-slate-700'}`}>
                {String.fromCharCode(65 + idx)}. {alt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 flex-row gap-3">
        {currentIndex > 0 && (
          <TouchableOpacity
            className="flex-1 border border-slate-200 rounded-xl py-3 items-center"
            onPress={() => setCurrentIndex((i) => i - 1)}
          >
            <Text className="text-slate-600 font-semibold">← Anterior</Text>
          </TouchableOpacity>
        )}
        {currentIndex < questions.length - 1 ? (
          <TouchableOpacity
            className="flex-1 bg-primary rounded-xl py-3 items-center"
            onPress={() => setCurrentIndex((i) => i + 1)}
          >
            <Text className="text-white font-semibold">Próxima →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className={`flex-1 rounded-xl py-3 items-center ${allAnswered ? 'bg-emerald-600' : 'bg-slate-300'}`}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold">Enviar Prova</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
