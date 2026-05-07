'use client';

import { useState, useEffect } from 'react';

export default function AdminAvaliacoesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/avaliacoes');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Avaliações de Professores</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Relatórios consolidados de feedback dos alunos.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
        </div>
      ) : data.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.map((item) => (
            <div key={item.disciplineId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">{item.disciplineName}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">Professor: {item.teacherName}</p>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {item.count} Avaliações
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <RatingSection label="Clareza da Explicação" ratings={item.clarity} total={item.count} />
                <RatingSection label="Engajamento e Metodologia" ratings={item.engagement} total={item.count} />
                <RatingSection label="Domínio do Conteúdo" ratings={item.mastery} total={item.count} />

                {item.comments.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => setSelectedDiscipline(item)}
                      className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:underline"
                    >
                      Ver {item.comments.length} observações
                      <span className="material-symbols-outlined text-sm">visibility</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">rate_review</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic">Nenhuma avaliação recebida ainda.</p>
        </div>
      )}

      {selectedDiscipline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div>
                <h3 className="font-black text-xl text-slate-800 dark:text-white">Observações - {selectedDiscipline.disciplineName}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">Professor: {selectedDiscipline.teacherName}</p>
              </div>
              <button onClick={() => setSelectedDiscipline(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedDiscipline.comments.map((comment: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-slate-700 dark:text-slate-200 text-sm italic font-medium leading-relaxed">"{comment.text}"</p>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 font-bold text-right">
                    {new Date(comment.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setSelectedDiscipline(null)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RatingSection({ label, ratings, total }: { label: string, ratings: any, total: number }) {
  const getRatingColor = (key: string) => {
    switch(key) {
      case 'EXCELENTE': return 'bg-emerald-500 shadow-lg shadow-emerald-500/20';
      case 'BOA': return 'bg-blue-500 shadow-lg shadow-blue-500/20';
      case 'REGULAR': return 'bg-amber-500 shadow-lg shadow-amber-500/20';
      case 'RUIM': return 'bg-red-500 shadow-lg shadow-red-500/20';
      default: return 'bg-slate-300';
    }
  };

  const keys = ['EXCELENTE', 'BOA', 'REGULAR', 'RUIM'];

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</h4>
      </div>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
        {keys.map(key => {
          const count = ratings[key] || 0;
          const percentage = (count / total) * 100;
          if (count === 0) return null;
          return (
            <div 
              key={key} 
              style={{ width: `${percentage}%` }} 
              className={getRatingColor(key)}
              title={`${key}: ${count} (${Math.round(percentage)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {keys.map(key => {
          const count = ratings[key] || 0;
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${getRatingColor(key).split(' ')[0]}`} />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                {key}: {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
