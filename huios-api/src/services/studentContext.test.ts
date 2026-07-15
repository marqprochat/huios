import { afterEach, describe, expect, it, vi } from 'vitest';
import { prisma } from './prisma';
import { getStudentContext, StudentNotFoundError } from './studentContext';

describe('getStudentContext', () => {
  afterEach(() => vi.restoreAllMocks());

  it('derives studentId and academic scope from the authenticated user', async () => {
    const findUnique = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      student: { id: 'student-1', enrollments: [{ classId: 'class-1' }] }
    } as never);
    vi.spyOn(prisma.discipline, 'findMany').mockResolvedValue([{ id: 'discipline-1' }] as never);

    await expect(getStudentContext('user-1')).resolves.toEqual({
      studentId: 'student-1', classIds: ['class-1'], disciplineIds: ['discipline-1']
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        student: {
          select: {
            id: true,
            enrollments: { where: { status: 'CURSANDO' }, select: { classId: true } }
          }
        }
      }
    });
  });

  it('rejects users without a student profile', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ student: null } as never);
    await expect(getStudentContext('user-1')).rejects.toBeInstanceOf(StudentNotFoundError);
  });
});
