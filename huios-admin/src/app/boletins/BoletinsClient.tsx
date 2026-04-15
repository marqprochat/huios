'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Aluno {
  id: string;
  name: string;
  email: string;
  enrollments: {
    class: {
      name: string;
      course: {
        name: string;
      };
    };
  }[];
}

interface Disciplina {
  id: string;
  name: string;
  courseClasses: {
    name: string;
  }[];
  workload: number | null;
}

interface BoletinsClientProps {
  initialAlunos: Aluno[];
  initialDisciplinas: Disciplina[];
}

export default function BoletinsClient({ initialAlunos, initialDisciplinas }: BoletinsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlunos = initialAlunos.filter(aluno => 
    aluno.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Boletins</h2>
          <p className="text-slate-500 dark:text-slate-400">Consulte notas e histórico acadêmico</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Buscar por Aluno</h3>
          
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Nome ou email do aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlunos.map((aluno) => (
            <Link
              key={aluno.id}
              href={`/boletins/${aluno.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary text-xl">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white truncate">{aluno.name}</div>
                <div className="text-sm text-slate-500 truncate">{aluno.email}</div>
                {aluno.enrollments.length > 0 && (
                  <div className="text-xs text-primary mt-1">
                    {aluno.enrollments[0].class.course.name} - {aluno.enrollments[0].class.name}
                  </div>
                )}
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                arrow_forward
              </span>
            </Link>
          ))}
        </div>

        {filteredAlunos.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
            <p>{searchTerm ? 'Nenhum aluno encontrado' : 'Nenhum aluno matriculado'}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Disciplinas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialDisciplinas.map((disciplina) => (
            <div
              key={disciplina.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="font-bold text-slate-900 dark:text-white">{disciplina.name}</div>
              <div className="text-sm text-slate-500">{disciplina.courseClasses.map(cc => cc.name).join(', ') || 'Sem turma'}</div>
              <div className="text-xs text-slate-400 mt-1">
                {disciplina.workload ? `${disciplina.workload}h` : 'Sem carga horária'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
