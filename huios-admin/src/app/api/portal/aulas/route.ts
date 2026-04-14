import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        // Get student from user
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { student: true }
        });

        if (!user?.student) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        const studentId = user.student.id;

        // Get enrolled class IDs
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, status: 'ACTIVE' },
            select: { classId: true }
        });

        const classIds = enrollments.map(e => e.classId);

        // Get all disciplines from enrolled classes
        const disciplines = await prisma.discipline.findMany({
            where: { courseClassId: { in: classIds } },
            select: { id: true }
        });

        const disciplineIds = disciplines.map(d => d.id);

        // Get lessons for those disciplines
        const lessons = await prisma.lesson.findMany({
            where: {
                disciplines: {
                    some: { id: { in: disciplineIds } }
                }
            },
            include: {
                disciplines: {
                    include: {
                        courseClass: {
                            include: { course: true }
                        },
                        teacher: true
                    }
                },
                attendances: {
                    where: { studentId }
                },
                materials: true
            },
            orderBy: { date: 'asc' }
        });

        // Map lessons to include the specific discipline for this student
        const flattenedLessons = lessons.map(lesson => {
            const { disciplines, ...rest } = lesson;
            // Find the discipline that belongs to one of the student's classes
            const studentDiscipline = disciplines.find(d => disciplineIds.includes(d.id)) || disciplines[0];
            return {
                ...rest,
                discipline: studentDiscipline
            };
        });

        return NextResponse.json(flattenedLessons);
    } catch (error) {
        console.error('Portal aulas error:', error);
        return NextResponse.json({ error: 'Erro ao carregar aulas' }, { status: 500 });
    }
}
