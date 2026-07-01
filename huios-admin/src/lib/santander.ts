// Integração Santander — API Pix (padrão Bacen / Pix Cobrança imediata).
// Diferente do PagBank (que usa apenas um token Bearer), o Santander exige:
//   1) Client ID + Client Secret (credenciais do app no portal do desenvolvedor);
//   2) Certificado de transporte (mTLS): toda chamada usa um certificado digital
//      cliente (PEM) + chave privada para estabelecer o canal seguro;
//   3) Uma chave Pix recebedora previamente cadastrada na conta Santander.
// O fluxo: OAuth2 (client_credentials, sobre mTLS) → cria a cobrança (PUT /cob/{txid})
// → recebe o "copia e cola" (pixCopiaECola) → confirma o pagamento via webhook.
// Docs: https://developer.santander.com.br (produto "Pix" / "Cobrança Pix").

import https from 'https';
import crypto from 'crypto';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';

export interface SantanderConfig {
  env: string; // "sandbox" | "prod"
  clientId: string;
  clientSecret: string;
  applicationKey: string; // Application Key / Developer API Key (header X-Application-Key)
  certificate: string; // PEM do certificado de transporte
  certificateKey: string; // PEM da chave privada
  certificatePassphrase: string; // senha da chave privada (se estiver cifrada)
  pixKey: string; // chave Pix recebedora
  appUrl: string;
}

// Hosts da API Pix do Santander. Autenticação (OAuth) e recursos Pix (cob, webhook)
// ficam no MESMO host por ambiente — o token só é válido no host que o emitiu.
// Produção: trust-pix. Homologação: trust-pix-h (sufixo "-h", NÃO "trust-sandbox").
const HOSTS: Record<string, string> = {
  prod: 'https://trust-pix.santander.com.br',
  sandbox: 'https://trust-pix-h.santander.com.br',
};

export function baseUrlFor(env: string): string {
  return HOSTS[env] || HOSTS.sandbox;
}

/**
 * Header `X-Application-Key` (Application Key / Developer API Key do app no portal).
 * Só é enviado quando configurado — mandar um valor errado (ex.: o Client ID) pode
 * fazer o gateway responder 401 "Access Denied".
 */
function appKeyHeader(config: SantanderConfig): Record<string, string> {
  return config.applicationKey ? { 'X-Application-Key': config.applicationKey } : {};
}

/** Carrega a configuração do Santander do banco (SystemSettings). */
export async function getSantanderConfig(): Promise<SantanderConfig> {
  let s: any = null;
  try {
    s = await (prisma as any).systemSettings.findFirst();
  } catch {
    s = null;
  }
  return {
    env: s?.santanderEnv || 'sandbox',
    clientId: s?.santanderClientId || '',
    clientSecret: s?.santanderClientSecret || '',
    applicationKey: s?.santanderApplicationKey || '',
    certificate: s?.santanderCertificate || '',
    certificateKey: s?.santanderCertificateKey || '',
    certificatePassphrase: s?.santanderCertificatePassphrase || '',
    pixKey: s?.santanderPixKey || '',
    appUrl: s?.appUrl || process.env.APP_URL || '',
  };
}

export async function isConfigured(): Promise<boolean> {
  const c = await getSantanderConfig();
  return !!(c.clientId && c.clientSecret && c.certificate && c.certificateKey && c.pixKey);
}

interface HttpResult {
  status: number;
  body: string;
}

/**
 * Faz uma requisição HTTPS usando o certificado cliente (mTLS). O `fetch` nativo
 * não expõe facilmente a opção de certificado de cliente, então usamos o módulo
 * `https` do Node diretamente.
 */
function mtlsRequest(
  urlStr: string,
  opts: { method: string; headers: Record<string, string>; body?: string; cert: string; key: string; passphrase?: string },
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    let u: URL;
    try {
      u = new URL(urlStr);
    } catch (e) {
      return reject(e);
    }
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: opts.method,
        headers: opts.headers,
        cert: opts.cert,
        key: opts.key,
        // Só informa a passphrase quando a chave privada está cifrada. Passar uma
        // string vazia para uma chave não cifrada também dispara "bad decrypt".
        ...(opts.passphrase ? { passphrase: opts.passphrase } : {}),
        // O canal usa o certificado de transporte do cliente; a cadeia do servidor
        // continua sendo validada normalmente.
      },
      (res) => {
        let chunks = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ status: res.statusCode || 0, body: chunks }));
      },
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function parseJson(body: string): any {
  try {
    return JSON.parse(body || '{}');
  } catch {
    return {};
  }
}

function describeError(data: any, status: number, rawBody?: string): string {
  // A API Pix (Bacen) devolve erros em formatos variados: { violacoes: [...] },
  // { detail }, { message } ou { error_description }.
  if (Array.isArray(data?.violacoes) && data.violacoes.length) {
    return data.violacoes.map((v: any) => v.razao || v.propriedade).filter(Boolean).join(' | ');
  }
  const structured =
    data?.detail || data?.message || data?.error_description || data?.error || data?.fault?.faultstring;
  if (structured) return structured;
  // Sem campo estruturado: inclui um trecho do corpo bruto para facilitar o
  // diagnóstico (ex.: 401 com texto simples ou HTML do gateway).
  const snippet = (rawBody || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  return snippet ? `Santander HTTP ${status}: ${snippet}` : `Santander HTTP ${status}`;
}

/**
 * Obtém um access token via OAuth2 (client_credentials) sobre mTLS.
 * Serve também como teste de conexão das credenciais + certificado.
 */
export async function fetchAccessToken(
  config: SantanderConfig,
  scope = 'cob.write',
): Promise<string> {
  const base = baseUrlFor(config.env);
  // Token endpoint desta API é /api/v1/oauth (ver doc "Pix - Geração de QR Code").
  // As credenciais vão via HTTP Basic Auth; o grant_type/scope no corpo. Sem o
  // header Authorization o gateway responde "Missing Authentication Token". O
  // escopo (cob.write) é o que autoriza a criação da cobrança — sem ele o recurso
  // devolve "Access Denied".
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const form = `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`;
  const res = await mtlsRequest(`${base}/api/v1/oauth`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'Content-Length': Buffer.byteLength(form).toString(),
    },
    body: form,
    cert: config.certificate,
    key: config.certificateKey,
    passphrase: config.certificatePassphrase,
  });
  const data = parseJson(res.body);
  if (res.status < 200 || res.status >= 300) {
    throw new Error('OAuth: ' + describeError(data, res.status, res.body));
  }
  if (!data?.access_token) throw new Error('OAuth: resposta sem access_token. Verifique o certificado de transporte (mTLS).');
  return data.access_token as string;
}

/** Gera um txid válido (26–35 caracteres alfanuméricos) conforme o padrão Bacen. */
function generateTxid(): string {
  return crypto.randomUUID().replace(/-/g, ''); // 32 caracteres hexadecimais
}

function onlyDigits(v?: string | null): string | undefined {
  if (!v) return undefined;
  const d = v.replace(/\D/g, '');
  return d || undefined;
}

export interface SantanderPixParams {
  description: string;
  amountCents: number;
  customer: { name: string; taxId?: string | null };
  expirationSeconds?: number;
}

export interface SantanderPixResult {
  txid: string;
  status: string; // WAITING (interno)
  pixQrCode: string | null; // imagem (data URL) gerada do copia-e-cola
  pixQrCodeText: string | null; // copia-e-cola
  raw: any;
}

/** Mapeia o status da cobrança Pix (Bacen) → status interno do Payment. */
export function mapStatus(cobStatus?: string): 'WAITING' | 'PAID' | 'CANCELED' {
  switch ((cobStatus || '').toUpperCase()) {
    case 'CONCLUIDA':
      return 'PAID';
    case 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
    case 'REMOVIDA_PELO_PSP':
      return 'CANCELED';
    default:
      return 'WAITING'; // ATIVA
  }
}

/**
 * Cria uma cobrança Pix imediata e devolve o "copia e cola" + imagem do QR Code.
 * O recebimento é confirmado depois pelo webhook do Santander.
 */
export async function createPixCharge(params: SantanderPixParams): Promise<SantanderPixResult> {
  const config = await getSantanderConfig();
  if (!(await isConfigured())) throw new Error('Pagamento Santander não configurado.');

  const token = await fetchAccessToken(config);
  const base = baseUrlFor(config.env);
  const txid = generateTxid();

  const valor = (params.amountCents / 100).toFixed(2);
  const body: any = {
    calendario: { expiracao: params.expirationSeconds ?? 86400 },
    valor: { original: valor },
    chave: config.pixKey,
    solicitacaoPagador: params.description.slice(0, 140),
  };
  const cpf = onlyDigits(params.customer.taxId);
  if (cpf && (cpf.length === 11 || cpf.length === 14)) {
    body.devedor = cpf.length === 11 ? { cpf, nome: params.customer.name } : { cnpj: cpf, nome: params.customer.name };
  }
  const payload = JSON.stringify(body);

  const res = await mtlsRequest(`${base}/api/v1/cob/${txid}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      ...appKeyHeader(config),
      'Content-Type': 'application/json',
      Accept: 'application/json, application/problem+json',
      'Content-Length': Buffer.byteLength(payload).toString(),
    },
    body: payload,
    cert: config.certificate,
    key: config.certificateKey,
    passphrase: config.certificatePassphrase,
  });
  const data = parseJson(res.body);
  if (res.status < 200 || res.status >= 300) {
    throw new Error('Cobrança (cob): ' + describeError(data, res.status, res.body));
  }

  // O "copia e cola" (EMV) pode vir como pixCopiaECola/emv; alguns retornos trazem
  // apenas o "location" (URL do payload do QR), usado como fallback para o texto.
  const copiaECola: string | null = data?.pixCopiaECola ?? data?.emv ?? data?.location ?? null;
  let qrImage: string | null = null;
  if (copiaECola) {
    try {
      qrImage = await QRCode.toDataURL(copiaECola, { width: 280, margin: 1 });
    } catch {
      qrImage = null;
    }
  }

  return {
    txid: data?.txid || txid,
    status: mapStatus(data?.status),
    pixQrCode: qrImage,
    pixQrCodeText: copiaECola,
    raw: data,
  };
}

/** Consulta uma cobrança Pix pelo txid (usado em reconciliação/polling). */
export async function getCob(txid: string): Promise<any> {
  const config = await getSantanderConfig();
  const token = await fetchAccessToken(config);
  const base = baseUrlFor(config.env);
  const res = await mtlsRequest(`${base}/api/v1/cob/${txid}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, ...appKeyHeader(config), Accept: 'application/json' },
    cert: config.certificate,
    key: config.certificateKey,
    passphrase: config.certificatePassphrase,
  });
  return parseJson(res.body);
}

/**
 * Registra (ou atualiza) o webhook que recebe as confirmações de pagamento Pix.
 * O Santander vincula o webhook à chave Pix recebedora.
 */
export async function registerWebhook(config: SantanderConfig, webhookUrl: string): Promise<void> {
  const token = await fetchAccessToken(config, 'webhook.write webhook.read');
  const base = baseUrlFor(config.env);
  const payload = JSON.stringify({ webhookUrl });
  const res = await mtlsRequest(`${base}/api/v1/webhook/${encodeURIComponent(config.pixKey)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      ...appKeyHeader(config),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Content-Length': Buffer.byteLength(payload).toString(),
    },
    body: payload,
    cert: config.certificate,
    key: config.certificateKey,
    passphrase: config.certificatePassphrase,
  });
  if (res.status < 200 || res.status >= 300) {
    const data = parseJson(res.body);
    throw new Error(describeError(data, res.status, res.body));
  }
}
