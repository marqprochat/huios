import prisma from '@/lib/prisma';
import { MatriculasClient } from './MatriculasClient';

export default async function MatriculasPage() {
  const matriculas = await prisma.enrollment.findMany({
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return <MatriculasClient matriculas={matriculas} />;
}
