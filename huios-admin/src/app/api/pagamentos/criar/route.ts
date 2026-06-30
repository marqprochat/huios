import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createCharge, getPagBankConfig, PagBankMethod } from '@/lib/pagbank';
import { createPixCharge, getActiveProvider, isActiveProviderConfigured } from '@/lib/payments';

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

// Métodos habilitados no momento. Mantém o checkout (UI) e a API alinhados.
// PIX funciona em qualquer provedor; cartão/boleto são exclusivos do PagBank.
const ENABLED_METHODS: PagBankMethod[] = ['PIX'];

export async function POST(request: Request) {
  try {
    if (!(await isActiveProviderConfigured())) {
      return NextResponse.json({ error: 'Pagamento online não configurado. Contate a coordenação.' }, { status: 503 });
    }

    const body = (await request.json()) as Body;
    if (!body.transactionId || !body.method) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }
    if (!ENABLED_METHODS.includes(body.method)) {
      return NextResponse.json({ error: 'Método de pagamento indisponível. Use o Pix.' }, { status: 400 });
    }

    const provider = await getActiveProvider();
    // Cartão e boleto só existem no PagBank. Se o provedor ativo for outro, bloqueia.
    if (body.method !== 'PIX' && provider !== 'pagbank') {
      return NextResponse.json({ error: 'Método indisponível para o provedor ativo. Use o Pix.' }, { status: 400 });
    }

    const tx = await (prisma as any).financialTransaction.findUnique({
      where: { id: body.transactionId },
      include: { student: true },
    });
    if (!tx) return NextResponse.json({ error: 'Cobrança não encontrada.' }, { status: 404 });
    if (tx.status === 'PAGO') return NextResponse.json({ error: 'Esta cobrança já foi paga.' }, { status: 409 });

    const amountCents = Math.round((tx.amount as number) * 100);
    const customer = {
      name: tx.student?.name || 'Aluno',
      email: tx.student?.email || 'sememail@huios.com.br',
      taxId: tx.student?.cpf || null,
      phone: tx.student?.phone || null,
    };

    // O webhook precisa de uma URL pública em HTTPS. Em ambiente local o origin
    // vira http://localhost, então priorizamos a URL pública (SystemSettings.appUrl).
    const { appUrl } = await getPagBankConfig();
    const requestOrigin = new URL(request.url).origin;
    const baseUrl = (appUrl || requestOrigin).replace(/\/$/, '');
    const pagbankNotificationUrl = baseUrl.startsWith('https://')
      ? `${baseUrl}/api/pagamentos/webhook/pagbank`
      : undefined;

    let gateway: 'PAGBANK' | 'SANTANDER';
    let result: {
      status: string;
      chargeId: string | null;
      orderId: string | null;
      pixQrCode: string | null;
      pixQrCodeText: string | null;
      boletoUrl?: string | null;
      boletoBarcode?: string | null;
      raw: any;
    };

    if (body.method === 'PIX') {
      // PIX passa pelo provedor ativo (PagBank ou Santander).
      const r = await createPixCharge({
        referenceId: tx.id,
        description: tx.description,
        amountCents,
        customer,
        notificationUrl: pagbankNotificationUrl,
      });
      gateway = r.gateway;
      result = { ...r, boletoUrl: null, boletoBarcode: null };
    } else {
      // Cartão/boleto (somente PagBank).
      const r = await createCharge({
        referenceId: tx.id,
        description: tx.description,
        amountCents,
        method: body.method,
        customer,
        card: body.card,
        notificationUrl: pagbankNotificationUrl,
      });
      gateway = 'PAGBANK';
      result = {
        status: r.status,
        chargeId: r.chargeId,
        orderId: r.orderId,
        pixQrCode: r.pixQrCode ?? null,
        pixQrCodeText: r.pixQrCodeText ?? null,
        boletoUrl: r.boletoUrl ?? null,
        boletoBarcode: r.boletoBarcode ?? null,
        raw: r.raw,
      };
    }

    // Registra a tentativa de pagamento.
    const payment = await (prisma as any).payment.create({
      data: {
        transactionId: tx.id,
        gateway,
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
    console.error('Erro ao criar pagamento:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar pagamento.' }, { status: 400 });
  }
}
