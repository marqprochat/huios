import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getPagBankConfig } from '@/lib/pagbank';
import { PagamentoClient } from './PagamentoClient';

export const dynamic = 'force-dynamic';

export default async function PagamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ transactionId: string }>;
  searchParams: Promise<{ retorno?: string }>;
}) {
  const { transactionId } = await params;
  const { retorno } = await searchParams;
  // Só aceitamos caminhos internos para evitar open redirect.
  const redirectTo = retorno && retorno.startsWith('/') ? retorno : null;

  const tx = await (prisma as any).financialTransaction.findUnique({
    where: { id: transactionId },
    include: { student: { select: { name: true } } },
  });
  if (!tx) notFound();

  const { publicKey } = await getPagBankConfig();

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
          redirectTo={redirectTo}
        />
      </div>
    </div>
  );
}
