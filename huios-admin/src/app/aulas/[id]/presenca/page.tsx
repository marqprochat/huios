'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDateBR } from '@/lib/date-utils';
import { useToast } from '@/app/components/Toast/useToast';

interface Attendance {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING';
  student: {
    id: string;
    name: string;
    email: string;
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

export default function PresencaPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLesson();
    fetchAttendances();
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/lessons/${lessonId}`);
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
      const response = await fetch(`http://localhost:3001/api/lessons/${lessonId}/attendances`);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/api/lessons/${lessonId}/attendances/bulk`, {
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

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {stats.total} alunos matriculados
          </span>
          <button
            onClick={handleMarkAllPresent}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Marcar Todos Presentes
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Aluno</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Check-in</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {attendances.map((attendance) => (
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
      </div>

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
