'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CourseClassOption {
  id: string;
  name: string;
  courseName: string;
}

interface NovoEventoFormProps {
  courseClasses: CourseClassOption[];
  today: string;
  action: (formData: FormData) => void | Promise<void>;
}

export default function NovoEventoForm({ courseClasses, today, action }: NovoEventoFormProps) {
  const [requiresCheckIn, setRequiresCheckIn] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Título *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            placeholder="Ex: Formatura 2026"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Tipo
          </label>
          <input
            type="text"
            id="type"
            name="type"
            placeholder="Ex: Formatura, Conferência, Retiro"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
            Turmas (opcional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            {courseClasses.map((cc) => (
              <label key={cc.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    name="courseClassIds"
                    value={cc.id}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
                  />
                  <span className="material-symbols-outlined absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none text-base font-bold">
                    check
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                    {cc.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{cc.courseName}</span>
                </div>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Nenhuma turma selecionada = evento geral, visível a todos os alunos.</p>
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
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="requiresCheckIn"
              checked={requiresCheckIn}
              onChange={(e) => setRequiresCheckIn(e.target.checked)}
              className="h-5 w-5 cursor-pointer rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
            />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Requer check-in de presença?</span>
          </label>

          {requiresCheckIn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="locationName" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Nome do local
                </label>
                <input
                  type="text"
                  id="locationName"
                  name="locationName"
                  placeholder="Ex: Auditório Principal"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="radiusMeters" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Raio de tolerância (m)
                </label>
                <input
                  type="number"
                  id="radiusMeters"
                  name="radiusMeters"
                  defaultValue={100}
                  min={10}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="latitude" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Latitude
                </label>
                <input
                  type="text"
                  id="latitude"
                  name="latitude"
                  placeholder="Ex: -23.55052"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Longitude
                </label>
                <input
                  type="text"
                  id="longitude"
                  name="longitude"
                  placeholder="Ex: -46.633308"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}
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
            placeholder="Observações opcionais sobre o evento"
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
          Criar Evento
        </button>
      </div>
    </form>
  );
}
