import prisma from '@/lib/prisma';
import { selectExpiredRegistrationIds } from '@/lib/events';

export interface EventReservationResult {
  expired: number;
}

/**
 * Job diário: expira inscrições PENDENTES cuja reserva de vaga venceu, e cancela
 * a cobrança pendente vinculada (se ainda não tiver sido paga nem cancelada).
 */
export async function expireEventReservations(now: Date = new Date()): Promise<EventReservationResult> {
  const pending = await (prisma as any).eventRegistration.findMany({
    where: { status: 'PENDENTE', reservedUntil: { not: null } },
    select: { id: true, status: true, reservedUntil: true, transactionId: true },
  });

  const expiredIds = selectExpiredRegistrationIds(pending, now);
  if (expiredIds.length === 0) return { expired: 0 };

  const transactionIds = pending
    .filter((r: any) => expiredIds.includes(r.id) && r.transactionId)
    .map((r: any) => r.transactionId as string);

  await (prisma as any).eventRegistration.updateMany({
    where: { id: { in: expiredIds } },
    data: { status: 'EXPIRADA', canceledAt: now },
  });

  if (transactionIds.length > 0) {
    await (prisma as any).financialTransaction.updateMany({
      where: { id: { in: transactionIds }, status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    });
  }

  return { expired: expiredIds.length };
}
