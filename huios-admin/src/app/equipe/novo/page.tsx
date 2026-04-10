'use client';

import { createTeamMember, fetchStudentsForTeam } from '../actions';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/Toast/useToast';

export default function NovoMembroPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [isPending, setIsPending] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        birthDate: '',
        maritalStatus: '',
        area: '',
        role: 'MONITOR',
        address: ''
    });

    useEffect(() => {
        async function loadStudents() {
            const data = await fetchStudentsForTeam();
            setStudents(data);
        }
        loadStudents();
    }, []);

    const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const studentId = e.target.value;
        setSelectedStudent(studentId);

        if (studentId) {
            const student = students.find(s => s.id === studentId);
            if (student) {
                setFormData({
                    name: student.name,
                    email: student.email,
                    phone: student.phone || '',
                    cpf: student.cpf || '',
                    birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
                    maritalStatus: student.maritalStatus || '',
                    area: '',
                    role: 'MONITOR',
                    address: student.address || ''
                });
            }
        } else {
            // Limpa o formulário se desmarcar
            setFormData({
                name: '',
                email: '',
                phone: '',
                cpf: '',
                birthDate: '',
                maritalStatus: '',
                area: '',
                role: 'MONITOR',
                address: ''
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);

        const data = new FormData(e.currentTarget);
        if (selectedStudent) {
            data.append('studentId', selectedStudent);
        }

        try {
            await createTeamMember(data);
            toast('success', 'Membro salvo com sucesso!');
            router.push('/equipe');
        } catch (error) {
            console.error('Erro ao salvar membro da equipe:', error);
            toast('error', 'Erro ao salvar', 'Ocorreu um erro ao salvar o membro da equipe.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/equipe" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo Membro</h2>
                    <p className="text-slate-500 dark:text-slate-400">Preencha os dados do membro da equipe.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">

                {/* Vínculo com Aluno */}
                <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-primary">link</span>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Este membro já é um aluno?</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Selecione um aluno abaixo para preencher os dados automaticamente.</p>
                    <select
                        value={selectedStudent}
                        onChange={handleStudentChange}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                    >
                        <option value="">Não (Cadastrar novo)</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.name} ({student.email})
                            </option>
                        ))}
                    </select>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* DADOS PESSOAIS */}
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">person</span>
                            Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo <span className="text-red-500">*</span></label>
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: João da Silva" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">Email <span className="text-red-500">*</span></label>
                                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="joao@exemplo.com" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-bold text-slate-700 dark:text-slate-300">Telefone</label>
                                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="(11) 99999-9999" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="cpf" className="text-sm font-bold text-slate-700 dark:text-slate-300">CPF</label>
                                <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="000.000.000-00" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="birthDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">Data de Nascimento</label>
                                <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="maritalStatus" className="text-sm font-bold text-slate-700 dark:text-slate-300">Estado Civil</label>
                                <select id="maritalStatus" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                                    <option value="">Selecione...</option>
                                    <option value="SOLTEIRO">Solteiro(a)</option>
                                    <option value="CASADO">Casado(a)</option>
                                    <option value="DIVORCIADO">Divorciado(a)</option>
                                    <option value="VIUVO">Viúvo(a)</option>
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="address" className="text-sm font-bold text-slate-700 dark:text-slate-300">Endereço Completo</label>
                                <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Rua Exemplo, 123 - Centro, São Paulo - SP" />
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
                                <label htmlFor="role" className="text-sm font-bold text-slate-700 dark:text-slate-300">Função <span className="text-red-500">*</span></label>
                                <select id="role" name="role" value={formData.role} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                                    <option value="MONITOR">Monitor</option>
                                    <option value="LIDER_DE_TURMA">Líder de Turma</option>
                                    <option value="VOLUNTARIO">Voluntário</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="area" className="text-sm font-bold text-slate-700 dark:text-slate-300">Área de Atuação</label>
                                <input type="text" id="area" name="area" value={formData.area} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Recepção, Logística, Áudio..." />
                            </div>
                        </div>
                    </div>

                    {/* BOTÕES */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <Link href="/equipe" className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancelar
                        </Link>
                        <button type="submit" disabled={isPending} className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">
                                {isPending ? 'sync' : 'save'}
                            </span>
                            {isPending ? 'Salvando...' : 'Salvar Membro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
