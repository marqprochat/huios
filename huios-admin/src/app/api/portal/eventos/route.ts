import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isRegistrationOpen, isTicketAvailable, applicablePrice, countOccupiedSlots } from '@/lib/events';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
  if (!user?.student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
  const studentId = user.student.id;

  const now = new Date();
  const eventos = await (prisma as any).event.findMany({
    where: { isPublished: true, registrationEnabled: true },
    include: {
      tickets: { orderBy: { order: 'asc' } },
      registrations: { select: { studentId: true, status: true, reservedUntil: true, ticketId: true, id: true, amount: true, createdAt: true } },
    },
    orderBy: { date: 'asc' },
  });

  const open = eventos
    .map((evento: any) => {
      const totalOccupied = countOccupiedSlots(evento.registrations, now);
      const tickets = evento.tickets.map((t: any) => {
        const ticketRegs = evento.registrations.filter((r: any) => r.ticketId === t.id);
        const occupied = countOccupiedSlots(ticketRegs, now);
        return {
          id: t.id, name: t.name, price: applicablePrice(t, true),
          available: isTicketAvailable(t, { now, isStudent: true, occupied }),
        };
      });
      const hasAvailableTicket = tickets.some((t: any) => t.available);
      const registrationOpen = isRegistrationOpen(evento, { now, totalOccupied, hasAvailableTicket });
      return {
        id: evento.id, title: evento.title, date: evento.date, startTime: evento.startTime, endTime: evento.endTime, bannerUrl: evento.bannerUrl,
        registrationOpen, tickets,
      };
    })
    .filter((e: any) => e.registrationOpen);

  const myRegistrations = eventos.flatMap((evento: any) =>
    evento.registrations
      .filter((r: any) => r.studentId === studentId)
      .map((r: any) => ({
        id: r.id, eventTitle: evento.title, eventDate: evento.date, eventStartTime: evento.startTime, eventEndTime: evento.endTime,
        status: r.status, amount: r.amount, createdAt: r.createdAt,
      })));

  return NextResponse.json({ open, myRegistrations });
}
