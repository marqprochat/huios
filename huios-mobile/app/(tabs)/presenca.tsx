import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, Alert, Modal } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { getPresenca, uploadJustificativa } from '@/services/presenca';

export default function PresencaScreen() {
  const qc = useQueryClient();
  const { data: presenca = [], isLoading, refetch } = useQuery({
    queryKey: ['presenca'],
    queryFn: getPresenca,
  });

  const [uploading, setUploading] = useState(false);

  async function handleUpload(disciplineId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];

      setUploading(true);
      await uploadJustificativa(disciplineId, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      });
      await qc.invalidateQueries({ queryKey: ['presenca'] });
      Alert.alert('Sucesso', 'Justificativa enviada com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar arquivo';
      Alert.alert('Erro', msg);
    } finally {
      setUploading(false);
    }
  }

  const totalRate = presenca.length > 0
    ? Math.round(presenca.reduce((acc, p) => acc + p.attendanceRate, 0) / presenca.length)
    : 100;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Frequência" subtitle={`Média geral: ${totalRate}%`} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#135bec" />}
      >
        {presenca.length === 0 && !isLoading && (
          <Text className="text-center text-slate-400 mt-10">Sem registros de frequência.</Text>
        )}
        {presenca.map((item) => (
          <View key={item.disciplineId} className="bg-white rounded-2xl border border-slate-100 p-4 mb-3">
            <View className="flex-row justify-between items-start mb-3">
              <Text className="font-semibold text-slate-800 flex-1 mr-2" numberOfLines={2}>
                {item.disciplineName}
              </Text>
              <StatusBadge status={item.status} />
            </View>

            {/* Rate bar */}
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1 bg-slate-100 rounded-full h-2">
                <View
                  className={`h-2 rounded-full ${item.attendanceRate >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(item.attendanceRate, 100)}%` }}
                />
              </View>
              <Text className="text-xs font-semibold text-slate-600 w-10 text-right">
                {item.attendanceRate.toFixed(0)}%
              </Text>
            </View>

            <Text className="text-xs text-slate-500">
              {item.absences} falta{item.absences !== 1 ? 's' : ''} de {item.totalLessons} aula{item.totalLessons !== 1 ? 's' : ''}
            </Text>

            {item.status === 'NEEDS_JUSTIFICATION' && (
              <TouchableOpacity
                className="mt-3 border border-primary rounded-xl py-2.5 items-center"
                onPress={() => handleUpload(item.disciplineId)}
                disabled={uploading}
              >
                <Text className="text-primary font-semibold text-sm">
                  {uploading ? 'Enviando...' : 'Enviar Justificativa'}
                </Text>
              </TouchableOpacity>
            )}

            {item.status === 'AUTO_FAILED' && (
              <View className="mt-3 bg-red-50 rounded-xl p-3">
                <Text className="text-red-600 text-xs font-medium text-center">
                  Reprovado por faltas (≥ 2 faltas)
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
