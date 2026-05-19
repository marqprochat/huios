"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SearchFilter } from "@/app/components/SearchFilter";

interface Matricula {
  id: string;
  studentId: string;
  classId: string;
  status: string;
  statusDate: Date | null;
  createdAt: Date;
  student: {
    id: string;
    name: string;
    email: string;
  };
  class: {
    id: string;
    name: string;
    course: {
      name: string;
    };
  };
}

interface MatriculasClientProps {
  matriculas: Matricula[];
}

const STATUS_LABELS: Record<string, string> = {
  CURSANDO: "Cursando",
  TRANCADO: "Trancado",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

const STATUS_COLORS: Record<string, string> = {
  CURSANDO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  TRANCADO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  APROVADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  REPROVADO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

export function MatriculasClient({ matriculas }: MatriculasClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatriculas = useMemo(() => {
    if (!searchQuery.trim()) return matriculas;

    const query = searchQuery.toLowerCase();
    return matriculas.filter(
      (m) =>
        m.student.name.toLowerCase().includes(query) ||
        m.student.email.toLowerCase().includes(query) ||
        m.class.name.toLowerCase().includes(query) ||
        m.class.course.name.toLowerCase().includes(query)
    );
  }, [matriculas, searchQuery]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Matrículas
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie as matrículas e vínculos acadêmicos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchFilter
            placeholder="Buscar matrícula..."
            onSearch={setSearchQuery}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Aluno
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Turma / Curso
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Data Matrícula
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMatriculas.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-500 font-medium italic"
                  >
                    {searchQuery
                      ? "Nenhuma matrícula encontrada para esta busca."
                      : "Nenhuma matrícula cadastrada no sistema."}
                  </td>
                </tr>
              ) : null}
              {filteredMatriculas.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {m.student.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.student.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{m.student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.class.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-black">{m.class.course.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ${STATUS_COLORS[m.status] || ""}`}>
                      {STATUS_LABELS[m.status] || m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/alunos/${m.student.id}`}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all"
                        title="Ver Perfil do Aluno"
                      >
                        <span className="material-symbols-outlined text-sm">
                          person
                        </span>
                      </Link>
                      <Link
                        href={`/turmas/${m.class.id}`}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all"
                        title="Ver Turma"
                      >
                        <span className="material-symbols-outlined text-sm">
                          diversity_3
                        </span>
                      </Link>
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
