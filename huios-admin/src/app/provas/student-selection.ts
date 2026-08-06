import type { ExamClassGroup } from '@/lib/exam-participants';

export function toggleStudentSelection(selected: Set<string>, studentId: string): Set<string> {
  const next = new Set(selected);
  if (next.has(studentId)) next.delete(studentId);
  else next.add(studentId);
  return next;
}

export function selectClassStudents(selected: Set<string>, studentIds: string[]): Set<string> {
  const next = new Set(selected);
  studentIds.forEach(studentId => next.add(studentId));
  return next;
}

export function clearClassStudents(
  selected: Set<string>,
  studentIds: string[],
  lockedIds: Set<string>,
): Set<string> {
  const next = new Set(selected);
  studentIds.forEach(studentId => {
    if (!lockedIds.has(studentId)) next.delete(studentId);
  });
  return next;
}

export function selectionAfterDisciplineChange(
  previousDisciplineId: string,
  nextDisciplineId: string,
  selected: Set<string>,
): Set<string> {
  return previousDisciplineId === nextDisciplineId ? new Set(selected) : new Set();
}

export function countSelectedClasses(groups: ExamClassGroup[], selected: Set<string>): number {
  return groups.filter(group => group.students.some(student => selected.has(student.id))).length;
}

function searchable(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function filterClassGroups(groups: ExamClassGroup[], search: string): ExamClassGroup[] {
  const query = searchable(search.trim());
  if (!query) return groups;

  return groups.flatMap(group => {
    const groupMatches = searchable(`${group.name} ${group.courseName}`).includes(query);
    const students = groupMatches
      ? group.students
      : group.students.filter(student => searchable(student.name).includes(query));
    return students.length > 0 ? [{ ...group, students }] : [];
  });
}
