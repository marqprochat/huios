'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DeleteButton } from './DeleteButton';

interface DisciplinaData {
    id: string;
    name: string;
    year: number | null;
    workload: number | null;
    courseClasses: { id: string; name: string; course: { name: string } }[];
    teacher: { name: string } | null;
}

export default function DisciplinasClient({ disciplinas, availableYears }: { disciplinas: DisciplinaData[]; availableYears: number[] }) {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

    const filtered = selectedYear === 'all'
        ? disciplinas
        : disciplinas.filter(d => d.year === parseInt(selectedYear));

    return (
        <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Disciplinas</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie as disciplinas das turmas</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-sm">calendar_today</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                        >
                            <option value="all">Todos os anos</option>
                            {availableYears.map(year => (
                                <option key={year} value={String(year)}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <Link href="/disciplinas/novo" className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-sm">add</span>
                        Nova Disciplina
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nome da Disciplina</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Turmas</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Professor</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Carga Horária</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ano</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        {selectedYear === 'all' ? 'Nenhuma disciplina cadastrada.' : `Nenhuma disciplina em ${selectedYear}.`}
                                    </td>
                                </tr>
                            ) : null}
                            {filtered.map(disciplina => (
                                <tr key={disciplina.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium">{disciplina.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {disciplina.courseClasses.map(cc => (
                                                <span key={cc.id} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                                    {cc.name}
                                                    <span className="ml-1 text-primary/60">({cc.course.name})</span>
                                                </span>
                                            ))}
                                            {disciplina.courseClasses.length === 0 && (
                                                <span className="text-slate-400 italic text-sm">Sem turma</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {disciplina.teacher?.name || <span className="text-slate-400 italic">Não atribuído</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {disciplina.workload ? `${disciplina.workload}h` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {disciplina.year ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                                                {disciplina.year}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/disciplinas/${disciplina.id}/editar`} className="text-slate-400 hover:text-primary transition-colors" title="Editar Disciplina">
                                                <span className="material-symbols-outlined text-xl">edit</span>
                                            </Link>
                                            <DeleteButton id={disciplina.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
