'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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
    courseClasses: {
      name: string;
    }[];
  };
}

interface Attendance {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING';
  checkInAt: string | null;
  distance: number | null;
  checkOutAt: string | null;
  checkOutDistance: number | null;
}

export default function CheckInPage() {
  const params = useParams();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [checkInResult, setCheckInResult] = useState<any>(null);

  // Mock student ID - in production this would come from auth context
  const studentId = 'mock-student-id';

  useEffect(() => {
    if (lessonId) {
      fetchLesson();
    }
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      const response = await fetch(`/api/portal/aulas/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data);
        // Check if already checked in
        checkExistingAttendance(data.id);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    }
  };

  const checkExistingAttendance = async (lessonId: string) => {
    try {
      // In a real application we would check standard endpoint or it could be retrieved with the lesson
      // For now, let's fetch aulas from portal to see if it has attendance mapped
      const response = await fetch(`/api/portal/aulas`);
      if (response.ok) {
        const data = await response.json();
        const currentLesson = data.find((l: any) => l.id === lessonId);
        if (currentLesson && currentLesson.attendances && currentLesson.attendances.length > 0) {
          setAttendance(currentLesson.attendances[0]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setLoading(false);
    }
  };

  const handleLocationAction = async (action: 'checkin' | 'checkout') => {
    setCheckingIn(true);
    setLocationError('');
    setCheckInResult(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada por este navegador.');
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const response = await fetch(`/api/portal/aulas/${lessonId}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude,
              longitude,
              action
            })
          });

          const data = await response.json();
          
          if (response.ok) {
            setCheckInResult(data);
            setAttendance(data.attendance);
          } else {
            setLocationError(data.error || `Erro ao realizar ${action === 'checkin' ? 'check-in' : 'check-out'}`);
          }
        } catch (error) {
          console.error(`Error during ${action}:`, error);
          setLocationError('Erro ao conectar com o servidor');
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        let errorMessage = 'Erro ao obter localização: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Permissão negada. Por favor, permita o acesso à localização nas configurações do navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Informação de localização indisponível.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Tempo esgotado ao tentar obter localização.';
            break;
          default:
            errorMessage += error.message;
        }
        setLocationError(errorMessage);
        setCheckingIn(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
          <span className="text-slate-600 dark:text-slate-400">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aula não encontrada</h1>
          <p className="text-slate-500">Verifique o código da aula e tente novamente.</p>
        </div>
      </div>
    );
  }

  const isCheckedIn = attendance?.checkInAt !== null;
  const isWithinRadius = checkInResult?.isWithinRadius || (attendance?.distance !== null && attendance?.distance !== undefined);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md mx-auto p-4 min-h-screen flex flex-col">
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

        {/* Lesson Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {lesson.discipline.name}
              </h2>
              <p className="text-sm text-slate-500">
                {lesson.discipline.courseClasses.map(cc => cc.name).join(', ')}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined text-slate-400">event</span>
              <span>{formatDate(lesson.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined text-slate-400">schedule</span>
              <span>{formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}</span>
            </div>
            {lesson.locationName && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-slate-400">location_on</span>
                <span>{lesson.locationName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Card */}
        {isCheckedIn ? (
          <div className={`rounded-2xl border p-6 mb-4 ${
            isWithinRadius 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`material-symbols-outlined text-3xl ${
                isWithinRadius ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {isWithinRadius ? 'check_circle' : 'warning'}
              </span>
              <div>
                <h3 className={`font-bold ${
                  isWithinRadius ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {isWithinRadius ? 'Check-in Realizado!' : 'Check-in Fora do Local'}
                </h3>
                <p className={`text-sm ${
                  isWithinRadius ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {isWithinRadius 
                    ? 'Você está presente na aula'
                    : 'Sua localização está fora do raio permitido'
                  }
                </p>
              </div>
            </div>
            
            {attendance?.checkInAt && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span>Check-in:</span>
                  <span className="font-medium">
                    {formatTime(attendance.checkInAt)}
                  </span>
                </div>
                {attendance.distance !== null && attendance.distance !== undefined && (
                  <div className="flex items-center justify-between mt-1">
                    <span>Distância Check-in:</span>
                    <span className="font-medium">{Math.round(attendance.distance)}m</span>
                  </div>
                )}
                {attendance.checkOutAt && (
                   <>
                       <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                         <span>Check-out:</span>
                         <span className="font-medium">
                           {formatTime(attendance.checkOutAt)}
                         </span>
                       </div>
                       {attendance.checkOutDistance !== null && attendance.checkOutDistance !== undefined && (
                         <div className="flex items-center justify-between mt-1">
                           <span>Distância Check-out:</span>
                           <span className="font-medium">{Math.round(attendance.checkOutDistance)}m</span>
                         </div>
                       )}
                   </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">qr_code_scanner</span>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                Realizar Check-in
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Clique no botão abaixo para registrar sua presença. 
                O sistema solicitará acesso à sua localização.
              </p>
              
              <button
                onClick={() => handleLocationAction('checkin')}
                disabled={checkingIn}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </div>
        )}

        {/* Check-out Card (if already checked in) */}
        {isCheckedIn && (
           <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4 mt-2">
             <div className="text-center">
               <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                 Realizar Check-out
               </h3>
               <p className="text-sm text-slate-500 mb-4">
                 Clique no botão abaixo para registrar sua saída da aula.
               </p>
               
               <button
                 onClick={() => handleLocationAction('checkout')}
                 disabled={checkingIn}
                 className="w-full bg-slate-800 text-white dark:bg-slate-700 py-3 rounded-xl font-bold text-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                 {checkingIn ? (
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
           </div>
        )}

        {/* Error Message */}
        {locationError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
              <p className="text-sm text-red-700 dark:text-red-300">{locationError}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-auto pt-4">
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Como funciona?
            </h4>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm">check</span>
                Permita o acesso à localização quando solicitado
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm">check</span>
                Esteja dentro do raio de {lesson.radiusMeters}m da aula
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm">check</span>
                Seu check-in será registrado automaticamente
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
