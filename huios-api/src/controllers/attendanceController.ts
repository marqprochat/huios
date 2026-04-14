import { Request, Response } from 'express';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Get attendances by lesson
export const getAttendancesByLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    
    const attendances = await prisma.attendance.findMany({
      where: { lessonId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        student: {
          name: 'asc'
        }
      }
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
    const userId = (req as any).user?.id || 'system'; // Get from auth middleware

    if (!status || !Object.values(AttendanceStatus).includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: PRESENT, ABSENT, EXCUSED, PENDING' 
      });
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        status,
        markedById: userId,
        markedAt: new Date(),
        notes: notes || null
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lesson: {
          select: {
            id: true,
            date: true,
            disciplines: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

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

    const updates = attendances.map(async (att: any) => {
      return prisma.attendance.update({
        where: { id: att.id },
        data: {
          status: att.status,
          markedById: userId,
          markedAt: new Date(),
          notes: att.notes || null
        }
      });
    });

    await Promise.all(updates);

    // Fetch updated attendances
    const updatedAttendances = await prisma.attendance.findMany({
      where: { lessonId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
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
      where.lesson = {
        disciplines: {
          some: { id: disciplineId as string }
        }
      };
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
            disciplines: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        lesson: {
          date: 'desc'
        }
      }
    });

    // Calculate statistics
    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'PRESENT').length,
      absent: attendances.filter(a => a.status === 'ABSENT').length,
      excused: attendances.filter(a => a.status === 'EXCUSED').length,
      pending: attendances.filter(a => a.status === 'PENDING').length,
      attendance: attendances.length > 0 
        ? Math.round((attendances.filter(a => a.status === 'PRESENT').length / attendances.length) * 100)
        : 0
    };

    res.json({
      attendances,
      stats
    });
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

    const where: any = {
      disciplines: {
        some: { id: disciplineId }
      }
    };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Calculate student statistics
    const studentStats: any = {};
    lessons.forEach(lesson => {
      lesson.attendances.forEach(att => {
        if (!studentStats[att.student.id]) {
          studentStats[att.student.id] = {
            student: att.student,
            total: 0,
            present: 0,
            absent: 0,
            excused: 0
          };
        }
        studentStats[att.student.id].total++;
        if (att.status === 'PRESENT') studentStats[att.student.id].present++;
        if (att.status === 'ABSENT') studentStats[att.student.id].absent++;
        if (att.status === 'EXCUSED') studentStats[att.student.id].excused++;
      });
    });

    // Add percentage to each student
    Object.values(studentStats).forEach((stat: any) => {
      stat.percentage = stat.total > 0 
        ? Math.round((stat.present / stat.total) * 100)
        : 0;
    });

    res.json({
      lessons,
      studentStats: Object.values(studentStats)
    });
  } catch (error) {
    console.error('Error fetching discipline attendance report:', error);
    res.status(500).json({ error: 'Failed to fetch discipline attendance report' });
  }
};
