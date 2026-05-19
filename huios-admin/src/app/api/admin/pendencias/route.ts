import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING_REVIEW';

    const justifications = await prisma.absenceJustification.findMany({
      where: status === 'ALL' ? {} : { status: status as any },
      include: {
        student: { select: { id: true, name: true, email: true } },
        discipline: { select: { id: true, name: true } },
        attendance: {
          include: { lesson: { select: { id: true, date: true, locationName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(justifications);
  } catch (error) {
    console.error('Admin pendencias error:', error);
    return NextResponse.json({ error: 'Erro ao buscar pendências' }, { status: 500 });
  }
}
