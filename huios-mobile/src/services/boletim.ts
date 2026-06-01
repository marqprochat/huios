import { api } from './api';
import type { Grade } from '@/types';

export async function getBoletim(): Promise<Grade[]> {
  return api.get<Grade[]>('/api/portal/boletim');
}
