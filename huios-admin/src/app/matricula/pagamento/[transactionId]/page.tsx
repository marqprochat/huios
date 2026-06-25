import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PagamentoClient } from './PagamentoClient';

export const dynamic = 'force-dynamic';

export default async function PagamentoPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;

  const tx = await (prisma as any).financialTransaction.findUnique({
    where: { id: transactionId },
    include: { student: { select: { name: true } } },
  });
  if (!tx) notFound();

  const publicKey = process.env.NEXT_PUBLIC_PAGBANK_PUBLIC_KEY || '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[560px]">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Huios" className="h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-black text-slate-900">Pagamento</h1>
          <p className="text-slate-500 text-sm">Seminário Teológico Huios</p>
        </div>
        <PagamentoClient
          transactionId={tx.id}
          description={tx.description}
          amount={tx.amount}
          studentName={tx.student?.name ?? ''}
          alreadyPaid={tx.status === 'PAGO'}
          publicKey={publicKey}
        />
      </div>
    </div>
  );
}
