"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DeleteButton } from "./DeleteButton";
import { SearchFilter } from "@/app/components/SearchFilter";

interface Aluno {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface AlunosClientProps {
  alunos: Aluno[];
}

export function AlunosClient({ alunos }: AlunosClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAlunos = useMemo(() => {
    if (!searchQuery.trim()) return alunos;

    const query = searchQuery.toLowerCase();
    return alunos.filter(
      (aluno) =>
        aluno.name.toLowerCase().includes(query) ||
        aluno.email.toLowerCase().includes(query) ||
        (aluno.phone && aluno.phone.toLowerCase().includes(query))
    );
  }, [alunos, searchQuery]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Alunos
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie os alunos do seminário
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchFilter
            placeholder="Buscar aluno..."
            onSearch={setSearchQuery}
          />
          <Link
            href="/alunos/novo"
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Novo Aluno
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nome
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Telefone
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAlunos.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    {searchQuery
                      ? "Nenhum aluno encontrado para esta busca."
                      : "Nenhum aluno cadastrado."}
                  </td>
                </tr>
              ) : null}
              {filteredAlunos.map((aluno) => (
                <tr
                  key={aluno.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {aluno.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{aluno.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{aluno.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {aluno.phone || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/alunos/${aluno.id}/editar`}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Editar Aluno"
                      >
                        <span className="material-symbols-outlined text-xl">
                          edit
                        </span>
                      </Link>
                      <DeleteButton id={aluno.id} />
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
