import prisma from '@/lib/prisma';
import { ContasReceberClient } from './ContasReceberClient';

export default async function ContasReceberPage() {
  const [transactions, categories, students, classesRaw] = await Promise.all([
    (prisma as any).financialTransaction.findMany({
      where: { type: 'RECEITA' },
      include: {
        category: true,
        student: { select: { id: true, name: true } },
        enrollment: { include: { class: { include: { course: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    (prisma as any).financialCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.student.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    // Turmas com alunos CURSANDO — para lançamento em lote por turma.
    (prisma as any).courseClass.findMany({
      include: {
        course: { select: { name: true } },
        enrollments: {
          where: { status: 'CURSANDO' },
          include: { student: { select: { id: true, name: true } } },
          orderBy: { student: { name: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Achata para o formato que o form consome (só turmas com ao menos 1 aluno cursando).
  const classes = classesRaw
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      courseName: c.course?.name ?? '',
      students: c.enrollments.map((e: any) => ({
        id: e.student.id,
        name: e.student.name,
        enrollmentId: e.id,
      })),
    }))
    .filter((c: any) => c.students.length > 0);

  return <ContasReceberClient transactions={transactions} categories={categories} students={students as any} classes={classes} />;
}
