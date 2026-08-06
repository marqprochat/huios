'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ExamClassGroup } from '@/lib/exam-participants';
import StudentSelectionModal from './StudentSelectionModal';
import { countSelectedClasses, selectionAfterDisciplineChange } from './student-selection';

export interface ExamDisciplineOption {
  id: string;
  name: string;
  groups: ExamClassGroup[];
}

export interface ExamFormValues {
  title: string;
  description: string;
  disciplineId: string;
  startDate: string;
  endDate: string;
  duration: number | null;
}

interface Props {
  disciplines: ExamDisciplineOption[];
  action: (formData: FormData) => Promise<void>;
  initialExam?: ExamFormValues;
  initialParticipantIds?: string[];
  lockedParticipantIds?: string[];
}

const fieldClass = 'w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const labelClass = 'block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2';

export default function ExamForm({
  disciplines,
  action,
  initialExam,
  initialParticipantIds = [],
  lockedParticipantIds = [],
}: Props) {
  const [disciplineId, setDisciplineId] = useState(initialExam?.disciplineId ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialParticipantIds));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectionError, setSelectionError] = useState('');

  const discipline = useMemo(
    () => disciplines.find(item => item.id === disciplineId) ?? null,
    [disciplines, disciplineId],
  );
  const selectedClassCount = discipline ? countSelectedClasses(discipline.groups, selectedIds) : 0;
  const lockedIds = useMemo(() => new Set(lockedParticipantIds), [lockedParticipantIds]);

  const changeDiscipline = (nextDisciplineId: string) => {
    setSelectedIds(current => selectionAfterDisciplineChange(disciplineId, nextDisciplineId, current));
    setDisciplineId(nextDisciplineId);
    setSelectionError('');
  };

  return (
    <>
      <form
        action={action}
        className="space-y-6"
        onSubmit={event => {
          if (selectedIds.size > 0) return;
          event.preventDefault();
          setSelectionError('Selecione ao menos um aluno para a prova.');
        }}
      >
        {[...selectedIds].map(studentId => <input key={studentId} type="hidden" name="studentIds" value={studentId} />)}

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className={labelClass}>Título da Prova *</label>
            <input type="text" id="title" name="title" required defaultValue={initialExam?.title} className={fieldClass} placeholder="Ex: Prova 1 - Teologia Sistemática" />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>Descrição</label>
            <textarea id="description" name="description" rows={3} defaultValue={initialExam?.description} className={`${fieldClass} resize-none`} placeholder="Descrição opcional da prova" />
          </div>

          <div>
            <label htmlFor="disciplineId" className={labelClass}>Disciplina *</label>
            <select id="disciplineId" name="disciplineId" required value={disciplineId} onChange={event => changeDiscipline(event.target.value)} className={fieldClass}>
              <option value="">Selecione uma disciplina</option>
              {disciplines.map(item => (
                <option key={item.id} value={item.id}>{item.name} - {item.groups.map(group => group.name).join(', ')}</option>
              ))}
            </select>
          </div>

          {discipline && (
            <div className={`rounded-xl border p-4 ${selectionError ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    {selectedIds.size === 0
                      ? 'Nenhum aluno selecionado'
                      : `${selectedIds.size} aluno${selectedIds.size === 1 ? '' : 's'} selecionado${selectedIds.size === 1 ? '' : 's'} em ${selectedClassCount} turma${selectedClassCount === 1 ? '' : 's'}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Escolha quem poderá visualizar e responder esta prova.</p>
                </div>
                <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
                  <span className="material-symbols-outlined text-lg">group_add</span>
                  Selecionar alunos
                </button>
              </div>
              {selectionError && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{selectionError}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="startDate" className={labelClass}>Data e Hora de Início *</label>
              <input type="datetime-local" id="startDate" name="startDate" required defaultValue={initialExam?.startDate} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="endDate" className={labelClass}>Data e Hora de Término *</label>
              <input type="datetime-local" id="endDate" name="endDate" required defaultValue={initialExam?.endDate} className={fieldClass} />
            </div>
          </div>

          <div>
            <label htmlFor="duration" className={labelClass}>Duração (minutos)</label>
            <input type="number" id="duration" name="duration" min="1" defaultValue={initialExam?.duration ?? ''} className={fieldClass} placeholder="Ex: 60 (opcional)" />
            <p className="mt-1 text-xs text-slate-500">Deixe em branco para não limitar o tempo</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          <Link href="/provas" className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">Cancelar</Link>
          <button type="submit" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90">
            {initialExam ? 'Salvar Alterações' : 'Criar Prova'}
          </button>
        </div>
      </form>

      {discipline && modalOpen && (
        <StudentSelectionModal
          disciplineName={discipline.name}
          groups={discipline.groups}
          selectedIds={selectedIds}
          lockedIds={lockedIds}
          onCancel={() => setModalOpen(false)}
          onConfirm={next => {
            setSelectedIds(next);
            setSelectionError('');
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
