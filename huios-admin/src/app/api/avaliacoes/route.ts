import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'COORDENADOR')) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        // Get all evaluations with discipline and teacher info
        const evaluations = await prisma.teacherEvaluation.findMany({
            include: {
                discipline: {
                    include: {
                        teacher: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by discipline and teacher
        const groupedResults: any = {};

        evaluations.forEach(ev => {
            const key = ev.disciplineId;
            if (!groupedResults[key]) {
                groupedResults[key] = {
                    disciplineId: ev.disciplineId,
                    disciplineName: ev.discipline.name,
                    teacherName: ev.discipline.teacher?.name || 'Não definido',
                    count: 0,
                    clarity: { EXCELENTE: 0, BOA: 0, REGULAR: 0, RUIM: 0 },
                    engagement: { EXCELENTE: 0, BOA: 0, REGULAR: 0, RUIM: 0 },
                    mastery: { EXCELENTE: 0, BOA: 0, REGULAR: 0, RUIM: 0 },
                    comments: []
                };
            }

            const group = groupedResults[key];
            group.count++;
            // Use safe casting or indexing
            const clarityVal = ev.clarity as 'EXCELENTE' | 'BOA' | 'REGULAR' | 'RUIM';
            const engagementVal = ev.engagement as 'EXCELENTE' | 'BOA' | 'REGULAR' | 'RUIM';
            const masteryVal = ev.mastery as 'EXCELENTE' | 'BOA' | 'REGULAR' | 'RUIM';

            if (group.clarity[clarityVal] !== undefined) group.clarity[clarityVal]++;
            if (group.engagement[engagementVal] !== undefined) group.engagement[engagementVal]++;
            if (group.mastery[masteryVal] !== undefined) group.mastery[masteryVal]++;

            if (ev.observations) {
                group.comments.push({
                    text: ev.observations,
                    date: ev.createdAt
                });
            }
        });

        return NextResponse.json(Object.values(groupedResults));
    } catch (error) {
        console.error('Admin evaluations error:', error);
        return NextResponse.json({ error: 'Erro ao carregar relatórios de avaliação' }, { status: 500 });
    }
}
