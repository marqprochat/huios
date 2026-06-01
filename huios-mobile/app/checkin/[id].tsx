import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { getAula, checkin, checkout } from '@/services/aulas';

type CheckinState = 'idle' | 'locating' | 'sending' | 'success' | 'error';

export default function CheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['aula', id],
    queryFn: () => getAula(id),
    enabled: !!id,
  });

  const [state, setState] = useState<CheckinState>('idle');
  const [message, setMessage] = useState('');

  const hasCheckin = !!lesson?.attendance?.checkInAt;
  const hasCheckout = !!lesson?.attendance?.checkOutAt;
  const isPresent = lesson?.attendance?.status === 'PRESENT';

  async function handleAction(action: 'checkin' | 'checkout') {
    setState('locating');
    setMessage('');

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState('error');
      setMessage('Permissão de localização negada. Habilite nas configurações do dispositivo.');
      return;
    }

    try {
      setState('locating');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setState('sending');
      const { latitude, longitude } = position.coords;

      if (action === 'checkin') {
        await checkin(id, latitude, longitude);
      } else {
        await checkout(id, latitude, longitude);
      }

      await qc.invalidateQueries({ queryKey: ['aula', id] });
      await qc.invalidateQueries({ queryKey: ['aulas'] });

      setState('success');
      setMessage(action === 'checkin' ? 'Presença confirmada!' : 'Check-out realizado!');
    } catch (err: unknown) {
      setState('error');
      const msg = err instanceof Error ? err.message : 'Erro ao registrar presença';
      setMessage(msg);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#135bec" />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-slate-500">Aula não encontrada.</Text>
      </View>
    );
  }

  const isProcessing = state === 'locating' || state === 'sending';

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 24 }}>
      {/* Lesson Info */}
      <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
        <Text className="text-lg font-bold text-slate-800 mb-1">{lesson.title}</Text>
        {lesson.discipline && (
          <Text className="text-sm text-slate-500 mb-3">{lesson.discipline.name}</Text>
        )}
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="event" size={16} color="#94a3b8" />
            <Text className="text-sm text-slate-600">
              {new Date(lesson.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="schedule" size={16} color="#94a3b8" />
            <Text className="text-sm text-slate-600">{lesson.startTime} – {lesson.endTime}</Text>
          </View>
          {lesson.locationName && (
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="location-on" size={16} color="#94a3b8" />
              <Text className="text-sm text-slate-600">{lesson.locationName}</Text>
            </View>
          )}
          {lesson.radiusMeters && (
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="radar" size={16} color="#94a3b8" />
              <Text className="text-sm text-slate-600">Raio de presença: {lesson.radiusMeters}m</Text>
            </View>
          )}
        </View>
      </View>

      {/* Status */}
      {lesson.attendance && (
        <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Status da Presença
          </Text>
          {lesson.attendance.checkInAt && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-slate-500">Check-in</Text>
              <Text className="text-sm text-slate-800 font-medium">
                {new Date(lesson.attendance.checkInAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          )}
          {lesson.attendance.checkOutAt && (
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Check-out</Text>
              <Text className="text-sm text-slate-800 font-medium">
                {new Date(lesson.attendance.checkOutAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          )}
          {lesson.attendance.distance != null && (
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-slate-500">Distância</Text>
              <Text className="text-sm text-slate-800">{Math.round(lesson.attendance.distance)}m</Text>
            </View>
          )}
        </View>
      )}

      {/* Feedback */}
      {message ? (
        <View className={`rounded-2xl p-4 mb-6 ${state === 'success' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
          <Text className={`text-sm font-medium text-center ${state === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
            {state === 'success' ? '✓ ' : '✗ '}{message}
          </Text>
        </View>
      ) : null}

      {/* Action Button */}
      {!hasCheckout && (
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${isProcessing ? 'bg-slate-300' : !hasCheckin ? 'bg-primary' : 'bg-slate-700'}`}
          onPress={() => handleAction(hasCheckin ? 'checkout' : 'checkin')}
          disabled={isProcessing || (isPresent && hasCheckout)}
        >
          {isProcessing ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-white font-bold">
                {state === 'locating' ? 'Obtendo localização...' : 'Registrando...'}
              </Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-base">
              {!hasCheckin ? '📍 Fazer Check-in' : '🚪 Fazer Check-out'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {hasCheckout && (
        <View className="items-center mt-4">
          <MaterialIcons name="check-circle" size={48} color="#10b981" />
          <Text className="text-emerald-600 font-semibold mt-2">Presença completa registrada</Text>
          <TouchableOpacity className="mt-4" onPress={() => router.back()}>
            <Text className="text-primary font-medium">← Voltar para Aulas</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
