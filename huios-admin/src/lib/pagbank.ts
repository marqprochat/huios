// Integração PagBank (checkout transparente — Orders API).
// Tokenização do cartão é feita no navegador com a chave pública (PCI SAQ-A-EP):
// o PAN nunca trafega pelo nosso servidor — recebemos apenas o cartão criptografado.
// Docs: https://dev.pagbank.uol.com.br/reference/criar-pedido

const ENV = process.env.PAGBANK_ENV || 'sandbox';
const TOKEN = process.env.PAGBANK_TOKEN || '';

const BASE_URL = ENV === 'prod' ? 'https://api.pagseguro.com' : 'https://sandbox.api.pagseguro.com';

export type PagBankMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

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

async function postOrder(body: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error_messages?.[0]?.description || data?.message || `PagBank HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function createCharge(params: CreateChargeParams): Promise<CreateChargeResult> {
  const { referenceId, description, amountCents, method, customer, card, notificationUrl } = params;
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
    });
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
    });
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
          card: { encrypted: card.encrypted, store: false },
          holder: { name: card.holderName },
        },
      },
    ],
    notification_urls,
  });
  const charge = data?.charges?.[0];
  return {
    orderId: data?.id ?? null,
    chargeId: charge?.id ?? null,
    status: mapStatus(charge?.status),
    raw: data,
  };
}

export async function getCharge(chargeId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
  });
  return res.json().catch(() => ({}));
}

export function isConfigured(): boolean {
  return !!TOKEN;
}

export const PAGBANK_ENV = ENV;
