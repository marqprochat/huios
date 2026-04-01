'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Discipline {
  id: string;
  name: string;
  courseClass: { name: string };
}

interface StudentStat {
  student: {
    id: string;
    name: string;
  };
  total: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number;
}

interface Lesson {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  attendances: {
    id: string;
    status: string;
    student: { id: string; name: string };
    checkInAt: string | null;
    distance: number | null;
  }[];
}

export default function RelatorioPresencaPage() {
  const [disciplinas, setDisciplinas] = useState<Discipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    fetchDisciplinas();
  }, []);

  useEffect(() => {
    if (selectedDiscipline) {
      fetchReport();
    }
  }, [selectedDiscipline, dateRange]);

  const fetchDisciplinas = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/classes');
      if (response.ok) {
        // Buscar disciplinas de alguma forma - vamos simplificar por enquanto
        const data = await response.json();
        // Como não temos endpoint específico, vamos deixar vazio
        setDisciplinas([]);
      }
    } catch (error) {
      console.error('Error fetching disciplines:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:3001/api/attendance/discipline/${selectedDiscipline}`;
      if (dateRange.start || dateRange.end) {
        const params = new URLSearchParams();
        if (dateRange.start) params.append('startDate', dateRange.start);
        if (dateRange.end) params.append('endDate', dateRange.end);
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
        setStudentStats(data.studentStats || []);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'text-green-600';
      case 'ABSENT':
        return 'text-red-600';
      case 'EXCUSED':
        return 'text-yellow-600';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'check_circle';
      case 'ABSENT':
        return 'cancel';
      case 'EXCUSED':
        return 'help';
      default:
        return 'pending';
    }
  };

  const calculateOverallStats = () => {
    const totalLessons = lessons.length;
    const totalPresences = studentStats.reduce((sum, s) => sum + s.present, 0);
    const totalPossible = studentStats.reduce((sum, s) => sum + s.total, 0);
    const overallPercentage = totalPossible > 0 ? Math.round((totalPresences / totalPossible) * 100) : 0;

    return { totalLessons, overallPercentage };
  };

  const stats = calculateOverallStats();

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Relatório de Presença
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Visualize estatísticas de presença por disciplina
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Disciplina
            </label>
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Selecione uma disciplina</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} - {d.courseClass.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {selectedDiscipline && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="text-3xl font-black text-primary">{stats.totalLessons}</div>
              <div className="text-sm text-slate-500">Total de Aulas</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="text-3xl font-black text-green-600">{stats.overallPercentage}%</div>
              <div className="text-sm text-slate-500">Média de Presença</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="text-3xl font-black text-slate-600">{studentStats.length}</div>
              <div className="text-sm text-slate-500">Alunos</div>
            </div>
          </div>

          {studentStats.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Presença por Aluno
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Aluno</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Presenças</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Faltas</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Justificadas</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">% Presença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {studentStats.map((stat) => (
                      <tr key={stat.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-medium">{stat.student.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-green-600">{stat.present}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-red-600">{stat.absent}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-yellow-600">{stat.excused}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  stat.percentage >= 75 ? 'bg-green-500' :
                                  stat.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${stat.percentage}%` }}
                              />
                            </div>
                            <span className="font-bold">{stat.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lessons.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Histórico de Aulas
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Data</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Horário</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Local</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Presenças</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lessons.map((lesson) => {
                      const presentCount = lesson.attendances.filter(a => a.status === 'PRESENT').length;
                      return (
                        <tr key={lesson.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-4">
                            {new Date(lesson.date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {lesson.startTime ? new Date(lesson.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            {' - '}
                            {lesson.endTime ? new Date(lesson.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {lesson.locationName || 'Não definido'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-green-600">{presentCount}</span>
                            <span className="text-slate-400"> / {lesson.attendances.length}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              href={`/aulas/${lesson.id}/presenca`}
                              className="text-primary hover:text-primary/80 font-medium text-sm"
                            >
                              Ver Detalhes →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lessons.length === 0 && studentStats.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
              <p>Nenhum dado encontrado para o período selecionado</p>
            </div>
          )}
        </>
      )}

      {!selectedDiscipline && !loading && (
        <div className="text-center py-12 text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-2">tune</span>
          <p>Selecione uma disciplina para visualizar o relatório</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
          <p className="text-slate-500 mt-2">Carregando...</p>
        </div>
      )}
    </div>
  );
}
