import { prisma } from './prisma';

export class StudentNotFoundError extends Error {
  constructor() {
    super('Aluno não encontrado');
    this.name = 'StudentNotFoundError';
  }
}

export async function getStudentContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      student: {
        select: {
          id: true,
          enrollments: { where: { status: 'CURSANDO' }, select: { classId: true } }
        }
      }
    }
  });

  if (!user?.student) throw new StudentNotFoundError();

  const classIds = user.student.enrollments.map(({ classId }) => classId);
  const disciplines = await prisma.discipline.findMany({
    where: { courseClasses: { some: { id: { in: classIds } } } },
    select: { id: true }
  });

  return {
    studentId: user.student.id,
    classIds,
    disciplineIds: disciplines.map(({ id }) => id)
  };
}
