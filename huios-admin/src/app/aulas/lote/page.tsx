'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBulkLessons } from '../actions';
import { useToast } from '@/app/components/Toast/useToast';

interface Discipline {
  id: string;
  name: string;
  courseClass: {
    name: string;
  };
}

export default function LoteAulasPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [disciplinas, setDisciplinas] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    disciplineIds: [] as string[],
    startDate: '',
    endDate: '',
    weekDays: [] as number[], // 0 = Sunday, 1 = Monday...
    startTime: '19:00',
    endTime: '22:00',
    locationName: '',
    latitude: '',
    longitude: '',
    radiusMeters: '100',
    description: ''
  });

  const [previewDates, setPreviewDates] = useState<string[]>([]);

  useEffect(() => {
    async function fetchDisciplines() {
      // Since we need to fetch disciplines on client, let's use the API or an action
      // For now, let's assume we can fetch them via a simple call or we can pass them from a server component if we used one.
      // But let's keep it client-side for better interactivity.
      try {
        const response = await fetch('/api/disciplinas');
        const data = await response.json();
        setDisciplinas(data);
      } catch (error) {
        console.error('Error fetching disciplines:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDisciplines();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [formData.startDate, formData.endDate, formData.weekDays]);

  const generatePreview = () => {
    if (!formData.startDate || !formData.endDate || formData.weekDays.length === 0) {
      setPreviewDates([]);
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const dates: string[] = [];
    
    let current = new Date(start);
    while (current <= end) {
      if (formData.weekDays.includes(current.getDay())) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    setPreviewDates(dates);
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => {
      const next = prev.weekDays.includes(day)
        ? prev.weekDays.filter(d => d !== day)
        : [...prev.weekDays, day];
      return { ...prev, weekDays: next };
    });
  };

  const removeDate = (dateToRemove: string) => {
    setPreviewDates(prev => prev.filter(d => d !== dateToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.disciplineIds.length === 0) {
      toast('warning', 'Nenhuma disciplina selecionada', 'Selecione ao menos uma disciplina.');
      return;
    }
    if (previewDates.length === 0) {
      toast('warning', 'Nenhuma aula para criar', 'Selecione os dias da semana e o período.');
      return;
    }

    setSubmitting(true);
    try {
      await createBulkLessons({
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        radiusMeters: parseInt(formData.radiusMeters),
        dates: previewDates
      });
      toast('success', 'Aulas criadas com sucesso!');
      router.push('/aulas');
    } catch (error) {
      console.error('Error:', error);
      toast('error', 'Erro ao criar aulas', 'Ocorreu um erro ao criar as aulas em lote.');
    } finally {
      setSubmitting(false);
    }
  };

  const weekDaysLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/aulas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Cadastro em Lote</h2>
          <p className="text-slate-500 dark:text-slate-400">Crie várias aulas de uma vez para o calendário</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                Disciplinas / Turmas *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                {disciplinas.map((d) => (
                  <label key={d.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={formData.disciplineIds.includes(d.id)}
                        onChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            disciplineIds: prev.disciplineIds.includes(d.id)
                              ? prev.disciplineIds.filter(id => id !== d.id)
                              : [...prev.disciplineIds, d.id]
                          }));
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none text-base font-bold">
                        check
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                        {d.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {d.courseClass.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Data Início *</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Data Fim *</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dias da Semana *</label>
              <div className="flex flex-wrap gap-2">
                {weekDaysLabels.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleDayToggle(index)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      formData.weekDays.includes(index)
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Horário Início</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Horário Término</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
               <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Local / Polo</label>
               <input
                 type="text"
                 placeholder="Auditório, Sala 101, etc."
                 value={formData.locationName}
                 onChange={e => setFormData({ ...formData, locationName: e.target.value })}
                 className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
               />
            </div>
          </div>

          {previewDates.length > 0 && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                Preview das Aulas
                <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {previewDates.length} aulas
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                {previewDates.map(dateStr => (
                  <div key={dateStr} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 group">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDate(dateStr)}
                      className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4 italic">* Você pode remover datas específicas clicando no X. Útil para feriados ou recessos.</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/aulas"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || previewDates.length === 0}
              className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Criando...
                </>
              ) : (
                'Criar Aulas'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
