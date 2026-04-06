'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
    courseClass: { name: string };
  };
}

export default function CheckInPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
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
        const found = lessons.find((l: any) => l.id === lessonId);
        if (found) {
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
    setCheckingIn(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada por este navegador.');
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const response = await fetch(`${API_URL}/api/lessons/${lessonId}/checkin`, {
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
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">error</span>
        <h2 className="font-bold text-slate-800 mb-2">Aula não encontrada</h2>
        <button onClick={() => router.push('/portal')} className="text-[#135bec] text-sm font-semibold">
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const isCheckedIn = checkInResult?.attendance?.checkInAt;

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
            <p className="text-xs text-slate-400">{lesson.discipline.courseClass.name}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm text-slate-400">event</span>
            {new Date(lesson.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
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
      {isCheckedIn ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
          <h3 className="font-bold text-emerald-800 mb-1">Check-in Realizado!</h3>
          <p className="text-emerald-600 text-sm">Sua presença foi registrada com sucesso.</p>
          {checkInResult?.attendance?.distance !== null && checkInResult?.attendance?.distance !== undefined && (
            <p className="text-emerald-500 text-xs mt-2">
              Distância: {Math.round(checkInResult.attendance.distance)}m
            </p>
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
            disabled={checkingIn}
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
