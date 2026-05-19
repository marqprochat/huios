import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Aprovação ou rejeição de justificativa
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reviewNotes } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido. Use APPROVED ou REJECTED' }, { status: 400 });
    }

    const justification = await prisma.absenceJustification.update({
      where: { id },
      data: {
        status,
        reviewedById: session.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null
      },
      include: {
        student: { select: { id: true, name: true } },
        discipline: { select: { id: true, name: true } }
      }
    });

    // Se aprovado, muda a falta para EXCUSED
    if (status === 'APPROVED') {
      await prisma.attendance.update({
        where: { id: justification.attendanceId },
        data: {
          status: 'EXCUSED',
          notes: 'Justificativa aprovada pela diretoria'
        }
      });
    }

    const action = status === 'APPROVED' ? 'aprovada' : 'reprovada';
    await prisma.notification.create({
      data: {
        type: 'JUSTIFICATION_REVIEWED',
        title: `Justificativa ${action}`,
        message: `A justificativa de ${justification.student.name} para a disciplina "${justification.discipline.name}" foi ${action}.${reviewNotes ? ` Observação: ${reviewNotes}` : ''}`,
        targetRole: 'COORDENADOR',
        relatedId: justification.studentId
      }
    });

    return NextResponse.json(justification);
  } catch (error) {
    console.error('Review justification error:', error);
    return NextResponse.json({ error: 'Erro ao revisar justificativa' }, { status: 500 });
  }
}

// Visualizar arquivo da justificativa
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const justification = await prisma.absenceJustification.findUnique({
      where: { id }
    });

    if (!justification) {
      return NextResponse.json({ error: 'Justificativa não encontrada' }, { status: 404 });
    }

    return NextResponse.json(justification);
  } catch (error) {
    console.error('Get justification error:', error);
    return NextResponse.json({ error: 'Erro ao buscar justificativa' }, { status: 500 });
  }
}
