'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { deleteLesson } from './actions';
import LessonMaterials from './components/LessonMaterials';
import { toLocalDate } from '@/lib/date-utils';
import LessonDetailsModal from './components/LessonDetailsModal';

interface Lesson {
  id: string;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  locationName: string | null;
  description: string | null;
  disciplines: {
    name: string;
    courseClasses: {
      name: string;
    }[]
  }[];
}

interface CalendarProps {
  initialLessons: Lesson[];
  defaultLocationName?: string;
}

export default function CalendarContainer({ initialLessons, defaultLocationName }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const lessons = useMemo(() => {
    return initialLessons.map(l => ({
      ...l,
      date: toLocalDate(l.date),
      startTime: l.startTime ? new Date(l.startTime) : null,
      endTime: l.endTime ? new Date(l.endTime) : null,
      description: l.description,
    }));
  }, [initialLessons]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    
    const days = [];
    
    // Previous month padding
    const prevMonthTotalDays = daysInMonth(year, month - 1);
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ 
        day: prevMonthTotalDays - i, 
        currentMonth: false, 
        date: new Date(year, month - 1, prevMonthTotalDays - i) 
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ 
        day: i, 
        currentMonth: true, 
        date: new Date(year, month, i) 
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ 
        day: i, 
        currentMonth: false, 
        date: new Date(year, month + 1, i) 
      });
    }
    
    return days;
  }, [currentDate]);

  const getLessonsForDay = (date: Date) => {
    return lessons.filter(l => 
      l.date.getDate() === date.getDate() && 
      l.date.getMonth() === date.getMonth() && 
      l.date.getFullYear() === date.getFullYear()
    );
  };

  // Color generator based on discipline name
  const getDisciplineColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 
      'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white capitalize">{monthName}</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie o calendário acadêmico e materiais</p>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 flex items-center mr-4">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              Hoje
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>

          <Link
            href="/aulas/lote"
            className="bg-primary/10 text-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/20 transition-all border border-primary/20"
          >
            <span className="material-symbols-outlined text-sm">layers</span>
            Cadastro em Lote
          </Link>
          <Link
            href="/aulas/novo"
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Aula Única
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-400">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 grid-rows-6 h-[800px] md:h-[900px]">
          {calendarDays.map((calDay, i) => {
            const dayLessons = getLessonsForDay(calDay.date);
            const isToday = new Date().toDateString() === calDay.date.toDateString();
            
            return (
              <div 
                key={i} 
                className={`border-r border-b border-slate-50 dark:border-slate-800/50 p-2 overflow-y-auto last:border-r-0 ${
                  !calDay.currentMonth ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''
                }`}
              >
                <div className={`flex items-center justify-center w-7 h-7 text-xs font-bold mb-2 ml-auto rounded-full ${
                  isToday ? 'bg-primary text-white shadow-lg shadow-primary/40' : 'text-slate-500'
                } ${!calDay.currentMonth && !isToday ? 'opacity-30' : ''}`}>
                  {calDay.day}
                </div>
                
                <div className="space-y-1">
                  {dayLessons.map(lesson => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left p-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] group overflow-hidden ${getDisciplineColor(lesson.disciplines[0]?.name || '')}/10 border border-transparent hover:border-current`}
                      style={{ borderLeftColor: getDisciplineColor(lesson.disciplines[0]?.name || '').replace('bg-', '') }}
                    >
                      <div className={`text-[10px] font-black uppercase tracking-tighter truncate ${getDisciplineColor(lesson.disciplines[0]?.name || '').replace('bg-', 'text-')}`}>
                        {lesson.disciplines[0]?.name}
                        {lesson.disciplines.length > 1 && ` (+${lesson.disciplines.length - 1})`}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium truncate">
                        {lesson.startTime ? lesson.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLesson && (
        <LessonDetailsModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onDelete={() => window.location.reload()}
          defaultLocationName={defaultLocationName}
        />
      )}
    </div>
  );
}
