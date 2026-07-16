import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/api';

export function toLoginMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') {
      return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'E-mail ou senha incorretos.';
    }
  }

  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível entrar no portal. Tente novamente.';
}

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const passwordInput = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleLogin() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail && !password) {
      setFormError('Informe seu e-mail e sua senha.');
      return;
    }
    if (!normalizedEmail) {
      setFormError('Informe seu e-mail.');
      return;
    }
    if (!password) {
      setFormError('Informe sua senha.');
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      await login(normalizedEmail, password);
      router.replace('/(tabs)');
    } catch (error) {
      setFormError(toLoginMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="min-h-52 justify-end overflow-hidden bg-primary-dark px-6 pb-8 pt-8">
            <View className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary opacity-50" />
            <View className="max-w-xl flex-row items-center gap-4 self-center">
              <View className="h-20 w-28 items-center justify-center rounded-2xl bg-white px-3 shadow-sm">
                <Image
                  source={require('../../assets/logo-huios.png')}
                  accessibilityLabel="Logo HuIOS"
                  resizeMode="contain"
                  className="h-14 w-full"
                />
              </View>
              <Text className="flex-shrink text-2xl font-bold text-white">Portal do Aluno</Text>
            </View>
          </View>

          <View className="flex-1 rounded-t-3xl bg-surface px-6 pb-8 pt-8">
            <View className="w-full max-w-xl self-center">
              <Text className="text-2xl font-bold text-slate-900">Boas-vindas</Text>
              <Text className="mb-7 mt-2 text-base leading-6 text-slate-600">
                Entre com seus dados para acompanhar sua vida acadêmica.
              </Text>

              <Text className="mb-2 text-sm font-semibold text-slate-700">E-mail</Text>
              <View className="mb-5 min-h-14 flex-row items-center rounded-xl border border-slate-300 bg-white px-4">
                <AppIcon name="email" accessibilityLabel="Ícone de e-mail" color="#64748b" />
                <TextInput
                  accessibilityLabel="E-mail"
                  className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  placeholder="seu@email.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(value) => { setEmail(value); setFormError(null); }}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInput.current?.focus()}
                />
              </View>

              <Text className="mb-2 text-sm font-semibold text-slate-700">Senha</Text>
              <View className="min-h-14 flex-row items-center rounded-xl border border-slate-300 bg-white pl-4">
                <AppIcon name="lock" accessibilityLabel="Ícone de senha" color="#64748b" />
                <TextInput
                  ref={passwordInput}
                  accessibilityLabel="Senha"
                  className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  placeholder="Digite sua senha"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(value) => { setPassword(value); setFormError(null); }}
                  secureTextEntry={!passwordVisible}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  className="min-h-11 min-w-11 items-center justify-center"
                  onPress={() => setPasswordVisible((visible) => !visible)}
                >
                  <AppIcon
                    name={passwordVisible ? 'visibility-off' : 'visibility'}
                    accessibilityLabel={passwordVisible ? 'Senha visível' : 'Senha oculta'}
                    color="#475569"
                  />
                </TouchableOpacity>
              </View>

              {formError ? (
                <View
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  className="mt-4 flex-row items-start gap-2 rounded-xl bg-red-50 px-4 py-3"
                >
                  <AppIcon name="error-outline" accessibilityLabel="Erro" color="#b91c1c" size={20} />
                  <Text className="flex-1 leading-5 text-red-700">{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Entrar no portal"
                accessibilityState={{ disabled: loading, busy: loading }}
                className={`mt-6 min-h-14 items-center justify-center rounded-xl px-4 ${loading ? 'bg-blue-400' : 'bg-primary'}`}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" accessibilityLabel="Entrando" />
                ) : (
                  <Text className="text-base font-bold text-white">Entrar no portal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
