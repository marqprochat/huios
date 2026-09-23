'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateTeamMember } from '../../actions';
import { useToast } from '@/app/components/Toast/useToast';
import { MaskedInput } from '@/app/components/MaskedInput';
import { isValidCPF, isValidPhone } from '@/lib/masks';

interface RoleOption {
    id: string;
    name: string;
    protected: boolean;
}

interface CourseClassOption {
    id: string;
    name: string;
    course: {
        name: string;
    };
}

interface EditarMembroFormProps {
    member: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        cpf: string | null;
        birthDate: Date | null;
        maritalStatus: string | null;
        address: string | null;
        area: string | null;
        studentId: string | null;
        active: boolean;
        user: {
            id: string;
            active: boolean;
            adminRoleId: string | null;
        } | null;
        courseClassAssignments: {
            courseClassId: string;
        }[];
    };
    roles: RoleOption[];
    courseClasses: CourseClassOption[];
}

export default function EditarMembroForm({ member, roles, courseClasses }: EditarMembroFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    const initialClasses = member.courseClassAssignments.map(a => a.courseClassId);
    const [selectedClasses, setSelectedClasses] = useState<string[]>(initialClasses);

    const birthDateStr = member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '';

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);

        const cpf = String(formData.get('cpf') || '').trim();
        if (cpf && !isValidCPF(cpf)) {
            toast('error', 'CPF inválido', 'Informe um CPF válido com 11 dígitos.');
            return;
        }

        const phone = String(formData.get('phone') || '').trim();
        if (phone && !isValidPhone(phone)) {
            toast('error', 'Telefone inválido', 'Use o formato (99) 99999-9999.');
            return;
        }

        setIsPending(true);

        try {
            const result = await updateTeamMember(member.id, formData);

            if (!result.success) {
                toast('error', 'Erro ao salvar', result.error);
                return;
            }

            toast('success', 'Membro atualizado com sucesso!');
            router.push('/equipe');
            router.refresh();
        } catch (error) {
            console.error('Erro ao atualizar membro da equipe:', error);
            toast('error', 'Erro inesperado', error instanceof Error ? error.message : 'Não foi possível salvar as alterações.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {member.studentId && (
                <input type="hidden" name="studentId" value={member.studentId} />
            )}

            {/* DADOS PESSOAIS */}
            <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-lg">person</span>
                    Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Nome Completo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            defaultValue={member.name}
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                            placeholder="Ex: João da Silva"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            defaultValue={member.email}
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                            placeholder="joao@exemplo.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Telefone
                        </label>
                        <MaskedInput
                            mask="phone"
                            type="tel"
                            id="phone"
                            name="phone"
                            defaultValue={member.phone || ''}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                            placeholder="(11) 99999-9999"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="cpf" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            CPF <span className="text-red-500">*</span>
                        </label>
                        <MaskedInput
                            mask="cpf"
                            type="text"
                            id="cpf"
                            name="cpf"
                            defaultValue={member.cpf || ''}
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                            placeholder="000.000.000-00"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="birthDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Data de Nascimento
                        </label>
                        <input
                            type="date"
                            id="birthDate"
                            name="birthDate"
                            defaultValue={birthDateStr}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="maritalStatus" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Estado Civil
                        </label>
                        <select
                            id="maritalStatus"
                            name="maritalStatus"
                            defaultValue={member.maritalStatus || ''}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                        >
                            <option value="">Selecione...</option>
                            <option value="SOLTEIRO">Solteiro(a)</option>
                            <option value="CASADO">Casado(a)</option>
                            <option value="DIVORCIADO">Divorciado(a)</option>
                            <option value="VIUVO">Viúvo(a)</option>
                        </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label htmlFor="address" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Endereço Completo
                        </label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            defaultValue={member.address || ''}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                            placeholder="Rua Exemplo, 123 - Centro, São Paulo - SP"
                        />
                    </div>
                </div>
            </div>

            {/* DADOS DE EQUIPE */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-lg">badge</span>
                    Dados na Equipe
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="roleId" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Função de acesso <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="roleId"
                            name="roleId"
                            defaultValue={member.user?.adminRoleId || ''}
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                        >
                            <option value="">Selecione...</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name}{role.protected ? ' (protegida)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="area" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Área de Atuação
                        </label>
                        <input
                            type="text"
                            id="area"
                            name="area"
                            defaultValue={member.area || ''}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                            placeholder="Ex: Recepção, Logística, Áudio..."
                        />
                    </div>

                    <fieldset className="space-y-2 md:col-span-2">
                        <legend className="text-sm font-bold text-slate-700 dark:text-slate-300">Turmas atribuídas</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {courseClasses.map(courseClass => {
                                const isChecked = selectedClasses.includes(courseClass.id);
                                return (
                                    <label
                                        key={courseClass.id}
                                        className={`flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
                                            isChecked
                                                ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name="courseClassIds"
                                            value={courseClass.id}
                                            checked={isChecked}
                                            onChange={() => {
                                                setSelectedClasses(prev =>
                                                    prev.includes(courseClass.id)
                                                        ? prev.filter(id => id !== courseClass.id)
                                                        : [...prev, courseClass.id]
                                                );
                                            }}
                                            className="rounded text-primary focus:ring-primary/50"
                                        />
                                        <span>
                                            <strong className="font-semibold">{courseClass.course.name}</strong> — {courseClass.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="space-y-2">
                        <label htmlFor="active" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Status da conta
                        </label>
                        <select
                            id="active"
                            name="active"
                            defaultValue={member.active && member.user?.active !== false ? 'true' : 'false'}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                        >
                            <option value="true">Ativa</option>
                            <option value="false">Desativada</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* BOTÕES */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Link
                    href="/equipe"
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    Cancelar
                </Link>
                <button
                    type="submit"
                    disabled={isPending}
                    className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        {isPending ? 'sync' : 'save'}
                    </span>
                    {isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
}
