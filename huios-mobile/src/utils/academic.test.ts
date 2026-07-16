import { calculateAttendanceRate, canSubmitJustification, formatExamAvailability, formatExamDeadline, getAcademicViewState, groupLessonsByPeriod, lessonDateKey, summarizeGrades } from './academic';
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
    expect(summarizeGrades([{ id: 'g1', disciplineId: '1', disciplineName: 'Direito', finalGrade: undefined, weight: 1 }])).toEqual(expect.objectContaining({ average: null, gradedCount: 0 }));
  });

  it('aggregates multiple grade items per discipline with their official weights', () => {
    const result = summarizeGrades([
      { id: 'g1', disciplineId: 'd1', disciplineName: 'Direito', value: 6, weight: 1 },
      { id: 'g2', disciplineId: 'd1', disciplineName: 'Direito', value: 9, weight: 2 },
      { id: 'g3', disciplineId: 'd2', disciplineName: 'Ética', value: 8, weight: 1 },
    ]);
    expect(result.disciplines).toEqual([
      expect.objectContaining({ disciplineId: 'd1', value: 8 }),
      expect.objectContaining({ disciplineId: 'd2', value: 8 }),
    ]);
    expect(result.average).toBe(8);
  });

  it('labels future exams as not started and preserves Prisma civil lesson dates', () => {
    const now = new Date('2026-07-15T12:00:00.000Z');
    expect(formatExamAvailability({ startDate: '2026-07-16T12:00:00.000Z', deadline: '2026-07-17T12:00:00.000Z' }, now)).toBe('Ainda não iniciada');
    expect(lessonDateKey('2026-07-15T00:00:00.000Z')).toBe('2026-07-15');
  });

  it('keeps profile loading until both academic queries settle', () => {
    expect(getAcademicViewState(true, false, false)).toBe('loading');
    expect(getAcademicViewState(false, true, false)).toBe('error');
    expect(getAcademicViewState(false, false, true)).toBe('empty');
    expect(getAcademicViewState(false, false, false)).toBe('content');
  });

  it('allows justification for auto-failed absence only when no review is pending or approved', () => {
    expect(canSubmitJustification({ attendanceId: 'a', status: 'AUTO_FAILED' })).toBe(true);
    expect(canSubmitJustification({ attendanceId: 'a', status: 'AUTO_FAILED', justificationStatus: 'PENDING_REVIEW' })).toBe(false);
    expect(canSubmitJustification({ attendanceId: 'a', status: 'AUTO_FAILED', justificationStatus: 'APPROVED' })).toBe(false);
  });
});
