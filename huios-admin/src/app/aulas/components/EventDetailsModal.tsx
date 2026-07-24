'use client';

import { deleteEvent } from '../eventos/actions';

interface EventItem {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  requiresCheckIn: boolean;
  locationName: string | null;
  courseClasses: { name: string }[];
}

interface EventDetailsModalProps {
  event: EventItem;
  onClose: () => void;
  onDelete?: () => void;
}

export default function EventDetailsModal({ event, onClose, onDelete }: EventDetailsModalProps) {
  const deleteSelectedEvent = async () => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    await deleteEvent(event.id);
    onDelete?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex h-32 items-end bg-amber-500 p-8">
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-widest text-white/60">{event.type || 'Evento'}</div>
            <h3 className="text-2xl font-black text-white">{event.title}</h3>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-black/10 p-2 text-white transition-colors hover:bg-black/20">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6 p-8">
          <EventDetail icon="calendar_today" title="Data e horário">
            <p className="font-bold text-slate-900 dark:text-white">{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
            <p className="text-sm text-slate-500">
              {event.startTime ? new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
              {event.endTime ? ` às ${new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : ''}
            </p>
          </EventDetail>

          <EventDetail icon="layers" title="Turmas">
            <p className="font-bold text-slate-900 dark:text-white">{event.courseClasses.length ? event.courseClasses.map((courseClass) => courseClass.name).join(', ') : 'Evento geral (todos os alunos)'}</p>
          </EventDetail>

          {event.requiresCheckIn && (
            <EventDetail icon="map" title="Localização (check-in)">
              <p className="font-bold text-slate-900 dark:text-white">{event.locationName || 'Não definido'}</p>
            </EventDetail>
          )}

          {event.description && (
            <EventDetail icon="notes" title="Observações">
              <p className="mt-1 text-sm italic leading-relaxed text-slate-600 dark:text-slate-400">&ldquo;{event.description}&rdquo;</p>
            </EventDetail>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-6 dark:border-slate-800">
            <button aria-label="Excluir evento" onClick={deleteSelectedEvent} className="text-slate-300 transition-colors hover:text-red-500">
              <span className="material-symbols-outlined">delete_forever</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetail({ children, icon, title }: { children: React.ReactNode; icon: string; title: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
        {children}
      </div>
    </div>
  );
}
