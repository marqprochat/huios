import { api } from './api';
import type { AbsenceSummary } from '@/types';

export async function getPresenca(): Promise<AbsenceSummary[]> {
  return api.get<AbsenceSummary[]>('/api/portal/presenca/pendencias');
}

export async function uploadJustificativa(attendanceId: string, file: {
  uri: string;
  name: string;
  type: string;
}) {
  const form = new FormData();
  form.append('attendanceId', attendanceId);
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  return api.postForm('/api/portal/presenca/justificativa', form);
}
