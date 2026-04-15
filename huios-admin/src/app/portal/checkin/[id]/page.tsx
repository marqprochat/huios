'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toLocalDate } from '@/lib/date-utils';

interface Lesson {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  discipline: {
    name: string;
    courseClasses: { name: string }[];
  };
}

export default function CheckInPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [checkInResult, setCheckInResult] = useState<any>(null);
  const [studentId, setStudentId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [lessonId]);

  const fetchData = async () => {
    try {
      // Get student ID
      const meRes = await fetch('/api/auth/aluno/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setStudentId(meData.student.id);
      }

      // Get lessons to find this one
      const lessonsRes = await fetch('/api/portal/aulas');
      if (lessonsRes.ok) {
        const lessons = await lessonsRes.json();
        
        let found;
        if (lessonId === 'hoje') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          found = lessons.find((l: any) => {
            const lessonDate = toLocalDate(l.date);
            return lessonDate.getTime() === today.getTime();
          });
        } else {
          found = lessons.find((l: any) => l.id === lessonId);
        }

        if (found) {
          // If lesson has no coordinates, use system settings as fallback
          if (found.latitude === null || found.latitude === undefined || found.longitude === null || found.longitude === undefined) {
            try {
              const sRes = await fetch('/api/settings');
              if (sRes.ok) {
                const sData = await sRes.json();
                if (sData.latitude !== null && sData.latitude !== undefined && sData.longitude !== null && sData.longitude !== undefined) {
                  // Update found object with fallback values
                  found = {
                    ...found,
                    latitude: sData.latitude,
                    longitude: sData.longitude,
                    radiusMeters: sData.radiusMeters || found.radiusMeters,
                    locationName: found.locationName || sData.locationName
                  };
                }
              }
            } catch (err) {
              console.error('Error fetching default settings:', err);
            }
          }
          setLesson(found);
          // Check existing attendance
          if (found.attendances?.length > 0) {
            setCheckInResult({
              attendance: found.attendances[0],
              isWithinRadius: true
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!lesson) return;
    setCheckingIn(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada por este navegador.');
      setCheckingIn(false);
      return;
    }

    const realLessonId = lesson.id;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const response = await fetch(`${API_URL}/api/lessons/${realLessonId}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          });

          const data = await response.json();

          if (response.ok) {
            setCheckInResult(data);
          } else {
            setLocationError(data.error || 'Erro ao realizar check-in');
          }
        } catch (error) {
          console.error(error);
          setLocationError('Erro ao conectar com o servidor');
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        let msg = 'Erro ao obter localização: ';
        switch (error.code) {
          case error.PERMISSION_DENIED: msg += 'Permissão negada.'; break;
          case error.POSITION_UNAVAILABLE: msg += 'Localização indisponível.'; break;
          case error.TIMEOUT: msg += 'Tempo esgotado.'; break;
          default: msg += error.message;
        }
        setLocationError(msg);
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCheckOut = async () => {
    if (!lesson) return;
    setCheckingOut(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada por este navegador.');
      setCheckingOut(false);
      return;
    }

    const realLessonId = lesson.id;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const response = await fetch(`${API_URL}/api/lessons/${realLessonId}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          });

          const data = await response.json();

          if (response.ok) {
            setCheckInResult(data);
          } else {
            setLocationError(data.error || 'Erro ao realizar check-out');
          }
        } catch (error) {
          console.error(error);
          setLocationError('Erro ao conectar com o servidor');
        } finally {
          setCheckingOut(false);
        }
      },
      (error) => {
        let msg = 'Erro ao obter localização: ';
        switch (error.code) {
          case error.PERMISSION_DENIED: msg += 'Permissão negada.'; break;
          case error.POSITION_UNAVAILABLE: msg += 'Localização indisponível.'; break;
          case error.TIMEOUT: msg += 'Tempo esgotado.'; break;
          default: msg += error.message;
        }
        setLocationError(msg);
        setCheckingOut(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">event_busy</span>
        <h2 className="font-bold text-slate-800 mb-2">{lessonId === 'hoje' ? 'Nenhuma aula para hoje' : 'Aula não encontrada'}</h2>
        <p className="text-sm text-slate-400 mb-6">
          {lessonId === 'hoje' 
            ? 'Não localizamos nenhuma aula agendada para a data de hoje.' 
            : 'O link acessado pode estar incorreto ou a aula foi removida.'}
        </p>
        <button onClick={() => router.push('/portal')} className="bg-[#135bec] text-white px-6 py-2 rounded-xl text-sm font-semibold">
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const isCheckedIn = !!checkInResult?.attendance?.checkInAt;
  const isCheckedOut = !!checkInResult?.attendance?.checkOutAt;

  return (
    <div className="max-w-md mx-auto p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-[#135bec]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-3xl text-[#135bec]">my_location</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Check-in de Presença</h2>
        <p className="text-sm text-slate-400">Registre sua presença por geolocalização</p>
      </div>

      {/* Lesson Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-[#135bec]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#135bec]">menu_book</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{lesson.discipline.name}</h3>
            <p className="text-xs text-slate-400">{lesson.discipline.courseClasses.map(cc => cc.name).join(', ')}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm text-slate-400">event</span>
            {toLocalDate(lesson.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
            {lesson.startTime ? new Date(lesson.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            {lesson.endTime && ` - ${new Date(lesson.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </div>
          {lesson.locationName && (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
              {lesson.locationName}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      {(lesson.latitude === null || lesson.latitude === undefined || lesson.longitude === null || lesson.longitude === undefined) && !isCheckedIn && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">location_off</span>
          <h3 className="font-bold text-amber-800 mb-1">Localização não definida</h3>
          <p className="text-amber-600 text-sm">Esta aula não possui coordenadas geográficas definidas para o check-in por geolocalização. Por favor, solicite ao professor a marcação manual da sua presença.</p>
        </div>
      )}

      {isCheckedIn ? (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
            <h3 className="font-bold text-emerald-800 mb-1">Check-in Realizado!</h3>
            <p className="text-emerald-600 text-sm">Sua presença inicial foi registrada.</p>
            {checkInResult?.attendance?.distance !== null && checkInResult?.attendance?.distance !== undefined && (
              <p className="text-emerald-500 text-xs mt-2">
                Distância (In): {Math.round(checkInResult.attendance.distance)}m
              </p>
            )}
          </div>

          {isCheckedOut ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-blue-500 mb-2">logout</span>
              <h3 className="font-bold text-blue-800 mb-1">Check-out Realizado!</h3>
              <p className="text-blue-600 text-sm">Sua saída foi registrada com sucesso.</p>
              {checkInResult?.attendance?.checkOutDistance !== null && checkInResult?.attendance?.checkOutDistance !== undefined && (
                <p className="text-blue-500 text-xs mt-2">
                  Distância (Out): {Math.round(checkInResult.attendance.checkOutDistance)}m
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">sensor_door</span>
              <h3 className="font-semibold text-slate-800 mb-2">Finalizar Aula (Check-out)</h3>
              <p className="text-xs text-slate-500 mb-4">
                Ao final da aula, registre sua saída para completar a presença.
              </p>
              <button
                onClick={handleCheckOut}
                disabled={checkingOut || lesson.latitude === null || lesson.latitude === undefined || lesson.longitude === null || lesson.longitude === undefined}
                className="w-full bg-slate-800 text-white py-4 rounded-xl font-semibold text-lg hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingOut ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Obtendo localização...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">logout</span>
                    Fazer Check-out
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">qr_code_scanner</span>
          <h3 className="font-semibold text-slate-800 mb-2">Realizar Check-in</h3>
          <p className="text-xs text-slate-500 mb-4">
            Clique no botão abaixo. O sistema solicitará acesso à sua localização.
          </p>
          <button
            onClick={handleCheckIn}
            disabled={checkingIn || lesson.latitude === null || lesson.latitude === undefined || lesson.longitude === null || lesson.longitude === undefined}
            className="w-full bg-[#135bec] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#0d47a1] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checkingIn ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Obtendo localização...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">my_location</span>
                Fazer Check-in
              </>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-sm text-red-700">{locationError}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Como funciona?</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
            Permita o acesso à localização
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
            Esteja dentro do raio de {lesson.radiusMeters}m da aula
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-xs text-emerald-500">check</span>
            Seu check-in será registrado automaticamente
          </li>
        </ul>
      </div>
    </div>
  );
}
