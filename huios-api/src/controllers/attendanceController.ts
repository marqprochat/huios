import { Request, Response } from 'express';
import { PrismaClient, AttendanceStatus } from '@prisma/client';
import { sendPushToUser } from '../services/pushService';

const prisma = new PrismaClient();

// Regra: por disciplina, se o aluno faltar 1 aula (33,33%) precisa enviar resumo.
// Se faltar 2+ aulas (66,67%) é reprovado automaticamente.
const ABSENT_FOR_PENDING = 1;
const ABSENT_FOR_FAIL = 2;

async function applyAttendanceRules(studentId: string, disciplineId: string) {
  // Busca todas as aulas da disciplina
  const lessons = await prisma.lesson.findMany({
    where: { disciplines: { some: { id: disciplineId } } },
    select: { id: true }
  });

  const lessonIds = lessons.map(l => l.id);
  if (lessonIds.length === 0) return;

  const attendances = await prisma.attendance.findMany({
    where: { studentId, lessonId: { in: lessonIds } }
  });

  const absentCount = attendances.filter(a => a.status === 'ABSENT').length;
  const totalLessons = lessons.length;
  const absenceRate = totalLessons > 0 ? absentCount / totalLessons : 0;

  if (absentCount >= ABSENT_FOR_FAIL) {
    // Reprovação automática — atualiza matrícula
    const discipline = await prisma.discipline.findUnique({
      where: { id: disciplineId },
      include: { courseClasses: true }
    });

    if (discipline) {
      const classIds = discipline.courseClasses.map(cc => cc.id);
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, classId: { in: classIds }, status: 'CURSANDO' }
      });

      if (enrollment) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'REPROVADO',
            statusDate: new Date(),
            statusReason: `Reprovado por excesso de faltas na disciplina "${discipline.name}" (${absentCount} falta(s) de ${totalLessons} aula(s) — ${Math.round(absenceRate * 100)}%)`
          }
        });

        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: { name: true, userId: true },
        });
        await prisma.notification.create({
          data: {
            type: 'AUTO_FAILED',
            title: 'Aluno reprovado por faltas',
            message: `${student?.name} foi reprovado automaticamente na disciplina "${discipline.name}" por excesso de faltas (${absentCount}/${totalLessons} aulas).`,
            targetRole: 'COORDENADOR',
            relatedId: studentId
          }
        });
        // Notifica o aluno via push
        if (student?.userId) {
          await sendPushToUser(
            student.userId,
            '⚠️ Reprovado por Faltas',
            `Você foi reprovado na disciplina "${discipline.name}" por excesso de faltas (${absentCount}/${totalLessons} aulas).`,
          );
        }
      }
    }
  } else if (absentCount === ABSENT_FOR_PENDING) {
    // Precisa enviar resumo — cria notificação (sem reprovar ainda)
    const absences = attendances.filter(a => a.status === 'ABSENT');
    const discipline = await prisma.discipline.findUnique({ where: { id: disciplineId }, select: { name: true } });
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { name: true } });

    // Notifica o coordenador que o aluno tem 1 falta (precisa de justificativa)
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        type: 'ABSENCE_PENDING_JUSTIFICATION',
        relatedId: absences[0].id
      }
    });

    if (!alreadyNotified) {
      await prisma.notification.create({
        data: {
          type: 'ABSENCE_PENDING_JUSTIFICATION',
          title: 'Aluno com falta — aguardando justificativa',
          message: `${student?.name} tem 1 falta na disciplina "${discipline?.name}". O aluno deve enviar um resumo da aula para regularização.`,
          targetRole: 'COORDENADOR',
          relatedId: absences[0].id
        }
      });

      // Notifica o aluno via push
      const studentWithUser = await prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });
      if (studentWithUser?.userId) {
        await sendPushToUser(
          studentWithUser.userId,
          '📋 Falta Registrada',
          `Você tem 1 falta na disciplina "${discipline?.name}". Envie a justificativa pelo app para regularizar.`,
        );
      }
    }
  }
}

// Get attendances by lesson
export const getAttendancesByLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        disciplines: {
          select: {
            id: true,
            courseClasses: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    const courseClassIds = lesson?.disciplines.flatMap(d => d.courseClasses.map(cc => cc.id)) || [];

    const attendances = await prisma.attendance.findMany({
      where: { lessonId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            enrollments: {
              where: { classId: { in: courseClassIds }, status: 'CURSANDO' },
              select: { class: { select: { id: true, name: true } } }
            }
          }
        }
      },
      orderBy: { student: { name: 'asc' } }
    });

    res.json(attendances);
  } catch (error) {
    console.error('Error fetching attendances:', error);
    res.status(500).json({ error: 'Failed to fetch attendances' });
  }
};

// Update attendance status (manual)
export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!status || !Object.values(AttendanceStatus).includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: PRESENT, ABSENT, EXCUSED, PENDING'
      });
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: { status, markedById: userId, markedAt: new Date(), notes: notes || null },
      include: {
        student: { select: { id: true, name: true, email: true } },
        lesson: {
          select: {
            id: true,
            date: true,
            disciplines: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Aplica regras de frequência para cada disciplina da aula
    for (const discipline of attendance.lesson.disciplines) {
      await applyAttendanceRules(attendance.student.id, discipline.id);
    }

    res.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
};

// Bulk update attendances
export const bulkUpdateAttendances = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { attendances } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!Array.isArray(attendances)) {
      return res.status(400).json({ error: 'attendances must be an array' });
    }

    await Promise.all(
      attendances.map((att: any) =>
        prisma.attendance.update({
          where: { id: att.id },
          data: { status: att.status, markedById: userId, markedAt: new Date(), notes: att.notes || null }
        })
      )
    );

    // Aplica regras de frequência por disciplina após salvar tudo
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { disciplines: { select: { id: true } } }
    });

    if (lesson) {
      // Coleta IDs únicos de alunos que tiveram faltas registradas
      const absentStudentIds = attendances
        .filter((a: any) => a.status === 'ABSENT')
        .map((a: any) => a.studentId)
        .filter(Boolean);

      // Se não tiver studentId no body, busca do banco
      const updatedAttendances = await prisma.attendance.findMany({
        where: { lessonId },
        select: { studentId: true, status: true }
      });

      const allStudentIds = [...new Set(updatedAttendances.map(a => a.studentId))];

      for (const disciplineId of lesson.disciplines.map(d => d.id)) {
        for (const studentId of allStudentIds) {
          await applyAttendanceRules(studentId, disciplineId);
        }
      }
    }

    const updatedAttendances = await prisma.attendance.findMany({
      where: { lessonId },
      include: {
        student: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(updatedAttendances);
  } catch (error) {
    console.error('Error bulk updating attendances:', error);
    res.status(500).json({ error: 'Failed to update attendances' });
  }
};

// Get student attendance report
export const getStudentAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { disciplineId, startDate, endDate } = req.query;

    const where: any = { studentId };
    if (disciplineId) {
      where.lesson = { disciplines: { some: { id: disciplineId as string } } };
    }
    if (startDate || endDate) {
      where.lesson = where.lesson || {};
      where.lesson.date = {};
      if (startDate) where.lesson.date.gte = new Date(startDate as string);
      if (endDate) where.lesson.date.lte = new Date(endDate as string);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            date: true,
            disciplines: { select: { id: true, name: true } }
          }
        },
        justification: {
          select: { id: true, status: true, fileName: true, createdAt: true }
        }
      },
      orderBy: { lesson: { date: 'desc' } }
    });

    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'PRESENT').length,
      absent: attendances.filter(a => a.status === 'ABSENT').length,
      excused: attendances.filter(a => a.status === 'EXCUSED').length,
      pending: attendances.filter(a => a.status === 'PENDING').length,
      attendance:
        attendances.length > 0
          ? Math.round((attendances.filter(a => a.status === 'PRESENT').length / attendances.length) * 100)
          : 0
    };

    res.json({ attendances, stats });
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({ error: 'Failed to fetch attendance report' });
  }
};

// Get discipline attendance report
export const getDisciplineAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { disciplineId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = { disciplines: { some: { id: disciplineId } } };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        attendances: {
          include: { student: { select: { id: true, name: true } } }
        }
      },
      orderBy: { date: 'asc' }
    });

    const totalLessons = lessons.length;

    const studentStats: any = {};
    lessons.forEach(lesson => {
      lesson.attendances.forEach(att => {
        if (!studentStats[att.student.id]) {
          studentStats[att.student.id] = {
            student: att.student,
            total: 0,
            present: 0,
            absent: 0,
            excused: 0,
            absenceStatus: 'OK' // OK | NEEDS_JUSTIFICATION | FAILED
          };
        }
        studentStats[att.student.id].total++;
        if (att.status === 'PRESENT') studentStats[att.student.id].present++;
        if (att.status === 'ABSENT') studentStats[att.student.id].absent++;
        if (att.status === 'EXCUSED') studentStats[att.student.id].excused++;
      });
    });

    Object.values(studentStats).forEach((stat: any) => {
      stat.percentage = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
      if (stat.absent >= ABSENT_FOR_FAIL) {
        stat.absenceStatus = 'FAILED';
      } else if (stat.absent === ABSENT_FOR_PENDING) {
        stat.absenceStatus = 'NEEDS_JUSTIFICATION';
      }
    });

    res.json({ lessons, totalLessons, studentStats: Object.values(studentStats) });
  } catch (error) {
    console.error('Error fetching discipline attendance report:', error);
    res.status(500).json({ error: 'Failed to fetch discipline attendance report' });
  }
};
