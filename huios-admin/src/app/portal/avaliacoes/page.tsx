'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EvaluationDiscipline {
  id: string;
  name: string;
  teacher: string;
}

export default function AvaliacoesPage() {
  const [disciplines, setDisciplines] = useState<EvaluationDiscipline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const res = await fetch('/api/portal/avaliacoes');
      if (res.ok) {
        const data = await res.json();
        setDisciplines(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Avaliação de Professores</h2>
        <p className="text-slate-500 text-sm">Sua opinião é fundamental para melhorarmos continuamente.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-[#135bec]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#135bec]">info</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Avaliação Anônima</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              As avaliações são totalmente anônimas. Utilize este espaço para trazer feedbacks construtivos
              sobre a didática, engajamento e domínio do conteúdo dos nossos professores.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
          </div>
        ) : disciplines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disciplines.map((disc) => (
              <div key={disc.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{disc.name}</h4>
                  <p className="text-xs text-slate-400">Prof. {disc.teacher}</p>
                </div>
                <Link
                  href={`/portal/avaliacoes/${disc.id}`}
                  className="w-full bg-[#135bec] text-white text-center py-2 rounded-lg text-sm font-semibold hover:bg-[#135bec]/90 transition-all"
                >
                  Avaliar Agora
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-slate-200 mb-3">check_circle</span>
            <p className="text-slate-400 text-sm font-medium">Você não possui avaliações pendentes no momento.</p>
            <p className="text-slate-400 text-xs mt-1">As avaliações ficam disponíveis após a conclusão das aulas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
