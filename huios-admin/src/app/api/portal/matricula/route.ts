import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { matricularAlunoExistente } from '@/lib/enrollment';

export const dynamic = 'force-dynamic';

/** Resolve o Student do usuário logado (papel ALUNO). */
async function getStudent() {
  const session = await getSession();
  if (!session) return { error: 'Não autenticado', status: 401 as const };
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { student: true },
  });
  if (!user?.student) return { error: 'Aluno não encontrado', status: 404 as const };
  return { student: user.student };
}

/** Lista turmas com matrículas abertas nas quais o aluno ainda não está matriculado. */
export async function GET() {
  const ctx = await getStudent();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const studentId = ctx.student.id;

  const now = new Date();
  const turmas = await prisma.courseClass.findMany({
    where: { enrollmentStatus: 'ABERTA' } as any,
    include: { course: { select: { name: true, description: true, imageUrl: true } } },
    orderBy: { name: 'asc' },
  });

  const enrolledClassIds = new Set(
    (await prisma.enrollment.findMany({ where: { studentId }, select: { classId: true } })).map(e => e.classId)
  );

  const disponiveis = (turmas as any[])
    .filter(t => {
      if (enrolledClassIds.has(t.id)) return false;
      if (t.enrollmentOpensAt && now < new Date(t.enrollmentOpensAt)) return false;
      if (t.enrollmentClosesAt && now > new Date(t.enrollmentClosesAt)) return false;
      return true;
    })
    .map(t => ({
      id: t.id,
      name: t.name,
      courseName: t.course?.name ?? '',
      courseDescription: t.course?.description ?? null,
      courseImageUrl: t.course?.imageUrl ?? null,
      startDate: t.startDate ? t.startDate.toISOString() : null,
      duration: t.duration ?? null,
    }));

  return NextResponse.json({ turmas: disponiveis });
}

/** Matricula o aluno logado em uma turma aberta. Body: { classId } */
export async function POST(request: Request) {
  const ctx = await getStudent();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  try {
    const { classId, couponCode } = (await request.json()) as { classId?: string; couponCode?: string | null };
    if (!classId) return NextResponse.json({ error: 'Turma não informada.' }, { status: 400 });

    const result = await matricularAlunoExistente(ctx.student.id, classId, couponCode ?? null);

    const firstTxId = result.transactionIds[0] ?? null;
    let amount: number | null = null;
    if (firstTxId) {
      const tx = await (prisma as any).financialTransaction.findUnique({
        where: { id: firstTxId },
        select: { amount: true },
      });
      amount = tx?.amount ?? null;
    }

    return NextResponse.json({
      success: true,
      alreadyEnrolled: result.alreadyEnrolled,
      tier: result.tier,
      monthlyAmount: result.monthlyAmount,
      discountedMonthlyAmount: result.discountedMonthlyAmount,
      appliedCouponCode: result.appliedCouponCode,
      transactionId: firstTxId,
      amount,
    });
  } catch (error: any) {
    console.error('Erro na matrícula pelo portal:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar matrícula.' }, { status: 400 });
  }
}
