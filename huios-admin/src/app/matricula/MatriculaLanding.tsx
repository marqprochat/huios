import Link from 'next/link';

export interface LandingTurma {
  id: string;
  name: string;
  courseName: string;
  courseDescription: string | null;
  courseImageUrl: string | null;
  startDate: string | null;
  duration: string | null;
}

export interface LandingChurch {
  name: string;
  isPartner: boolean;
  slug: string;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null);

export function MatriculaLanding({ turmas, church }: { turmas: LandingTurma[]; church?: LandingChurch | null }) {
  const enrollHref = (turmaId: string) =>
    church ? `/matricula/turma/${turmaId}?church=${church.slug}` : `/matricula/turma/${turmaId}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-indigo-700 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Huios" className="h-16 mx-auto mb-6 object-contain brightness-0 invert" />
          {church?.isPartner && (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold mb-5">
              <span className="material-symbols-outlined text-[18px]">handshake</span>
              Igreja parceira: {church.name}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Matrículas Abertas
          </h1>
          <p className="text-lg md:text-xl text-white/80 mt-3 font-medium">Seminário Teológico Huios</p>
          <p className="max-w-2xl mx-auto text-white/70 mt-5 text-sm md:text-base">
            Forme-se com excelência teológica. Escolha uma das turmas com inscrições abertas
            e faça sua matrícula online em poucos minutos.
          </p>
          {turmas.length > 0 && (
            <a href="#turmas" className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl text-sm font-bold mt-8 hover:bg-white/90 transition-colors shadow-xl">
              Ver turmas disponíveis
              <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            </a>
          )}
        </div>
      </header>

      {/* Turmas */}
      <main id="turmas" className="max-w-5xl mx-auto px-6 py-14">
        {turmas.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">event_busy</span>
            <h2 className="text-xl font-black text-slate-800">Nenhuma turma com matrícula aberta no momento</h2>
            <p className="text-slate-500 text-sm mt-2">Volte em breve ou entre em contato com a coordenação.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">Turmas disponíveis</h2>
              <p className="text-slate-500 mt-2">Selecione a turma desejada para iniciar sua matrícula.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {turmas.map(t => (
                <div key={t.id} className="group rounded-2xl border border-slate-200 overflow-hidden hover:border-primary hover:shadow-xl transition-all flex flex-col">
                  <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                    {t.courseImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.courseImageUrl} alt={t.courseName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300">menu_book</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-black text-slate-900 text-lg leading-snug">{t.courseName}</h3>
                    <p className="text-sm font-bold text-primary">{t.name}</p>
                    {t.courseDescription && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{t.courseDescription}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500">
                      {fmtDate(t.startDate) && (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          Início {fmtDate(t.startDate)}
                        </span>
                      )}
                      {t.duration && (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          {t.duration}
                        </span>
                      )}
                    </div>
                    <Link href={enrollHref(t.id)} className="mt-5 w-full text-center bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                      Matricular nesta turma
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        <p>Seminário Teológico Huios · Igreja Conviva</p>
      </footer>
    </div>
  );
}
