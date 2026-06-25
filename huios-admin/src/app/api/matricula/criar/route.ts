import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { matricularGrupo, PersonInput } from '@/lib/enrollment';

export const dynamic = 'force-dynamic';

interface Body {
  classId: string;
  churchSlug?: string | null;
  churchId?: string | null;
  isFamily?: boolean;
  family?: { name?: string; responsibleName?: string; responsiblePhone?: string } | null;
  people: PersonInput[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body.classId) return NextResponse.json({ error: 'Turma não informada.' }, { status: 400 });
    const people = (body.people || []).filter(p => p?.name?.trim() && p?.email?.trim());
    if (people.length === 0) return NextResponse.json({ error: 'Informe ao menos uma pessoa com nome e e-mail.' }, { status: 400 });

    // Resolve church via slug (link exclusivo) ou id.
    let churchId: string | null = body.churchId ?? null;
    if (body.churchSlug) {
      const church = await (prisma as any).church.findUnique({ where: { publicSlug: body.churchSlug } });
      if (!church || !church.isActive) return NextResponse.json({ error: 'Link de igreja inválido.' }, { status: 404 });
      churchId = church.id;
    }

    const isFamily = !!body.isFamily && people.length > 0;
    const familyName = body.family?.name?.trim() || people[0].name.split(' ').slice(-1)[0] || 'Família';

    const result = await matricularGrupo({
      classId: body.classId,
      origin: 'PUBLIC_LINK',
      churchId,
      people,
      family: isFamily
        ? { name: familyName, responsibleName: body.family?.responsibleName, responsiblePhone: body.family?.responsiblePhone }
        : null,
    });

    // Monta resumo para a tela de sucesso (primeira cobrança a pagar de cada pessoa).
    const summary = [] as { studentName: string; tier: string; monthlyAmount: number; transactionId: string | null; amount: number | null }[];
    for (const en of result.enrollments) {
      const student = await prisma.student.findUnique({ where: { id: en.studentId }, select: { name: true } });
      const firstTxId = en.transactionIds[0] ?? null;
      let amount: number | null = null;
      if (firstTxId) {
        const tx = await (prisma as any).financialTransaction.findUnique({ where: { id: firstTxId }, select: { amount: true } });
        amount = tx?.amount ?? null;
      }
      summary.push({
        studentName: student?.name ?? '',
        tier: en.tier,
        monthlyAmount: en.monthlyAmount,
        transactionId: firstTxId,
        amount,
      });
    }

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('Erro na matrícula pública:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar matrícula.' }, { status: 400 });
  }
}
