'use client';

import { useStudent } from './components/PortalShell';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function PortalDashboard() {
  const { data } = useStudent();
  const [lessons, setLessons] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    fetchLessons();
    fetchExams();
    fetchGrades();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await fetch('/api/portal/aulas');
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLessons(false);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/portal/provas');
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/portal/boletim');
      if (res.ok) {
        const data = await res.json();
        setGrades(data.grades || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!data) return null;

  const student = data.student;
  const enrollment = student.enrollments?.[0];
  const courseName = enrollment?.class?.course?.name || 'Sem matrícula';
  const className = enrollment?.class?.name || '';

  // Today's lessons
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const todayLessons = lessons.filter(l => {
    const lessonDate = new Date(l.date);
    return lessonDate >= today && lessonDate <= todayEnd;
  });

  // Upcoming lessons (next 7 days)
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const upcomingLessons = lessons.filter(l => {
    const d = new Date(l.date);
    return d > todayEnd && d <= weekEnd;
  }).slice(0, 5);

  // Pending exams
  const now = new Date();
  const pendingExams = exams.filter(e => {
    const hasSubmission = e.submissions?.length > 0 && e.submissions[0]?.submittedAt;
    const isOpen = new Date(e.startDate) <= now && new Date(e.endDate) >= now;
    return !hasSubmission && isOpen;
  });

  // Recent grades
  const recentGrades = grades.slice(0, 3);

  // Calculate attendance
  const totalAttendances = student.attendances?.length || 0;
  const presentCount = student.attendances?.filter((a: any) => a.status === 'PRESENT').length || 0;
  const attendanceRate = totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 100;

  // Average grade
  const gradeScores = grades.map((g: any) => g.score);
  const avgGrade = gradeScores.length > 0 ? (gradeScores.reduce((a: number, b: number) => a + b, 0) / gradeScores.length).toFixed(1) : '—';

  // Has pendencies
  const hasPendencies = pendingExams.length > 0 || attendanceRate < 75;

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Painel do Aluno
          </h2>
          <p className="text-slate-500 text-sm">Bem-vindo de volta, vamos continuar seus estudos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#135bec]/10 text-[#135bec] text-xs font-semibold">
            <span className="w-2 h-2 bg-[#135bec] rounded-full"></span>
            Semestre 2024.1
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Matriculado
          </span>
        </div>
      </div>

      {/* Pendencies Alert */}
      {hasPendencies && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-amber-600">warning</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 text-sm">Pendências Acadêmicas</h3>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
              {pendingExams.length > 0 && `Você possui ${pendingExams.length} prova(s) pendente(s). `}
              {attendanceRate < 75 && `Sua frequência está em ${attendanceRate}% (mínimo: 75%). `}
              Por favor, regularize para evitar bloqueios.
            </p>
          </div>
          <Link href="/portal/provas" className="text-amber-700 hover:text-amber-900 text-xs font-semibold whitespace-nowrap underline">
            Resolver
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="menu_book"
          label="Disciplinas"
          value={String(enrollment?.class?.course ? student.enrollments.reduce((acc: number, e: any) => acc + (e.class?.disciplines?.length || 0), 0) : 0) || '—'}
          color="blue"
        />
        <StatCard
          icon="quiz"
          label="Provas Pendentes"
          value={String(pendingExams.length)}
          color={pendingExams.length > 0 ? 'amber' : 'green'}
        />
        <StatCard
          icon="grade"
          label="Média Geral"
          value={String(avgGrade)}
          color="purple"
        />
        <StatCard
          icon="how_to_reg"
          label="Frequência"
          value={`${attendanceRate}%`}
          color={attendanceRate >= 75 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Grades */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#135bec]">assessment</span>
                <h3 className="font-semibold text-slate-900">Boletim Recente</h3>
              </div>
              <Link href="/portal/boletim" className="text-[#135bec] text-xs font-semibold hover:underline">
                Ver Completo
              </Link>
            </div>

            {recentGrades.length > 0 ? (
              <div className="space-y-3">
                {recentGrades.map((grade: any) => (
                  <div key={grade.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{grade.discipline?.name}</p>
                      <p className="text-xs text-slate-400">{grade.title || 'Avaliação'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            grade.score >= 7 ? 'bg-emerald-500' : grade.score >= 5 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(grade.score / 10) * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold min-w-[2rem] text-right ${
                        grade.score >= 7 ? 'text-emerald-600' : grade.score >= 5 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {grade.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">school</span>
                <p className="text-sm">Nenhuma nota registrada ainda</p>
              </div>
            )}
          </div>

          {/* Today's Calendar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#135bec]">calendar_today</span>
                <h3 className="font-semibold text-slate-900">Calendário de Aulas</h3>
              </div>
              <Link href="/portal/aulas" className="text-[#135bec] text-xs font-semibold hover:underline">
                Ver Todas
              </Link>
            </div>

            {/* Week Day Selector */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(today);
                d.setDate(d.getDate() - d.getDay() + i);
                const isToday = d.toDateString() === today.toDateString();
                const hasLessons = lessons.some(l => new Date(l.date).toDateString() === d.toDateString());

                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] transition-all ${
                      isToday
                        ? 'bg-[#135bec] text-white shadow-lg shadow-[#135bec]/25'
                        : hasLessons
                          ? 'bg-slate-100 text-slate-700'
                          : 'text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase">{weekDays[d.getDay()]}</span>
                    <span className="text-lg font-bold">{d.getDate()}</span>
                    {hasLessons && !isToday && <span className="w-1.5 h-1.5 bg-[#135bec] rounded-full mt-0.5"></span>}
                  </div>
                );
              })}
            </div>

            {/* Today's Lessons */}
            {loadingLessons ? (
              <div className="flex items-center justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-[#135bec]">refresh</span>
              </div>
            ) : todayLessons.length > 0 ? (
              <div className="space-y-3">
                {todayLessons.map((lesson: any) => (
                  <Link
                    key={lesson.id}
                    href={`/portal/aulas/${lesson.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-[#135bec]/5 border border-transparent hover:border-[#135bec]/20 transition-all group"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-xs font-bold text-[#135bec]">
                        {lesson.startTime ? new Date(lesson.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {lesson.endTime ? new Date(lesson.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-[#135bec]/20"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm group-hover:text-[#135bec] transition-colors truncate">
                        {lesson.discipline?.name}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {lesson.locationName || 'Local não definido'} • {lesson.discipline?.courseClass?.name}
                      </p>
                    </div>
                    {lesson.attendances?.length > 0 ? (
                      <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-[#135bec]">chevron_right</span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">event_busy</span>
                <p className="text-sm">Nenhuma aula hoje</p>
              </div>
            )}

            {/* Upcoming */}
            {upcomingLessons.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Próximas Aulas</p>
                <div className="space-y-2">
                  {upcomingLessons.slice(0, 3).map((lesson: any) => (
                    <div key={lesson.id} className="flex items-center gap-3 text-sm">
                      <span className="text-xs font-semibold text-slate-400 min-w-[44px]">
                        {new Date(lesson.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className="text-slate-700 truncate">{lesson.discipline?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pending Exams */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#135bec]">quiz</span>
              <h3 className="font-semibold text-slate-900">Provas</h3>
            </div>

            {loadingExams ? (
              <div className="flex items-center justify-center py-6">
                <span className="material-symbols-outlined animate-spin text-[#135bec]">refresh</span>
              </div>
            ) : pendingExams.length > 0 ? (
              <div className="space-y-3">
                {pendingExams.slice(0, 3).map((exam: any) => {
                  const daysLeft = Math.ceil((new Date(exam.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link
                      key={exam.id}
                      href={`/portal/provas/${exam.id}`}
                      className="block p-4 rounded-xl bg-slate-50 hover:bg-[#135bec]/5 border border-transparent hover:border-[#135bec]/20 transition-all"
                    >
                      <p className="font-medium text-slate-800 text-sm">{exam.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{exam.discipline?.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          daysLeft <= 1 ? 'bg-red-50 text-red-600' :
                          daysLeft <= 3 ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {daysLeft <= 0 ? 'Último dia!' : `${daysLeft} dias restantes`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                <Link href="/portal/provas" className="block text-center text-[#135bec] text-xs font-semibold hover:underline pt-2">
                  Ver todas as provas →
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">task_alt</span>
                <p className="text-sm">Nenhuma prova pendente</p>
              </div>
            )}
          </div>

          {/* Check-in Card */}
          {todayLessons.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined">my_location</span>
                <h3 className="font-semibold">Check-in Disponível</h3>
              </div>
              <p className="text-emerald-100 text-xs mb-4 leading-relaxed">
                Você tem {todayLessons.length} aula(s) hoje. Faça seu check-in de presença por geolocalização.
              </p>
              <Link
                href={`/portal/checkin/${todayLessons[0].id}`}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                <span className="material-symbols-outlined text-sm">near_me</span>
                Fazer Check-in
              </Link>
            </div>
          )}

          {/* Course Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#135bec]">info</span>
              <h3 className="font-semibold text-slate-900">Curso</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curso</p>
                <p className="text-sm font-medium text-slate-800">{courseName}</p>
              </div>
              {className && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Turma</p>
                  <p className="text-sm font-medium text-slate-800">{className}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Ativo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string; value: string }> = {
    blue: { bg: 'bg-[#135bec]/5', icon: 'text-[#135bec]', value: 'text-[#135bec]' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-500', value: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', value: 'text-amber-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-500', value: 'text-red-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', value: 'text-purple-600' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
        <span className={`material-symbols-outlined ${c.icon}`}>{icon}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${c.value} mt-0.5`}>{value}</p>
    </div>
  );
}
