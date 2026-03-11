import { updateAluno, fetchClasses } from '../../actions';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface EditarAlunoProps {
    params: {
        id: string;
    };
}

export default async function EditarAlunoPage({ params }: EditarAlunoProps) {
    const { id } = await params;
    
    // Fetch student with enrollments
    const aluno = await prisma.student.findUnique({
        where: { id },
        include: {
            enrollments: true
        }
    });

    if (!aluno) {
        notFound();
    }

    const classes = await fetchClasses();
    const enrolledClassIds = aluno.enrollments.map(e => e.classId);

    // Format dates for inputs
    const birthDateStr = aluno.birthDate ? aluno.birthDate.toISOString().split('T')[0] : '';

    return (
        <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/alunos" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Aluno</h2>
                    <p className="text-slate-500 dark:text-slate-400">Atualize os dados curriculares e pessoais do aluno.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <form action={updateAluno.bind(null, id)} className="space-y-8">

                    {/* ───── DADOS PESSOAIS ───── */}
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">person</span>
                            Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo <span className="text-red-500">*</span></label>
                                <input type="text" id="name" name="name" defaultValue={aluno.name} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: João da Silva" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">Email <span className="text-red-500">*</span></label>
                                <input type="email" id="email" name="email" defaultValue={aluno.email} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="joao@exemplo.com" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-bold text-slate-700 dark:text-slate-300">Telefone</label>
                                <input type="tel" id="phone" name="phone" defaultValue={aluno.phone || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="(11) 99999-9999" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="cpf" className="text-sm font-bold text-slate-700 dark:text-slate-300">CPF</label>
                                <input type="text" id="cpf" name="cpf" defaultValue={aluno.cpf || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="000.000.000-00" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="birthDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">Data de Nascimento</label>
                                <input type="date" id="birthDate" name="birthDate" defaultValue={birthDateStr} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="maritalStatus" className="text-sm font-bold text-slate-700 dark:text-slate-300">Estado Civil</label>
                                <select id="maritalStatus" name="maritalStatus" defaultValue={aluno.maritalStatus || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                                    <option value="">Selecione...</option>
                                    <option value="SOLTEIRO">Solteiro(a)</option>
                                    <option value="CASADO">Casado(a)</option>
                                    <option value="DIVORCIADO">Divorciado(a)</option>
                                    <option value="VIUVO">Viúvo(a)</option>
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="address" className="text-sm font-bold text-slate-700 dark:text-slate-300">Endereço Completo</label>
                                <input type="text" id="address" name="address" defaultValue={aluno.address || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Rua Exemplo, 123 - Centro, São Paulo - SP" />
                            </div>
                        </div>
                    </div>

                    {/* ───── VIDA CRISTÃ ───── */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">church</span>
                            Vida Cristã
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="conversionTime" className="text-sm font-bold text-slate-700 dark:text-slate-300">É convertido(a) há quanto tempo?</label>
                                <input type="text" id="conversionTime" name="conversionTime" defaultValue={aluno.conversionTime || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: 5 anos" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="churchName" className="text-sm font-bold text-slate-700 dark:text-slate-300">Qual igreja você frequenta?</label>
                                <input type="text" id="churchName" name="churchName" defaultValue={aluno.churchName || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Igreja Conviva" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="churchMembershipTime" className="text-sm font-bold text-slate-700 dark:text-slate-300">Há quanto tempo é membro da igreja?</label>
                                <input type="text" id="churchMembershipTime" name="churchMembershipTime" defaultValue={aluno.churchMembershipTime || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: 3 anos" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Você é batizado(a)?</label>
                                <div className="flex items-center gap-6 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="isBaptized" value="true" defaultChecked={aluno.isBaptized} className="w-4 h-4 text-primary border-slate-300 focus:ring-primary" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Sim</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="isBaptized" value="false" defaultChecked={!aluno.isBaptized} className="w-4 h-4 text-primary border-slate-300 focus:ring-primary" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Não</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="baptismTime" className="text-sm font-bold text-slate-700 dark:text-slate-300">Há quanto tempo é batizado(a)?</label>
                                <input type="text" id="baptismTime" name="baptismTime" defaultValue={aluno.baptismTime || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: 2 anos" />
                            </div>
                        </div>
                    </div>

                    {/* ───── MATRÍCULA ───── */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">school</span>
                            Informações de Matrícula
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="howKnewHuios" className="text-sm font-bold text-slate-700 dark:text-slate-300">Como conheceu o Huios Avançado?</label>
                                <select id="howKnewHuios" name="howKnewHuios" defaultValue={aluno.howKnewHuios || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                                    <option value="">Selecione...</option>
                                    <option value="INDICACAO">Indicação de amigo/familiar</option>
                                    <option value="REDES_SOCIAIS">Redes Sociais</option>
                                    <option value="IGREJA">Através da igreja</option>
                                    <option value="SITE">Site / Internet</option>
                                    <option value="EVENTO">Evento</option>
                                    <option value="OUTRO">Outro</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="enrollmentFee" className="text-sm font-bold text-slate-700 dark:text-slate-300">Taxa de Matrícula (R$)</label>
                                <input type="number" id="enrollmentFee" name="enrollmentFee" step="0.01" min="0" defaultValue={aluno.enrollmentFee || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="0,00" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Fez algum curso na Igreja Conviva?</label>
                                <div className="flex items-center gap-6 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="didConvivaCourse" value="true" defaultChecked={aluno.didConvivaCourse} className="w-4 h-4 text-primary border-slate-300 focus:ring-primary" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Sim</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="didConvivaCourse" value="false" defaultChecked={!aluno.didConvivaCourse} className="w-4 h-4 text-primary border-slate-300 focus:ring-primary" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Não</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="convivaCourseDetails" className="text-sm font-bold text-slate-700 dark:text-slate-300">Quais cursos? (se aplicável)</label>
                                <input type="text" id="convivaCourseDetails" name="convivaCourseDetails" defaultValue={aluno.convivaCourseDetails || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Curso de Liderança, EBD..." />
                            </div>
                        </div>
                    </div>

                    {/* ───── SELEÇÃO DE TURMAS ───── */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">class</span>
                            Seleção de Turmas (Cursos)
                        </h3>

                        {classes.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-center">
                                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">info</span>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma turma cadastrada. Cadastre turmas antes de matricular alunos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {classes.map(cls => (
                                    <label key={cls.id} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                                        <input type="checkbox" name="classIds" value={cls.id} defaultChecked={enrolledClassIds.includes(cls.id)} className="mt-0.5 w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{cls.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {cls.module.name} • Prof. {cls.teacher.name}
                                            </p>
                                            {cls.location && (
                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                    {cls.location}
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ───── BOTÕES ───── */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <Link href="/alunos" className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancelar
                        </Link>
                        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
