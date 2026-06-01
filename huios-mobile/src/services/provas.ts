import { api } from './api';
import type { Exam, Question } from '@/types';

export async function getProvas(): Promise<Exam[]> {
  return api.get<Exam[]>('/api/portal/provas');
}

export async function getProvaQuestions(examId: string): Promise<Question[]> {
  return api.get<Question[]>(`/api/portal/provas/${examId}/questoes`);
}

export async function submitProva(examId: string, answers: Record<string, string>) {
  return api.post(`/api/portal/provas/${examId}/submit`, { answers });
}
