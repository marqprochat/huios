'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/Toast/useToast';
import type { TicketInput, CustomFieldInput } from './actions';

const inputCls = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white';
const labelCls = 'text-sm font-bold text-slate-700 dark:text-slate-300';
const sectionTitleCls = 'text-base font-bold text-slate-800 dark:text-slate-200 mb-4';

export interface EventFormValues {
  id?: string;
  title: string;
  type: string;
  description: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string;
  courseClassIds: string[];
  requiresCheckIn: boolean;
  locationName: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  bannerUrl: string;
  locationAddress: string;
  mapUrl: string;
  meetingPoint: string;
  meetingTime: string;
  returnTime: string;
  transportInfo: string;
  includedItems: string;
  whatToBring: string;
  extraNotes: string;
  organizerName: string;
  organizerPhone: string;
  cancellationPolicy: string;
  registrationEnabled: boolean;
  isPublished: boolean;
  registrationOpensAt: string;
  registrationClosesAt: string;
  capacity: string;
  reservationHours: string;
  tickets: TicketInput[];
  customFields: CustomFieldInput[];
}

interface Props {
  mode: 'create' | 'edit';
  initialValues: EventFormValues;
  courseClasses: { id: string; name: string; courseName: string }[];
  action: (prevState: { success: boolean; message: string }, formData: FormData) => Promise<{ success: boolean; message: string } | void>;
}

let ticketSeq = 0;
let fieldSeq = 0;

export default function EventForm({ mode, initialValues, courseClasses, action }: Props) {
  const [state, formAction] = useActionState(action as any, { success: false, message: '' });
  const { toast } = useToast();
  const router = useRouter();

  const [requiresCheckIn, setRequiresCheckIn] = useState(initialValues.requiresCheckIn);
  const [registrationEnabled, setRegistrationEnabled] = useState(initialValues.registrationEnabled);
  const [tickets, setTickets] = useState(initialValues.tickets.map((t) => ({ ...t, _key: `t${ticketSeq++}` })));
  const [customFields, setCustomFields] = useState(initialValues.customFields.map((f) => ({ ...f, _key: `f${fieldSeq++}` })));

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast('success', 'Sucesso', state.message);
        router.push('/eventos');
      } else {
        toast('error', 'Erro', state.message);
      }
    }
  }, [state, toast, router]);

  const addTicket = () => setTickets((prev) => [...prev, {
    id: undefined, name: '', description: null, priceStudent: 0, priceGeneral: 0,
    quantity: null, salesStart: null, salesEnd: null, audience: 'ALL' as const, isActive: true,
    order: prev.length, _key: `t${ticketSeq++}`,
  }]);
  const removeTicket = (key: string) => setTickets((prev) => prev.filter((t) => t._key !== key));
  const updateTicket = (key: string, patch: Partial<TicketInput>) =>
    setTickets((prev) => prev.map((t) => (t._key === key ? { ...t, ...patch } : t)));

  const addField = () => setCustomFields((prev) => [...prev, {
    id: undefined, label: '', type: 'TEXT' as const, options: [], required: false, order: prev.length, _key: `f${fieldSeq++}`,
  }]);
  const removeField = (key: string) => setCustomFields((prev) => prev.filter((f) => f._key !== key));
  const updateField = (key: string, patch: Partial<CustomFieldInput>) =>
    setCustomFields((prev) => prev.map((f) => (f._key === key ? { ...f, ...patch } : f)));

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="ticketsJson" value={JSON.stringify(tickets.map(({ _key, ...t }) => t))} />
      <input type="hidden" name="customFieldsJson" value={JSON.stringify(customFields.map(({ _key, ...f }) => f))} />

      {/* ───── DADOS ───── */}
      <section>
        <h3 className={sectionTitleCls}>Dados do evento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Título <span className="text-red-500">*</span></label>
            <input name="title" defaultValue={initialValues.title} required className={inputCls} placeholder="Ex: Excursão a Israel 2026" />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Tipo</label>
            <input name="type" defaultValue={initialValues.type} className={inputCls} placeholder="Ex: Excursão, Conferência" />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Data <span className="text-red-500">*</span></label>
            <input type="date" name="date" defaultValue={initialValues.date} required className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Hora de início</label>
            <input type="time" name="startTime" defaultValue={initialValues.startTime} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Hora de término</label>
            <input type="time" name="endTime" defaultValue={initialValues.endTime} className={inputCls} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Descrição</label>
            <textarea name="description" defaultValue={initialValues.description} className={inputCls} rows={3} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Turmas vinculadas (opcional — vazio = evento geral)</label>
            <select name="courseClassIds" multiple defaultValue={initialValues.courseClassIds} className={`${inputCls} h-32`}>
              {courseClasses.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.courseName} — {cc.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" id="requiresCheckIn" name="requiresCheckIn" defaultChecked={requiresCheckIn}
              onChange={(e) => setRequiresCheckIn(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="requiresCheckIn" className={labelCls}>Exige check-in por localização (uso institucional)</label>
          </div>
          {requiresCheckIn && (
            <>
              <div className="space-y-2">
                <label className={labelCls}>Nome do local</label>
                <input name="locationName" defaultValue={initialValues.locationName} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Raio (metros)</label>
                <input type="number" name="radiusMeters" defaultValue={initialValues.radiusMeters || '100'} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Latitude</label>
                <input name="latitude" defaultValue={initialValues.latitude} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Longitude</label>
                <input name="longitude" defaultValue={initialValues.longitude} className={inputCls} />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ───── LOCAL & LOGÍSTICA ───── */}
      <section>
        <h3 className={sectionTitleCls}>Local & logística</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Banner (URL da imagem)</label>
            <input name="bannerUrl" defaultValue={initialValues.bannerUrl} className={inputCls} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Endereço do local</label>
            <input name="locationAddress" defaultValue={initialValues.locationAddress} className={inputCls} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Link do mapa</label>
            <input name="mapUrl" defaultValue={initialValues.mapUrl} className={inputCls} placeholder="https://maps.google.com/..." />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Ponto de encontro</label>
            <input name="meetingPoint" defaultValue={initialValues.meetingPoint} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Horário de encontro</label>
            <input type="time" name="meetingTime" defaultValue={initialValues.meetingTime} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Previsão de retorno</label>
            <input type="time" name="returnTime" defaultValue={initialValues.returnTime} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Transporte</label>
            <input name="transportInfo" defaultValue={initialValues.transportInfo} className={inputCls} placeholder="Ex: Ônibus fretado, saída da sede" />
          </div>
        </div>
      </section>

      {/* ───── INFORMAÇÕES ───── */}
      <section>
        <h3 className={sectionTitleCls}>Informações ao inscrito</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>O que está incluso</label>
            <textarea name="includedItems" defaultValue={initialValues.includedItems} className={inputCls} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>O que levar</label>
            <textarea name="whatToBring" defaultValue={initialValues.whatToBring} className={inputCls} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Observações</label>
            <textarea name="extraNotes" defaultValue={initialValues.extraNotes} className={inputCls} rows={2} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Responsável pelo evento</label>
            <input name="organizerName" defaultValue={initialValues.organizerName} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>WhatsApp do responsável</label>
            <input name="organizerPhone" defaultValue={initialValues.organizerPhone} className={inputCls} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className={labelCls}>Política de cancelamento</label>
            <textarea name="cancellationPolicy" defaultValue={initialValues.cancellationPolicy} className={inputCls} rows={2} />
          </div>
        </div>
      </section>

      {/* ───── INSCRIÇÃO ───── */}
      <section>
        <h3 className={sectionTitleCls}>Inscrição</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="registrationEnabled" name="registrationEnabled" defaultChecked={registrationEnabled}
              onChange={(e) => setRegistrationEnabled(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="registrationEnabled" className={labelCls}>Habilitar inscrição (evento pago ou gratuito)</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublished" name="isPublished" defaultChecked={initialValues.isPublished} className="h-4 w-4" />
            <label htmlFor="isPublished" className={labelCls}>Publicado (visível na página pública)</label>
          </div>
          {registrationEnabled && (
            <>
              <div className="space-y-2">
                <label className={labelCls}>Inscrições abrem em</label>
                <input type="datetime-local" name="registrationOpensAt" defaultValue={initialValues.registrationOpensAt} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Inscrições encerram em</label>
                <input type="datetime-local" name="registrationClosesAt" defaultValue={initialValues.registrationClosesAt} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Vagas totais (vazio = ilimitado)</label>
                <input type="number" name="capacity" defaultValue={initialValues.capacity} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Horas para expirar a reserva não paga</label>
                <input type="number" name="reservationHours" defaultValue={initialValues.reservationHours || '24'} className={inputCls} />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ───── LOTES ───── */}
      {registrationEnabled && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className={sectionTitleCls}>Lotes</h3>
            <button type="button" onClick={addTicket} className="text-primary text-sm font-bold hover:underline">+ Adicionar lote</button>
          </div>
          <div className="space-y-4">
            {tickets.map((t) => (
              <div key={t._key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input placeholder="Nome do lote" value={t.name} onChange={(e) => updateTicket(t._key, { name: e.target.value })} className={inputCls} />
                  <input type="number" placeholder="Preço aluno" value={t.priceStudent} onChange={(e) => updateTicket(t._key, { priceStudent: parseFloat(e.target.value) || 0 })} className={inputCls} />
                  <input type="number" placeholder="Preço não-aluno" value={t.priceGeneral} onChange={(e) => updateTicket(t._key, { priceGeneral: parseFloat(e.target.value) || 0 })} className={inputCls} />
                  <input type="number" placeholder="Vagas (vazio=ilimitado)" value={t.quantity ?? ''} onChange={(e) => updateTicket(t._key, { quantity: e.target.value ? parseInt(e.target.value, 10) : null })} className={inputCls} />
                  <input type="date" placeholder="Início da venda" value={t.salesStart ?? ''} onChange={(e) => updateTicket(t._key, { salesStart: e.target.value || null })} className={inputCls} />
                  <input type="date" placeholder="Fim da venda" value={t.salesEnd ?? ''} onChange={(e) => updateTicket(t._key, { salesEnd: e.target.value || null })} className={inputCls} />
                  <select value={t.audience} onChange={(e) => updateTicket(t._key, { audience: e.target.value as any })} className={inputCls}>
                    <option value="ALL">Todos</option>
                    <option value="STUDENT">Só alunos</option>
                    <option value="EXTERNAL">Só não-alunos</option>
                  </select>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={t.isActive} onChange={(e) => updateTicket(t._key, { isActive: e.target.checked })} className="h-4 w-4" />
                    <span className="text-sm">Ativo</span>
                  </label>
                </div>
                <button type="button" onClick={() => removeTicket(t._key)} className="text-red-500 text-xs font-bold hover:underline">Remover lote</button>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-sm text-slate-400">Nenhum lote cadastrado ainda.</p>}
          </div>
        </section>
      )}

      {/* ───── CAMPOS EXTRAS ───── */}
      {registrationEnabled && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className={sectionTitleCls}>Campos extras</h3>
            <button type="button" onClick={addField} className="text-primary text-sm font-bold hover:underline">+ Adicionar campo</button>
          </div>
          <div className="space-y-4">
            {customFields.map((f) => (
              <div key={f._key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input placeholder="Rótulo (ex: Tamanho da camiseta)" value={f.label} onChange={(e) => updateField(f._key, { label: e.target.value })} className={inputCls} />
                  <select value={f.type} onChange={(e) => updateField(f._key, { type: e.target.value as any })} className={inputCls}>
                    <option value="TEXT">Texto</option>
                    <option value="SELECT">Opções (seleção)</option>
                    <option value="CHECKBOX">Confirmação (sim/não)</option>
                  </select>
                  {f.type === 'SELECT' && (
                    <input placeholder="Opções separadas por vírgula" value={f.options.join(', ')}
                      onChange={(e) => updateField(f._key, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                      className={inputCls} />
                  )}
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={f.required} onChange={(e) => updateField(f._key, { required: e.target.checked })} className="h-4 w-4" />
                    <span className="text-sm">Obrigatório</span>
                  </label>
                </div>
                <button type="button" onClick={() => removeField(f._key)} className="text-red-500 text-xs font-bold hover:underline">Remover campo</button>
              </div>
            ))}
            {customFields.length === 0 && <p className="text-sm text-slate-400">Nenhum campo extra cadastrado.</p>}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
        <button type="submit" className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
          {mode === 'create' ? 'Criar evento' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
