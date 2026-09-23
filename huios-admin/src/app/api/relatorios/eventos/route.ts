import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { maskCpf } from '@/lib/masks';

function formatBirthDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      // Se já estiver como string DD/MM/AAAA
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date.trim())) {
        return date.trim();
      }
      return '—';
    }
    // Para evitar problemas de fuso horário UTC retroceder 1 dia em datas puras (YYYY-MM-DD)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      const [year, month, day] = date.split('T')[0].split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return '—';
  }
}

function extractBirthDateFromAnswers(answers: any): string | null {
  if (!answers || typeof answers !== 'object') return null;
  for (const [key, val] of Object.entries(answers)) {
    const k = key.toLowerCase();
    if (k.includes('nasc') || k.includes('birth') || k.includes('aniversario') || k.includes('data')) {
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');

    // 1. Lista de eventos para seleção de filtro
    const events = await (prisma as any).event.findMany({
      orderBy: { date: 'desc' },
      select: {
        id: true,
        title: true,
        date: true,
      },
    });

    // 2. Montar cláusula where das inscrições
    const where: any = {};
    if (eventId) {
      where.eventId = eventId;
    }
    if (status) {
      where.status = status;
    }

    const registrations = await (prisma as any).eventRegistration.findMany({
      where,
      include: {
        event: { select: { id: true, title: true, date: true } },
        ticket: { select: { id: true, name: true } },
        student: { select: { id: true, name: true, cpf: true, birthDate: true, phone: true } },
      },
      orderBy: [
        { event: { date: 'desc' } },
        { name: 'asc' },
      ],
    });

    const rows = registrations.map((r: any) => {
      const rawCpf = (r.cpf || r.student?.cpf || '').trim();
      const formattedCpf = rawCpf ? maskCpf(rawCpf) : '—';

      const birthDateRaw = r.student?.birthDate ?? extractBirthDateFromAnswers(r.answers);
      const birthDate = formatBirthDate(birthDateRaw);

      return {
        id: r.id,
        name: r.name || r.student?.name || 'Sem nome',
        email: r.email,
        phone: r.phone || r.student?.phone || '—',
        cpf: formattedCpf,
        birthDate,
        eventId: r.event.id,
        eventTitle: r.event.title,
        ticketName: r.ticket?.name || 'Geral',
        status: r.status,
        amount: r.amount,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      events: events.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date.toISOString(),
      })),
      rows,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do relatório de inscritos em eventos:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar os dados do relatório.' },
      { status: 500 }
    );
  }
}
