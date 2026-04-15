import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { updateLesson, deleteLesson } from '../../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarAulaPage({ params }: Props) {
  const { id } = await params;

  const [lesson, disciplinas] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id },
      include: {
        disciplines: {
          include: {
            courseClasses: true
          }
        },
        _count: {
          select: { attendances: true }
        }
      }
    }),
    prisma.discipline.findMany({
      include: {
        courseClasses: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    })
  ]);

  if (!lesson) {
    notFound();
  }

  // Format date for input
  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  // Format time for input (HH:MM)
  const formatTimeForInput = (date: Date | null) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[1].slice(0, 5);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/aulas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Aula</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {lesson.disciplines.map(d => d.name).join(', ')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <form action={updateLesson.bind(null, id)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                Disciplinas / Turmas *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                {disciplinas.map((d) => (
                  <label key={d.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        name="disciplineIds"
                        value={d.id}
                        defaultChecked={lesson.disciplines.some(ld => ld.id === d.id)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none text-base font-bold">
                        check
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                        {d.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {d.courseClasses.map(cc => cc.name).join(', ')}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  defaultValue={formatDateForInput(lesson.date)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="startTime" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Horário Início
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  defaultValue={formatTimeForInput(lesson.startTime)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Horário Término
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  defaultValue={formatTimeForInput(lesson.endTime)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Localização para Check-in</h3>

        <div className="space-y-4 opacity-50 pointer-events-none">
          <p className="text-sm text-slate-500 mb-4">
            Configuração de localização movida para a página de Configurações &gt; Localização.
          </p>
          {/*
          <div>
            <label htmlFor="locationName" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Nome do Local
            </label>
            <input
              type="text"
              id="locationName"
              name="locationName"
              defaultValue={lesson.locationName || ''}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Ex: Auditório Principal"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Latitude
              </label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                step="any"
                defaultValue={lesson.latitude || ''}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="-23.550520"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Longitude
              </label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                step="any"
                defaultValue={lesson.longitude || ''}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="-46.633308"
              />
            </div>
          </div>

          <div>
            <label htmlFor="radiusMeters" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Raio de Tolerância (metros) *
            </label>
            <input
              type="number"
              id="radiusMeters"
              name="radiusMeters"
              min="10"
              max="1000"
              defaultValue={lesson.radiusMeters || 100}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">
              Distância máxima permitida para o check-in (padrão: 100m)
            </p>
          </div>

          <button
            type="button"
            id="getLocationBtn"
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">my_location</span>
            Usar minha localização atual
          </button>
          */}
        </div>
      </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Observações
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={lesson.description || ''}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="Observações opcionais sobre a aula"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {lesson._count.attendances} alunos registrados
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/aulas"
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <form action={async () => {
            'use server';
            await deleteLesson(id);
          }}>
            <button
              type="submit"
              className="text-red-500 hover:text-red-600 text-sm font-bold px-4 py-2 transition-colors"
            >
              Excluir Aula
            </button>
          </form>
        </div>
      </div>

      {/* Script comentado - localização movida para Configurações
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('getLocationBtn').addEventListener('click', function() {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              function(position) {
                document.getElementById('latitude').value = position.coords.latitude;
                document.getElementById('longitude').value = position.coords.longitude;
              },
              function(error) {
                alert('Erro ao obter localização: ' + error.message);
              }
            );
          } else {
            alert('Geolocalização não é suportada por este navegador.');
          }
        });
      `}} />
      */}
    </div>
  );
}
