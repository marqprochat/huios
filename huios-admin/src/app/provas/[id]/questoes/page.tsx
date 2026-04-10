'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/app/components/Toast/useToast';

interface Alternative {
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  statement: string;
  weight: number;
  order: number;
  alternatives: Alternative[];
}

export default function QuestoesPage() {
  const params = useParams();
  const examId = params.id as string;
  const { toast } = useToast();
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [statement, setStatement] = useState('');
  const [weight, setWeight] = useState('1');
  const [alternatives, setAlternatives] = useState<Alternative[]>([
    { letter: 'A', text: '', isCorrect: false },
    { letter: 'B', text: '', isCorrect: false },
    { letter: 'C', text: '', isCorrect: false },
    { letter: 'D', text: '', isCorrect: false },
    { letter: 'E', text: '', isCorrect: false }
  ]);

  useEffect(() => {
    fetchExam();
    fetchQuestions();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/exams/${examId}`);
      if (response.ok) {
        const data = await response.json();
        setExam(data);
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/exams/${examId}/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
    }
  };

  const handleAddAlternative = () => {
    const nextLetter = String.fromCharCode(65 + alternatives.length); // A=65, B=66, etc.
    setAlternatives([...alternatives, { letter: nextLetter, text: '', isCorrect: false }]);
  };

  const handleRemoveAlternative = (index: number) => {
    if (alternatives.length <= 2) return;
    const newAlternatives = alternatives.filter((_, i) => i !== index);
    // Reorder letters
    setAlternatives(newAlternatives.map((alt, i) => ({
      ...alt,
      letter: String.fromCharCode(65 + i)
    })));
  };

  const handleAlternativeChange = (index: number, field: keyof Alternative, value: any) => {
    const newAlternatives = [...alternatives];
    if (field === 'isCorrect') {
      // Only one correct answer
      newAlternatives.forEach((alt, i) => {
        alt.isCorrect = i === index ? value : false;
      });
    } else {
      newAlternatives[index][field] = value;
    }
    setAlternatives(newAlternatives);
  };

  const resetForm = () => {
    setStatement('');
    setWeight('1');
    setAlternatives([
      { letter: 'A', text: '', isCorrect: false },
      { letter: 'B', text: '', isCorrect: false },
      { letter: 'C', text: '', isCorrect: false },
      { letter: 'D', text: '', isCorrect: false },
      { letter: 'E', text: '', isCorrect: false }
    ]);
    setEditingQuestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const correctCount = alternatives.filter(a => a.isCorrect).length;
    if (correctCount === 0) {
      toast('warning', 'Alternativa obrigatória', 'Selecione pelo menos uma alternativa correta.');
      return;
    }

    const payload = {
      statement,
      weight: parseFloat(weight),
      alternatives: alternatives.filter(a => a.text.trim() !== '')
    };

    try {
      const url = editingQuestion 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/exams/${examId}/questions/${editingQuestion.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/exams/${examId}/questions`;
      
      const response = await fetch(url, {
        method: editingQuestion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        resetForm();
        setShowForm(false);
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error saving question:', error);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setStatement(question.statement);
    setWeight(question.weight.toString());
    setAlternatives(question.alternatives.length >= 2 ? question.alternatives : [
      { letter: 'A', text: '', isCorrect: false },
      { letter: 'B', text: '', isCorrect: false },
      { letter: 'C', text: '', isCorrect: false },
      { letter: 'D', text: '', isCorrect: false },
      { letter: 'E', text: '', isCorrect: false }
    ]);
    setShowForm(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/exams/${examId}/questions/${questionId}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const calculateTotalWeight = () => {
    return questions.reduce((sum, q) => sum + q.weight, 0);
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
        <Link href="/provas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Construção de Prova</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {exam?.title} • {questions.length} questões • Peso total: {calculateTotalWeight().toFixed(1)}
          </p>
        </div>
        <Link
          href={`/provas/${examId}/editar`}
          className="text-slate-400 hover:text-primary transition-colors"
          title="Voltar para edição da prova"
        >
          <span className="material-symbols-outlined text-2xl">settings</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Adicionar Nova Questão
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Enunciado da Questão *
              </label>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="Digite o enunciado da questão..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Peso da Questão
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                min="0.1"
                step="0.1"
                className="w-32 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Alternativas *
                </label>
                <button
                  type="button"
                  onClick={handleAddAlternative}
                  className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Adicionar Alternativa
                </button>
              </div>

              {alternatives.map((alt, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={alt.isCorrect}
                      onChange={() => handleAlternativeChange(index, 'isCorrect', true)}
                      className="w-5 h-5 text-primary focus:ring-primary"
                      required
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300 w-6">{alt.letter})</span>
                  </div>
                  <input
                    type="text"
                    value={alt.text}
                    onChange={(e) => handleAlternativeChange(index, 'text', e.target.value)}
                    placeholder={`Alternativa ${alt.letter}`}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  {alternatives.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAlternative(index)}
                      className="text-red-400 hover:text-red-500 pt-2"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                {editingQuestion ? 'Salvar Alterações' : 'Adicionar Questão'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-400">Q{index + 1}</span>
                <span className="px-2 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary">
                  Peso: {question.weight}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(question)}
                  className="text-slate-400 hover:text-primary transition-colors"
                  title="Editar Questão"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(question.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Excluir Questão"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
            <p className="text-slate-900 dark:text-white mb-4 whitespace-pre-wrap">{question.statement}</p>
            <div className="space-y-2">
              {question.alternatives.map((alt) => (
                <div
                  key={alt.letter}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    alt.isCorrect
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <span
                    className={`font-bold w-6 ${
                      alt.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
                    }`}
                  >
                    {alt.letter})
                  </span>
                  <span className={alt.isCorrect ? 'text-green-800 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}>
                    {alt.text}
                  </span>
                  {alt.isCorrect && (
                    <span className="ml-auto text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Correta
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {questions.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-2">quiz</span>
          <p>Nenhuma questão cadastrada</p>
          <p className="text-sm">Clique no botão acima para adicionar a primeira questão</p>
        </div>
      )}
    </div>
  );
}
