import { updateMonitor } from '../../actions';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

interface EditarMonitorProps {
    params: {
        id: string;
    };
}

export default async function EditarMonitorPage({ params }: EditarMonitorProps) {
    const { id } = await params;
    
    // Fetch monitor
    const monitor = await prisma.monitor.findUnique({
        where: { id }
    });

    if (!monitor) {
        notFound();
    }

    const birthDateStr = monitor.birthDate ? monitor.birthDate.toISOString().split('T')[0] : '';

    return (
        <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/monitores" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Monitor</h2>
                    <p className="text-slate-500 dark:text-slate-400">Atualize os dados do monitor.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <form action={updateMonitor.bind(null, id)} className="space-y-8">
                    
                    {monitor.studentId && (
                        <input type="hidden" name="studentId" value={monitor.studentId} />
                    )}

                    {/* DADOS PESSOAIS */}
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">person</span>
                            Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo <span className="text-red-500">*</span></label>
                                <input type="text" id="name" name="name" defaultValue={monitor.name} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: João da Silva" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">Email <span className="text-red-500">*</span></label>
                                <input type="email" id="email" name="email" defaultValue={monitor.email} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="joao@exemplo.com" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-bold text-slate-700 dark:text-slate-300">Telefone</label>
                                <input type="tel" id="phone" name="phone" defaultValue={monitor.phone || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="(11) 99999-9999" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="cpf" className="text-sm font-bold text-slate-700 dark:text-slate-300">CPF</label>
                                <input type="text" id="cpf" name="cpf" defaultValue={monitor.cpf || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="000.000.000-00" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="birthDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">Data de Nascimento</label>
                                <input type="date" id="birthDate" name="birthDate" defaultValue={birthDateStr} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="maritalStatus" className="text-sm font-bold text-slate-700 dark:text-slate-300">Estado Civil</label>
                                <select id="maritalStatus" name="maritalStatus" defaultValue={monitor.maritalStatus || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                                    <option value="">Selecione...</option>
                                    <option value="SOLTEIRO">Solteiro(a)</option>
                                    <option value="CASADO">Casado(a)</option>
                                    <option value="DIVORCIADO">Divorciado(a)</option>
                                    <option value="VIUVO">Viúvo(a)</option>
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="address" className="text-sm font-bold text-slate-700 dark:text-slate-300">Endereço Completo</label>
                                <input type="text" id="address" name="address" defaultValue={monitor.address || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Rua Exemplo, 123 - Centro, São Paulo - SP" />
                            </div>
                        </div>
                    </div>

                    {/* DADOS DE MONITOR */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">badge</span>
                            Dados da Monitoria
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="area" className="text-sm font-bold text-slate-700 dark:text-slate-300">Área de Atuação</label>
                                <input type="text" id="area" name="area" defaultValue={monitor.area || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Recepção, Logística, Áudio..." />
                            </div>
                        </div>
                    </div>

                    {/* BOTÕES */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <Link href="/monitores" className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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
