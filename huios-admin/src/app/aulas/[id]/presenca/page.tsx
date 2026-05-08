'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDateBR } from '@/lib/date-utils';
import { API_URL } from '@/lib/api';
import { useToast } from '@/app/components/Toast/useToast';

interface Attendance {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING';
  student: {
    id: string;
    name: string;
    email: string;
    enrollments?: {
      class: {
        id: string;
        name: string;
      };
    }[];
  };
  checkInAt: string | null;
  distance: number | null;
  markedAt: string | null;
}

interface Lesson {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  disciplines: {
    name: string;
    courseClasses: {
      name: string;
    }[];
  }[];
}

interface GroupedAttendances {
  [turmaName: string]: {
    turmaId: string;
    attendances: Attendance[];
  };
}

export default function PresencaPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLesson();
    fetchAttendances();
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lessons/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    }
  };

  const fetchAttendances = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lessons/${lessonId}/attendances`);
      if (response.ok) {
        const data = await response.json();
        setAttendances(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching attendances:', error);
      setLoading(false);
    }
  };

  // Group attendances by turma (CourseClass)
  const groupedAttendances = useMemo<GroupedAttendances>(() => {
    const groups: GroupedAttendances = {};

    attendances.forEach(att => {
      const enrollments = att.student.enrollments || [];
      if (enrollments.length > 0) {
        // Student may belong to multiple turmas linked to this lesson's disciplines
        enrollments.forEach(enrollment => {
          const turmaName = enrollment.class.name;
          const turmaId = enrollment.class.id;
          if (!groups[turmaName]) {
            groups[turmaName] = { turmaId, attendances: [] };
          }
          // Avoid duplicates if a student appears in the same turma multiple times
          if (!groups[turmaName].attendances.find(a => a.id === att.id)) {
            groups[turmaName].attendances.push(att);
          }
        });
      } else {
        // No enrollment linked — put in "Sem Turma"
        const key = 'Sem Turma';
        if (!groups[key]) {
          groups[key] = { turmaId: 'none', attendances: [] };
        }
        groups[key].attendances.push(att);
      }
    });

    // Sort students within each group
    Object.values(groups).forEach(group => {
      group.attendances.sort((a, b) => a.student.name.localeCompare(b.student.name));
    });

    return groups;
  }, [attendances]);

  const sortedGroupNames = useMemo(() => {
    const names = Object.keys(groupedAttendances);
    // Put "Sem Turma" at the end
    return names.sort((a, b) => {
      if (a === 'Sem Turma') return 1;
      if (b === 'Sem Turma') return -1;
      return a.localeCompare(b);
    });
  }, [groupedAttendances]);

  const handleStatusChange = (id: string, status: string) => {
    setAttendances(prev =>
      prev.map(att =>
        att.id === id ? { ...att, status: status as any, markedAt: new Date().toISOString() } : att
      )
    );
  };

  const handleMarkAllPresent = () => {
    setAttendances(prev =>
      prev.map(att => ({
        ...att,
        status: 'PRESENT' as const,
        markedAt: new Date().toISOString()
      }))
    );
  };

  const handleMarkGroupPresent = (groupName: string) => {
    const groupStudentIds = new Set(
      groupedAttendances[groupName]?.attendances.map(a => a.id) || []
    );
    setAttendances(prev =>
      prev.map(att =>
        groupStudentIds.has(att.id)
          ? { ...att, status: 'PRESENT' as const, markedAt: new Date().toISOString() }
          : att
      )
    );
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/lessons/${lessonId}/attendances/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendances: attendances.map(a => ({ id: a.id, status: a.status }))
        })
      });

      if (response.ok) {
        toast('success', 'Presenças salvas com sucesso!');
        fetchAttendances();
      } else {
        const data = await response.json();
        toast('error', 'Erro ao salvar presenças', data.error || 'Tente novamente mais tarde');
      }
    } catch (error) {
      console.error('Error saving attendances:', error);
      toast('error', 'Erro ao salvar presenças', 'Verifique sua conexão e tente novamente');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Presente</span>;
      case 'ABSENT':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Ausente</span>;
      case 'EXCUSED':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Justificado</span>;
      default:
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Pendente</span>;
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getGroupStats = (groupAttendances: Attendance[]) => ({
    total: groupAttendances.length,
    present: groupAttendances.filter(a => a.status === 'PRESENT').length,
    absent: groupAttendances.filter(a => a.status === 'ABSENT').length,
    excused: groupAttendances.filter(a => a.status === 'EXCUSED').length,
    pending: groupAttendances.filter(a => a.status === 'PENDING').length
  });

  const stats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === 'PRESENT').length,
    absent: attendances.filter(a => a.status === 'ABSENT').length,
    excused: attendances.filter(a => a.status === 'EXCUSED').length,
    pending: attendances.filter(a => a.status === 'PENDING').length
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/aulas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Lançar Presença</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {lesson?.disciplines.map(d => d.name).join(' / ')} • {formatDateBR(lesson?.date)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-black text-green-600">{stats.present}</div>
          <div className="text-sm text-slate-500">Presentes</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-black text-red-600">{stats.absent}</div>
          <div className="text-sm text-slate-500">Ausentes</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-black text-yellow-600">{stats.excused}</div>
          <div className="text-sm text-slate-500">Justificados</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-black text-slate-600">{stats.pending}</div>
          <div className="text-sm text-slate-500">Pendentes</div>
        </div>
      </div>

      {/* Global actions */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {stats.total} alunos matriculados • {sortedGroupNames.filter(n => n !== 'Sem Turma').length} turma(s)
        </span>
        <button
          onClick={handleMarkAllPresent}
          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Marcar Todos Presentes
        </button>
      </div>

      {/* Grouped by Turma */}
      {sortedGroupNames.map(groupName => {
        const group = groupedAttendances[groupName];
        const groupStats = getGroupStats(group.attendances);
        const isCollapsed = collapsedGroups.has(groupName);

        return (
          <div key={groupName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Group Header */}
            <div
              className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                  chevron_right
                </span>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-primary">groups</span>
                    {groupName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                    <span>{groupStats.total} alunos</span>
                    <span className="text-green-600">{groupStats.present} presentes</span>
                    <span className="text-red-600">{groupStats.absent} ausentes</span>
                    {groupStats.excused > 0 && <span className="text-yellow-600">{groupStats.excused} justificados</span>}
                    {groupStats.pending > 0 && <span className="text-slate-400">{groupStats.pending} pendentes</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkGroupPresent(groupName);
                }}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Todos Presentes
              </button>
            </div>

            {/* Group Table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Aluno</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Check-in</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.attendances.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium">{attendance.student.name}</div>
                          <div className="text-sm text-slate-500">{attendance.student.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {attendance.checkInAt ? (
                            <div>
                              <div className="font-medium text-green-600">
                                {formatTime(attendance.checkInAt)}
                              </div>
                              {attendance.distance && (
                                <div className="text-xs text-slate-500">
                                  {Math.round(attendance.distance)}m de distância
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">--:--</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(attendance.status)}</td>
                        <td className="px-6 py-4">
                          <select
                            value={attendance.status}
                            onChange={(e) => handleStatusChange(attendance.id, e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="PENDING">Pendente</option>
                            <option value="PRESENT">Presente</option>
                            <option value="ABSENT">Ausente</option>
                            <option value="EXCUSED">Justificado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {sortedGroupNames.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">person_off</span>
          <p className="text-slate-500 mt-2">Nenhum aluno matriculado para esta aula.</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-4">
        <Link
          href="/aulas"
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          Cancelar
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && <span className="material-symbols-outlined animate-spin">refresh</span>}
          Salvar Presenças
        </button>
      </div>
    </div>
  );
}
