export interface ExamClassStudent {
  id: string;
  name: string;
}

export interface ExamClassGroup {
  id: string;
  name: string;
  courseName: string;
  students: ExamClassStudent[];
}

interface DisciplineStudentSource {
  id: string;
  name: string;
  courseClasses: Array<{
    id: string;
    name: string;
    course: { name: string } | null;
    enrollments: Array<{
      status: string;
      student: ExamClassStudent;
    }>;
  }>;
}

export function groupDisciplineStudents(discipline: DisciplineStudentSource): ExamClassGroup[] {
  return discipline.courseClasses
    .map(courseClass => ({
      id: courseClass.id,
      name: courseClass.name,
      courseName: courseClass.course?.name ?? '',
      students: courseClass.enrollments
        .filter(enrollment => enrollment.status === 'CURSANDO')
        .map(enrollment => enrollment.student)
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    }))
    .filter(group => group.students.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

export const INACTIVE_PARTICIPANTS_GROUP_ID = 'inactive-participants';

/**
 * Participantes já vinculados à prova podem ter perdido a matrícula ativa (trancamento,
 * conclusão ou troca de turma). Sem este grupo eles ficariam invisíveis no modal e ainda
 * assim seriam enviados no formulário, travando a edição da prova.
 */
export function appendInactiveParticipants(
  groups: ExamClassGroup[],
  participants: ExamClassStudent[],
): ExamClassGroup[] {
  const enrolled = new Set(groups.flatMap(group => group.students.map(student => student.id)));
  const inactive = participants
    .filter(participant => !enrolled.has(participant.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));

  if (inactive.length === 0) return groups;

  return [...groups, {
    id: INACTIVE_PARTICIPANTS_GROUP_ID,
    name: 'Sem matrícula ativa nesta disciplina',
    courseName: 'Participantes já vinculados a esta prova',
    students: inactive,
  }];
}

export function parseParticipantIds(formData: FormData): string[] {
  return formData.getAll('studentIds')
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean);
}

export function assertParticipantSelection(studentIds: string[], eligibleStudentIds: string[]): string[] {
  if (studentIds.length === 0) {
    throw new Error('Selecione ao menos um aluno para a prova.');
  }

  if (new Set(studentIds).size !== studentIds.length) {
    throw new Error('A seleção contém alunos duplicados.');
  }

  const eligible = new Set(eligibleStudentIds);
  if (studentIds.some(studentId => !eligible.has(studentId))) {
    throw new Error('Um dos alunos selecionados não está cursando uma turma desta disciplina.');
  }

  return studentIds;
}

export function assertRemovableParticipants(
  currentStudentIds: string[],
  nextStudentIds: string[],
  studentIdsWithSubmission: string[],
): void {
  const next = new Set(nextStudentIds);
  const locked = new Set(studentIdsWithSubmission);
  const removesLockedStudent = currentStudentIds.some(studentId => !next.has(studentId) && locked.has(studentId));

  if (removesLockedStudent) {
    throw new Error('Não é possível remover um aluno que já iniciou ou respondeu esta prova.');
  }
}

export function uniqueStudentIds(groups: ExamClassGroup[]): string[] {
  return [...new Set(groups.flatMap(group => group.students.map(student => student.id)))];
}
