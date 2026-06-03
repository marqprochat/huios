"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusModal } from "./StatusModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useRouter } from "next/navigation";
import { createStudentLogin } from "../actions";
import { useToast } from "../../components/Toast/useToast";

interface StudentDetailClientProps {
  student: any;
}

export default function StudentDetailClient({ student }: StudentDetailClientProps) {
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [creatingLogin, setCreatingLogin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateLogin = async () => {
    setCreatingLogin(true);
    const result = await createStudentLogin(student.id);
    if (result.success) {
      toast("success", result.message);
      router.refresh();
    } else {
      toast("error", result.message);
    }
    setCreatingLogin(false);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/alunos" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {student.name}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Gerenciamento completo do aluno
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {student.userId ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">lock_reset</span>
              Trocar Senha
            </button>
          ) : (
            <button
              onClick={handleCreateLogin}
              disabled={creatingLogin}
              className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              {creatingLogin ? "Criando..." : "Criar Login"}
            </button>
          )}
          <Link
            href={`/alunos/${student.id}/editar`}
            className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Editar Cadastro
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Dados de Contato</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">mail</span>
                <span className="text-slate-600 dark:text-slate-300">{student.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">phone</span>
                <span className="text-slate-600 dark:text-slate-300">{student.phone || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-primary text-lg">badge</span>
                <span className="text-slate-600 dark:text-slate-300">{student.cpf || "Não informado"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Acesso ao Portal</h3>
            <div className="flex items-center gap-2">
              {student.userId ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Login ativo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Sem login
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Login: <span className="font-medium text-slate-700 dark:text-slate-300">{student.email}</span>
            </p>
            {!student.userId && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Clique em "Criar Login" para habilitar o acesso.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Resumo Acadêmico</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <div className="text-2xl font-black text-primary">{student.attendances.length}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Presenças</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                <div className="text-2xl font-black text-primary">{student.grades.length}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Notas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Matrículas */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">school</span>
              Matrículas e Status
            </h3>
            <div className="grid gap-4">
              {student.enrollments.map((enr: any) => (
                <div key={enr.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                        {enr.class.course.name}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white">{enr.class.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        Desde {new Date(enr.createdAt).toLocaleDateString()}
                      </span>
                      {enr.statusDate && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <span className="material-symbols-outlined text-[14px]">update</span>
                          Última atualização: {new Date(enr.statusDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {enr.statusReason && (
                      <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        "{enr.statusReason}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                      enr.status === 'CURSANDO' ? 'bg-green-100 text-green-700' :
                      enr.status === 'TRANCADO' ? 'bg-amber-100 text-amber-700' :
                      enr.status === 'APROVADO' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {enr.status}
                    </div>
                    <button
                      onClick={() => setSelectedEnrollment(enr)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      title="Alterar Status"
                    >
                      <span className="material-symbols-outlined">settings</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas e Presenças (Amostra) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Últimas Notas
                </h3>
                {student.grades.length > 0 ? (
                  <div className="space-y-3">
                    {student.grades.slice(0, 5).map((grade: any) => (
                      <div key={grade.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{grade.discipline.name}</span>
                        <span className="font-bold text-primary">{grade.score.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Nenhuma nota lançada.</p>
                )}
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">event_available</span>
                  Frequência
                </h3>
                <div className="flex items-end gap-2">
                   <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {student.attendances.length > 0 
                        ? Math.round((student.attendances.filter((a: any) => a.status === 'PRESENT').length / student.attendances.length) * 100)
                        : 0}%
                   </span>
                   <span className="text-xs text-slate-500 pb-1">Presença média</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${student.attendances.length > 0 ? (student.attendances.filter((a: any) => a.status === 'PRESENT').length / student.attendances.length) * 100 : 0}%` }}
                  ></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          studentId={student.id}
          studentName={student.name}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {selectedEnrollment && (
        <StatusModal
          studentId={student.id}
          enrollmentId={selectedEnrollment.id}
          currentStatus={selectedEnrollment.status}
          currentDate={selectedEnrollment.statusDate}
          currentReason={selectedEnrollment.statusReason}
          onClose={() => setSelectedEnrollment(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
