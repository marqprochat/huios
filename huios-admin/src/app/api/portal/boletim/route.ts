import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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

        // All grades for the student
        const grades = await prisma.grade.findMany({
            where: { studentId },
            include: {
                discipline: {
                    include: {
                        courseClasses: {
                            include: { course: true }
                        },
                        teacher: true
                    }
                },
                exam: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get all disciplines the student is enrolled in (for showing 0 grades too)
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, status: 'ACTIVE' },
            select: { classId: true }
        });

        const classIds = enrollments.map(e => e.classId);

        const disciplines = await prisma.discipline.findMany({
            where: { courseClasses: { some: { id: { in: classIds } } } },
            include: {
                courseClasses: {
                    include: { course: true }
                },
                teacher: true,
                grades: {
                    where: { studentId }
                }
            }
        });

        // Calculate attendance stats per discipline
        const attendanceStats = await prisma.attendance.groupBy({
            by: ['lessonId'],
            where: { studentId },
            _count: true
        });

        return NextResponse.json({
            grades,
            disciplines,
            attendanceStats
        });
    } catch (error) {
        console.error('Portal boletim error:', error);
        return NextResponse.json({ error: 'Erro ao carregar boletim' }, { status: 500 });
    }
}
