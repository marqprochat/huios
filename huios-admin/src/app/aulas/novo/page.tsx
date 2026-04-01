import Link from 'next/link';
import prisma from '@/lib/prisma';
import { createLesson } from '../actions';

export default async function NovaAulaPage() {
  const disciplinas = await prisma.discipline.findMany({
    include: {
      courseClass: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/aulas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Nova Aula</h2>
          <p className="text-slate-500 dark:text-slate-400">Registre um novo encontro da disciplina</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <form action={createLesson} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="disciplineId" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Disciplina *
              </label>
              <select
                id="disciplineId"
                name="disciplineId"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Selecione uma disciplina</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} - {d.courseClass.name}
                  </option>
                ))}
              </select>
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
                  defaultValue={today}
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
              defaultValue="100"
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
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="Observações opcionais sobre a aula"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
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
              Criar Aula
            </button>
          </div>
        </form>
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
