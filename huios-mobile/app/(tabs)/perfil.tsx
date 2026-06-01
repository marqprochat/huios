import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getBoletim } from '@/services/boletim';
import { getPresenca } from '@/services/presenca';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const { data: grades = [] } = useQuery({ queryKey: ['boletim'], queryFn: getBoletim });
  const { data: presenca = [] } = useQuery({ queryKey: ['presenca'], queryFn: getPresenca });

  const totalAbsences = presenca.reduce((acc, p) => acc + p.absences, 0);
  const avgGrade = grades.length > 0
    ? (grades.reduce((acc, g) => acc + (g.finalGrade ?? g.value ?? 0), 0) / grades.length).toFixed(1)
    : '—';

  const enrollment = user?.student?.enrollments?.[0];

  function confirmLogout() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Meu Perfil" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Avatar + name */}
        <View className="items-center mb-6 mt-2">
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-3">
            <Text className="text-white text-3xl font-bold">
              {user?.student?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </Text>
          </View>
          <Text className="text-xl font-bold text-slate-800">{user?.student?.name ?? 'Aluno'}</Text>
          <Text className="text-sm text-slate-500 mt-0.5">{user?.email}</Text>
        </View>

        {/* Course info */}
        {enrollment && (
          <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Curso
            </Text>
            <Text className="font-semibold text-slate-800">{enrollment.courseClass.course.name}</Text>
            <Text className="text-sm text-slate-500 mt-0.5">{enrollment.courseClass.name}</Text>
            <View className="mt-2 self-start bg-emerald-100 rounded-full px-3 py-1">
              <Text className="text-xs font-semibold text-emerald-700">{enrollment.status}</Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-4 items-center">
            <Text className="text-2xl font-bold text-primary">{avgGrade}</Text>
            <Text className="text-xs text-slate-500 mt-1">Média Geral</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-4 items-center">
            <Text className="text-2xl font-bold text-amber-500">{totalAbsences}</Text>
            <Text className="text-xs text-slate-500 mt-1">Faltas Totais</Text>
          </View>
        </View>

        {/* Info fields */}
        {user?.student?.phone && (
          <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Contato
            </Text>
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500">Telefone</Text>
              <Text className="text-sm text-slate-800">{user.student.phone}</Text>
            </View>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-2xl py-4 items-center mt-2"
          onPress={confirmLogout}
        >
          <Text className="text-red-600 font-semibold">Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
