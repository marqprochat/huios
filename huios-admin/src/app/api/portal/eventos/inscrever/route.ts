import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { registerForEvent } from '@/lib/events';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
  if (!user?.student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { eventId, ticketId, answers } = body as { eventId?: string; ticketId?: string; answers?: Record<string, string | boolean> };
  if (!eventId || !ticketId) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });

  const result = await registerForEvent({
    eventId,
    ticketId,
    isStudent: true,
    studentId: user.student.id,
    name: user.student.name,
    email: user.student.email,
    phone: user.student.phone,
    cpf: user.student.cpf,
    answers,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    registrationId: result.registrationId,
    requiresPayment: result.requiresPayment,
    transactionId: result.transactionId,
  });
}
