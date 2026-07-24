'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toLocalDate } from '@/lib/date-utils';
import LessonDetailsModal from './components/LessonDetailsModal';
import EventDetailsModal from './components/EventDetailsModal';

interface Lesson {
  id: string;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  locationName: string | null;
  description: string | null;
  disciplines: { name: string; courseClasses: { name: string }[] }[];
}

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

interface CalendarProps {
  initialLessons: Lesson[];
  initialEvents?: EventItem[];
  defaultLocationName?: string;
}

export default function CalendarContainer({ initialLessons, initialEvents = [], defaultLocationName }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const lessons = useMemo(() => initialLessons.map((lesson) => ({
    ...lesson,
    date: toLocalDate(lesson.date),
    startTime: lesson.startTime ? new Date(lesson.startTime) : null,
    endTime: lesson.endTime ? new Date(lesson.endTime) : null
  })), [initialLessons]);

  const events = useMemo(() => initialEvents.map((event) => ({
    ...event,
    date: toLocalDate(event.date),
    startTime: event.startTime ? new Date(event.startTime) : null,
    endTime: event.endTime ? new Date(event.endTime) : null
  })), [initialEvents]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const days: { day: number; currentMonth: boolean; date: Date }[] = [];

    for (let day = firstDay - 1; day >= 0; day--) {
      days.push({ day: previousMonthDays - day, currentMonth: false, date: new Date(year, month - 1, previousMonthDays - day) });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, currentMonth: true, date: new Date(year, month, day) });
    }
    for (let day = 1; days.length < 42; day++) {
      days.push({ day, currentMonth: false, date: new Date(year, month + 1, day) });
    }
    return days;
  }, [currentDate]);

  const getDisciplineColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'];
    let hash = 0;
    for (let index = 0; index < name.length; index++) hash = name.charCodeAt(index) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const itemsForDay = (date: Date) => ({
    lessons: lessons.filter((lesson) => isSameDay(lesson.date, date)),
    events: events.filter((event) => isSameDay(event.date, date))
  });
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-black capitalize tracking-tight text-slate-900 dark:text-white">{monthName}</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie o calendário acadêmico e materiais</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-0 flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 md:mr-4">
            <button aria-label="Mês anterior" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
            <button onClick={() => setCurrentDate(new Date())} className="rounded-lg px-4 py-1 text-sm font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">Hoje</button>
            <button aria-label="Próximo mês" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
          </div>
          <CalendarLink href="/aulas/lote" icon="layers" tone="secondary">Cadastro em Lote</CalendarLink>
          <CalendarLink href="/aulas/novo" icon="add" tone="primary">Aula Única</CalendarLink>
          <CalendarLink href="/aulas/eventos/novo" icon="celebration" tone="event">Novo Evento</CalendarLink>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <div key={day} className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">{day}</div>)}
        </div>
        <div className="grid h-[800px] grid-cols-7 grid-rows-6 md:h-[900px]">
          {calendarDays.map((calendarDay) => {
            const { lessons: dayLessons, events: dayEvents } = itemsForDay(calendarDay.date);
            const isToday = new Date().toDateString() === calendarDay.date.toDateString();
            return (
              <div key={calendarDay.date.toISOString()} className={`overflow-y-auto border-b border-r border-slate-50 p-2 last:border-r-0 dark:border-slate-800/50 ${!calendarDay.currentMonth ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
                <div className={`mb-2 ml-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/40' : 'text-slate-500'} ${!calendarDay.currentMonth && !isToday ? 'opacity-30' : ''}`}>{calendarDay.day}</div>
                <div className="space-y-1">
                  {dayLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} color={getDisciplineColor(lesson.disciplines[0]?.name || '')} onSelect={() => setSelectedLesson(lesson)} />)}
                  {dayEvents.map((event) => <EventCard key={event.id} event={event} onSelect={() => setSelectedEvent(event)} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLesson && <LessonDetailsModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} onDelete={() => window.location.reload()} defaultLocationName={defaultLocationName} />}
      {selectedEvent && <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={() => window.location.reload()} />}
    </div>
  );
}

function isSameDay(first: Date, second: Date) {
  return first.getDate() === second.getDate() && first.getMonth() === second.getMonth() && first.getFullYear() === second.getFullYear();
}

function CalendarLink({ children, href, icon, tone }: { children: React.ReactNode; href: string; icon: string; tone: 'primary' | 'secondary' | 'event' }) {
  const styles = { primary: 'bg-primary text-white shadow-lg shadow-primary/20', secondary: 'border border-primary/20 bg-primary/10 text-primary', event: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' };
  return <Link href={href} className={`${styles[tone]} flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:opacity-90`}><span className="material-symbols-outlined text-sm">{icon}</span>{children}</Link>;
}

function LessonCard({ lesson, color, onSelect }: { lesson: Lesson; color: string; onSelect: () => void }) {
  return <button onClick={onSelect} className={`w-full overflow-hidden rounded-lg border border-transparent p-1.5 text-left transition-all hover:scale-[1.02] hover:border-current active:scale-[0.98] ${color}/10`}><div className={`truncate text-[10px] font-black uppercase tracking-tighter ${color.replace('bg-', 'text-')}`}>{lesson.disciplines[0]?.name}{lesson.disciplines.length > 1 && ` (+${lesson.disciplines.length - 1})`}</div><div className="truncate text-[9px] font-medium text-slate-500">{lesson.startTime ? lesson.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div></button>;
}

function EventCard({ event, onSelect }: { event: EventItem; onSelect: () => void }) {
  return <button onClick={onSelect} className="flex w-full items-center gap-1 overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"><span className="material-symbols-outlined text-[12px] leading-none text-amber-600">celebration</span><div className="min-w-0"><div className="truncate text-[10px] font-black uppercase tracking-tighter text-amber-600">{event.title}</div><div className="truncate text-[9px] font-medium text-slate-500">{event.startTime ? event.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div></div></button>;
}
