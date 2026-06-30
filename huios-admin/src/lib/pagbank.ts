// Integração PagBank (checkout transparente — Orders API).
// Tokenização do cartão é feita no navegador com a chave pública (PCI SAQ-A-EP):
// o PAN nunca trafega pelo nosso servidor — recebemos apenas o cartão criptografado.
// Docs: https://dev.pagbank.uol.com.br/reference/criar-pedido

import prisma from '@/lib/prisma';

export type PagBankMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

export interface PagBankConfig {
  env: string; // "sandbox" | "prod"
  token: string;
  publicKey: string;
  webhookToken: string;
  appUrl: string;
}

/**
 * Carrega a configuração do PagBank do banco (SystemSettings), com fallback
 * para variáveis de ambiente. Assim o coordenador configura tudo pelo painel.
 */
export async function getPagBankConfig(): Promise<PagBankConfig> {
  let s: any = null;
  try {
    s = await (prisma as any).systemSettings.findFirst();
  } catch {
    s = null;
  }
  return {
    env: s?.pagbankEnv || process.env.PAGBANK_ENV || 'sandbox',
    token: s?.pagbankToken || process.env.PAGBANK_TOKEN || '',
    publicKey: s?.pagbankPublicKey || process.env.NEXT_PUBLIC_PAGBANK_PUBLIC_KEY || '',
    webhookToken: s?.pagbankWebhookToken || process.env.PAGBANK_WEBHOOK_TOKEN || '',
    appUrl: s?.appUrl || process.env.APP_URL || '',
  };
}

export function baseUrlFor(env: string): string {
  return env === 'prod' ? 'https://api.pagseguro.com' : 'https://sandbox.api.pagseguro.com';
}

export interface CustomerInput {
  name: string;
  email: string;
  taxId?: string | null; // CPF (apenas dígitos)
  phone?: string | null;
}

export interface CardInput {
  encrypted: string; // cartão criptografado pelo SDK do navegador
  holderName: string;
}

export interface CreateChargeParams {
  referenceId: string; // id da transação interna
  description: string;
  amountCents: number;
  method: PagBankMethod;
  customer: CustomerInput;
  card?: CardInput;
  notificationUrl?: string;
}

export interface CreateChargeResult {
  orderId: string | null;
  chargeId: string | null;
  status: string; // PAID, WAITING, DECLINED, CANCELED...
  pixQrCode?: string | null; // imagem (url)
  pixQrCodeText?: string | null; // copia-e-cola
  boletoUrl?: string | null;
  boletoBarcode?: string | null;
  raw: any;
}

function onlyDigits(v?: string | null): string | undefined {
  if (!v) return undefined;
  const d = v.replace(/\D/g, '');
  return d || undefined;
}

function buildCustomer(c: CustomerInput) {
  const phone = onlyDigits(c.phone);
  return {
    name: c.name,
    email: c.email,
    tax_id: onlyDigits(c.taxId),
    phones: phone && phone.length >= 10
      ? [{ country: '55', area: phone.slice(0, 2), number: phone.slice(2), type: 'MOBILE' }]
      : undefined,
  };
}

/** Mapeia status do PagBank → status interno do Payment. */
export function mapStatus(pagbankStatus?: string): 'WAITING' | 'PAID' | 'DECLINED' | 'CANCELED' {
  switch ((pagbankStatus || '').toUpperCase()) {
    case 'PAID':
    case 'AVAILABLE':
      return 'PAID';
    case 'DECLINED':
      return 'DECLINED';
    case 'CANCELED':
      return 'CANCELED';
    default:
      return 'WAITING';
  }
}

async function postOrder(body: any, config: PagBankConfig): Promise<any> {
  const res = await fetch(`${baseUrlFor(config.env)}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errs = data?.error_messages;
    const msg = Array.isArray(errs) && errs.length
      ? errs.map((e: any) => [e.parameter_name, e.description].filter(Boolean).join(': ')).join(' | ')
      : data?.message || `PagBank HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function createCharge(params: CreateChargeParams): Promise<CreateChargeResult> {
  const { referenceId, description, amountCents, method, customer, card, notificationUrl } = params;
  const config = await getPagBankConfig();
  if (!config.token) throw new Error('Pagamento online não configurado.');
  const customerPayload = buildCustomer(customer);
  const items = [{ name: description.slice(0, 60), quantity: 1, unit_amount: amountCents }];
  const notification_urls = notificationUrl ? [notificationUrl] : undefined;

  if (method === 'PIX') {
    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const data = await postOrder({
      reference_id: referenceId,
      customer: customerPayload,
      items,
      qr_codes: [{ amount: { value: amountCents }, expiration_date: expiration }],
      notification_urls,
    }, config);
    const qr = data?.qr_codes?.[0];
    const pngLink = qr?.links?.find((l: any) => l.media === 'image/png')?.href ?? null;
    return {
      orderId: data?.id ?? null,
      chargeId: qr?.id ?? null,
      status: 'WAITING',
      pixQrCode: pngLink,
      pixQrCodeText: qr?.text ?? null,
      raw: data,
    };
  }

  if (method === 'BOLETO') {
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await postOrder({
      reference_id: referenceId,
      customer: customerPayload,
      items,
      charges: [
        {
          reference_id: referenceId,
          description: description.slice(0, 63),
          amount: { value: amountCents, currency: 'BRL' },
          payment_method: {
            type: 'BOLETO',
            boleto: {
              due_date: dueDate,
              instruction_lines: { line_1: 'Pagamento Seminário Huios', line_2: 'Não receber após vencimento' },
              holder: {
                name: customer.name,
                tax_id: onlyDigits(customer.taxId),
                email: customer.email,
              },
            },
          },
        },
      ],
      notification_urls,
    }, config);
    const charge = data?.charges?.[0];
    const boletoLink = charge?.payment_method?.boleto?.links?.find((l: any) => l.media === 'application/pdf')?.href
      ?? charge?.links?.find((l: any) => l.rel?.includes('PDF') || l.media === 'application/pdf')?.href
      ?? null;
    return {
      orderId: data?.id ?? null,
      chargeId: charge?.id ?? null,
      status: mapStatus(charge?.status),
      boletoUrl: boletoLink,
      boletoBarcode: charge?.payment_method?.boleto?.barcode ?? charge?.payment_method?.boleto?.formatted_barcode ?? null,
      raw: data,
    };
  }

  // CREDIT_CARD
  if (!card?.encrypted) throw new Error('Cartão não informado.');
  const data = await postOrder({
    reference_id: referenceId,
    customer: customerPayload,
    items,
    charges: [
      {
        reference_id: referenceId,
        description: description.slice(0, 63),
        amount: { value: amountCents, currency: 'BRL' },
        payment_method: {
          type: 'CREDIT_CARD',
          installments: 1,
          capture: true,
          // Texto exibido na fatura do cartão (máx. 17 caracteres, sem acentos).
          soft_descriptor: 'HUIOS',
          card: { encrypted: card.encrypted, store: false },
          holder: { name: card.holderName },
        },
      },
    ],
    notification_urls,
  }, config);
  const charge = data?.charges?.[0];
  return {
    orderId: data?.id ?? null,
    chargeId: charge?.id ?? null,
    status: mapStatus(charge?.status),
    raw: data,
  };
}

export async function getCharge(chargeId: string): Promise<any> {
  const config = await getPagBankConfig();
  const res = await fetch(`${baseUrlFor(config.env)}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${config.token}`, accept: 'application/json' },
  });
  return res.json().catch(() => ({}));
}

export async function isConfigured(): Promise<boolean> {
  const config = await getPagBankConfig();
  return !!config.token;
}

/**
 * Busca a chave pública do PagBank usada para criptografar o cartão no navegador.
 * Serve também como teste de conexão do token.
 * Docs: https://developer.pagbank.com.br/reference/criar-chave-publica
 */
export async function fetchPublicKey(token: string, env: string): Promise<string> {
  const res = await fetch(`${baseUrlFor(env)}/public-keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ type: 'card' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error_messages?.[0]?.description || data?.message || `PagBank HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!data?.public_key) throw new Error('Resposta sem chave pública.');
  return data.public_key as string;
}
