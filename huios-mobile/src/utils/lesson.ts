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

export function formatLessonDate(value: string): string {
  const key = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
  if (!key) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(`${key}T12:00:00-03:00`));
}

export function formatLessonTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime && !endTime) return 'Horário não informado';
  if (!startTime) return `Até ${formatLessonTime(endTime)}`;
  if (!endTime) return `A partir de ${formatLessonTime(startTime)}`;
  return `${formatLessonTime(startTime)} – ${formatLessonTime(endTime)}`;
}
