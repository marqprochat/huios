'use client';

import { useState } from 'react';
import LessonDetailsModal from '@/app/aulas/components/LessonDetailsModal';

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

interface LessonListClientProps {
    lessons: any[]; // We'll cast them to Lesson
    defaultLocationName?: string;
}

export default function LessonListClient({ lessons: initialLessons, defaultLocationName }: LessonListClientProps) {
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

    return (
        <div className="space-y-4">
            {initialLessons.map((aula) => (
                <div key={aula.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary/30 transition-colors">
                    <div>
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-[18px] text-primary">event</span>
                            {new Date(aula.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-4">
                            {(aula.startTime || aula.endTime) && (
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    {aula.startTime ? new Date(aula.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'} às {aula.endTime ? new Date(aula.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
                                </span>
                            )}
                            {aula.description && (
                                <span className="line-clamp-1">{aula.description}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center sm:justify-end gap-2">
                        <button
                            onClick={() => setSelectedLesson(aula as unknown as Lesson)}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            Ver Aula
                        </button>
                    </div>
                </div>
            ))}

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
