'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/app/components/Toast/useToast';
import { getReportCardData, createManualGrade } from './actions';

interface Grade {
  id: string;
  score: number;
  weight: number;
  title: string | null;
  description: string | null;
  type: 'EXAM' | 'MANUAL' | 'ACTIVITY' | 'PARTICIPATION';
  createdAt: string;
  exam: { title: string } | null;
}

interface DisciplineData {
  discipline: {
    id: string;
    name: string;
    workload: number | null;
    teacher: { name: string } | null;
  };
  grades: Grade[];
  average: number;
  status: string;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
}

export default function BoletimAlunoPage() {
  const params = useParams();
  const alunoId = params.alunoId as string;
  const { toast } = useToast();
  
  const [student, setStudent] = useState<StudentData | null>(null);
  const [disciplines, setDisciplines] = useState<DisciplineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  
  // Form state
  const [newGrade, setNewGrade] = useState({
    score: '',
    weight: '1',
    title: '',
    description: '',
    type: 'MANUAL'
  });

  useEffect(() => {
    fetchReportCard();
  }, [alunoId]);

  const fetchReportCard = async () => {
    try {
      // Use Server Action instead of fetch to avoid CORS and API proxy issues
      const data = await getReportCardData(alunoId);
      setStudent(data.student);
      setDisciplines(data.disciplines);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report card:', error);
      toast('error', 'Erro ao carregar', 'Não foi possível carregar o boletim.');
      setLoading(false);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDiscipline || !newGrade.score) {
      toast('warning', 'Campos obrigatórios', 'Selecione a disciplina e informe a nota.');
      return;
    }

    try {
      await createManualGrade({
        studentId: alunoId,
        disciplineId: selectedDiscipline,
        score: parseFloat(newGrade.score),
        weight: parseFloat(newGrade.weight),
        title: newGrade.title,
        description: newGrade.description,
        type: newGrade.type
      });

      setNewGrade({ score: '', weight: '1', title: '', description: '', type: 'MANUAL' });
      setShowAddGrade(false);
      setSelectedDiscipline('');
      fetchReportCard();
      toast('success', 'Nota salva', 'A nota foi lançada com sucesso.');
    } catch (error) {
      console.error('Error adding grade:', error);
      toast('error', 'Erro ao salvar', 'Não foi possível salvar a nota.');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      EXAM: 'Prova',
      MANUAL: 'Manual',
      ACTIVITY: 'Atividade',
      PARTICIPATION: 'Participação'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'Recuperação':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  const overallAverage = disciplines.length > 0
    ? disciplines.reduce((sum, d) => sum + d.average, 0) / disciplines.length
    : 0;

  const stats = {
    total: disciplines.length,
    approved: disciplines.filter(d => d.average >= 6).length,
    recovery: disciplines.filter(d => d.average >= 4 && d.average < 6).length,
    failed: disciplines.filter(d => d.average < 4).length
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
        <Link href="/boletins" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Boletim do Aluno
          </h2>
        </div>
        <button
          onClick={() => setShowAddGrade(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Lançar Nota
        </button>
      </div>

      {student && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">person</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{student.name}</h3>
              <p className="text-slate-500">{student.email}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-3xl font-black text-primary">{overallAverage.toFixed(1)}</div>
          <div className="text-sm text-slate-500">Média Geral</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-3xl font-black text-green-600">{stats.approved}</div>
          <div className="text-sm text-slate-500">Aprovados</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-3xl font-black text-yellow-600">{stats.recovery}</div>
          <div className="text-sm text-slate-500">Recuperação</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-3xl font-black text-red-600">{stats.failed}</div>
          <div className="text-sm text-slate-500">Reprovados</div>
        </div>
      </div>

      {showAddGrade && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Lançar Nota Manual</h3>
          <form onSubmit={handleAddGrade} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Disciplina *
                </label>
                <select
                  value={selectedDiscipline}
                  onChange={(e) => setSelectedDiscipline(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  {disciplines.map((d) => (
                    <option key={d.discipline.id} value={d.discipline.id}>
                      {d.discipline.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Tipo *
                </label>
                <select
                  value={newGrade.type}
                  onChange={(e) => setNewGrade({ ...newGrade, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="MANUAL">Manual</option>
                  <option value="ACTIVITY">Atividade</option>
                  <option value="PARTICIPATION">Participação</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Nota (0-10) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={newGrade.score}
                  onChange={(e) => setNewGrade({ ...newGrade, score: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Peso
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={newGrade.weight}
                  onChange={(e) => setNewGrade({ ...newGrade, weight: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={newGrade.title}
                  onChange={(e) => setNewGrade({ ...newGrade, title: e.target.value })}
                  placeholder="Ex: Trabalho 1"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Descrição
              </label>
              <textarea
                value={newGrade.description}
                onChange={(e) => setNewGrade({ ...newGrade, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowAddGrade(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Salvar Nota
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {disciplines.map((disciplineData) => (
          <div
            key={disciplineData.discipline.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {disciplineData.discipline.name}
                </h3>
                <p className="text-sm text-slate-500">
                  Professor: {disciplineData.discipline.teacher?.name || 'N/A'} • 
                  {disciplineData.discipline.workload ? ` ${disciplineData.discipline.workload}h` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black text-primary">
                    {disciplineData.average.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500">Média</div>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(disciplineData.status)}`}>
                  {disciplineData.status}
                </span>
              </div>
            </div>

            {disciplineData.grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Data</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Avaliação</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Peso</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {disciplineData.grades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {new Date(grade.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {getTypeLabel(grade.type)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {grade.title || grade.exam?.title || 'Prova Online'}
                          {grade.description && (
                            <div className="text-xs text-slate-400">{grade.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500">{grade.weight}</td>
                        <td className="px-6 py-3">
                          <span className={`font-bold ${
                            grade.score >= 6 ? 'text-green-600' : 
                            grade.score >= 4 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {grade.score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">
                <p>Nenhuma nota registrada para esta disciplina</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {disciplines.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-2">school</span>
          <p>Nenhuma disciplina encontrada para este aluno</p>
        </div>
      )}
    </div>
  );
}
