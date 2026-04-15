import prisma from '@/lib/prisma';
import BoletinsClient from './BoletinsClient';

export default async function BoletinsPage() {
  const alumnos = await prisma.student.findMany({
    include: {
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          class: {
            include: {
              course: true
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const disciplinas = await prisma.discipline.findMany({
    include: {
      courseClass: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Type cast for the component (simplified types)
  const initialAlunos = alumnos as any;
  const initialDisciplinas = disciplinas as any;

  return (
    <BoletinsClient 
      initialAlunos={initialAlunos} 
      initialDisciplinas={initialDisciplinas} 
    />
  );
}
