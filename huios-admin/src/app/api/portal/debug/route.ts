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
            return NextResponse.json({ error: 'Aluno não encontrado', userId: session.userId }, { status: 404 });
        }

        const studentId = user.student.id;

        const [allEnrollments, cursandoEnrollments, disciplines, lessons, grades, attendances] = await Promise.all([
            prisma.enrollment.findMany({ where: { studentId }, select: { id: true, status: true, classId: true } }),
            prisma.enrollment.findMany({ where: { studentId, status: 'CURSANDO' }, select: { classId: true } }),
            prisma.discipline.count({
                where: {
                    courseClasses: {
                        some: {
                            id: { in: (await prisma.enrollment.findMany({ where: { studentId, status: 'CURSANDO' }, select: { classId: true } })).map(e => e.classId) }
                        }
                    }
                }
            }),
            prisma.lesson.count(),
            prisma.grade.count({ where: { studentId } }),
            prisma.attendance.count({ where: { studentId } }),
        ]);

        const classIds = cursandoEnrollments.map(e => e.classId);
        const disciplineIds = classIds.length > 0
            ? (await prisma.discipline.findMany({ where: { courseClasses: { some: { id: { in: classIds } } } }, select: { id: true } })).map(d => d.id)
            : [];

        const studentLessons = disciplineIds.length > 0
            ? await prisma.lesson.count({ where: { disciplines: { some: { id: { in: disciplineIds } } } } })
            : 0;

        return NextResponse.json({
            ok: true,
            student: { id: studentId, name: user.student.name, email: user.student.email },
            enrollments: {
                total: allEnrollments.length,
                statuses: allEnrollments.map(e => e.status),
                cursando: cursandoEnrollments.length,
            },
            data: {
                disciplinesInMyClasses: disciplines,
                lessonsForMyDisciplines: studentLessons,
                totalLessonsInDB: lessons,
                myGrades: grades,
                myAttendances: attendances,
            },
            diagnosis: {
                hasActiveEnrollment: cursandoEnrollments.length > 0,
                hasDisciplines: disciplines > 0,
                hasLessons: studentLessons > 0,
                hasGrades: grades > 0,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
