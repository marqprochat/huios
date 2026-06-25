'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Turma {
  id: string;
  name: string;
  courseName: string;
  startDate: string | null;
}

interface ChurchInfo {
  id: string;
  name: string;
  isPartner: boolean;
  type: string;
}

interface Person {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  isMemberOfSede: boolean;
}

interface SummaryItem {
  studentName: string;
  tier: string;
  monthlyAmount: number;
  transactionId: string | null;
  amount: number | null;
}

const TIER_LABELS: Record<string, string> = {
  MEMBER: 'Membro da sede',
  NON_MEMBER: 'Não-membro',
  FAMILY: 'Família',
  PARTNER: 'Igreja parceira',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const emptyPerson = (): Person => ({ name: '', email: '', phone: '', cpf: '', isMemberOfSede: false });

export function MatriculaForm({ turmas, church }: { turmas: Turma[]; church?: ChurchInfo | null }) {
  const [classId, setClassId] = useState(turmas[0]?.id ?? '');
  const [isFamily, setIsFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [people, setPeople] = useState<Person[]>([emptyPerson()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryItem[] | null>(null);

  const updatePerson = (i: number, patch: Partial<Person>) =>
    setPeople(ps => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addPerson = () => setPeople(ps => [...ps, emptyPerson()]);
  const removePerson = (i: number) => setPeople(ps => ps.filter((_, idx) => idx !== i));

  const fieldCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!classId) return setError('Selecione uma turma.');
    setLoading(true);
    try {
      const res = await fetch('/api/matricula/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          churchSlug: undefined,
          churchId: church?.id ?? null,
          isFamily: isFamily && people.length > 1,
          family: isFamily ? { name: familyName } : null,
          people,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao matricular.');
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (summary) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <h3 className="text-xl font-black text-slate-900">Matrícula realizada!</h3>
          <p className="text-sm text-slate-500">Conclua o pagamento da primeira mensalidade de cada aluno.</p>
        </div>
        <div className="space-y-3">
          {summary.map((s, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">{s.studentName}</p>
                <p className="text-xs text-slate-500">
                  Mensalidade {fmt(s.monthlyAmount)} · {TIER_LABELS[s.tier] || s.tier}
                </p>
              </div>
              {s.transactionId ? (
                <Link href={`/matricula/pagamento/${s.transactionId}`} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 whitespace-nowrap">
                  Pagar {s.amount != null ? fmt(s.amount) : ''}
                </Link>
              ) : (
                <span className="text-xs text-slate-400">Sem cobrança</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {church && (
        <div className={`rounded-xl p-3 text-sm font-bold ${church.isPartner ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
          <span className="material-symbols-outlined text-[18px] align-middle mr-1">church</span>
          {church.isPartner ? 'Matrícula via igreja parceira: ' : 'Igreja: '}{church.name}
          {church.isPartner && <p className="text-xs font-medium mt-1">A partir de 3 pessoas, o valor de parceria é aplicado automaticamente.</p>}
        </div>
      )}

      {turmas.length === 1 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Turma</p>
          <p className="text-sm font-bold text-slate-800">{turmas[0].courseName}</p>
          <p className="text-xs text-slate-500">{turmas[0].name}</p>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Turma</label>
          <select value={classId} onChange={e => setClassId(e.target.value)} className={fieldCls} required>
            {turmas.length === 0 && <option value="">Nenhuma turma com matrícula aberta</option>}
            {turmas.map(t => (
              <option key={t.id} value={t.id}>{t.courseName} — {t.name}</option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isFamily} onChange={e => setIsFamily(e.target.checked)} className="rounded" />
        <span className="text-sm font-bold text-slate-700">Matricular grupo familiar (2+ pessoas)</span>
      </label>

      {isFamily && (
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Nome da família / responsável</label>
          <input value={familyName} onChange={e => setFamilyName(e.target.value)} className={fieldCls} placeholder="Ex: Família Silva" />
        </div>
      )}

      <div className="space-y-4">
        {people.map((p, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Pessoa {i + 1}</p>
              {people.length > 1 && (
                <button type="button" onClick={() => removePerson(i)} className="text-red-500 text-xs font-bold">Remover</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={p.name} onChange={e => updatePerson(i, { name: e.target.value })} className={fieldCls} placeholder="Nome completo *" required />
              <input value={p.email} onChange={e => updatePerson(i, { email: e.target.value })} type="email" className={fieldCls} placeholder="E-mail *" required />
              <input value={p.phone} onChange={e => updatePerson(i, { phone: e.target.value })} className={fieldCls} placeholder="Telefone" />
              <input value={p.cpf} onChange={e => updatePerson(i, { cpf: e.target.value })} className={fieldCls} placeholder="CPF" />
            </div>
            {!church?.isPartner && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={p.isMemberOfSede} onChange={e => updatePerson(i, { isMemberOfSede: e.target.checked })} className="rounded" />
                <span className="text-xs font-bold text-slate-600">Sou membro da igreja sede</span>
              </label>
            )}
          </div>
        ))}
        {isFamily && (
          <button type="button" onClick={addPerson} className="text-sm font-bold text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">add</span>Adicionar pessoa
          </button>
        )}
      </div>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <button type="submit" disabled={loading || turmas.length === 0} className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
        {loading ? 'Processando...' : 'Confirmar matrícula'}
      </button>
    </form>
  );
}
