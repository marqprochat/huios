import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { mapStatus, getPagBankConfig } from '@/lib/pagbank';

export const dynamic = 'force-dynamic';

const METHOD_TO_PAYMENTMETHOD: Record<string, string> = {
  CREDIT_CARD: 'CARTAO',
  PIX: 'PIX',
  BOLETO: 'BOLETO',
};

/** Valida a autenticidade da notificação (x-authenticity-token = sha256(token-rawBody)). */
function isAuthentic(rawBody: string, header: string | null, webhookToken: string): boolean {
  if (!webhookToken) return true; // sem token configurado, não bloqueia (sandbox)
  if (!header) return false;
  const expected = crypto.createHash('sha256').update(`${webhookToken}-${rawBody}`).digest('hex');
  return expected === header;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const header = request.headers.get('x-authenticity-token');
    const { webhookToken } = await getPagBankConfig();
    if (!isAuthentic(rawBody, header, webhookToken)) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }

    const data = JSON.parse(rawBody || '{}');

    // O payload pode vir como pedido (com charges[]/qr_codes[]) — normaliza para uma lista.
    const charges: any[] = data.charges || (data.id && data.status ? [data] : []);
    if (charges.length === 0) {
      return NextResponse.json({ received: true });
    }

    for (const charge of charges) {
      const chargeId: string | undefined = charge.id;
      const status = mapStatus(charge.status);
      const methodType: string | undefined = charge.payment_method?.type;

      // Localiza o Payment pelo chargeId; fallback pelo reference_id (transactionId).
      let payment = chargeId
        ? await (prisma as any).payment.findUnique({ where: { gatewayChargeId: chargeId } })
        : null;
      const referenceId: string | undefined = charge.reference_id || data.reference_id;
      if (!payment && referenceId) {
        payment = await (prisma as any).payment.findFirst({
          where: { transactionId: referenceId },
          orderBy: { createdAt: 'desc' },
        });
      }
      if (!payment) continue;

      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: { status, gatewayChargeId: chargeId ?? payment.gatewayChargeId },
      });

      if (status === 'PAID') {
        await (prisma as any).financialTransaction.update({
          where: { id: payment.transactionId },
          data: {
            status: 'PAGO',
            paidAt: new Date(),
            paymentMethod: METHOD_TO_PAYMENTMETHOD[methodType || payment.method] || 'OUTRO',
            reference: chargeId ?? payment.gatewayChargeId,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Erro no webhook PagBank:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook.' }, { status: 200 });
  }
}
