import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ disciplineId: string }> }
) {
    try {
        try {
            await requirePermission('avaliacoes.visualizar');
        } catch {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { disciplineId } = await params;

        const discipline = await prisma.discipline.findUnique({
            where: { id: disciplineId },
            include: {
                lessons: {
                    include: {
                        attendances: true
                    }
                },
                courseClasses: {
                    include: {
                        course: { select: { modality: true } },
                        enrollments: {
                            where: { status: { in: ['CURSANDO', 'APROVADO'] } },
                            include: { student: true }
                        }
                    }
                }
            }
        });

        if (!discipline) {
            return NextResponse.json({ error: 'Disciplina não encontrada' }, { status: 404 });
        }

        const now = new Date();
        const liberado = discipline.lessons.length > 0 && discipline.lessons.every(lesson => {
            const end = lesson.endTime ? new Date(lesson.endTime) : new Date(lesson.date);
            if (!lesson.endTime) {
                end.setHours(23, 59, 59, 999);
            }
            return now > end;
        });

        const studentsMap = new Map<string, { name: string; modality: string }>();
        for (const courseClass of discipline.courseClasses) {
            const modality = courseClass.course?.modality ?? 'POR_NOTA';
            for (const enrollment of courseClass.enrollments) {
                studentsMap.set(enrollment.studentId, { name: enrollment.student.name, modality });
            }
        }

        const submissions = await prisma.teacherEvaluationSubmission.findMany({
            where: { disciplineId, studentId: { in: [...studentsMap.keys()] } }
        });
        const submittedIds = new Set(submissions.map(s => s.studentId));

        const feito: { studentId: string; studentName: string }[] = [];
        const pendente: { studentId: string; studentName: string }[] = [];
        const naoLiberado: { studentId: string; studentName: string }[] = [];
        const isentoPorFalta: { studentId: string; studentName: string }[] = [];

        for (const [studentId, info] of studentsMap) {
            const entry = { studentId, studentName: info.name };
            
            // Se modalidade for POR_PRESENCA e o aluno faltou a todas as aulas (zero presenças),
            // ele não deve ser cobrado por avaliação do professor.
            if (info.modality === 'POR_PRESENCA') {
                const presentCount = discipline.lessons.filter(lesson =>
                    lesson.attendances.some(att => att.studentId === studentId && att.status === 'PRESENT')
                ).length;

                if (presentCount === 0) {
                    isentoPorFalta.push(entry);
                    continue;
                }
            }

            if (submittedIds.has(studentId)) {
                feito.push(entry);
            } else if (liberado) {
                pendente.push(entry);
            } else {
                naoLiberado.push(entry);
            }
        }

        const byName = (a: { studentName: string }, b: { studentName: string }) => a.studentName.localeCompare(b.studentName);
        feito.sort(byName);
        pendente.sort(byName);
        naoLiberado.sort(byName);
        isentoPorFalta.sort(byName);

        return NextResponse.json({
            disciplineId,
            disciplineName: discipline.name,
            liberado,
            feito,
            pendente,
            naoLiberado,
            isentoPorFalta
        });
    } catch (error) {
        console.error('Discipline evaluation status error:', error);
        return NextResponse.json({ error: 'Erro ao carregar status das avaliações' }, { status: 500 });
    }
}
