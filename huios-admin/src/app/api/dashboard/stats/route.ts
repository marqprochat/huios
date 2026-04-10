import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    
    // Start and End of Current Month
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Start and End of Last Month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Total Students & Growth
    const totalStudents = await prisma.student.count();
    const lastMonthStudents = await prisma.student.count({
      where: { createdAt: { lt: startOfCurrentMonth } }
    });
    const studentsGrowth = lastMonthStudents > 0 
      ? Math.round(((totalStudents - lastMonthStudents) / lastMonthStudents) * 100) 
      : 100;

    // 2. Active Teachers
    const totalTeachers = await prisma.teacher.count();

    // 3. Disciplines in Course
    const totalDisciplines = await prisma.discipline.count();

    // 4. New Enrollments this month
    const newEnrollments = await prisma.enrollment.count({
      where: {
        createdAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
    });

    // 5. Pendências Acadêmicas (Simulated or based on ABSENT attendance)
    // For now, let's get students with at least one ABSENT status in the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const pendingStudents = await prisma.student.findMany({
      where: {
        attendances: {
          some: {
            status: 'ABSENT',
            lesson: {
              date: { gte: thirtyDaysAgo }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        attendances: {
          where: { 
            status: 'ABSENT',
            lesson: { date: { gte: thirtyDaysAgo } }
          },
          include: {
            lesson: true
          },
          orderBy: { 
            lesson: { date: 'desc' }
          },
          take: 1
        }
      },
      take: 5
    });

    const pendencies = pendingStudents.map(s => ({
      id: s.id,
      studentName: s.name,
      type: 'Falta Registrada',
      deadline: s.attendances[0]?.lesson?.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) || '--',
      status: 'Warning'
    }));

    // 6. Próximos Eventos (Lessons in the next 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingLessons = await prisma.lesson.findMany({
      where: {
        date: {
          gte: now,
          lte: sevenDaysFromNow
        }
      },
      include: {
        discipline: true
      },
      orderBy: { date: 'asc' },
      take: 5
    });
    const events = upcomingLessons.map(l => ({
      id: l.id,
      title: l.discipline.name,
      date: l.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      time: l.startTime ? new Date(l.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
      location: l.locationName || 'Auditório'
    }));

    return NextResponse.json({
      stats: {
        totalStudents,
        studentsGrowth: `+${studentsGrowth}%`,
        totalTeachers,
        totalDisciplines,
        newEnrollments: `+${newEnrollments}`,
      },
      pendencies,
      events
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
