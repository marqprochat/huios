import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { fetchPublicKey } from '@/lib/pagbank';

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

// GET — retorna a configuração SEM expor o token completo (apenas mascarado).
export async function GET() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const s = await (prisma as any).systemSettings.findFirst();
  return NextResponse.json({
    pagbankEnv: s?.pagbankEnv || 'sandbox',
    appUrl: s?.appUrl || '',
    tokenMasked: mask(s?.pagbankToken),
    webhookTokenMasked: mask(s?.pagbankWebhookToken),
    hasToken: !!s?.pagbankToken,
    hasPublicKey: !!s?.pagbankPublicKey,
  });
}

// PUT — salva configuração. Token/webhookToken só são atualizados se vierem preenchidos.
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { pagbankEnv, appUrl, pagbankToken, pagbankWebhookToken } = body;

    const s = await ensureSettings();
    const data: any = {
      pagbankEnv: pagbankEnv === 'prod' ? 'prod' : 'sandbox',
      appUrl: (appUrl || '').trim() || null,
    };
    // Só sobrescreve o token se um novo valor não-vazio for enviado (evita apagar ao salvar).
    if (typeof pagbankToken === 'string' && pagbankToken.trim()) {
      data.pagbankToken = pagbankToken.trim();
      data.pagbankPublicKey = null; // invalida a chave; será gerada novamente no teste
    }
    if (typeof pagbankWebhookToken === 'string' && pagbankWebhookToken.trim()) {
      data.pagbankWebhookToken = pagbankWebhookToken.trim();
    }

    await (prisma as any).systemSettings.update({ where: { id: s.id }, data });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao salvar config de pagamento:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar.' }, { status: 400 });
  }
}

// POST — testa o token gerando a chave pública do PagBank e a salva no banco.
export async function POST() {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const s = await (prisma as any).systemSettings.findFirst();
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
    console.error('Erro ao testar conexão PagBank:', error);
    return NextResponse.json({ error: error.message || 'Falha ao validar o token.' }, { status: 400 });
  }
}
