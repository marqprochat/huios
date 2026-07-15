import type { AbsenceSummary, Grade, Lesson } from '@/types';

export const canSubmitJustification = (item: Pick<AbsenceSummary, 'attendanceId' | 'justificationStatus' | 'status'>) => Boolean(item.attendanceId) && item.justificationStatus !== 'PENDING_REVIEW' && item.justificationStatus !== 'APPROVED';

const civilDate = (value: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(typeof value === 'string' ? new Date(value) : value);

export const lessonDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? civilDate(value);

export function groupLessonsByPeriod(lessons: Lesson[], now = new Date()) {
  const today = civilDate(now);
  const ordered = [...lessons].sort((a, b) => `${lessonDateKey(a.date)}${a.startTime ?? ''}`.localeCompare(`${lessonDateKey(b.date)}${b.startTime ?? ''}`));
  return { upcoming: ordered.filter(item => lessonDateKey(item.date) >= today), previous: ordered.filter(item => lessonDateKey(item.date) < today).reverse() };
}

export function formatExamAvailability(exam: { startDate?: string; deadline?: string; availabilityStatus?: 'NOT_STARTED' | 'AVAILABLE' | 'EXPIRED' }, now = new Date()) {
  if (exam.availabilityStatus === 'NOT_STARTED') return 'Ainda não iniciada';
  if (exam.availabilityStatus === 'EXPIRED') return 'Prazo encerrado';
  if (exam.availabilityStatus === 'AVAILABLE') return 'Disponível';
  if (exam.startDate && new Date(exam.startDate).getTime() > now.getTime()) return 'Ainda não iniciada';
  if (exam.deadline && new Date(exam.deadline).getTime() < now.getTime()) return 'Prazo encerrado';
  return 'Disponível';
}

export function getAcademicViewState(loading: boolean, error: boolean, empty: boolean) {
  if (loading) return 'loading';
  if (error) return 'error';
  if (empty) return 'empty';
  return 'content';
}

export function formatExamDeadline(deadline?: string, now = new Date()) {
  if (!deadline) return 'Sem prazo informado';
  const timestamp = new Date(deadline).getTime();
  if (!Number.isFinite(timestamp)) return 'Prazo indisponível';
  if (timestamp < now.getTime()) return 'Prazo encerrado';
  if (civilDate(deadline) === civilDate(now)) return 'Encerra hoje';
  const days = Math.ceil((timestamp - now.getTime()) / 86_400_000);
  return `${days} dia${days === 1 ? '' : 's'} restante${days === 1 ? '' : 's'}`;
}

export function calculateAttendanceRate(items: Pick<AbsenceSummary, 'totalLessons' | 'absences'>[]) {
  const total = items.reduce((sum, item) => sum + item.totalLessons, 0);
  const absences = items.reduce((sum, item) => sum + item.absences, 0);
  return total ? Math.round(((total - absences) / total) * 100) : 100;
}

export function summarizeGrades(grades: Grade[]) {
  const values = grades.map(item => item.finalGrade ?? item.value).filter((value): value is number => value != null);
  return { average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, gradedCount: values.length };
}

export function groupLessonsByDate(lessons: Lesson[]) {
  return lessons.reduce<Record<string, Lesson[]>>((groups, item) => { const key = lessonDateKey(item.date); (groups[key] ??= []).push(item); return groups; }, {});
}
