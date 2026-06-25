import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createCharge, isConfigured, PagBankMethod } from '@/lib/pagbank';

export const dynamic = 'force-dynamic';

interface Body {
  transactionId: string;
  method: PagBankMethod;
  card?: { encrypted: string; holderName: string };
}

const METHOD_TO_PAYMENTMETHOD: Record<PagBankMethod, string> = {
  CREDIT_CARD: 'CARTAO',
  PIX: 'PIX',
  BOLETO: 'BOLETO',
};

export async function POST(request: Request) {
  try {
    if (!isConfigured()) {
      return NextResponse.json({ error: 'Pagamento online não configurado. Contate a coordenação.' }, { status: 503 });
    }

    const body = (await request.json()) as Body;
    if (!body.transactionId || !body.method) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const tx = await (prisma as any).financialTransaction.findUnique({
      where: { id: body.transactionId },
      include: { student: true },
    });
    if (!tx) return NextResponse.json({ error: 'Cobrança não encontrada.' }, { status: 404 });
    if (tx.status === 'PAGO') return NextResponse.json({ error: 'Esta cobrança já foi paga.' }, { status: 409 });

    const amountCents = Math.round((tx.amount as number) * 100);
    const origin = new URL(request.url).origin;
    const notificationUrl = `${origin}/api/pagamentos/webhook/pagbank`;

    const result = await createCharge({
      referenceId: tx.id,
      description: tx.description,
      amountCents,
      method: body.method,
      customer: {
        name: tx.student?.name || 'Aluno',
        email: tx.student?.email || 'sememail@huios.com.br',
        taxId: tx.student?.cpf || null,
        phone: tx.student?.phone || null,
      },
      card: body.card,
      notificationUrl,
    });

    // Registra a tentativa de pagamento.
    const payment = await (prisma as any).payment.create({
      data: {
        transactionId: tx.id,
        method: body.method,
        status: result.status,
        amount: tx.amount,
        gatewayChargeId: result.chargeId,
        gatewayOrderId: result.orderId,
        pixQrCode: result.pixQrCode ?? null,
        pixQrCodeText: result.pixQrCodeText ?? null,
        boletoUrl: result.boletoUrl ?? null,
        boletoBarcode: result.boletoBarcode ?? null,
        rawResponse: result.raw ?? undefined,
      },
    });

    // Cartão aprovado na hora → marca a transação como paga.
    if (result.status === 'PAID') {
      await (prisma as any).financialTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'PAGO',
          paidAt: new Date(),
          paymentMethod: METHOD_TO_PAYMENTMETHOD[body.method],
          reference: result.chargeId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      paymentId: payment.id,
      pixQrCode: result.pixQrCode ?? null,
      pixQrCodeText: result.pixQrCodeText ?? null,
      boletoUrl: result.boletoUrl ?? null,
      boletoBarcode: result.boletoBarcode ?? null,
    });
  } catch (error: any) {
    console.error('Erro ao criar pagamento PagBank:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar pagamento.' }, { status: 400 });
  }
}
