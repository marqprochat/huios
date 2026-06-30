'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    PagSeguro?: any;
  }
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const SDK_URL = 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js';

type Tab = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

// Métodos de pagamento habilitados no checkout. Por ora apenas Pix está ativo
// (Cartão/Boleto exigem liberação adicional na conta PagBank).
const ENABLED_METHODS: Tab[] = ['PIX'];

interface Props {
  transactionId: string;
  description: string;
  amount: number;
  studentName: string;
  alreadyPaid: boolean;
  publicKey: string;
  redirectTo?: string | null;
}

export function PagamentoClient({ transactionId, description, amount, studentName, alreadyPaid, publicKey, redirectTo }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(ENABLED_METHODS[0]);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(alreadyPaid);
  const [pix, setPix] = useState<{ image: string | null; text: string | null } | null>(null);
  const [boleto, setBoleto] = useState<{ url: string | null; barcode: string | null } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carrega o SDK do PagBank (criptografia do cartão no navegador).
  useEffect(() => {
    if (window.PagSeguro) { setSdkReady(true); return; }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => setSdkReady(true);
    document.body.appendChild(s);
  }, []);

  // Polling de status (PIX/boleto) até confirmar pagamento.
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagamentos/status?transactionId=${transactionId}`);
        const data = await res.json();
        if (data.paid) {
          setPaid(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore */ }
    }, 5000);
  };
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const submitCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!publicKey) return setError('Pagamento por cartão indisponível (chave não configurada).');
    if (!sdkReady || !window.PagSeguro) return setError('Aguarde o carregamento do checkout...');

    const form = e.currentTarget;
    const fd = new FormData(form);
    const holderName = (fd.get('holderName') as string).trim();
    const number = (fd.get('number') as string).replace(/\s/g, '');
    const expMonth = fd.get('expMonth') as string;
    const expYear = fd.get('expYear') as string;
    const securityCode = fd.get('cvv') as string;

    const card = window.PagSeguro.encryptCard({ publicKey, holder: holderName, number, expMonth, expYear, securityCode });
    if (card.hasErrors) {
      setError('Dados do cartão inválidos. Verifique e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pagamentos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, method: 'CREDIT_CARD', card: { encrypted: card.encryptedCard, holderName } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no pagamento.');
      if (data.status === 'PAID') setPaid(true);
      else if (data.status === 'DECLINED') setError('Pagamento recusado pela operadora.');
      else { startPolling(); }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOther = async (method: 'PIX' | 'BOLETO') => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/pagamentos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar cobrança.');
      if (method === 'PIX') setPix({ image: data.pixQrCode, text: data.pixQrCodeText });
      if (method === 'BOLETO') setBoleto({ url: data.boletoUrl, barcode: data.boletoBarcode });
      startPolling();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return <PaidScreen description={description} amount={amount} redirectTo={redirectTo} router={router} />;
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5">
      <div className="text-center border-b border-slate-100 pb-4">
        <p className="text-sm text-slate-500">{description}</p>
        <p className="text-[11px] text-slate-400">{studentName}</p>
        <p className="text-3xl font-black text-slate-900 mt-1">{fmt(amount)}</p>
      </div>

      {ENABLED_METHODS.length > 1 && (
        <div className="flex gap-2">
          {ENABLED_METHODS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
              {t === 'CREDIT_CARD' ? 'Cartão' : t === 'PIX' ? 'PIX' : 'Boleto'}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      {tab === 'CREDIT_CARD' && (
        <form onSubmit={submitCard} className="space-y-3">
          <input name="holderName" className={inputCls} placeholder="Nome impresso no cartão" required />
          <input name="number" className={inputCls} placeholder="Número do cartão" inputMode="numeric" required />
          <div className="grid grid-cols-3 gap-3">
            <input name="expMonth" className={inputCls} placeholder="MM" inputMode="numeric" maxLength={2} required />
            <input name="expYear" className={inputCls} placeholder="AAAA" inputMode="numeric" maxLength={4} required />
            <input name="cvv" className={inputCls} placeholder="CVV" inputMode="numeric" maxLength={4} required />
          </div>
          <button type="submit" disabled={loading || !sdkReady} className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
            {loading ? 'Processando...' : !sdkReady ? 'Carregando...' : `Pagar ${fmt(amount)}`}
          </button>
          <p className="text-[10px] text-slate-400 text-center">Dados do cartão criptografados no seu navegador. Não armazenamos o número do cartão.</p>
        </form>
      )}

      {tab === 'PIX' && (
        <div className="space-y-3 text-center">
          {!pix ? (
            <button onClick={() => submitOther('PIX')} disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {loading ? 'Gerando...' : 'Gerar PIX'}
            </button>
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {pix.image && <img src={pix.image} alt="QR Code PIX" className="w-48 h-48 mx-auto" />}
              {pix.text && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">PIX copia e cola</p>
                  <textarea readOnly value={pix.text} className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 h-20" />
                  <button onClick={() => navigator.clipboard?.writeText(pix.text!)} className="text-xs font-bold text-primary mt-1">Copiar código</button>
                </div>
              )}
              <p className="text-xs text-slate-400">Aguardando confirmação do pagamento...</p>
            </div>
          )}
        </div>
      )}

      {tab === 'BOLETO' && (
        <div className="space-y-3 text-center">
          {!boleto ? (
            <button onClick={() => submitOther('BOLETO')} disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {loading ? 'Gerando...' : 'Gerar Boleto'}
            </button>
          ) : (
            <div className="space-y-2">
              {boleto.url && (
                <a href={boleto.url} target="_blank" rel="noopener noreferrer" className="inline-block bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90">
                  Abrir boleto (PDF)
                </a>
              )}
              {boleto.barcode && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">Linha digitável</p>
                  <p className="text-xs break-all bg-slate-50 border border-slate-200 rounded-xl p-2">{boleto.barcode}</p>
                </div>
              )}
              <p className="text-xs text-slate-400">O pagamento é confirmado em até alguns dias úteis.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const REDIRECT_SECONDS = 5;

function PaidScreen({
  description,
  amount,
  redirectTo,
  router,
}: {
  description: string;
  amount: number;
  redirectTo?: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  const [count, setCount] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (!redirectTo) return;
    const tick = setInterval(() => setCount(c => Math.max(0, c - 1)), 1000);
    const go = setTimeout(() => router.push(redirectTo), REDIRECT_SECONDS * 1000);
    return () => { clearInterval(tick); clearTimeout(go); };
  }, [redirectTo, router]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-4xl">check_circle</span>
      </div>
      <h3 className="text-xl font-black text-slate-900">Pagamento confirmado!</h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
      <p className="text-2xl font-black text-slate-900 mt-3">{fmt(amount)}</p>
      {redirectTo && (
        <div className="mt-6 space-y-2">
          <button
            onClick={() => router.push(redirectTo)}
            className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90"
          >
            Voltar ao financeiro
          </button>
          <p className="text-xs text-slate-400">Redirecionando em {count}s...</p>
        </div>
      )}
    </div>
  );
}
