'use client';

import { useState } from 'react';
import { useStudent } from '../components/PortalShell';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const { data } = useStudent();
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!data) return null;

  const student = data.student;
  const enrollment = student.enrollments?.[0];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/portal/senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const result = await res.json();

      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordForm(false), 2000);
      } else {
        setPasswordError(result.error || 'Erro ao alterar senha');
      }
    } catch {
      setPasswordError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/portal/login');
    router.refresh();
  };

  return (
    <div className="max-w-[800px] mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Perfil</h2>
        <p className="text-slate-500 text-sm">Suas informações pessoais e configurações</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#135bec] to-[#0d47a1] p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <span className="text-white font-bold text-2xl">{student.name.charAt(0)}</span>
          </div>
          <h3 className="text-white font-bold text-lg">{student.name}</h3>
          <p className="text-white/70 text-sm">{student.email}</p>
        </div>

        <div className="p-6 space-y-4">
          <InfoRow label="Nome Completo" value={student.name} icon="person" />
          <InfoRow label="E-mail" value={student.email} icon="mail" />
          <InfoRow label="CPF" value={student.cpf || 'Não informado'} icon="badge" />
          {enrollment && (
            <>
              <InfoRow label="Curso" value={enrollment.class.course.name} icon="school" />
              <InfoRow label="Turma" value={enrollment.class.name} icon="group" />
              <InfoRow label="Status" value={enrollment.status === 'ACTIVE' ? 'Ativo' : enrollment.status} icon="verified" />
            </>
          )}
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#135bec]">lock</span>
            <h3 className="font-semibold text-slate-900">Alterar Senha</h3>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-[#135bec] text-sm font-semibold hover:underline"
          >
            {showPasswordForm ? 'Cancelar' : 'Alterar'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <span className="material-symbols-outlined text-sm">error</span>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Senha alterada com sucesso!
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha Atual (CPF)</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#135bec]/30 focus:border-[#135bec]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#135bec]/30 focus:border-[#135bec]"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#135bec]/30 focus:border-[#135bec]"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#135bec] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d47a1] transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-2xl font-semibold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">logout</span>
        Sair do Portal
      </button>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="material-symbols-outlined text-slate-400">{icon}</span>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
