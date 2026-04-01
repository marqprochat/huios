'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Lesson {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  discipline: {
    name: string;
    courseClass: {
      name: string;
    };
  };
}

export default function CheckInHomePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchTodayLessons();
  }, []);

  const fetchTodayLessons = async () => {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`http://localhost:3001/api/lessons?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setLessons(data);
      } else {
        setError('Erro ao carregar aulas de hoje');
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md mx-auto p-4 min-h-screen">
        {/* Header */}
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-primary">school</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            Check-in de Presença
          </h1>
          <p className="text-slate-500 text-sm">
            Huios Seminário Teológico
          </p>
        </div>

        {/* Date Display */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 text-center">
          <span className="material-symbols-outlined text-slate-400 mb-2">today</span>
          <p className="text-slate-600 dark:text-slate-400 capitalize">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Lessons List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
            <span className="material-symbols-outlined text-red-600 mb-2">error</span>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">event_busy</span>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">
              Nenhuma aula hoje
            </h3>
            <p className="text-sm text-slate-500">
              Não há aulas agendadas para hoje.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Aulas de Hoje
            </h2>
            
            {lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/checkin/${lesson.id}`}
                className="block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all hover:border-primary/50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary">menu_book</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {lesson.discipline.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {lesson.discipline.courseClass.name}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {formatTime(lesson.startTime)}
                      </span>
                      {lesson.locationName && (
                        <span className="flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {lesson.locationName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Sistema de Gestão Huios
          </p>
        </div>
      </div>
    </div>
  );
}
