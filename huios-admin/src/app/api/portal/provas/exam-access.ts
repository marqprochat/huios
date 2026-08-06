import type { Prisma } from '@prisma/client';

export function studentExamWhere(
  studentId: string,
  extra: Prisma.ExamWhereInput = {},
): Prisma.ExamWhereInput {
  return {
    ...extra,
    isPublished: true,
    participants: { some: { studentId } },
  };
}
