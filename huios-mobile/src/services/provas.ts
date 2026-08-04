import { api } from './api';
import type { Exam, ExamTeacherEvaluation, Question } from '@/types';

export async function getProvas(): Promise<Exam[]> {
  return api.get<Exam[]>('/api/portal/provas');
}

export async function getProvaQuestions(examId: string): Promise<Question[]> {
  return api.get<Question[]>(`/api/portal/provas/${examId}/questoes`);
}

export async function getProvaTeacherEvaluation(examId: string): Promise<ExamTeacherEvaluation> {
  return api.get<ExamTeacherEvaluation>(`/api/portal/provas/${examId}/avaliacao-professor`);
}

export async function submitProvaTeacherEvaluation(examId: string, evaluation: { clarity: string; engagement: string; mastery: string; observations?: string }) {
  return api.post(`/api/portal/provas/${examId}/avaliacao-professor`, evaluation);
}

export async function submitProva(examId: string, answers: Record<string, string>) {
  return api.post(`/api/portal/provas/${examId}/submit`, { answers });
}
