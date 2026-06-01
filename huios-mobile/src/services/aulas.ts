import { api } from './api';
import type { Lesson } from '@/types';

export async function getAulas(): Promise<Lesson[]> {
  return api.get<Lesson[]>('/api/portal/aulas');
}

export async function getAula(id: string): Promise<Lesson> {
  return api.get<Lesson>(`/api/portal/aulas/${id}`);
}

export async function checkin(lessonId: string, latitude: number, longitude: number) {
  return api.post(`/api/portal/aulas/${lessonId}/checkin`, { latitude, longitude });
}

export async function checkout(lessonId: string, latitude: number, longitude: number) {
  return api.post(`/api/portal/aulas/${lessonId}/checkout`, { latitude, longitude });
}
