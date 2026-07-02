// Camada que decide qual provedor de pagamento está ativo (PagBank ou Santander)
// e oferece uma cobrança Pix normalizada para o checkout. Assim a UI e a rota de
// criação de pagamento não precisam conhecer os detalhes de cada gateway.

import prisma from '@/lib/prisma';
import * as pagbank from '@/lib/pagbank';
import * as santander from '@/lib/santander';

export type PaymentProvider = 'pagbank' | 'santander';

/** Lê o provedor ativo configurado pelo coordenador (default: pagbank). */
export async function getActiveProvider(): Promise<PaymentProvider> {
  let s: any = null;
  try {
    s = await (prisma as any).systemSettings.findFirst();
  } catch {
    s = null;
  }
  return s?.paymentProvider === 'santander' ? 'santander' : 'pagbank';
}

/** Indica se o provedor ativo está configurado e pronto para cobrar. */
export async function isActiveProviderConfigured(): Promise<boolean> {
  const provider = await getActiveProvider();
  return provider === 'santander' ? santander.isConfigured() : pagbank.isConfigured();
}

export type CheckoutMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

/**
 * Métodos de pagamento habilitados no checkout, considerando o provedor ativo e
 * as flags do PagBank (SystemSettings). PIX funciona em qualquer provedor; cartão
 * e boleto só existem no PagBank e ainda dependem de estarem ligados no painel.
 * Mantém UI (checkout) e API (rota de criação) alinhados a uma única fonte.
 */
export async function getEnabledMethods(): Promise<CheckoutMethod[]> {
  let s: any = null;
  try {
    s = await (prisma as any).systemSettings.findFirst();
  } catch {
    s = null;
  }
  const provider: PaymentProvider = s?.paymentProvider === 'santander' ? 'santander' : 'pagbank';
  if (provider === 'santander') return ['PIX'];

  const methods: CheckoutMethod[] = [];
  if (s?.pagbankCardEnabled) methods.push('CREDIT_CARD');
  if (s?.pagbankPixEnabled ?? true) methods.push('PIX'); // default ligado (linhas antigas sem a coluna)
  if (s?.pagbankBoletoEnabled) methods.push('BOLETO');
  return methods;
}

export interface NormalizedPixResult {
  gateway: 'PAGBANK' | 'SANTANDER';
  status: string; // WAITING | PAID | DECLINED | CANCELED
  chargeId: string | null;
  orderId: string | null;
  pixQrCode: string | null; // imagem (url ou data URL)
  pixQrCodeText: string | null; // copia-e-cola
  raw: any;
}

export interface PixChargeInput {
  referenceId: string;
  description: string;
  amountCents: number;
  customer: { name: string; email: string; taxId?: string | null; phone?: string | null };
  notificationUrl?: string;
}

/** Cria uma cobrança Pix no provedor ativo e devolve um resultado normalizado. */
export async function createPixCharge(input: PixChargeInput): Promise<NormalizedPixResult> {
  const provider = await getActiveProvider();

  if (provider === 'santander') {
    const r = await santander.createPixCharge({
      description: input.description,
      amountCents: input.amountCents,
      customer: { name: input.customer.name, taxId: input.customer.taxId },
    });
    return {
      gateway: 'SANTANDER',
      status: r.status,
      chargeId: r.txid,
      orderId: null,
      pixQrCode: r.pixQrCode,
      pixQrCodeText: r.pixQrCodeText,
      raw: r.raw,
    };
  }

  const r = await pagbank.createCharge({
    referenceId: input.referenceId,
    description: input.description,
    amountCents: input.amountCents,
    method: 'PIX',
    customer: input.customer,
    notificationUrl: input.notificationUrl,
  });
  return {
    gateway: 'PAGBANK',
    status: r.status,
    chargeId: r.chargeId,
    orderId: r.orderId,
    pixQrCode: r.pixQrCode ?? null,
    pixQrCodeText: r.pixQrCodeText ?? null,
    raw: r.raw,
  };
}
