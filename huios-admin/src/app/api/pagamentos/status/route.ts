import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');
  if (!transactionId) return NextResponse.json({ error: 'transactionId obrigatório' }, { status: 400 });

  const tx = await (prisma as any).financialTransaction.findUnique({
    where: { id: transactionId },
    select: { status: true },
  });
  if (!tx) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 });

  return NextResponse.json({ status: tx.status, paid: tx.status === 'PAGO' });
}
