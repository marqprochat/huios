import type { Lesson } from '@/types';

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

export function getLessonTitle(lesson: Lesson): string {
  return lesson.discipline?.name?.trim() || lesson.description?.trim() || 'Aula';
}

export function formatLessonTime(value: string | null): string {
  if (!value) return 'Horário não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}
