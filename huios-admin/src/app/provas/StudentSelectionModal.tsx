'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExamClassGroup } from '@/lib/exam-participants';
import {
  clearClassStudents,
  filterClassGroups,
  selectClassStudents,
  toggleStudentSelection,
} from './student-selection';

interface Props {
  disciplineName: string;
  groups: ExamClassGroup[];
  selectedIds: Set<string>;
  lockedIds: Set<string>;
  onCancel: () => void;
  onConfirm: (selectedIds: Set<string>) => void;
}

export default function StudentSelectionModal({
  disciplineName,
  groups,
  selectedIds,
  lockedIds,
  onCancel,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selectedIds));
  const [search, setSearch] = useState('');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  const visibleGroups = useMemo(() => filterClassGroups(groups, search), [groups, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="student-selection-title">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h3 id="student-selection-title" className="text-lg font-black text-slate-900 dark:text-white">Selecionar alunos</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{disciplineName}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Fechar seleção de alunos" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar aluno ou turma"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-5">
          {visibleGroups.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
              <p className="mt-2 text-sm font-semibold text-slate-500">Nenhum aluno cursando encontrado</p>
            </div>
          ) : visibleGroups.map(group => {
            const studentIds = group.students.map(student => student.id);
            const selectedCount = studentIds.filter(studentId => draft.has(studentId)).length;
            return (
              <section key={group.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-800/70 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{group.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{group.courseName} · {selectedCount} de {group.students.length} selecionados</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDraft(current => selectClassStudents(current, studentIds))} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20">
                      Marcar todos
                    </button>
                    <button type="button" onClick={() => setDraft(current => clearClassStudents(current, studentIds, lockedIds))} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">
                      Desmarcar todos
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.students.map(student => {
                    const locked = lockedIds.has(student.id);
                    return (
                      <label key={student.id} className={`flex items-center gap-3 px-4 py-3 ${locked ? 'cursor-not-allowed bg-amber-50/70 dark:bg-amber-950/20' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                        <input
                          type="checkbox"
                          checked={draft.has(student.id)}
                          disabled={locked}
                          onChange={() => setDraft(current => toggleStudentSelection(current, student.id))}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{student.name}</span>
                        {locked && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Prova iniciada</span>}
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{draft.size} aluno{draft.size === 1 ? '' : 's'} selecionado{draft.size === 1 ? '' : 's'}</p>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
            <button type="button" onClick={() => onConfirm(new Set(draft))} className="flex-1 whitespace-nowrap rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">Confirmar seleção</button>
          </div>
        </div>
      </div>
    </div>
  );
}
