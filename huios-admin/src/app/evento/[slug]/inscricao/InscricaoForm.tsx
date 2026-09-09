'use client';

import { useActionState } from 'react';
import { maskPhone, maskCpf } from '@/lib/masks';
import { createPublicRegistration } from '../../actions';

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all';
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CustomField { id: string; label: string; type: 'TEXT' | 'SELECT' | 'CHECKBOX'; options: string[]; required: boolean }

export default function InscricaoForm({
  eventId, eventTitle, ticket, isStudent, customFields, prefill,
}: {
  eventId: string;
  eventTitle: string;
  ticket: { id: string; name: string; priceStudent: number; priceGeneral: number };
  isStudent: boolean;
  customFields: CustomField[];
  prefill: { name: string; email: string; phone: string; cpf: string };
}) {
  const [state, formAction] = useActionState(createPublicRegistration, { success: false, message: '' });
  const price = isStudent ? ticket.priceStudent : ticket.priceGeneral;

  return (
    <form action={formAction} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="ticketId" value={ticket.id} />

      <div>
        <h1 className="text-xl font-black text-slate-900">Inscrição</h1>
        <p className="text-slate-500 text-sm">{eventTitle} — {ticket.name}</p>
        <p className="text-primary font-bold mt-1">{price > 0 ? fmtBRL(price) : 'Gratuito'}</p>
      </div>

      {state?.message && !state.success && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{state.message}</p>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Nome completo *</label>
          <input name="name" defaultValue={prefill.name} required className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">E-mail *</label>
          <input type="email" name="email" defaultValue={prefill.email} required className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">Telefone</label>
          <input name="phone" defaultValue={prefill.phone} onChange={(e) => { e.target.value = maskPhone(e.target.value); }} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">CPF</label>
          <input name="cpf" defaultValue={prefill.cpf} onChange={(e) => { e.target.value = maskCpf(e.target.value); }} className={inputCls} />
        </div>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          {customFields.map((f) => (
            <div key={f.id} className="space-y-1">
              <label className="text-sm font-bold text-slate-700">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'TEXT' && <input name={`answer_${f.id}`} required={f.required} className={inputCls} />}
              {f.type === 'SELECT' && (
                <select name={`answer_${f.id}`} required={f.required} className={inputCls}>
                  <option value="">Selecione...</option>
                  {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {f.type === 'CHECKBOX' && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" name={`answer_${f.id}`} value="true" className="h-4 w-4" />
                  <span className="text-sm text-slate-600">Confirmo</span>
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
        {price > 0 ? 'Continuar para pagamento' : 'Confirmar inscrição'}
      </button>
    </form>
  );
}
