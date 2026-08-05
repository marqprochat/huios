import prisma from '@/lib/prisma';
import { brToday } from '@/lib/date-utils';

const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

/**
 * dueDate é gravado como a data literal (meia-noite UTC), então os limites de "hoje"
 * também precisam ser calculados em UTC para não sofrer deslocamento de fuso horário.
 */
function todayBoundsUTC(now: Date) {
  // "Hoje" é o dia civil de Brasília — não o do processo Node (UTC em produção),
  // que já virou às 21h locais e antecipava o vencimento em algumas horas.
  const [y, m, d] = brToday(now).split('-').map(Number);
  return {
    startOfToday: new Date(Date.UTC(y, m - 1, d)),
    startOfTomorrow: new Date(Date.UTC(y, m - 1, d + 1)),
  };
}

export interface FinancialDueDateResult {
  markedOverdue: number;
  overdueNotified: number;
  dueTodayNotified: number;
}

/**
 * Job diário: marca como VENCIDO as cobranças pendentes cuja data de vencimento já passou,
 * notificando o aluno; e envia um lembrete para quem vence hoje.
 */
export async function processFinancialDueDates(now: Date = new Date()): Promise<FinancialDueDateResult> {
  const { startOfToday, startOfTomorrow } = todayBoundsUTC(now);

  const overdue = await (prisma as any).financialTransaction.findMany({
    where: { status: 'PENDENTE', dueDate: { lt: startOfToday } },
    select: { id: true, studentId: true, description: true, amount: true, dueDate: true },
  });

  if (overdue.length > 0) {
    await (prisma as any).financialTransaction.updateMany({
      where: { id: { in: overdue.map((tx: any) => tx.id) } },
      data: { status: 'VENCIDO' },
    });
  }

  const overdueForStudents = overdue.filter((tx: any) => tx.studentId);
  if (overdueForStudents.length > 0) {
    await prisma.studentNotification.createMany({
      data: overdueForStudents.map((tx: any) => ({
        studentId: tx.studentId as string,
        type: 'PAYMENT_OVERDUE',
        title: 'Cobrança vencida',
        message: `"${tx.description}" no valor de ${fmtCurrency(tx.amount)} venceu em ${fmtDate(new Date(tx.dueDate))} e ainda não foi paga.`,
      })),
    });
  }

  const dueToday = await (prisma as any).financialTransaction.findMany({
    where: {
      status: 'PENDENTE',
      dueDate: { gte: startOfToday, lt: startOfTomorrow },
      studentId: { not: null },
    },
    select: { id: true, studentId: true, description: true, amount: true, dueDate: true },
  });

  if (dueToday.length > 0) {
    await prisma.studentNotification.createMany({
      data: dueToday.map((tx: any) => ({
        studentId: tx.studentId as string,
        type: 'PAYMENT_DUE_TODAY',
        title: 'Cobrança vence hoje',
        message: `"${tx.description}" no valor de ${fmtCurrency(tx.amount)} vence hoje.`,
      })),
    });
  }

  return {
    markedOverdue: overdue.length,
    overdueNotified: overdueForStudents.length,
    dueTodayNotified: dueToday.length,
  };
}
