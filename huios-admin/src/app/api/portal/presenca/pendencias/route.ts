import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { student: true }
    });

    if (!user?.student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    const studentId = user.student.id;
    const now = new Date();

    // Busca faltas do aluno apenas em aulas já ocorridas (data <= hoje)
    const absences = await prisma.attendance.findMany({
      where: {
        studentId,
        status: 'ABSENT',
        lesson: { date: { lte: now } }
      },
      include: {
        lesson: {
          include: {
            disciplines: {
              select: { id: true, name: true }
            }
          }
        },
        justification: {
          select: {
            id: true,
            status: true,
            fileName: true,
            createdAt: true,
            reviewNotes: true,
            reviewedAt: true
          }
        }
      },
      orderBy: { lesson: { date: 'desc' } }
    });

    // Agrupa faltas por disciplina para calcular o status da regra
    const byDiscipline: Record<string, {
      disciplineId: string;
      disciplineName: string;
      totalLessons: number;
      absences: typeof absences;
    }> = {};

    for (const absence of absences) {
      for (const discipline of absence.lesson.disciplines) {
        if (!byDiscipline[discipline.id]) {
          // Conta apenas aulas já ocorridas (data <= hoje)
          const totalLessons = await prisma.lesson.count({
            where: {
              disciplines: { some: { id: discipline.id } },
              date: { lte: now }
            }
          });
          byDiscipline[discipline.id] = {
            disciplineId: discipline.id,
            disciplineName: discipline.name,
            totalLessons,
            absences: []
          };
        }
        if (!byDiscipline[discipline.id].absences.find(a => a.id === absence.id)) {
          byDiscipline[discipline.id].absences.push(absence);
        }
      }
    }

    // Monta resultado com status de cada disciplina
    const result = Object.values(byDiscipline).map(group => {
      const absentCount = group.absences.length;
      let ruleStatus: 'OK' | 'NEEDS_JUSTIFICATION' | 'AUTO_FAILED';
      if (absentCount >= 2) {
        ruleStatus = 'AUTO_FAILED';
      } else if (absentCount === 1) {
        ruleStatus = 'NEEDS_JUSTIFICATION';
      } else {
        ruleStatus = 'OK';
      }

      return {
        disciplineId: group.disciplineId,
        disciplineName: group.disciplineName,
        totalLessons: group.totalLessons,
        absentCount,
        absenceRate: group.totalLessons > 0
          ? Math.round((absentCount / group.totalLessons) * 10000) / 100
          : 0,
        ruleStatus,
        absences: group.absences.map(a => ({
          id: a.id,
          lessonDate: a.lesson.date,
          status: a.status,
          justification: a.justification
        }))
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Portal presenca pendencias error:', error);
    return NextResponse.json({ error: 'Erro ao carregar pendências' }, { status: 500 });
  }
}
