'use client';

import Link from 'next/link';
import { deleteLesson } from '../actions';
import LessonMaterials from './LessonMaterials';

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

interface LessonDetailsModalProps {
  lesson: Lesson;
  onClose: () => void;
  onDelete?: () => void;
  defaultLocationName?: string;
}

export default function LessonDetailsModal({ lesson, onClose, onDelete, defaultLocationName }: LessonDetailsModalProps) {
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

  const disciplineColor = getDisciplineColor(lesson.disciplines[0]?.name || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className={`h-32 p-8 flex items-end justify-between ${disciplineColor} relative`}>
           <div className="z-10">
              <div className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Detalhes da Aula</div>
              <h3 className="text-2xl font-black text-white">
                {lesson.disciplines.map(d => d.name).join(' / ')}
              </h3>
           </div>
           <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors z-20">
              <span className="material-symbols-outlined">close</span>
           </button>
        </div>
        
        <div className="p-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                       <span className="material-symbols-outlined text-primary">calendar_today</span>
                    </div>
                    <div>
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data e Horário</div>
                       <div className="text-slate-900 dark:text-white font-bold">
                          {new Date(lesson.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                       </div>
                       <div className="text-sm text-slate-500">
                         {lesson.startTime ? new Date(lesson.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'} 
                         {lesson.endTime ? ` às ${new Date(lesson.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : ''}
                       </div>
                    </div>
                 </div>

                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                       <span className="material-symbols-outlined text-primary">layers</span>
                    </div>
                    <div>
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turmas</div>
                       <div className="text-slate-900 dark:text-white font-bold">
                         {lesson.disciplines.flatMap(d => d.courseClasses.map(cc => cc.name)).join(', ')}
                       </div>
                    </div>
                 </div>

                 <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                       <span className="material-symbols-outlined text-primary">map</span>
                    </div>
                    <div>
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</div>
                       <div className="text-slate-900 dark:text-white font-bold">{lesson.locationName || defaultLocationName || 'Não definido'}</div>
                    </div>
                 </div>

                 {lesson.description && (
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                         <span className="material-symbols-outlined text-primary">notes</span>
                      </div>
                      <div>
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observações</div>
                         <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 italic leading-relaxed">
                           "{lesson.description}"
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 h-full">
                 <LessonMaterials lessonId={lesson.id} />
              </div>
           </div>

           <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Link
                   href={`/aulas/${lesson.id}/presenca`}
                   className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20"
                 >
                   <span className="material-symbols-outlined text-sm">checklist</span>
                   Lançar Presença
                 </Link>
                 <Link
                   href={`/aulas/${lesson.id}/editar`}
                   className="text-slate-400 hover:text-primary p-2.5 rounded-xl transition-colors"
                 >
                   <span className="material-symbols-outlined">edit</span>
                 </Link>
              </div>
              
              <button 
                onClick={async () => {
                  if (confirm('Tem certeza que deseja excluir esta aula?')) {
                    await deleteLesson(lesson.id);
                    if (onDelete) onDelete();
                    onClose();
                  }
                }}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                 <span className="material-symbols-outlined">delete_forever</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
