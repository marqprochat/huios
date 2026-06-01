import { api } from './api';
import type { User } from '@/types';

interface LoginResponse {
  token?: string;
  user?: User;
  message?: string;
}

export async function loginAluno(email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await api.post<LoginResponse>('/api/auth/aluno/login', { email, password });
  if (!data.token || !data.user) {
    throw new Error(data.message ?? 'Credenciais inválidas');
  }
  return { token: data.token, user: data.user };
}

export async function getMe(): Promise<User> {
  return api.get<User>('/api/auth/me');
}
