'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ratings = [
  { value: 'EXCELENTE', label: 'Excelente', color: 'bg-emerald-500' },
  { value: 'BOA', label: 'Boa', color: 'bg-blue-500' },
  { value: 'REGULAR', label: 'Regular', color: 'bg-amber-500' },
  { value: 'RUIM', label: 'Ruim', color: 'bg-red-500' },
];

export default function AvaliacaoFormPage({ params }: { params: { disciplineId: string } }) {
  const router = useRouter();
  const { disciplineId } = params;
  
  const [discipline, setDiscipline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [clarity, setClarity] = useState('');
  const [engagement, setEngagement] = useState('');
  const [mastery, setMastery] = useState('');
  const [observations, setObservations] = useState('');

  useEffect(() => {
    fetchDiscipline();
  }, []);

  const fetchDiscipline = async () => {
    try {
      const res = await fetch('/api/portal/avaliacoes');
      if (res.ok) {
        const data = await res.json();
        const found = data.find((d: any) => d.id === disciplineId);
        if (found) {
          setDiscipline(found);
        } else {
          router.push('/portal/avaliacoes');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarity || !engagement || !mastery) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/avaliacoes/${disciplineId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clarity, engagement, mastery, observations }),
      });

      if (res.ok) {
        router.push('/portal/avaliacoes?success=true');
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao enviar avaliação');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
      </div>
    );
  }

  if (!discipline) return null;

  return (
    <div className="max-w-[800px] mx-auto p-4 lg:p-8 space-y-6">
      <Link href="/portal/avaliacoes" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#135bec] transition-colors text-sm font-medium">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Voltar para a lista
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-[#135bec] to-[#0d47a1] p-8 text-white">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Avaliação do Professor</p>
          <h2 className="text-2xl font-bold">{discipline.teacher}</h2>
          <p className="text-white/80 text-sm mt-1">{discipline.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Graça e paz, seminarista!</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              O intuito deste formulário é para que você possa avaliar o nosso professor durante o período em que o mesmo esteve lecionando a matéria.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed">
              A avaliação é <strong>anônima</strong>, desta forma, você está livre para trazer feedbacks sem nenhum tipo de constrangimento. Entendemos como seminário a importância desse princípio para que possamos estar sempre buscando melhorias para que o desenvolvimento das aulas seja ainda mais excelente.
            </p>
          </div>

          <div className="space-y-6">
            {/* Pergunta 1 */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                1- Clareza da explicação:
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-slate-400">O professor apresentou o conteúdo de forma clara e compreensível?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {ratings.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setClarity(r.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      clarity === r.value
                        ? `${r.color} text-white border-transparent shadow-lg`
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pergunta 2 */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                2- Engajamento e metodologia:
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-slate-400">As atividades e exemplos usados ajudaram a manter seu interesse e facilitaram a aprendizagem?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {ratings.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setEngagement(r.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      engagement === r.value
                        ? `${r.color} text-white border-transparent shadow-lg`
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pergunta 3 */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                3- Domínio do conteúdo e interação:
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-slate-400">O professor demonstrou domínio do conteúdo?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {ratings.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setMastery(r.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      mastery === r.value
                        ? `${r.color} text-white border-transparent shadow-lg`
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                4 - Gostaria de acrescentar alguma observação? Quais?
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={4}
                placeholder="Escreva aqui seu feedback adicional..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#135bec] focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-slate-400 max-w-[300px]">
              Atenciosamente, Coordenação/Diretoria Seminário Teológico HuiosRib
            </p>
            <button
              type="submit"
              disabled={submitting || !clarity || !engagement || !mastery}
              className="w-full sm:w-auto bg-[#135bec] text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-[#135bec]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#135bec]/20"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                  Enviando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  Enviar Avaliação
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
