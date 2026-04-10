'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toLocalDate } from '@/lib/date-utils';

interface Lesson {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  description: string | null;
  discipline: {
    name: string;
    teacher: { name: string } | null;
    courseClass: { name: string };
  };
  attendances: Array<{ status: string; checkInAt: string | null }>;
  materials: Array<{ id: string; fileName: string; filePath: string; mimeType: string }>;
}

export default function AulasPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await fetch('/api/portal/aulas');
      if (res.ok) {
        const data = await res.json();
        // Convert dates from UTC to local literal date
        const processedLessons = data.map((l: Lesson) => {
          const localDate = toLocalDate(l.date);
          return {
            ...l,
            date: localDate.toISOString(), 
            actualDate: localDate 
          };
        });
        setLessons(processedLessons);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    const days = [];

    const prevMonthTotalDays = daysInMonth(year, month - 1);
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthTotalDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthTotalDays - i) });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }
    return days;
  }, [currentDate]);

  const getLessonsForDay = (date: Date) => {
    return lessons.filter(l => {
      const d = (l as any).actualDate || new Date(l.date);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  };

  const getDisciplineColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">{monthName}</h2>
          <p className="text-slate-500 text-sm">Calendário de aulas e materiais</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-semibold hover:bg-slate-50 rounded-lg transition-colors">
              Hoje
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6" style={{ minHeight: '600px' }}>
            {calendarDays.map((calDay, i) => {
              const dayLessons = getLessonsForDay(calDay.date);
              const isToday = new Date().toDateString() === calDay.date.toDateString();

              return (
                <div
                  key={i}
                  className={`border-r border-b border-slate-50 p-1.5 overflow-y-auto last:border-r-0 ${
                    !calDay.currentMonth ? 'bg-slate-50/50' : ''
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 text-xs font-bold mb-1 ml-auto rounded-full ${
                    isToday ? 'bg-[#135bec] text-white' : 'text-slate-500'
                  } ${!calDay.currentMonth && !isToday ? 'opacity-30' : ''}`}>
                    {calDay.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayLessons.map(lesson => {
                      const attended = lesson.attendances?.some((a: any) => a.status === 'PRESENT');
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full text-left p-1 rounded-lg transition-all hover:scale-[1.02] ${getDisciplineColor(lesson.discipline.name)}/10 relative`}
                        >
                          <div className={`text-[9px] font-bold truncate ${getDisciplineColor(lesson.discipline.name).replace('bg-', 'text-')}`}>
                            {lesson.discipline.name}
                          </div>
                          {attended && (
                            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className={`p-6 ${getDisciplineColor(selectedLesson.discipline.name)} text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Detalhes da Aula</p>
                  <h3 className="text-xl font-bold mt-1">{selectedLesson.discipline.name}</h3>
                </div>
                <button onClick={() => setSelectedLesson(null)} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                <div>
                  <p className="text-xs text-slate-400">Data</p>
                  <p className="font-medium text-slate-800">
                    {((selectedLesson as any).actualDate || new Date(selectedLesson.date)).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">schedule</span>
                <div>
                  <p className="text-xs text-slate-400">Horário</p>
                  <p className="font-medium text-slate-800">
                    {selectedLesson.startTime ? new Date(selectedLesson.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    {selectedLesson.endTime && ` às ${new Date(selectedLesson.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
              {selectedLesson.locationName && (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400">location_on</span>
                  <div>
                    <p className="text-xs text-slate-400">Local</p>
                    <p className="font-medium text-slate-800">{selectedLesson.locationName}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">person</span>
                <div>
                  <p className="text-xs text-slate-400">Professor</p>
                  <p className="font-medium text-slate-800">{selectedLesson.discipline.teacher?.name || 'Não definido'}</p>
                </div>
              </div>

              {/* Attendance status */}
              <div className={`p-3 rounded-xl flex items-center gap-2 ${
                selectedLesson.attendances?.some((a: any) => a.status === 'PRESENT') ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                <span className={`material-symbols-outlined ${
                  selectedLesson.attendances?.some((a: any) => a.status === 'PRESENT') ? 'text-emerald-500' : 'text-slate-400'
                }`}>
                  {selectedLesson.attendances?.some((a: any) => a.status === 'PRESENT') ? 'check_circle' : 'pending'}
                </span>
                <span className={`text-sm font-medium ${
                  selectedLesson.attendances?.some((a: any) => a.status === 'PRESENT') ? 'text-emerald-700' : 'text-slate-500'
                }`}>
                  {selectedLesson.attendances?.some((a: any) => a.status === 'PRESENT') ? 'Presença registrada' : 'Presença pendente'}
                </span>
              </div>

              {/* Materials */}
              {selectedLesson.materials?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Materiais</p>
                  <div className="space-y-2">
                    {selectedLesson.materials.map((mat) => (
                      <a
                        key={mat.id}
                        href={`/uploads/${mat.filePath}`}
                        target="_blank"
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-[#135bec]/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[#135bec]">attach_file</span>
                        <span className="text-sm font-medium text-slate-700 truncate">{mat.fileName}</span>
                        <span className="material-symbols-outlined text-slate-400 ml-auto">download</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {(!selectedLesson.attendances?.some((a: any) => a.checkInAt) || !selectedLesson.attendances?.some((a: any) => a.checkOutAt)) && (
                  <Link
                    href={`/portal/checkin/${selectedLesson.id}`}
                    className={`flex-1 ${selectedLesson.attendances?.some((a: any) => a.checkInAt) ? 'bg-amber-600' : 'bg-[#135bec]'} text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {selectedLesson.attendances?.some((a: any) => a.checkInAt) ? 'logout' : 'my_location'}
                    </span>
                    {selectedLesson.attendances?.some((a: any) => a.checkInAt) ? 'Check-out' : 'Check-in'}
                  </Link>
                )}
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
