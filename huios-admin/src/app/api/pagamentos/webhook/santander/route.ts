import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Webhook do Santander (API Pix / Bacen). Quando um Pix é pago, o Santander
// notifica esta URL com a lista de pagamentos recebidos:
//   { "pix": [ { "endToEndId": "...", "txid": "...", "valor": "100.00", "horario": "..." } ] }
// Cada item confirmado marca o Payment (e a FinancialTransaction) como pago.
// O txid corresponde ao gatewayChargeId gravado na criação da cobrança.

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => ({} as any));
    const pixList: any[] = Array.isArray(data?.pix) ? data.pix : [];

    if (pixList.length === 0) {
      // Pode ser um teste de conectividade do Santander — responde 200.
      return NextResponse.json({ received: true });
    }

    for (const pix of pixList) {
      const txid: string | undefined = pix?.txid;
      if (!txid) continue;

      const payment = await (prisma as any).payment.findUnique({
        where: { gatewayChargeId: txid },
      });
      if (!payment) continue;

      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: { status: 'PAID' },
      });

      await (prisma as any).financialTransaction.update({
        where: { id: payment.transactionId },
        data: {
          status: 'PAGO',
          paidAt: new Date(),
          paymentMethod: 'PIX',
          reference: pix?.endToEndId || txid,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Erro no webhook Santander:', error);
    // Responde 200 para evitar reenvios em massa; o erro fica registrado no log.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
