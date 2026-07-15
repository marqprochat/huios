import { calculateAttendanceRate, formatExamDeadline, groupLessonsByPeriod, summarizeGrades } from './academic';
import type { Lesson } from '@/types';

const lesson = (id: string, date: string): Lesson => ({ id, date, startTime: null, endTime: null });

describe('academic presentation rules', () => {
  it('separates upcoming and previous lessons using the academic civil date', () => {
    const result = groupLessonsByPeriod([
      lesson('past', '2026-07-14T23:00:00.000Z'),
      lesson('today', '2026-07-15T12:00:00.000Z'),
      lesson('future', '2026-07-16T01:00:00.000Z'),
    ], new Date('2026-07-15T15:00:00.000Z'));
    expect(result.upcoming.map(item => item.id)).toEqual(['today', 'future']);
    expect(result.previous.map(item => item.id)).toEqual(['past']);
  });

  it('labels expired and same-day exam deadlines safely', () => {
    const now = new Date('2026-07-15T12:00:00.000Z');
    expect(formatExamDeadline('2026-07-14T23:59:00.000Z', now)).toBe('Prazo encerrado');
    expect(formatExamDeadline('2026-07-15T23:59:00.000Z', now)).toBe('Encerra hoje');
  });

  it('returns 100 when attendance has no recorded lessons', () => {
    expect(calculateAttendanceRate([])).toBe(100);
    expect(calculateAttendanceRate([{ totalLessons: 4, absences: 1 }])).toBe(75);
  });

  it('does not turn missing grades into zeroes', () => {
    expect(summarizeGrades([{ disciplineId: '1', disciplineName: 'Direito', finalGrade: undefined }])).toEqual({ average: null, gradedCount: 0 });
  });
});
