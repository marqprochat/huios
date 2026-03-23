"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DeleteButton } from "./DeleteButton";
import { SearchFilter } from "@/app/components/SearchFilter";

interface Professor {
  id: string;
  name: string;
  email: string;
}

interface ProfessoresClientProps {
  professores: Professor[];
}

export function ProfessoresClient({ professores }: ProfessoresClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProfessores = useMemo(() => {
    if (!searchQuery.trim()) return professores;

    const query = searchQuery.toLowerCase();
    return professores.filter(
      (prof) =>
        prof.name.toLowerCase().includes(query) ||
        prof.email.toLowerCase().includes(query)
    );
  }, [professores, searchQuery]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Professores
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie o corpo docente do seminário
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchFilter
            placeholder="Buscar professor..."
            onSearch={setSearchQuery}
          />
          <Link
            href="/professores/novo"
            className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">assignment_add</span>
            Novo Professor
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Docente
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProfessores.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    {searchQuery
                      ? "Nenhum professor encontrado para esta busca."
                      : "Nenhum professor cadastrado."}
                  </td>
                </tr>
              ) : null}
              {filteredProfessores.map((prof) => (
                <tr
                  key={prof.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-bold">
                        {prof.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{prof.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{prof.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/professores/${prof.id}/editar`}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Editar Professor"
                      >
                        <span className="material-symbols-outlined text-xl">
                          edit
                        </span>
                      </Link>
                      <DeleteButton id={prof.id} />
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
