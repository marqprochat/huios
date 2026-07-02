'use client';

import { useState } from 'react';
import Link from 'next/link';
import { maskPhone, maskCpf, maskCep, onlyDigits, isValidCPF, isValidPhone } from '@/lib/masks';

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
  // Dados pessoais
  birthDate: string;
  maritalStatus: string;
  // Endereço (montado a partir do CEP / ViaCEP)
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cepLoading: boolean;
  // Vida cristã
  conversionTime: string;
  churchName: string;
  churchMembershipTime: string;
  isBaptized: boolean;
  baptismTime: string;
}

interface SummaryItem {
  studentName: string;
  tier: string;
  monthlyAmount: number;
  discountedMonthlyAmount: number;
  appliedCouponCode: string | null;
  enrollmentFeeTransactionId: string | null;
  enrollmentFeeAmount: number | null;
}

interface CouponInfo {
  code: string;
  description: string;
  waiveEnrollmentFee: boolean;
}

const PORTAL_URL = 'https://huios.igrejaconviva.com.br/portal';

const TIER_LABELS: Record<string, string> = {
  MEMBER: 'Membro da sede',
  NON_MEMBER: 'Não-membro',
  FAMILY: 'Família',
  PARTNER: 'Igreja parceira',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const emptyPerson = (): Person => ({
  name: '', email: '', phone: '', cpf: '', isMemberOfSede: false,
  birthDate: '', maritalStatus: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cepLoading: false,
  conversionTime: '', churchName: '', churchMembershipTime: '', isBaptized: false, baptismTime: '',
});

/** Junta as partes do endereço em um único texto para gravar no campo `address`. */
function buildAddress(p: Person): string {
  const linha = [p.logradouro, p.numero].filter(Boolean).join(', ');
  const comComp = p.complemento ? `${linha} - ${p.complemento}` : linha;
  const cidadeUf = [p.cidade, p.uf].filter(Boolean).join(' - ');
  const partes = [comComp, p.bairro, cidadeUf].filter(Boolean);
  let addr = partes.join(', ');
  if (p.cep) addr += (addr ? ', ' : '') + `CEP ${p.cep}`;
  return addr.trim();
}

export function MatriculaForm({ turmas, church }: { turmas: Turma[]; church?: ChurchInfo | null }) {
  const [classId, setClassId] = useState(turmas[0]?.id ?? '');
  const [isFamily, setIsFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [people, setPeople] = useState<Person[]>([emptyPerson()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryItem[] | null>(null);

  // Cupom
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    setCoupon(null);
    try {
      const res = await fetch('/api/cupons/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, classId }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponError(data.error || 'Cupom inválido.');
        return;
      }
      setCoupon({ code: data.code, description: data.description, waiveEnrollmentFee: data.waiveEnrollmentFee });
    } catch {
      setCouponError('Erro ao validar o cupom.');
    } finally {
      setCouponLoading(false);
    }
  };

  const clearCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const updatePerson = (i: number, patch: Partial<Person>) =>
    setPeople(ps => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addPerson = () => setPeople(ps => [...ps, emptyPerson()]);
  const removePerson = (i: number) => setPeople(ps => ps.filter((_, idx) => idx !== i));

  const fieldCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/30';
  const labelCls = 'block text-xs font-bold text-slate-600 mb-1';

  // Busca endereço pelo CEP (ViaCEP) e autopreenche os campos.
  const lookupCep = async (i: number, cep: string) => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    updatePerson(i, { cepLoading: true });
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        updatePerson(i, {
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
        });
      }
    } catch {
      /* silencioso: usuário pode preencher manualmente */
    } finally {
      updatePerson(i, { cepLoading: false });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!classId) return setError('Selecione uma turma.');

    // Valida CPF (obrigatório) e telefone (se preenchido) de cada pessoa.
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const quem = people.length > 1 ? `Pessoa ${i + 1}: ` : '';
      if (!p.cpf.trim()) return setError(`${quem}informe o CPF.`);
      if (!isValidCPF(p.cpf)) return setError(`${quem}CPF inválido.`);
      if (p.phone.trim() && !isValidPhone(p.phone)) return setError(`${quem}telefone inválido. Use (99) 99999-9999.`);
    }

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
          couponCode: coupon?.code ?? (couponCode.trim() || null),
          people: people.map(p => ({
            name: p.name,
            email: p.email,
            phone: p.phone,
            cpf: p.cpf,
            isMemberOfSede: p.isMemberOfSede,
            birthDate: p.birthDate || null,
            maritalStatus: p.maritalStatus || null,
            address: buildAddress(p) || null,
            conversionTime: p.conversionTime || null,
            churchName: p.churchName || null,
            churchMembershipTime: p.churchMembershipTime || null,
            isBaptized: p.isBaptized,
            baptismTime: p.baptismTime || null,
          })),
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
    const temTaxa = summary.some(s => s.enrollmentFeeTransactionId);
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <h3 className="text-xl font-black text-slate-900">Matrícula realizada!</h3>
          <p className="text-sm text-slate-500">
            {temTaxa
              ? 'Deseja pagar a taxa de matrícula agora?'
              : 'Cadastro concluído com sucesso.'}
          </p>
        </div>

        <div className="space-y-3">
          {summary.map((s, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="font-bold text-slate-800">{s.studentName}</p>
                {s.appliedCouponCode && s.discountedMonthlyAmount < s.monthlyAmount ? (
                  <p className="text-xs text-slate-500">
                    Mensalidade <span className="line-through text-slate-400">{fmt(s.monthlyAmount)}</span>{' '}
                    <span className="font-bold text-emerald-600">{fmt(s.discountedMonthlyAmount)}</span> · {TIER_LABELS[s.tier] || s.tier}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Mensalidade {fmt(s.monthlyAmount)} · {TIER_LABELS[s.tier] || s.tier}
                  </p>
                )}
                {s.appliedCouponCode && (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">sell</span>
                    Cupom {s.appliedCouponCode} aplicado
                  </p>
                )}
              </div>
              {s.enrollmentFeeTransactionId ? (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 space-y-2">
                  <p className="text-sm font-bold text-amber-800">
                    Taxa de matrícula: {s.enrollmentFeeAmount != null ? fmt(s.enrollmentFeeAmount) : ''}
                  </p>
                  <Link
                    href={`/matricula/pagamento/${s.enrollmentFeeTransactionId}`}
                    className="block w-full text-center bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90"
                  >
                    Pagar taxa de matrícula agora
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sem taxa de matrícula.</p>
              )}
            </div>
          ))}
        </div>

        {/* Pagar depois pelo portal */}
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-800 space-y-1">
          <p className="font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            {temTaxa ? 'Prefere pagar depois?' : 'Como acessar seus pagamentos'}
          </p>
          <p className="text-xs leading-relaxed">
            Você pode acessar o portal em{' '}
            <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline">
              huios.igrejaconviva.com.br/portal
            </a>{' '}
            usando seu <strong>e-mail</strong> e a senha é o seu <strong>CPF</strong>. Lá dentro você poderá
            acessar e pagar {temTaxa ? 'a taxa de matrícula e as mensalidades' : 'as mensalidades'} quando quiser.
          </p>
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

      <div className="space-y-5">
        {people.map((p, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                {people.length > 1 ? `Pessoa ${i + 1}` : 'Dados do aluno'}
              </p>
              {people.length > 1 && (
                <button type="button" onClick={() => removePerson(i)} className="text-red-500 text-xs font-bold">Remover</button>
              )}
            </div>

            {/* Dados pessoais */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">person</span> Dados pessoais
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Nome completo *</label>
                  <input value={p.name} onChange={e => updatePerson(i, { name: e.target.value })} className={fieldCls} placeholder="Nome completo" required />
                </div>
                <div>
                  <label className={labelCls}>E-mail *</label>
                  <input value={p.email} onChange={e => updatePerson(i, { email: e.target.value })} type="email" className={fieldCls} placeholder="email@exemplo.com" required />
                </div>
                <div>
                  <label className={labelCls}>Telefone</label>
                  <input value={p.phone} onChange={e => updatePerson(i, { phone: maskPhone(e.target.value) })} className={fieldCls} placeholder="(99) 99999-9999" inputMode="numeric" />
                </div>
                <div>
                  <label className={labelCls}>CPF *</label>
                  <input value={p.cpf} onChange={e => updatePerson(i, { cpf: maskCpf(e.target.value) })} className={fieldCls} placeholder="000.000.000-00" inputMode="numeric" required />
                </div>
                <div>
                  <label className={labelCls}>Data de nascimento</label>
                  <input value={p.birthDate} onChange={e => updatePerson(i, { birthDate: e.target.value })} type="date" className={fieldCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Estado civil</label>
                  <select value={p.maritalStatus} onChange={e => updatePerson(i, { maritalStatus: e.target.value })} className={fieldCls}>
                    <option value="">Selecione...</option>
                    <option value="SOLTEIRO">Solteiro(a)</option>
                    <option value="CASADO">Casado(a)</option>
                    <option value="DIVORCIADO">Divorciado(a)</option>
                    <option value="VIUVO">Viúvo(a)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">home</span> Endereço
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>CEP</label>
                  <div className="relative">
                    <input
                      value={p.cep}
                      onChange={e => updatePerson(i, { cep: maskCep(e.target.value) })}
                      onBlur={e => lookupCep(i, e.target.value)}
                      className={fieldCls}
                      placeholder="00000-000"
                      inputMode="numeric"
                    />
                    {p.cepLoading && (
                      <span className="material-symbols-outlined text-[18px] text-slate-400 animate-spin absolute right-3 top-2.5">progress_activity</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Digite o CEP para preencher o endereço automaticamente.</p>
                </div>
                <div>
                  <label className={labelCls}>Número</label>
                  <input value={p.numero} onChange={e => updatePerson(i, { numero: e.target.value })} className={fieldCls} placeholder="Ex: 123" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Logradouro (rua/avenida)</label>
                  <input value={p.logradouro} onChange={e => updatePerson(i, { logradouro: e.target.value })} className={fieldCls} placeholder="Rua / Avenida" />
                </div>
                <div>
                  <label className={labelCls}>Complemento</label>
                  <input value={p.complemento} onChange={e => updatePerson(i, { complemento: e.target.value })} className={fieldCls} placeholder="Apto, bloco..." />
                </div>
                <div>
                  <label className={labelCls}>Bairro</label>
                  <input value={p.bairro} onChange={e => updatePerson(i, { bairro: e.target.value })} className={fieldCls} placeholder="Bairro" />
                </div>
                <div>
                  <label className={labelCls}>Cidade</label>
                  <input value={p.cidade} onChange={e => updatePerson(i, { cidade: e.target.value })} className={fieldCls} placeholder="Cidade" />
                </div>
                <div>
                  <label className={labelCls}>UF</label>
                  <input value={p.uf} onChange={e => updatePerson(i, { uf: e.target.value.toUpperCase().slice(0, 2) })} className={fieldCls} placeholder="UF" maxLength={2} />
                </div>
              </div>
            </div>

            {/* Vida cristã */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">church</span> Vida cristã
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>É convertido(a) há quanto tempo?</label>
                  <input value={p.conversionTime} onChange={e => updatePerson(i, { conversionTime: e.target.value })} className={fieldCls} placeholder="Ex: 5 anos" />
                </div>
                <div>
                  <label className={labelCls}>Qual igreja você frequenta?</label>
                  <input value={p.churchName} onChange={e => updatePerson(i, { churchName: e.target.value })} className={fieldCls} placeholder="Ex: Igreja Conviva" disabled={church?.isPartner} />
                </div>
                <div>
                  <label className={labelCls}>Há quanto tempo é membro da igreja?</label>
                  <input value={p.churchMembershipTime} onChange={e => updatePerson(i, { churchMembershipTime: e.target.value })} className={fieldCls} placeholder="Ex: 3 anos" />
                </div>
                <div>
                  <label className={labelCls}>Há quanto tempo é batizado(a)?</label>
                  <input value={p.baptismTime} onChange={e => updatePerson(i, { baptismTime: e.target.value })} className={fieldCls} placeholder="Ex: 2 anos" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={p.isBaptized} onChange={e => updatePerson(i, { isBaptized: e.target.checked })} className="rounded" />
                <span className="text-xs font-bold text-slate-600">Sou batizado(a)</span>
              </label>
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

      {/* Cupom de desconto */}
      <div>
        <label className={labelCls}>Cupom de desconto (opcional)</label>
        {coupon ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-emerald-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">sell</span>
                Cupom {coupon.code} aplicado
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">{coupon.description}</p>
            </div>
            <button type="button" onClick={clearCoupon} className="text-emerald-700 hover:text-red-500 shrink-0">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                className={`${fieldCls} uppercase`}
                placeholder="Ex: BOLSA2026"
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponLoading || !couponCode.trim() || !classId}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {couponLoading ? '...' : 'Aplicar'}
              </button>
            </div>
            {couponError && <p className="text-xs font-bold text-red-600 mt-1">{couponError}</p>}
          </>
        )}
      </div>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <button type="submit" disabled={loading || turmas.length === 0} className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
        {loading ? 'Processando...' : 'Confirmar matrícula'}
      </button>
    </form>
  );
}
