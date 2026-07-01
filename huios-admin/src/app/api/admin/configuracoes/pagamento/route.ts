import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { fetchPublicKey } from '@/lib/pagbank';
import { fetchAccessToken, registerWebhook, getSantanderConfig } from '@/lib/santander';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'COORDENADOR'];

function mask(token?: string | null): string | null {
  if (!token) return null;
  if (token.length <= 8) return '••••';
  return `${'•'.repeat(Math.max(0, token.length - 4))}${token.slice(-4)}`;
}

/** Garante que existe um registro de SystemSettings e o retorna. */
async function ensureSettings(): Promise<any> {
  let s = await (prisma as any).systemSettings.findFirst();
  if (!s) s = await (prisma as any).systemSettings.create({ data: {} });
  return s;
}

// GET — retorna a configuração SEM expor os segredos (apenas mascarados).
export async function GET() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const s = await (prisma as any).systemSettings.findFirst();
  return NextResponse.json({
    paymentProvider: s?.paymentProvider === 'santander' ? 'santander' : 'pagbank',
    appUrl: s?.appUrl || '',
    // PagBank
    pagbankEnv: s?.pagbankEnv || 'sandbox',
    tokenMasked: mask(s?.pagbankToken),
    webhookTokenMasked: mask(s?.pagbankWebhookToken),
    hasToken: !!s?.pagbankToken,
    hasPublicKey: !!s?.pagbankPublicKey,
    // Santander
    santanderEnv: s?.santanderEnv || 'sandbox',
    santanderClientId: s?.santanderClientId || '',
    santanderClientSecretMasked: mask(s?.santanderClientSecret),
    santanderApplicationKey: s?.santanderApplicationKey || '',
    santanderPixKey: s?.santanderPixKey || '',
    hasSantanderCert: !!s?.santanderCertificate,
    hasSantanderKey: !!s?.santanderCertificateKey,
    hasSantanderPassphrase: !!s?.santanderCertificatePassphrase,
    santanderConfigured: !!(
      s?.santanderClientId &&
      s?.santanderClientSecret &&
      s?.santanderCertificate &&
      s?.santanderCertificateKey &&
      s?.santanderPixKey
    ),
    santanderWebhookConfigured: !!s?.santanderWebhookConfigured,
  });
}

// PUT — salva configuração. Segredos só são atualizados se vierem preenchidos.
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      paymentProvider,
      appUrl,
      // PagBank
      pagbankEnv,
      pagbankToken,
      pagbankWebhookToken,
      // Santander
      santanderEnv,
      santanderClientId,
      santanderClientSecret,
      santanderApplicationKey,
      santanderCertificate,
      santanderCertificateKey,
      santanderCertificatePassphrase,
      santanderPixKey,
    } = body;

    const s = await ensureSettings();
    const data: any = {};

    if (paymentProvider === 'pagbank' || paymentProvider === 'santander') {
      data.paymentProvider = paymentProvider;
    }
    if (typeof appUrl === 'string') data.appUrl = appUrl.trim() || null;

    // --- PagBank ---
    if (typeof pagbankEnv === 'string') data.pagbankEnv = pagbankEnv === 'prod' ? 'prod' : 'sandbox';
    if (typeof pagbankToken === 'string' && pagbankToken.trim()) {
      data.pagbankToken = pagbankToken.trim();
      data.pagbankPublicKey = null; // invalida a chave; será gerada novamente no teste
    }
    if (typeof pagbankWebhookToken === 'string' && pagbankWebhookToken.trim()) {
      data.pagbankWebhookToken = pagbankWebhookToken.trim();
    }

    // --- Santander ---
    if (typeof santanderEnv === 'string') data.santanderEnv = santanderEnv === 'prod' ? 'prod' : 'sandbox';
    if (typeof santanderClientId === 'string') data.santanderClientId = santanderClientId.trim() || null;
    if (typeof santanderApplicationKey === 'string') data.santanderApplicationKey = santanderApplicationKey.trim() || null;
    if (typeof santanderPixKey === 'string') data.santanderPixKey = santanderPixKey.trim() || null;
    if (typeof santanderClientSecret === 'string' && santanderClientSecret.trim()) {
      data.santanderClientSecret = santanderClientSecret.trim();
    }
    if (typeof santanderCertificate === 'string' && santanderCertificate.trim()) {
      data.santanderCertificate = santanderCertificate.trim();
      data.santanderWebhookConfigured = false; // mudou o certificado → revalidar webhook
    }
    if (typeof santanderCertificateKey === 'string' && santanderCertificateKey.trim()) {
      data.santanderCertificateKey = santanderCertificateKey.trim();
    }
    // Senha da chave: SEGREDO — só atualiza quando vier preenchida. Campo vazio
    // significa "manter a senha atual" (o frontend sempre envia o campo, mesmo em
    // branco); zerar aqui apagaria a senha salva e quebraria o mTLS ("bad decrypt").
    // Não usamos .trim() — senhas podem ter espaços intencionais.
    if (typeof santanderCertificatePassphrase === 'string' && santanderCertificatePassphrase) {
      data.santanderCertificatePassphrase = santanderCertificatePassphrase;
    }

    await (prisma as any).systemSettings.update({ where: { id: s.id }, data });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao salvar config de pagamento:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar.' }, { status: 400 });
  }
}

// POST — testa a conexão do provedor informado (?provider=pagbank|santander).
// PagBank: gera/salva a chave pública. Santander: obtém token e registra o webhook.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const provider = new URL(req.url).searchParams.get('provider') || 'pagbank';

  try {
    const s = await (prisma as any).systemSettings.findFirst();

    if (provider === 'santander') {
      const config = await getSantanderConfig();
      if (!config.clientId || !config.clientSecret || !config.certificate || !config.certificateKey || !config.pixKey) {
        return NextResponse.json(
          { error: 'Preencha Client ID, Client Secret, certificado, chave do certificado e chave Pix antes de testar.' },
          { status: 400 },
        );
      }
      // Testa as credenciais + certificado obtendo um token.
      await fetchAccessToken(config);

      // Tenta registrar o webhook (se houver URL pública HTTPS configurada).
      let webhookMsg = '';
      const base = (config.appUrl || '').replace(/\/$/, '');
      if (base.startsWith('https://')) {
        try {
          await registerWebhook(config, `${base}/api/pagamentos/webhook/santander`);
          await (prisma as any).systemSettings.update({
            where: { id: s.id },
            data: { santanderWebhookConfigured: true },
          });
          webhookMsg = ' Webhook registrado com sucesso.';
        } catch (e: any) {
          webhookMsg = ` Conexão OK, mas falhou ao registrar o webhook: ${e.message}`;
        }
      } else {
        webhookMsg = ' Preencha a URL pública (HTTPS) para registrar o webhook automaticamente.';
      }
      return NextResponse.json({ success: true, message: `Conexão Santander validada.${webhookMsg}` });
    }

    // --- PagBank (padrão) ---
    if (!s?.pagbankToken) {
      return NextResponse.json({ error: 'Salve o token antes de testar a conexão.' }, { status: 400 });
    }
    const env = s.pagbankEnv === 'prod' ? 'prod' : 'sandbox';
    const publicKey = await fetchPublicKey(s.pagbankToken, env);
    await (prisma as any).systemSettings.update({
      where: { id: s.id },
      data: { pagbankPublicKey: publicKey },
    });
    return NextResponse.json({ success: true, message: 'Conexão validada e chave pública gerada com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao testar conexão de pagamento:', error);
    return NextResponse.json({ error: error.message || 'Falha ao validar a conexão.' }, { status: 400 });
  }
}
